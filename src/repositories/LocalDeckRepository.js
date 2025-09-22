import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'flashcards_decks';

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function loadAll() {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.error('LocalDeckRepository.loadAll error', e);
    return [];
  }
}

async function saveAll(decks) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
  } catch (e) {
    console.error('LocalDeckRepository.saveAll error', e);
  }
}

export default class LocalDeckRepository {
  async getAllDecks() {
    const decks = await loadAll();
    // Sort by createdAt descending
    return decks.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  async getDeck(deckId) {
    const decks = await loadAll();
    return decks.find(d => String(d.id) === String(deckId)) || null;
  }

  async createDeck(name) {
    const decks = await loadAll();
    const id = generateId('deck');
    const deck = {
      id,
      name,
      createdAt: new Date().toISOString(),
      isShared: false,
      cards: {}, // store as object for persistence convenience
    };
    const updated = [...decks, deck];
    await saveAll(updated);
    return deck;
  }

  async deleteDeck(deckId) {
    const decks = await loadAll();
    const updated = decks.filter(d => String(d.id) !== String(deckId));
    await saveAll(updated);
    return true;
  }

  async addCard(deckId, { front, back, sampleSentence = '' }) {
    const decks = await loadAll();
    const idx = decks.findIndex(d => String(d.id) === String(deckId));
    if (idx === -1) return null;

    const cardId = generateId('card');
    const card = {
      id: cardId,
      front,
      back,
      sampleSentence,
      isKnown: false,
      lastReviewed: null,
      createdAt: new Date().toISOString(),
    };

    const deck = decks[idx];
    deck.cards = deck.cards || {};
    deck.cards[cardId] = card;

    await saveAll(decks);
    return cardId;
  }

  async deleteCard(deckId, cardId) {
    const decks = await loadAll();
    const idx = decks.findIndex(d => String(d.id) === String(deckId));
    if (idx === -1) return false;

    const deck = decks[idx];
    if (deck.cards && deck.cards[cardId]) {
      delete deck.cards[cardId];
      await saveAll(decks);
      return true;
    }
    return false;
  }

  async updateCard(deckId, cardId, updates) {
    const decks = await loadAll();
    const idx = decks.findIndex(d => String(d.id) === String(deckId));
    if (idx === -1) return false;

    const deck = decks[idx];
    deck.cards = deck.cards || {};
    const existing = deck.cards[cardId];
    if (!existing) return false;

    deck.cards[cardId] = { ...existing, ...updates };
    await saveAll(decks);
    return true;
  }

  async updateCardStatus(deckId, cardId, isKnown) {
    return this.updateCard(deckId, cardId, {
      isKnown,
      lastReviewed: new Date().toISOString(),
    });
  }

  async forkDeck(sourceDeckId, newDeckName) {
    const decks = await loadAll();
    const source = decks.find(d => String(d.id) === String(sourceDeckId));
    if (!source) return null;

    const id = generateId('deck');
    const newDeck = {
      ...source,
      id,
      name: newDeckName || source.name || 'Deck',
      createdAt: new Date().toISOString(),
      isShared: false,
      forkedFrom: {
        id: source.id,
        name: source.name,
      },
    };

    // Deep copy cards to a new object
    newDeck.cards = {};
    if (source.cards) {
      Object.values(source.cards).forEach((card) => {
        const newCardId = generateId('card');
        newDeck.cards[newCardId] = {
          ...card,
          id: newCardId,
          isKnown: false,
          lastReviewed: null,
          createdAt: new Date().toISOString(),
        };
      });
    }

    const updated = [...decks, newDeck];
    await saveAll(updated);
    return id;
  }

  // Cloud-only stubbed APIs
  async shareDeck(/* deckId, isShared */) {
    // Not supported in local mode
    return false;
  }
}
