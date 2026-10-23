// Deck export helpers used by the admin console.
//
// Two formats:
//   - Word list: plain text, one word (card front) per line. No numbering,
//     no bullets, nothing else.
//   - Full JSON: deck details plus every card field, with all audio removed.

// Any key that mentions audio (wordAudioUrl, sentenceAudioData,
// audioGeneratedAt, ...) is dropped from the JSON export.
const AUDIO_KEY_PATTERN = /audio/i;

// Bookkeeping fields that are not part of the deck's content: the client-side
// database ID, and the flags marking media kept in the separate media node.
const INTERNAL_KEYS = new Set(['_dbId', 'media']);

function cardTime(card) {
  const time = Date.parse(card?.createdAt);
  return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
}

// Orders keys like card_2 before card_10; other keys (e.g. Firebase push IDs,
// which are chronological) keep plain code-unit order.
function compareKeys(a, b) {
  const matchA = /^(.*?)(\d+)$/.exec(a);
  const matchB = /^(.*?)(\d+)$/.exec(b);
  if (matchA && matchB && matchA[1] === matchB[1]) {
    const diff = Number(matchA[2]) - Number(matchB[2]);
    if (diff !== 0) return diff;
  }
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Cards of a deck in the order they were added (oldest first).
 * Accepts the Firebase shape (object keyed by card ID) or an array.
 */
export function getOrderedCards(deck) {
  const raw = deck?.cards;
  if (!raw || typeof raw !== 'object') return [];

  const entries = Array.isArray(raw)
    ? raw.map((card, index) => [String(card?.id ?? index), card])
    : Object.entries(raw);

  return entries
    .filter(([, card]) => card && typeof card === 'object')
    .map(([key, card]) => ({ key, card: { ...card, id: card.id || key } }))
    .sort((a, b) => {
      const timeA = cardTime(a.card);
      const timeB = cardTime(b.card);
      if (timeA !== timeB) return timeA < timeB ? -1 : 1;
      return compareKeys(a.key, b.key);
    })
    .map(({ card }) => card);
}

function cleanWord(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Plain word list: one card front per line, nothing else. */
export function buildWordList(deck) {
  return getOrderedCards(deck)
    .map((card) => cleanWord(card.front))
    .filter(Boolean)
    .join('\n');
}

export function countWords(deck) {
  return getOrderedCards(deck).filter((card) => cleanWord(card.front)).length;
}

/** Deep copy of a value with every audio-related key removed. */
export function stripAudio(value) {
  if (Array.isArray(value)) {
    return value.map(stripAudio);
  }
  if (value && typeof value === 'object') {
    const result = {};
    Object.entries(value).forEach(([key, child]) => {
      if (AUDIO_KEY_PATTERN.test(key) || INTERNAL_KEYS.has(key)) return;
      result[key] = stripAudio(child);
    });
    return result;
  }
  return value;
}

/** Full deck content as an object (audio excluded). */
export function buildDeckExport(deck, exportedAt = new Date().toISOString()) {
  const { cards: _cards, ...deckFields } = deck || {};
  const cards = getOrderedCards(deck).map((card) => {
    const { id, front, back, sampleSentence, ...rest } = stripAudio(card);
    // Main fields first so the file is easy to read.
    return { id, front, back, sampleSentence, ...rest };
  });

  return {
    exportedAt,
    deck: {
      ...stripAudio(deckFields),
      cardCount: cards.length,
    },
    cards,
  };
}

/** Full deck content as pretty-printed JSON text (audio excluded). */
export function buildDeckJson(deck, exportedAt) {
  return JSON.stringify(buildDeckExport(deck, exportedAt), null, 2);
}

/** File name based on the deck name, safe on Windows/macOS/Linux. */
export function exportFileName(deck, kind) {
  const base =
    String(deck?.name || '')
      .replace(/[\\/:*?"<>|\u0000-\u001F]+/g, ' ')
      .replace(/\s+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '')
      .slice(0, 80) || 'deck';
  return kind === 'json' ? `${base}.json` : `${base}-words.txt`;
}

/** Browser download of a text file. Returns false when not in a browser. */
export function downloadTextFile(fileName, text, mimeType = 'text/plain') {
  if (typeof document === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') {
    return false;
  }

  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

/** Copies text in the browser. Resolves true on success. */
export async function copyTextToClipboard(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the textarea fallback (e.g. permissions blocked).
    }
  }

  if (typeof document === 'undefined') return false;

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-1000px';
  document.body.appendChild(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  document.body.removeChild(textarea);
  return copied;
}
