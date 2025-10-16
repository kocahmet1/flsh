/**
 * Calculate statistics from deck data
 * These are real-time calculations from actual deck state
 */

/**
 * Calculate total words mastered across all decks
 * @param {Array} decks - Array of deck objects
 * @returns {Number} Total known cards
 */
export function calculateTotalWordsMastered(decks) {
  if (!decks || decks.length === 0) return 0;
  
  let total = 0;
  
  decks.forEach(deck => {
    if (!deck.cards) return;
    
    // Handle both array and object card structures
    let cardsArray = Array.isArray(deck.cards) 
      ? deck.cards 
      : Object.values(deck.cards);
    
    // Count known cards
    const knownCards = cardsArray.filter(card => card.isKnown === true);
    total += knownCards.length;
  });
  
  return total;
}

/**
 * Calculate progress for a single deck
 * @param {Object} deck - Deck object
 * @returns {Object} Progress info
 */
export function calculateDeckProgress(deck) {
  if (!deck || !deck.cards) {
    return { total: 0, known: 0, percentage: 0 };
  }
  
  let cardsArray = Array.isArray(deck.cards) 
    ? deck.cards 
    : Object.values(deck.cards);
  
  const total = cardsArray.length;
  const known = cardsArray.filter(card => card.isKnown === true).length;
  const percentage = total > 0 ? Math.round((known / total) * 100) : 0;
  
  return { total, known, percentage };
}

/**
 * Get overall progress across all decks
 * @param {Array} decks - Array of deck objects
 * @returns {Object} Overall progress
 */
export function calculateOverallProgress(decks) {
  if (!decks || decks.length === 0) {
    return { totalCards: 0, knownCards: 0, percentage: 0 };
  }
  
  let totalCards = 0;
  let knownCards = 0;
  
  decks.forEach(deck => {
    const progress = calculateDeckProgress(deck);
    totalCards += progress.total;
    knownCards += progress.known;
  });
  
  const percentage = totalCards > 0 ? Math.round((knownCards / totalCards) * 100) : 0;
  
  return { totalCards, knownCards, percentage };
}

