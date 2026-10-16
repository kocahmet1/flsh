import {
  buildDeckExport,
  buildDeckJson,
  buildWordList,
  countWords,
  exportFileName,
  getOrderedCards,
  stripAudio,
} from '../src/utils/deckExport';

const deck = {
  id: '-Deck1',
  name: 'SAT Words: Set 1',
  createdAt: '2026-01-01T00:00:00.000Z',
  creatorId: 'admin',
  audioGenerationStatus: 'done',
  cards: {
    card_10: {
      id: 'card_10',
      front: 'third',
      back: 'üçüncü',
      sampleSentence: 'Third sentence.',
      createdAt: '2026-01-01T00:00:00.000Z',
      isKnown: true,
      imageData: 'data:image/png;base64,AAA',
      wordAudioUrl: 'https://example.com/w.mp3',
      definitionAudioUrl: 'https://example.com/d.mp3',
      sentenceAudioUrl: 'https://example.com/s.mp3',
      wordAudioData: 'BASE64',
      definitionAudioData: 'BASE64',
      sentenceAudioData: 'BASE64',
      audioGeneratedAt: '2026-01-02T00:00:00.000Z',
    },
    card_2: {
      id: 'card_2',
      front: '  second\nword ',
      back: 'ikinci',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    card_1: {
      id: 'card_1',
      front: 'first',
      back: 'birinci',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    card_empty: {
      front: '   ',
      back: 'boş',
      createdAt: '2026-01-03T00:00:00.000Z',
    },
    '-Later': {
      front: 'latest',
      back: 'en son',
      createdAt: '2026-02-01T00:00:00.000Z',
    },
  },
};

describe('deck export', () => {
  it('orders cards oldest first, numeric-aware for equal timestamps', () => {
    expect(getOrderedCards(deck).map((card) => card.id)).toEqual([
      'card_1',
      'card_2',
      'card_10',
      'card_empty',
      '-Later',
    ]);
  });

  it('builds a plain word list with one word per line and nothing else', () => {
    expect(buildWordList(deck)).toBe('first\nsecond word\nthird\nlatest');
    expect(countWords(deck)).toBe(4);
  });

  it('returns an empty list for a deck without cards', () => {
    expect(buildWordList({ name: 'Empty' })).toBe('');
    expect(buildWordList({ cards: [null, { front: 'a' }] })).toBe('a');
  });

  it('exports full content without any audio fields', () => {
    const exported = buildDeckExport(deck, '2026-10-17T00:00:00.000Z');
    const json = JSON.stringify(exported);

    expect(json).not.toMatch(/audio/i);
    expect(exported.exportedAt).toBe('2026-10-17T00:00:00.000Z');
    expect(exported.deck).toEqual({
      id: '-Deck1',
      name: 'SAT Words: Set 1',
      createdAt: '2026-01-01T00:00:00.000Z',
      creatorId: 'admin',
      cardCount: 5,
    });
    expect(exported.cards[2]).toEqual({
      id: 'card_10',
      front: 'third',
      back: 'üçüncü',
      sampleSentence: 'Third sentence.',
      createdAt: '2026-01-01T00:00:00.000Z',
      isKnown: true,
      imageData: 'data:image/png;base64,AAA',
    });
    // Cards keep their database key as id when the stored card has none.
    expect(exported.cards[4].id).toBe('-Later');
    expect(JSON.parse(buildDeckJson(deck, 'x')).cards).toHaveLength(5);
  });

  it('strips audio keys at any depth', () => {
    expect(stripAudio({ a: 1, nested: { audioUrl: 'x', b: [{ AudioData: 'y', c: 2 }] }, _dbId: 'z' })).toEqual({
      a: 1,
      nested: { b: [{ c: 2 }] },
    });
  });

  it('makes safe file names', () => {
    expect(exportFileName(deck, 'words')).toBe('SAT-Words-Set-1-words.txt');
    expect(exportFileName(deck, 'json')).toBe('SAT-Words-Set-1.json');
    expect(exportFileName({ name: '  ' }, 'json')).toBe('deck.json');
    expect(exportFileName({ name: 'Kelimeler / Ünite 3' }, 'words')).toBe('Kelimeler-Ünite-3-words.txt');
  });
});
