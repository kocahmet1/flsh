// Card pictures and audio clips are stored apart from the cards:
//
//   users/{uid}/decks/{deckId}/cards/{cardId}   text and small fields only
//   users/{uid}/cardMedia/{deckId}/{cardId}      base64 images / audio clips
//
// A card whose media lives in the media node carries a small flag map, e.g.
// `media: { imageData: true, wordAudioData: true }`, so screens know a
// picture or clip exists without downloading it. Any listener on a deck (or
// on the whole decks tree) therefore stays small, and the heavy payload is
// only fetched for the card that is actually on screen.
//
// Everything in this file is pure (no Firebase access) so it can be unit
// tested; the database side lives in cardMediaStore.js.

export const MEDIA_DATA_FIELDS = [
  'imageData',
  'wordAudioData',
  'definitionAudioData',
  'sentenceAudioData',
];

export const AUDIO_URL_FIELDS = ['wordAudioUrl', 'definitionAudioUrl', 'sentenceAudioUrl'];

export const AUDIO_TYPES = ['word', 'definition', 'sentence'];

// Card fields that are never moved, however long they are.
const PROTECTED_FIELDS = new Set([
  'id',
  'front',
  'back',
  'sampleSentence',
  'isKnown',
  'lastReviewed',
  'createdAt',
  'updatedAt',
  'media',
]);

// Strings longer than this on a card are treated as embedded media (catches
// older field names we no longer write).
const LARGE_INLINE_VALUE = 20000;

function isEmpty(value) {
  return value === null || value === undefined || value === '';
}

/** True when a card field holds media that belongs in the media node. */
export function isHeavyMediaField(field, value) {
  if (isEmpty(value) || PROTECTED_FIELDS.has(field)) return false;
  if (MEDIA_DATA_FIELDS.includes(field)) return true;
  if (typeof value !== 'string') return false;
  // Audio URL fields normally hold short https links; older decks stored
  // whole data: URLs there.
  if (value.startsWith('data:')) return true;
  return value.length > LARGE_INLINE_VALUE;
}

/** Heavy media fields still stored inline on a card. */
export function getInlineMediaFields(card) {
  const result = {};
  if (!card || typeof card !== 'object') return result;
  Object.entries(card).forEach(([field, value]) => {
    if (isHeavyMediaField(field, value)) result[field] = value;
  });
  return result;
}

export function hasInlineMedia(card) {
  return Object.keys(getInlineMediaFields(card)).length > 0;
}

/** Media fields flagged as stored in the media node. */
export function getExternalMediaFields(card) {
  const flags = card && card.media;
  if (!flags || typeof flags !== 'object') return [];
  return Object.keys(flags).filter((field) => flags[field] === true);
}

/** True if the card has this media field, inline or in the media node. */
export function cardHasMediaField(card, field) {
  if (!card || typeof card !== 'object') return false;
  if (!isEmpty(card[field])) return true;
  return Boolean(card.media && card.media[field] === true);
}

export function cardHasImage(card) {
  return cardHasMediaField(card, 'imageData');
}

/** type: 'word' | 'definition' | 'sentence' */
export function cardHasAudio(card, type) {
  return (
    cardHasMediaField(card, `${type}AudioUrl`) || cardHasMediaField(card, `${type}AudioData`)
  );
}

export function cardHasAnyAudio(card) {
  return AUDIO_TYPES.some((type) => cardHasAudio(card, type));
}

/**
 * Split a card into what is stored on the card and what goes to the media
 * node. Use when copying cards that may carry inline media (shared decks,
 * forks). Returns { card, media } where media is null when there is none.
 */
export function splitCardForStorage(card) {
  const light = {};
  const media = {};
  Object.entries(card || {}).forEach(([field, value]) => {
    if (isHeavyMediaField(field, value)) {
      media[field] = value;
    } else {
      light[field] = value;
    }
  });

  const movedFields = Object.keys(media);
  if (!movedFields.length) {
    return { card: light, media: null };
  }

  const flags =
    light.media && typeof light.media === 'object' && !Array.isArray(light.media)
      ? { ...light.media }
      : {};
  movedFields.forEach((field) => {
    flags[field] = true;
  });
  light.media = flags;
  return { card: light, media };
}

/**
 * Multi-path update (relative to users/{uid}) that stores media-related
 * fields for one card. Heavy values go to the media node and are flagged on
 * the card; light values (https links, timestamps) stay on the card; null
 * clears the field everywhere.
 */
export function buildCardMediaUpdates(deckId, cardId, fields) {
  const updates = {};
  const cardPath = `decks/${deckId}/cards/${cardId}`;
  const mediaPath = `cardMedia/${deckId}/${cardId}`;

  Object.entries(fields || {}).forEach(([field, value]) => {
    if (value === undefined) return;

    if (isHeavyMediaField(field, value)) {
      updates[`${mediaPath}/${field}`] = value;
      updates[`${cardPath}/media/${field}`] = true;
      updates[`${cardPath}/${field}`] = null;
      return;
    }

    updates[`${cardPath}/${field}`] = value;
    if (MEDIA_DATA_FIELDS.includes(field) || AUDIO_URL_FIELDS.includes(field)) {
      // A link or a cleared value replaces any copy kept in the media node.
      updates[`${mediaPath}/${field}`] = null;
      updates[`${cardPath}/media/${field}`] = null;
    }
  });

  return updates;
}

/**
 * Multi-path update (relative to users/{uid}) that moves a card's inline
 * media into the media node. Returns null when there is nothing to move.
 */
export function buildInlineMediaMoveUpdates(deckId, cardId, card) {
  const inline = getInlineMediaFields(card);
  const fields = Object.keys(inline);
  if (!fields.length) return null;

  const updates = {};
  fields.forEach((field) => {
    updates[`cardMedia/${deckId}/${cardId}/${field}`] = inline[field];
    updates[`decks/${deckId}/cards/${cardId}/${field}`] = null;
    updates[`decks/${deckId}/cards/${cardId}/media/${field}`] = true;
  });
  return updates;
}

/**
 * The media a screen needs for a card: card fields overlaid with whatever was
 * loaded from the media node. Every image/audio field is present (null when
 * missing) so it can be spread straight into props.
 */
export function mergeCardMedia(card, storedMedia) {
  const merged = {};
  [...MEDIA_DATA_FIELDS, ...AUDIO_URL_FIELDS].forEach((field) => {
    const own = card ? card[field] : undefined;
    const stored = storedMedia ? storedMedia[field] : undefined;
    merged[field] = !isEmpty(own) ? own : !isEmpty(stored) ? stored : null;
  });
  return merged;
}

/**
 * Key that changes whenever a card's media may have changed, so cached media
 * is never served for a regenerated picture or clip.
 */
export function mediaVersionKey(card) {
  if (!card) return '';
  return [
    getExternalMediaFields(card).sort().join(','),
    card.imageGeneratedAt || '',
    card.audioGeneratedAt || '',
  ].join('|');
}

/** Approximate size in bytes of a JSON-serialisable value. */
export function approximateSize(value) {
  try {
    return JSON.stringify(value).length;
  } catch {
    return 0;
  }
}
