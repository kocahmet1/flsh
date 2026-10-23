import { get, push, ref, remove, update } from 'firebase/database';
import { auth, db } from '../firebase/config';
import { getDeckRepository, isCloudEnabled } from '../repositories';
import { isAdminEmail } from '../constants/Admin';
import {
  buildDeckSummary,
  emptyDeckSummary,
  getCardsArray,
  summariesEqual,
} from './deckSummaries';
import { splitCardForStorage } from './cardMedia';
import { markDeckDeleted, moveInlineMedia } from './cardMediaStore';
import { restRequest } from './rtdbRest';

// Deck-level operations for the cloud (Firebase) build, usable without
// mounting the useDecks hook.
//
// Writes are not awaited on the server. Firebase applies a write to the
// local cache immediately (listeners fire right away) and syncs it in the
// background; waiting for the server's confirmation only made the UI wait
// behind whatever else was downloading on the shared connection.

function requireUser(action) {
  const user = auth?.currentUser;
  if (!user) {
    throw new Error(`You must be logged in to ${action}`);
  }
  return user;
}

function logWriteError(label) {
  return (error) => {
    console.error(`[decks] ${label} failed:`, error?.message || error);
  };
}

// ---------------------------------------------------------------------------
// Create / delete

/**
 * Create a deck. Resolves as soon as the deck exists locally; the returned
 * object has the new id, so the caller can navigate to it straight away.
 */
export async function createDeck(name, { isShared = false } = {}) {
  if (!isCloudEnabled()) {
    return getDeckRepository().createDeck(name);
  }

  const user = requireUser('create a deck');
  const uid = user.uid;
  const deckRef = push(ref(db, `users/${uid}/decks`));
  const deckId = deckRef.key;
  const createdAt = new Date().toISOString();

  const deck = {
    id: deckId,
    name,
    createdAt,
    creatorId: uid,
    isShared: isShared === true,
  };

  update(ref(db, `users/${uid}`), {
    [`decks/${deckId}`]: deck,
    [`deckSummaries/${deckId}`]: emptyDeckSummary(name, createdAt),
  }).catch(logWriteError(`Saving deck ${deckId}`));

  console.log('Deck created:', deckId);
  return { ...deck, cards: [] };
}

/** Delete one of the signed-in user's decks, with its media and summary. */
export async function deleteDeck(deckId) {
  if (!isCloudEnabled()) {
    return getDeckRepository().deleteDeck(deckId);
  }

  const user = requireUser('delete a deck');
  const uid = user.uid;
  const deckPath = `users/${uid}/decks/${deckId}`;

  // Only the small fields we need; never the cards.
  const [isSharedSnap, creatorSnap, autoForkedSnap, forkedFromSnap] = await Promise.all(
    ['isShared', 'creatorId', 'autoForked', 'forkedFrom'].map((field) =>
      get(ref(db, `${deckPath}/${field}`))
    )
  );
  const isShared = isSharedSnap.val() === true;
  const creatorId = creatorSnap.val();
  const autoForked = autoForkedSnap.val() === true;
  const forkedFrom = forkedFromSnap.val();

  // Remember explicitly deleted auto-forked decks so they are not re-added.
  if (autoForked && forkedFrom?.id) {
    const prefsRef = ref(db, `users/${uid}/preferences`);
    const prefsSnap = await get(prefsRef);
    const prefs = prefsSnap.exists() ? prefsSnap.val() : {};
    const deletedAutoForkedDecks = prefs.deletedAutoForkedDecks || [];
    if (!deletedAutoForkedDecks.includes(forkedFrom.id)) {
      deletedAutoForkedDecks.push(forkedFrom.id);
    }
    update(prefsRef, { deletedAutoForkedDecks }).catch(logWriteError('Saving deleted auto-fork'));

    // An admin deleting an auto-forked deck also turns auto-forking off.
    if (isAdminEmail(user.email)) {
      const sharedDeckRef = ref(db, `sharedDecks/${forkedFrom.id}`);
      const sharedExists = await get(ref(db, `sharedDecks/${forkedFrom.id}/name`));
      if (sharedExists.exists()) {
        update(sharedDeckRef, { autoForkForAll: false }).catch(
          logWriteError('Turning off auto-fork')
        );
      }
    }
  }

  // A shared deck created by this user is removed from the public decks too.
  if (isShared && creatorId === uid) {
    remove(ref(db, `decks/${deckId}`)).catch(logWriteError('Removing public deck'));
  }

  forgetDeckSummary(uid, deckId);
  markDeckDeleted(uid, deckId);
  update(ref(db, `users/${uid}`), {
    [`decks/${deckId}`]: null,
    [`deckSummaries/${deckId}`]: null,
    [`cardMedia/${deckId}`]: null,
  }).catch(logWriteError(`Deleting deck ${deckId}`));

  console.log('Deck deleted:', deckId);
  return true;
}

/**
 * Multi-path update (relative to users/{uid}) that stores a complete deck:
 * the cards without their media, the media in the media node and the deck
 * summary. Cards that carry inline media (shared decks, copies) are split.
 */
export function buildDeckWriteUpdates(deckId, deck) {
  const { cards, ...fields } = deck || {};
  const updates = {};
  const storedCards = {};

  Object.entries(cards || {}).forEach(([key, card]) => {
    if (!card || typeof card !== 'object') return;
    const { card: light, media } = splitCardForStorage(card);
    storedCards[key] = light;
    if (media) {
      updates[`cardMedia/${deckId}/${key}`] = media;
    }
  });

  const storedDeck = { ...fields, cards: storedCards };
  updates[`decks/${deckId}`] = storedDeck;
  updates[`deckSummaries/${deckId}`] = buildDeckSummary(storedDeck);
  return updates;
}

// ---------------------------------------------------------------------------
// Summaries

const lastSavedSummaries = new Map(); // `${uid}/${deckId}` -> summary

/** Keep users/{uid}/deckSummaries/{deckId} in step with a loaded deck. */
export function saveDeckSummary(uid, deckId, deck) {
  if (!uid || !deckId || !deck || !db) return;
  const summary = buildDeckSummary(deck);
  const key = `${uid}/${deckId}`;
  if (summariesEqual(lastSavedSummaries.get(key), summary)) return;

  lastSavedSummaries.set(key, summary);
  update(ref(db, `users/${uid}/deckSummaries`), { [deckId]: summary }).catch((error) => {
    lastSavedSummaries.delete(key);
    console.warn('[decks] Could not update deck summary:', error?.message || error);
  });
}

export function forgetDeckSummary(uid, deckId) {
  lastSavedSummaries.delete(`${uid}/${deckId}`);
}

// ---------------------------------------------------------------------------
// Background sync (runs once per session, off the realtime connection)

const RECENT_DECK_MS = 10 * 60 * 1000;
const syncRuns = new Map(); // uid -> Promise

function isRecent(summary) {
  const created = Date.parse(summary?.createdAt || '');
  return Number.isFinite(created) && Date.now() - created < RECENT_DECK_MS;
}

/**
 * Once per session: make sure every deck has a summary (and no summary
 * outlives its deck), run the old one-time duplicate cleanup, and move media
 * that older versions of the app stored inside the cards into the media node.
 */
export function syncDecksInBackground(uid, summaries) {
  if (!uid || !db) return Promise.resolve();
  if (!syncRuns.has(uid)) {
    const run = syncDecks(uid, summaries || {}).catch((error) => {
      console.warn('[decks] Background sync stopped:', error?.message || error);
      syncRuns.delete(uid); // try again next time the deck list opens
    });
    syncRuns.set(uid, run);
  }
  return syncRuns.get(uid);
}

async function syncDecks(uid, initialSummaries) {
  const shallow = await restRequest(`users/${uid}/decks`, { params: { shallow: 'true' } });
  const deckIds = shallow ? Object.keys(shallow) : [];
  const deckIdSet = new Set(deckIds);
  const summaries = { ...initialSummaries };
  const migrated = new Set();

  // 1. Decks without a summary (made before summaries existed, or by an older
  //    version of the app). Build it from the deck so the deck list fills in
  //    quickly; inline media found on the way is moved right after.
  const pendingMoves = [];
  for (const deckId of deckIds) {
    if (summaries[deckId]) continue;
    const deck = await restRequest(`users/${uid}/decks/${deckId}`);
    if (!deck) continue;
    if (isLeftoverFragment(deck)) {
      // Not a deck: what a late write left behind after the deck was deleted.
      console.log(`[decks] Removing leftover fragment of deleted deck ${deckId}`);
      update(ref(db, `users/${uid}`), {
        [`decks/${deckId}`]: null,
        [`cardMedia/${deckId}`]: null,
      }).catch(logWriteError('Removing deck fragment'));
      continue;
    }
    const summary = buildDeckSummary(deck);
    summaries[deckId] = summary;
    lastSavedSummaries.set(`${uid}/${deckId}`, summary);
    update(ref(db, `users/${uid}/deckSummaries`), { [deckId]: summary }).catch(
      logWriteError('Saving deck summary')
    );
    pendingMoves.push({ deckId, cards: deck.cards });
    migrated.add(deckId);
  }
  while (pendingMoves.length) {
    const { deckId, cards } = pendingMoves.shift();
    await moveInlineMedia(uid, deckId, cards);
  }

  // 2. Summaries whose deck no longer exists (deleted on another device).
  //    Skip very new decks: their creation may still be syncing.
  for (const deckId of Object.keys(summaries)) {
    if (deckIdSet.has(deckId) || isRecent(summaries[deckId])) continue;
    const stillThere = await restRequest(`users/${uid}/decks/${deckId}`, {
      params: { shallow: 'true' },
    });
    if (stillThere === null) {
      delete summaries[deckId];
      update(ref(db, `users/${uid}/deckSummaries`), { [deckId]: null }).catch(
        logWriteError('Removing stale summary')
      );
    }
  }

  const prefsRef = ref(db, `users/${uid}/preferences`);
  const prefsSnap = await get(prefsRef);
  const prefs = prefsSnap.exists() ? prefsSnap.val() : {};

  // 3. One-time cleanup of duplicate decks from an old bug (same rule as
  //    before: keep the oldest deck of each name), now using the summaries
  //    instead of downloading every deck.
  if (prefs.duplicateDecksCleanedV1 !== true) {
    removeDuplicateDecks(uid, summaries).forEach((deckId) => {
      delete summaries[deckId];
    });
    update(prefsRef, { duplicateDecksCleanedV1: true }).catch(
      logWriteError('Saving duplicate cleanup flag')
    );
  }

  // 4. One-time move of inline media out of the cards.
  if (prefs.mediaSplitV1 !== true) {
    let moved = 0;
    for (const deckId of deckIds) {
      if (migrated.has(deckId) || !summaries[deckId]) continue;
      const cards = await restRequest(`users/${uid}/decks/${deckId}/cards`);
      moved += await moveInlineMedia(uid, deckId, cards);
    }
    await update(prefsRef, { mediaSplitV1: true });
    console.log(`[decks] Moved stored media out of ${moved} card(s)`);
  }
}

/** Every real deck has a name, a creation time and a creator. */
function isLeftoverFragment(deck) {
  return !deck.name && !deck.createdAt && !deck.creatorId && getCardsArray(deck).length === 0;
}

/** Returns the ids of the decks removed. */
function removeDuplicateDecks(uid, summaries) {
  const byName = {};
  Object.entries(summaries).forEach(([deckId, summary]) => {
    // A deck made in the last few minutes is never treated as a duplicate.
    if (isRecent(summary)) return;
    const name = summary?.name || '';
    (byName[name] = byName[name] || []).push({ deckId, createdAt: summary?.createdAt });
  });

  const updates = {};
  const removed = [];
  Object.entries(byName).forEach(([name, decks]) => {
    if (decks.length < 2) return;
    decks.sort(
      (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
    decks.slice(1).forEach(({ deckId }) => {
      console.log(`[cleanupDuplicateDecks] Removing duplicate deck ${deckId} (${name})`);
      updates[`decks/${deckId}`] = null;
      updates[`deckSummaries/${deckId}`] = null;
      updates[`cardMedia/${deckId}`] = null;
      forgetDeckSummary(uid, deckId);
      markDeckDeleted(uid, deckId);
      removed.push(deckId);
    });
  });

  if (Object.keys(updates).length) {
    update(ref(db, `users/${uid}`), updates).catch(logWriteError('Removing duplicate decks'));
  }
  return removed;
}
