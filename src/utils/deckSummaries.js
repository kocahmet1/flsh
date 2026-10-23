// Lightweight per-deck summaries cached under users/{uid}/deckSummaries.
// The deck list (My Sets) renders from this node alone, so opening the app
// never downloads every card of every deck.
//
// Pure helpers only; reads and writes live in cloudDecks.js / useDeck.js.

/** Cards of a deck as an array, whether stored as an object or an array. */
export function getCardsArray(deck) {
  if (!deck?.cards) return [];
  const cards = Array.isArray(deck.cards) ? deck.cards : Object.values(deck.cards);
  return cards.filter(isRealCard);
}

/**
 * A partial write to a card that was deleted in the meantime (for example a
 * late audio update) can leave a fragment without any text. Those are not
 * cards and are hidden everywhere.
 */
export function isRealCard(card) {
  return Boolean(
    card &&
      typeof card === 'object' &&
      (card.front !== undefined || card.back !== undefined)
  );
}

/**
 * A late write to a card of a deleted card (an audio update landing after the
 * delete, say) leaves an object with none of a card's own fields. Safe to
 * remove: real cards are always written with their text and creation time.
 */
export function isStubCard(card) {
  return Boolean(
    card &&
      typeof card === 'object' &&
      card.front === undefined &&
      card.back === undefined &&
      card.sampleSentence === undefined &&
      card.createdAt === undefined
  );
}

/**
 * Same for whole decks: every real deck is written with a name, a creation
 * time and a creator. A node with none of them and no real cards is what a
 * late write left behind after the deck was deleted.
 */
export function isLeftoverFragment(deck) {
  if (!deck || typeof deck !== 'object') return false;
  return !deck.name && !deck.createdAt && !deck.creatorId && getCardsArray(deck).length === 0;
}

export function buildDeckSummary(deck) {
  const cards = getCardsArray(deck);
  return {
    name: deck?.name || 'Untitled Set',
    createdAt: deck?.createdAt || null,
    totalCards: cards.length,
    knownCards: cards.filter((card) => card.isKnown === true).length,
  };
}

export function emptyDeckSummary(name, createdAt) {
  return {
    name: name || 'Untitled Set',
    createdAt: createdAt || null,
    totalCards: 0,
    knownCards: 0,
  };
}

export function summariesEqual(a, b) {
  if (!a || !b) return false;
  return (
    a.name === b.name &&
    (a.createdAt || null) === (b.createdAt || null) &&
    (a.totalCards || 0) === (b.totalCards || 0) &&
    (a.knownCards || 0) === (b.knownCards || 0)
  );
}

/** Deck list entries (for My Sets) from the summaries node value. */
export function decksFromSummaries(summaries) {
  if (!summaries || typeof summaries !== 'object') return [];
  return Object.entries(summaries)
    .filter(([, summary]) => summary && typeof summary === 'object')
    .map(([id, summary]) => ({
      id,
      ...summary,
      _summaryOnly: true,
    }));
}
