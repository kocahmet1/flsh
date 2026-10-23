import { get, push, ref, remove, update } from 'firebase/database';
import { auth, db } from '../firebase/config';
import { getDeckRepository, isCloudEnabled } from '../repositories';
import { isAdminEmail } from '../constants/Admin';
import { MOVE_STORED_MEDIA_ENABLED } from '../constants/FeatureFlags';
import {
  buildDeckSummary,
  emptyDeckSummary,
  getCardsArray,
  isLeftoverFragment,
  summariesEqual,
} from './deckSummaries';
import { splitCardForStorage } from './cardMedia';
import { isDeckDeleted, markDeckDeleted, moveInlineMedia } from './cardMediaStore';
import { trackUserWrite } from './pendingWrites';
import { restRequest } from './rtdbRest';

// Deck-level operations for the cloud (Firebase) build, usable without
// mounting the useDecks hook.
//
// Writes are not awaited on the server. Firebase applies a write to the
// local cache immediately (listeners fire right away) and syncs it in the
// background; waiting for the server's confirmation only made the UI wait
// behind whatever else was downloading on the shared connection. Failures
// are reported by trackUserWrite.

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

  trackUserWrite(
    update(ref(db, `users/${uid}`), {
      [`decks/${deckId}`]: deck,
      [`deckSummaries/${deckId}`]: emptyDeckSummary(name, createdAt),
    }),
    `"${name}" could not be saved to your account. Check your connection and try again.`
  );

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
  trackUserWrite(
    update(ref(db, `users/${uid}`), {
      [`decks/${deckId}`]: null,
      [`deckSummaries/${deckId}`]: null,
      [`cardMedia/${deckId}`]: null,
    }),
    'The deck could not be deleted. Check your connection and try again.'
  );

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
  // Never give a summary (a place in the deck list) to a deleted deck's
  // leftovers.
  if (isLeftoverFragment(deck) || isDeckDeleted(uid, deckId)) return;
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
const RETRY_AFTER_FAILURE_MS = 10 * 60 * 1000;
// Media read while building missing summaries is moved once this much has
// piled up (or at the end), so memory stays bounded on large accounts.
const MAX_PENDING_MOVE_BYTES = 8 * 1024 * 1024;
const syncRuns = new Map(); // uid -> { promise, failedAt }

function isRecent(summary) {
  const created = Date.parse(summary?.createdAt || '');
  return Number.isFinite(created) && Date.now() - created < RECENT_DECK_MS;
}

/**
 * Once per session: make sure every deck has a summary (and no summary
 * outlives its deck), run the old one-time duplicate cleanup, and move media
 * that older versions of the app stored inside the cards into the media node.
 * Resolves to true when it completed; after a failure it is retried no sooner
 * than ten minutes later.
 */
export function syncDecksInBackground(uid, summaries) {
  if (!uid || !db) return Promise.resolve(false);
  const existing = syncRuns.get(uid);
  if (existing && !(existing.failedAt && Date.now() - existing.failedAt > RETRY_AFTER_FAILURE_MS)) {
    return existing.promise;
  }

  const entry = { promise: null, failedAt: null };
  entry.promise = syncDecks(uid, summaries || {}).then(
    () => true,
    (error) => {
      console.warn('[decks] Background sync stopped:', error?.message || error);
      entry.failedAt = Date.now();
      return false;
    }
  );
  syncRuns.set(uid, entry);
  return entry.promise;
}

/**
 * Fallback when REST requests fail and the account has no summaries yet:
 * build them over the realtime connection (one full download, which is what
 * the deck list used to do on every launch).
 */
async function buildSummariesOverRealtime(uid) {
  const snapshot = await get(ref(db, `users/${uid}/decks`));
  const decks = snapshot.val() || {};
  const summaries = {};
  Object.entries(decks).forEach(([deckId, deck]) => {
    if (!deck || typeof deck !== 'object' || isLeftoverFragment(deck)) return;
    const summary = buildDeckSummary(deck);
    lastSavedSummaries.set(`${uid}/${deckId}`, summary);
    summaries[deckId] = summary;
  });
  if (Object.keys(summaries).length) {
    await update(ref(db, `users/${uid}/deckSummaries`), summaries);
  }
}

/**
 * What is stored at users/{uid}/decks/{deckId}, judged from a few small reads
 * over the realtime connection: 'deck', or 'gone' when nothing is there or
 * only a deleted deck's leftovers are.
 */
async function inspectDeckNode(uid, deckId) {
  const base = `users/${uid}/decks/${deckId}`;
  const [name, createdAt, creatorId] = await Promise.all(
    ['name', 'createdAt', 'creatorId'].map((field) =>
      get(ref(db, `${base}/${field}`)).then((snap) => snap.val())
    )
  );
  if (name || createdAt || creatorId) return 'deck';
  const cards = (await get(ref(db, `${base}/cards`))).val();
  return getCardsArray({ cards }).length > 0 ? 'deck' : 'gone';
}

async function syncDecks(uid, initialSummaries) {
  const summaries = { ...initialSummaries };
  let deckIds;
  try {
    const shallow = await restRequest(`users/${uid}/decks`, { params: { shallow: 'true' } });
    deckIds = shallow ? Object.keys(shallow) : [];
  } catch (error) {
    if (!Object.keys(summaries).length) {
      console.warn('[decks] REST unavailable; building the deck list over the realtime connection');
      await buildSummariesOverRealtime(uid);
    }
    throw error;
  }
  const deckIdSet = new Set(deckIds);
  const migrated = new Set();
  const moveMedia = MOVE_STORED_MEDIA_ENABLED;

  // 1. Decks without a summary (made before summaries existed, or by an older
  //    version of the app). Build it from the deck so the deck list fills in
  //    quickly; inline media found on the way is moved soon after.
  let pendingMoves = [];
  let pendingBytes = 0;
  const flushMoves = async () => {
    const moves = pendingMoves;
    pendingMoves = [];
    pendingBytes = 0;
    for (const { deckId, cards } of moves) {
      await moveInlineMedia(uid, deckId, cards);
    }
  };

  for (const deckId of deckIds) {
    if (summaries[deckId] || isDeckDeleted(uid, deckId)) continue;
    const { data: deck, bytes } = await restRequest(`users/${uid}/decks/${deckId}`, {
      withSize: true,
    });
    if (!deck || isDeckDeleted(uid, deckId)) continue;
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
    if (moveMedia) {
      pendingMoves.push({ deckId, cards: deck.cards });
      pendingBytes += bytes;
      migrated.add(deckId);
      if (pendingBytes > MAX_PENDING_MOVE_BYTES) {
        await flushMoves();
      }
    }
  }
  await flushMoves();

  // 2. Summaries without a deck behind them (deleted on another device), or
  //    left from a deleted deck's leftovers. Checked over the realtime
  //    connection before anything is removed; very new decks are skipped
  //    because their creation may still be syncing.
  for (const deckId of Object.keys(summaries)) {
    const summary = summaries[deckId];
    const missing = !deckIdSet.has(deckId) && !isRecent(summary);
    const suspicious = !summary?.createdAt;
    if (!missing && !suspicious) continue;
    if ((await inspectDeckNode(uid, deckId)) === 'gone') {
      delete summaries[deckId];
      forgetDeckSummary(uid, deckId);
      update(ref(db, `users/${uid}`), {
        [`decks/${deckId}`]: null,
        [`deckSummaries/${deckId}`]: null,
        [`cardMedia/${deckId}`]: null,
      }).catch(logWriteError('Removing stale summary'));
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
  if (moveMedia && prefs.mediaSplitV1 !== true) {
    let moved = 0;
    for (const deckId of deckIds) {
      if (migrated.has(deckId) || !summaries[deckId] || isDeckDeleted(uid, deckId)) continue;
      const cards = await restRequest(`users/${uid}/decks/${deckId}/cards`);
      moved += await moveInlineMedia(uid, deckId, cards);
    }
    await update(prefsRef, { mediaSplitV1: true });
    console.log(`[decks] Moved stored media out of ${moved} card(s)`);
  }
}

// Names that summaries give decks without a name; such decks are never
// treated as duplicates of each other.
const UNNAMED = new Set(['', 'Untitled Set']);

/** Returns the ids of the decks removed. */
function removeDuplicateDecks(uid, summaries) {
  const byName = {};
  Object.entries(summaries).forEach(([deckId, summary]) => {
    // A deck made in the last few minutes is never treated as a duplicate.
    if (isRecent(summary)) return;
    const name = summary?.name || '';
    if (UNNAMED.has(name)) return;
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
