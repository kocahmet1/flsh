import {
  buildDeckSummary,
  decksFromSummaries,
  emptyDeckSummary,
  getCardsArray,
  isLeftoverFragment,
  isRealCard,
  isStubCard,
  summariesEqual,
} from '../src/utils/deckSummaries';

describe('deck summaries', () => {
  const deck = {
    name: 'Phrasal verbs',
    createdAt: '2026-10-23T19:00:00.000Z',
    cards: {
      a: { front: 'give up', back: 'vazgeçmek', isKnown: true },
      b: { front: 'look after', back: 'bakmak', isKnown: false },
      c: { front: 'put off', back: 'ertelemek' },
      // Fragment left by a late write to a deleted card: not a card.
      d: { wordAudioUrl: 'https://x/w.mp3', audioGeneratedAt: '2026-10-23' },
      e: { media: { imageData: true } },
    },
  };

  test('counts real cards and known cards', () => {
    expect(buildDeckSummary(deck)).toEqual({
      name: 'Phrasal verbs',
      createdAt: '2026-10-23T19:00:00.000Z',
      totalCards: 3,
      knownCards: 1,
    });
  });

  test('handles decks without cards and array-shaped cards', () => {
    expect(buildDeckSummary({ name: 'Empty' })).toEqual(emptyDeckSummary('Empty', null));
    expect(getCardsArray({ cards: [{ front: 'x', back: 'y' }, null] })).toHaveLength(1);
  });

  test('fragments are not cards', () => {
    expect(isRealCard({ front: 'x' })).toBe(true);
    expect(isRealCard({ back: '' })).toBe(true);
    expect(isRealCard({ media: { imageData: true } })).toBe(false);
    expect(isRealCard(null)).toBe(false);
  });

  test('summariesEqual compares the stored fields', () => {
    const a = buildDeckSummary(deck);
    expect(summariesEqual(a, { ...a })).toBe(true);
    expect(summariesEqual(a, { ...a, knownCards: 2 })).toBe(false);
    expect(summariesEqual(undefined, a)).toBe(false);
  });

  test('deck list entries come from the summaries node', () => {
    expect(
      decksFromSummaries({
        d1: { name: 'One', totalCards: 2, knownCards: 1 },
        bad: 'not a summary',
      })
    ).toEqual([{ id: 'd1', name: 'One', totalCards: 2, knownCards: 1, _summaryOnly: true }]);
    expect(decksFromSummaries(null)).toEqual([]);
  });

  test('leftovers of deleted cards and decks are recognised, real ones never', () => {
    expect(isStubCard({ wordAudioUrl: 'https://x', audioGeneratedAt: 't' })).toBe(true);
    expect(isStubCard({ isKnown: true, lastReviewed: 't' })).toBe(true);
    expect(isStubCard({ media: { imageData: true } })).toBe(true);
    expect(isStubCard({ front: 'a' })).toBe(false);
    expect(isStubCard({ sampleSentence: 's' })).toBe(false);
    expect(isStubCard({ createdAt: 't', imageData: 'x' })).toBe(false);

    expect(isLeftoverFragment({ cards: { c: { isKnown: false } } })).toBe(true);
    expect(isLeftoverFragment({ quizQuestions: { q: 1 } })).toBe(true);
    expect(isLeftoverFragment({ name: 'Real', cards: {} })).toBe(false);
    expect(isLeftoverFragment({ createdAt: 't' })).toBe(false);
    expect(isLeftoverFragment({ cards: { c: { front: 'kept', back: 'b' } } })).toBe(false);
    expect(isLeftoverFragment(null)).toBe(false);
  });
});
