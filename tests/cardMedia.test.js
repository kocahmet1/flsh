import {
  buildCardMediaUpdates,
  buildInlineMediaMoveUpdates,
  cardHasAnyAudio,
  cardHasAudio,
  cardHasImage,
  getExternalMediaFields,
  getInlineMediaFields,
  hasInlineMedia,
  inlineStoredMedia,
  isHeavyMediaField,
  mediaVersionKey,
  mergeCardMedia,
  splitCardForStorage,
} from '../src/utils/cardMedia';

const IMAGE = '/9j/' + 'A'.repeat(500);
const CLIP = 'SUQz' + 'B'.repeat(500);

describe('isHeavyMediaField', () => {
  test('media data fields are heavy when they have content', () => {
    expect(isHeavyMediaField('imageData', IMAGE)).toBe(true);
    expect(isHeavyMediaField('wordAudioData', CLIP)).toBe(true);
    expect(isHeavyMediaField('imageData', '')).toBe(false);
    expect(isHeavyMediaField('imageData', null)).toBe(false);
  });

  test('audio links stay on the card, inline data: URLs do not', () => {
    expect(isHeavyMediaField('wordAudioUrl', 'https://firebasestorage.googleapis.com/a.mp3')).toBe(false);
    expect(isHeavyMediaField('wordAudioUrl', 'data:audio/mpeg;base64,AAAA')).toBe(true);
  });

  test('card text is never moved, however long', () => {
    expect(isHeavyMediaField('back', 'x'.repeat(50000))).toBe(false);
    expect(isHeavyMediaField('sampleSentence', 'data:looks like a url')).toBe(false);
  });

  test('unknown very long strings are treated as embedded media', () => {
    expect(isHeavyMediaField('legacyImage', 'x'.repeat(30000))).toBe(true);
    expect(isHeavyMediaField('note', 'short')).toBe(false);
  });
});

describe('splitCardForStorage', () => {
  test('moves heavy fields out and flags them', () => {
    const card = {
      front: 'aloof',
      back: 'mesafeli',
      isKnown: true,
      imageData: IMAGE,
      wordAudioUrl: 'data:audio/mpeg;base64,AAAA',
      definitionAudioUrl: 'https://example.com/d.mp3',
      sentenceAudioData: CLIP,
    };
    const { card: light, media } = splitCardForStorage(card);
    expect(light).toEqual({
      front: 'aloof',
      back: 'mesafeli',
      isKnown: true,
      definitionAudioUrl: 'https://example.com/d.mp3',
      media: { imageData: true, wordAudioUrl: true, sentenceAudioData: true },
    });
    expect(media).toEqual({
      imageData: IMAGE,
      wordAudioUrl: 'data:audio/mpeg;base64,AAAA',
      sentenceAudioData: CLIP,
    });
  });

  test('keeps existing flags and returns null media when nothing to move', () => {
    const card = { front: 'a', back: 'b', media: { imageData: true } };
    expect(splitCardForStorage(card)).toEqual({ card, media: null });
  });
});

describe('buildCardMediaUpdates', () => {
  test('base64 clip goes to the media node, link stays on the card', () => {
    const updates = buildCardMediaUpdates('d1', 'c1', {
      wordAudioUrl: null,
      wordAudioData: CLIP,
      definitionAudioUrl: 'https://example.com/d.mp3',
      definitionAudioData: null,
      audioGeneratedAt: '2026-10-23T00:00:00.000Z',
    });
    expect(updates).toEqual({
      'decks/d1/cards/c1/wordAudioUrl': null,
      'cardMedia/d1/c1/wordAudioUrl': null,
      'decks/d1/cards/c1/media/wordAudioUrl': null,
      'cardMedia/d1/c1/wordAudioData': CLIP,
      'decks/d1/cards/c1/media/wordAudioData': true,
      'decks/d1/cards/c1/wordAudioData': null,
      'decks/d1/cards/c1/definitionAudioUrl': 'https://example.com/d.mp3',
      'cardMedia/d1/c1/definitionAudioUrl': null,
      'decks/d1/cards/c1/media/definitionAudioUrl': null,
      'decks/d1/cards/c1/definitionAudioData': null,
      'cardMedia/d1/c1/definitionAudioData': null,
      'decks/d1/cards/c1/media/definitionAudioData': null,
      'decks/d1/cards/c1/audioGeneratedAt': '2026-10-23T00:00:00.000Z',
    });
  });

  test('never writes a path inside another path of the same update', () => {
    const updates = buildCardMediaUpdates('d', 'c', {
      imageData: IMAGE,
      wordAudioData: CLIP,
      wordAudioUrl: 'https://x/y.mp3',
    });
    const paths = Object.keys(updates);
    paths.forEach((a) => {
      paths.forEach((b) => {
        if (a !== b) expect(b.startsWith(`${a}/`)).toBe(false);
      });
    });
  });
});

describe('buildInlineMediaMoveUpdates', () => {
  test('moves only inline media and flags it', () => {
    const updates = buildInlineMediaMoveUpdates('d1', 'c1', {
      front: 'a',
      back: 'b',
      imageData: IMAGE,
      wordAudioUrl: 'https://x/y.mp3',
    });
    expect(updates).toEqual({
      'cardMedia/d1/c1/imageData': IMAGE,
      'decks/d1/cards/c1/imageData': null,
      'decks/d1/cards/c1/media/imageData': true,
    });
  });

  test('returns null when the card is already light', () => {
    expect(buildInlineMediaMoveUpdates('d', 'c', { front: 'a', media: { imageData: true } })).toBe(
      null
    );
  });
});

describe('media presence checks', () => {
  const moved = { front: 'a', media: { imageData: true, wordAudioData: true } };
  const inline = { front: 'a', imageData: IMAGE, sentenceAudioUrl: 'https://x/s.mp3' };
  const none = { front: 'a', back: 'b' };

  test('work for inline and moved media', () => {
    expect(cardHasImage(moved)).toBe(true);
    expect(cardHasImage(inline)).toBe(true);
    expect(cardHasImage(none)).toBe(false);
    expect(cardHasAudio(moved, 'word')).toBe(true);
    expect(cardHasAudio(moved, 'definition')).toBe(false);
    expect(cardHasAudio(inline, 'sentence')).toBe(true);
    expect(cardHasAnyAudio(none)).toBe(false);
    expect(hasInlineMedia(inline)).toBe(true);
    expect(hasInlineMedia(moved)).toBe(false);
    expect(getExternalMediaFields(moved).sort()).toEqual(['imageData', 'wordAudioData']);
    expect(getInlineMediaFields(inline)).toEqual({ imageData: IMAGE });
  });
});

describe('mergeCardMedia', () => {
  test('card fields win, stored media fills the rest, missing is null', () => {
    const merged = mergeCardMedia(
      { wordAudioUrl: 'https://x/w.mp3', media: { imageData: true } },
      { imageData: IMAGE, wordAudioUrl: 'data:old' }
    );
    expect(merged).toEqual({
      imageData: IMAGE,
      wordAudioData: null,
      definitionAudioData: null,
      sentenceAudioData: null,
      wordAudioUrl: 'https://x/w.mp3',
      definitionAudioUrl: null,
      sentenceAudioUrl: null,
    });
  });
});

describe('mediaVersionKey', () => {
  test('changes when media is regenerated', () => {
    const before = { media: { wordAudioData: true }, audioGeneratedAt: '1' };
    const after = { media: { wordAudioData: true }, audioGeneratedAt: '2' };
    expect(mediaVersionKey(before)).not.toEqual(mediaVersionKey(after));
  });
});

describe('inlineStoredMedia', () => {
  test('puts stored media back and drops the flags', () => {
    expect(
      inlineStoredMedia(
        { front: 'a', media: { imageData: true, wordAudioData: true } },
        { imageData: IMAGE, wordAudioData: CLIP, sentenceAudioData: 'not flagged' }
      )
    ).toEqual({ front: 'a', imageData: IMAGE, wordAudioData: CLIP });
  });

  test("the card's own newer value wins over the stored copy", () => {
    expect(
      inlineStoredMedia({ front: 'a', imageData: 'NEW', media: { imageData: true } }, { imageData: 'OLD' })
    ).toEqual({ front: 'a', imageData: 'NEW' });
  });

  test('missing stored media leaves the field out', () => {
    expect(inlineStoredMedia({ front: 'a', media: { imageData: true } }, undefined)).toEqual({ front: 'a' });
  });
});
