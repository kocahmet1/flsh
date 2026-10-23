import { get, ref, update } from 'firebase/database';
import { auth, db } from '../firebase/config';
import {
  buildCardMediaUpdates,
  buildInlineMediaMoveUpdates,
  getExternalMediaFields,
  mediaVersionKey,
  mergeCardMedia,
  approximateSize,
} from './cardMedia';
import { isRealCard } from './deckSummaries';
import { restRequest } from './rtdbRest';

// Loading and saving card pictures/audio kept in users/{uid}/cardMedia.
// See cardMedia.js for the layout.

const MAX_CACHED_CARDS = 60;
const cache = new Map(); // key -> merged media (insertion order = LRU)
const inFlight = new Map(); // key -> Promise

/** Database key of a card object coming from useDeck (or a raw card). */
export function cardKeyOf(card) {
  return card ? String(card._dbId || card.id || '') : '';
}

function currentUid() {
  return auth?.currentUser?.uid || null;
}

function cacheKey(uid, deckId, card) {
  return `${uid}/${deckId}/${cardKeyOf(card)}#${mediaVersionKey(card)}`;
}

function remember(key, value) {
  cache.delete(key);
  cache.set(key, value);
  while (cache.size > MAX_CACHED_CARDS) {
    cache.delete(cache.keys().next().value);
  }
}

function needsStoredMedia(card) {
  return getExternalMediaFields(card).length > 0;
}

/**
 * Media for a card if it can be produced without a network call (the card
 * has no media stored elsewhere, or it is already cached); otherwise null.
 */
export function peekCardMedia(deckId, card) {
  if (!card) return mergeCardMedia(null, null);
  if (!needsStoredMedia(card)) return mergeCardMedia(card, null);
  const uid = currentUid();
  if (!uid || !deckId) return mergeCardMedia(card, null);
  const key = cacheKey(uid, deckId, card);
  if (!cache.has(key)) return null;
  const value = cache.get(key);
  remember(key, value);
  return value;
}

/**
 * Full media (image + audio fields) for one card, downloading the stored
 * part when needed. Never rejects: on failure the card's own fields are
 * returned.
 */
export async function loadCardMedia(deckId, card) {
  const peeked = peekCardMedia(deckId, card);
  if (peeked) return peeked;

  const uid = currentUid();
  const key = cacheKey(uid, deckId, card);
  if (inFlight.has(key)) return inFlight.get(key);

  const request = get(ref(db, `users/${uid}/cardMedia/${deckId}/${cardKeyOf(card)}`))
    .then((snapshot) => {
      const merged = mergeCardMedia(card, snapshot.val());
      remember(key, merged);
      return merged;
    })
    .catch((error) => {
      console.warn('[cardMedia] Could not load media:', error?.message || error);
      return mergeCardMedia(card, null);
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
}

export function prefetchCardMedia(deckId, card) {
  if (!card || !needsStoredMedia(card)) return;
  loadCardMedia(deckId, card).catch(() => {});
}

/**
 * Save picture/audio fields for a card of the signed-in user's deck. Heavy
 * values go to the media node; links and timestamps stay on the card.
 */
export function saveCardMediaFields(deckId, cardId, fields) {
  const uid = currentUid();
  if (!uid) return Promise.reject(new Error('User not authenticated'));
  const updates = buildCardMediaUpdates(deckId, cardId, fields);
  if (!Object.keys(updates).length) return Promise.resolve();
  return update(ref(db, `users/${uid}`), updates);
}

/**
 * Copy of a deck whose cards carry their media inline again (for exports and
 * for copying a deck to another account). Reads the owner's media node.
 */
export async function withStoredMedia(ownerUid, deck) {
  if (!deck?.cards || typeof deck.cards !== 'object') return deck;
  const entries = Object.entries(deck.cards);
  const needsMedia = entries.some(([, card]) => needsStoredMedia(card));
  let stored = {};
  if (needsMedia && ownerUid && deck.id) {
    const snapshot = await get(ref(db, `users/${ownerUid}/cardMedia/${deck.id}`));
    stored = snapshot.val() || {};
  }

  const cards = {};
  entries.forEach(([key, card]) => {
    if (!card || typeof card !== 'object') return;
    const { media: _flags, ...rest } = card;
    const cardMedia = stored[key] || {};
    const inline = {};
    getExternalMediaFields(card).forEach((field) => {
      if (cardMedia[field] !== undefined && cardMedia[field] !== null) {
        inline[field] = cardMedia[field];
      }
    });
    cards[key] = { ...rest, ...inline };
  });

  return { ...deck, cards };
}

// ---------------------------------------------------------------------------
// Moving media that older versions of the app stored inside the cards.

const MAX_PATCH_BYTES = 1.5 * 1024 * 1024;

// Decks deleted on this device; a media move in progress for one of them
// stops, so its late writes can't re-create cards of a deleted deck.
const deletedDecks = new Set();

export function markDeckDeleted(uid, deckId) {
  deletedDecks.add(`${uid}/${deckId}`);
}

/**
 * Move inline media of the given cards (object keyed by card key, as stored)
 * into the media node. Uses REST so the upload never blocks the app's
 * realtime connection. Resolves to the number of cards updated.
 */
export async function moveInlineMedia(uid, deckId, cards) {
  if (!uid || !deckId || !cards || typeof cards !== 'object') return 0;

  let batch = {};
  let batchBytes = 0;
  let moved = 0;

  const deckKey = `${uid}/${deckId}`;
  const flush = async () => {
    if (!batchBytes || deletedDecks.has(deckKey)) return;
    const body = batch;
    batch = {};
    batchBytes = 0;
    await restRequest(`users/${uid}`, { method: 'PATCH', params: { print: 'silent' }, body });
  };

  for (const [cardKey, card] of Object.entries(cards)) {
    if (deletedDecks.has(deckKey)) break;
    // Never write into a fragment: it could resurrect a deleted card.
    if (!isRealCard(card)) continue;
    const updates = buildInlineMediaMoveUpdates(deckId, cardKey, card);
    if (!updates) continue;

    const size = approximateSize(updates);
    if (batchBytes && batchBytes + size > MAX_PATCH_BYTES) {
      await flush();
    }
    Object.assign(batch, updates);
    batchBytes += size;
    moved += 1;
  }

  await flush();
  return moved;
}
