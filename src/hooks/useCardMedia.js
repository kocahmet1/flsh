import { useEffect, useState } from 'react';
import { cardKeyOf, loadCardMedia, peekCardMedia } from '../utils/cardMediaStore';
import { mediaVersionKey, mergeCardMedia } from '../utils/cardMedia';

/**
 * Picture and audio fields for the card on screen. Media kept in the media
 * node is downloaded for this card only; until it arrives the card's own
 * fields (audio links, older inline media) are returned.
 */
export function useCardMedia(deckId, card) {
  const key = card ? `${deckId}/${cardKeyOf(card)}#${mediaVersionKey(card)}` : '';
  const [state, setState] = useState(() => ({
    key,
    media: peekCardMedia(deckId, card) || mergeCardMedia(card, null),
  }));

  useEffect(() => {
    if (!card) return undefined;
    let active = true;

    const cached = peekCardMedia(deckId, card);
    if (cached) {
      setState({ key, media: cached });
      return undefined;
    }

    setState({ key, media: mergeCardMedia(card, null) });
    loadCardMedia(deckId, card).then((media) => {
      if (active) setState({ key, media });
    });

    return () => {
      active = false;
    };
    // `key` covers the card identity and its media version.
  }, [deckId, key]);

  if (state.key === key) return state.media;
  // The card just changed and the effect has not run yet.
  return peekCardMedia(deckId, card) || mergeCardMedia(card, null);
}
