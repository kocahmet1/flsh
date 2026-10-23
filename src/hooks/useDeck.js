import { useState, useEffect, useCallback, useRef } from 'react';
import { ref, onValue, push, set, remove, get, update } from 'firebase/database';
import { auth, db } from '../firebase/config';
import { Platform } from 'react-native';
import { getDeckRepository, isCloudEnabled } from '../repositories';
import { useAuth } from '../context/AuthContext';
import { isRealCard } from '../utils/deckSummaries';
import { hasInlineMedia } from '../utils/cardMedia';
import { moveInlineMedia } from '../utils/cardMediaStore';
import { saveDeckSummary } from '../utils/cloudDecks';

// Decks whose old inline media was already moved out this session.
const inlineMediaMoves = new Set();

/**
 * Older versions of the app stored pictures/audio inside the cards. When such
 * a deck is opened, move that media to the media node (over REST, so it does
 * not hold up the app's own reads and writes). Data is already in hand.
 */
function moveInlineMediaOnce(uid, deckId, rawCards) {
  const key = `${uid}/${deckId}`;
  if (!rawCards || inlineMediaMoves.has(key)) return;
  const needsMove = Object.values(rawCards).some(
    (card) => isRealCard(card) && hasInlineMedia(card)
  );
  if (!needsMove) return;

  inlineMediaMoves.add(key);
  moveInlineMedia(uid, deckId, rawCards)
    .then((moved) => {
      console.log(`[useDeck] Moved stored media out of ${moved} card(s) in deck ${deckId}`);
    })
    .catch((error) => {
      inlineMediaMoves.delete(key);
      console.warn('[useDeck] Could not move inline media:', error?.message || error);
    });
}

function cardsFromSnapshot(rawCards) {
  if (!rawCards) return [];
  return Object.entries(rawCards)
    .filter(([, card]) => isRealCard(card))
    .map(([id, card]) => ({
      id, // This is the key ID from the database
      ...card,
      _dbId: id, // Store the original database ID to use for updates
    }))
    .sort((a, b) => {
      // Sort by createdAt in descending order (newest first)
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
}

function logWriteError(label) {
  return (error) => {
    console.error(`[useDeck] ${label} failed:`, error?.message || error);
  };
}

export function useDeck(deckId) {
  const [deck, setDeck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // 'personal' when the deck comes from users/{uid}/decks, 'shared' otherwise
  const sourceRef = useRef(null);
  const cloud = isCloudEnabled();
  const repo = getDeckRepository();
  const { user } = useAuth();

  // Function to manually refresh deck data
  const refreshDeck = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    console.log(`[useDeck] Loading deck with ID: ${deckId}, cloud: ${cloud}`);

    if (!deckId) {
      console.log("[useDeck] No deck ID provided");
      setDeck(null);
      setLoading(false);
      setError("No deck ID provided");
      return;
    }

    // Offline-first branch
    if (!cloud) {
      let cancelled = false;
      const loadLocal = async () => {
        try {
          setLoading(true);
          const d = await repo.getDeck(String(deckId));
          if (!cancelled) {
            if (d) {
              const cardsArray = d.cards ? Object.values(d.cards).map((c) => ({ ...c })).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)) : [];
              setDeck({ ...d, cards: cardsArray });
              setIsCreator(true);
              setError(null);
            } else {
              setDeck(null);
              setIsCreator(false);
              setError("Deck not found");
            }
          }
        } catch (e) {
          console.error('[useDeck] Error loading local deck:', e);
          if (!cancelled) {
            setDeck(null);
            setIsCreator(false);
            setError('Error loading deck');
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      loadLocal();
      return () => { cancelled = true; };
    }

    // Cloud branch
    if (!auth.currentUser) {
      console.log("[useDeck] No authenticated user");
      setDeck(null);
      setLoading(false);
      setError("You must be logged in to view this deck");
      return;
    }

    // Ensure deckId is a string
    const deckIdString = String(deckId);
    const uid = auth.currentUser.uid;
    console.log(`[useDeck] Normalized deck ID: ${deckIdString}`);

    let active = true;
    let unsubscribePersonal = null;
    let unsubscribeShared = null;
    let usingSharedDeck = false;

    const handleListenError = (error) => {
      if (!active) return;
      console.error('Error loading deck:', error);
      setDeck(null);
      setIsCreator(false);
      setError("Error loading deck");
      setLoading(false);
    };

    const listenToSharedDeck = () => {
      const sharedDeckRef = ref(db, `decks/${deckIdString}`);
      console.log(`[useDeck] Checking shared decks at: decks/${deckIdString}`);
      unsubscribeShared = onValue(sharedDeckRef, (snapshot) => {
        if (!active) return;
        const data = snapshot.val();
        if (data) {
          const cards = cardsFromSnapshot(data.cards);
          console.log(`[useDeck] Shared deck updated: ${deckIdString}, Cards count: ${cards.length}`);
          sourceRef.current = 'shared';
          setDeck({
            id: deckIdString,
            ...data,
            cards,
            isShared: true
          });
          setIsCreator(data.creatorId === auth.currentUser?.uid);
          setError(null);
        } else {
          // Deck not found in either location
          console.log(`[useDeck] Deck not found in either location`);
          setDeck(null);
          setIsCreator(false);
          setError("Deck not found");
        }
        setLoading(false);
      }, handleListenError);
    };

    // Listen to the user's own copy first. (This used to get() the deck and
    // then attach a listener, which downloaded the whole deck twice.)
    const userDeckRef = ref(db, `users/${uid}/decks/${deckIdString}`);
    console.log(`[useDeck] Checking user's personal decks at: users/${uid}/decks/${deckIdString}`);
    let sawPersonalDeck = false;

    unsubscribePersonal = onValue(userDeckRef, (snapshot) => {
      if (!active || usingSharedDeck) return;
      const data = snapshot.val();

      if (!data) {
        if (!sawPersonalDeck) {
          // Not one of the user's decks: try the shared decks. (This callback
          // can run before onValue returns, so the personal listener is
          // removed below once its unsubscribe function exists.)
          usingSharedDeck = true;
          if (unsubscribePersonal) {
            unsubscribePersonal();
            unsubscribePersonal = null;
          }
          listenToSharedDeck();
          return;
        }
        console.log(`[useDeck] Deck data is null or empty`);
        setDeck(null);
        setIsCreator(false);
        setError("Deck not found");
        setLoading(false);
        return;
      }

      sawPersonalDeck = true;
      sourceRef.current = 'personal';
      const cards = cardsFromSnapshot(data.cards);
      console.log(`[useDeck] Deck updated: ${deckIdString}, Cards count: ${cards.length}`);

      setDeck({
        id: deckIdString,
        ...data,
        cards
      });
      setIsCreator(true);
      setError(null);
      setLoading(false);

      // Keep the deck list's summary in step, and tidy up old inline media.
      saveDeckSummary(uid, deckIdString, data);
      moveInlineMediaOnce(uid, deckIdString, data.cards);
    }, handleListenError);

    if (usingSharedDeck && unsubscribePersonal) {
      unsubscribePersonal();
      unsubscribePersonal = null;
    }

    return () => {
      active = false;
      if (unsubscribePersonal) unsubscribePersonal();
      if (unsubscribeShared) unsubscribeShared();
    };
  }, [deckId, refreshKey, cloud, user?.uid]);

  const forkDeck = async (originalDeckId, newDeckName) => {
    if (!cloud) {
      try {
        const newId = await repo.forkDeck(originalDeckId, newDeckName);
        return newId;
      } catch (error) {
        console.error('Error forking local deck:', error);
        throw error;
      }
    }

    try {
      const originalDeckRef = ref(db, `decks/${originalDeckId}`);
      const originalDeckSnapshot = await get(originalDeckRef);

      if (!originalDeckSnapshot.exists()) {
        throw new Error("Original deck not found");
      }

      const originalDeckData = originalDeckSnapshot.val();
      const newDeckId = push(ref(db, `users/${auth.currentUser.uid}/decks`)).key;
      const newDeckRef = ref(db, `users/${auth.currentUser.uid}/decks/${newDeckId}`);

      const newDeckData = {
        ...originalDeckData,
        id: newDeckId,
        name: newDeckName,
        creatorId: auth.currentUser.uid,
        createdAt: new Date().toISOString(),
        isShared: false, //This is crucial for forked decks
        cards: {}
      };

      // Ensure forkedFrom has valid values
      if (newDeckData.forkedFrom) {
        newDeckData.forkedFrom = {
          id: originalDeckData.id || '',
          name: originalDeckData.name || 'Unknown Deck',
          creatorName: originalDeckData.creatorName || 'Unknown Creator'
        };
      }

      //Copy cards individually with new IDs and ensure proper structure
      for (const cardId in originalDeckData.cards) {
        const newCardId = push(ref(db, `users/${auth.currentUser.uid}/decks/${newDeckId}/cards`)).key;
        const cardData = originalDeckData.cards[cardId];
        
        // Create a fresh card object with the new ID and reset known status
        newDeckData.cards[newCardId] = {
          id: newCardId,
          front: cardData.front,
          back: cardData.back,
          isKnown: false, // Reset known status for the new owner
          lastReviewed: null,
          createdAt: new Date().toISOString()
        };
      }

      await set(newDeckRef, newDeckData);

      return newDeckId;
    } catch (error) {
      console.error("Error forking deck:", error);
      throw error; // Re-throw to be handled by calling function.
    }
  };

  const addCard = async (front, back, sampleSentence = '') => {
    if (!deckId) return null;

    if (!cloud) {
      try {
        const newId = await repo.addCard(String(deckId), { front, back, sampleSentence });
        // Refresh local state
        setRefreshKey(prev => prev + 1);
        return newId;
      } catch (error) {
        console.error('Error adding local card:', error);
        return null;
      }
    }

    if (!auth.currentUser || (deck?.isShared && !isCreator)) {
      return null;
    }

    try {
      const card = {
        front,
        back,
        sampleSentence,
        isKnown: false,
        lastReviewed: null,
        createdAt: new Date().toISOString()
      };

      // Always add to user's deck. The card shows up immediately (Firebase
      // applies the write locally); we don't wait for the server to confirm.
      const userCardsRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}/cards`);
      const newCardRef = push(userCardsRef);
      set(newCardRef, card).catch(logWriteError(`Saving card ${newCardRef.key}`));

      // If deck is shared, also add to public decks
      if (deck?.isShared) {
        const publicCardsRef = ref(db, `decks/${deckId}/cards/${newCardRef.key}`);
        set(publicCardsRef, card).catch(logWriteError('Saving public card'));
      }

      return newCardRef.key;
    } catch (error) {
      console.error('Error adding card:', error);
      return null;
    }
  };

  const deleteCard = async (cardId) => {
    if (!deckId || !cardId) {
      return false;
    }

    if (!cloud) {
      try {
        const ok = await repo.deleteCard(String(deckId), String(cardId));
        // Update local state immediately
        setDeck(prev => prev ? { ...prev, cards: prev.cards?.filter(c => c.id !== cardId) } : prev);
        return ok;
      } catch (error) {
        console.error('Error deleting local card:', error);
        return false;
      }
    }

    if (!auth.currentUser || (deck?.isShared && !isCreator)) {
      console.error('Cannot delete card: Invalid parameters or permissions', { 
        hasUser: !!auth.currentUser, 
        hasDeckId: !!deckId, 
        hasCardId: !!cardId, 
        isShared: deck?.isShared, 
        isCreator 
      });
      return false;
    }

    try {
      console.log('Deleting card:', cardId, 'from deck:', deckId);
      const dbCardId = deck?.cards?.find(c => c.id === cardId)?._dbId || cardId;

      // If this is a shared deck and the user is its creator, delete the
      // public copy of the card too
      if (deck?.isShared && isCreator) {
        const publicCardRef = ref(db, `decks/${deckId}/cards/${dbCardId}`);
        remove(publicCardRef).catch(logWriteError('Deleting public card'));
      }

      // Delete from the user's deck, together with the card's picture/audio
      update(ref(db, `users/${auth.currentUser.uid}`), {
        [`decks/${deckId}/cards/${dbCardId}`]: null,
        [`cardMedia/${deckId}/${dbCardId}`]: null,
      }).catch(logWriteError(`Deleting card ${dbCardId}`));

      // Manually update the state for web platform to ensure UI updates
      if (Platform.OS === 'web' && deck && deck.cards) {
        console.log('Web platform detected, manually updating state');
        const updatedCards = deck.cards.filter(card => card.id !== cardId);
        setDeck(prevDeck => ({
          ...prevDeck,
          cards: updatedCards
        }));
      }

      console.log('Card deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting card:', error);
      return false;
    }
  };

  const updateCard = async (cardId, updates) => {
    if (!deckId || !cardId) return false;

    if (!cloud) {
      try {
        const ok = await repo.updateCard(String(deckId), String(cardId), updates);
        if (ok) setRefreshKey(prev => prev + 1);
        return ok;
      } catch (error) {
        console.error('Error updating local card:', error);
        return false;
      }
    }

    if (!auth.currentUser || (deck?.isShared && !isCreator)) {
      return false;
    }

    try {
      const dbCardId = deck?.cards?.find(c => c.id === cardId)?._dbId || cardId;
      const cardRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}/cards/${dbCardId}`);
      // Only the changed fields (rewriting the whole card re-uploaded it)
      update(cardRef, updates).catch(logWriteError(`Updating card ${dbCardId}`));
      console.log(`Card updated: ${cardId}, Deck: ${deckId}`);
      return true;
    } catch (error) {
      console.error('Error updating card:', error);
      return false;
    }
  };

  const updateCardStatus = async (cardId, isKnown) => {
    if (!deckId || !cardId) {
      console.log(`[updateCardStatus] Missing required data:`, { 
        deckId, 
        cardId 
      });
      return false;
    }

    if (!cloud) {
      try {
        const ok = await repo.updateCardStatus(String(deckId), String(cardId), isKnown);
        if (ok) setRefreshKey(prev => prev + 1);
        return ok;
      } catch (error) {
        console.error('Error updating local card status:', error);
        return false;
      }
    }

    if (!auth.currentUser) {
      return false;
    }

    try {
      console.log(`[updateCardStatus] Updating card status: Card ID: ${cardId}, Deck: ${deckId}, Known: ${isKnown}`);
      
      // Find the card in the deck's cards array to get the database ID (_dbId)
      const cardInDeck = deck?.cards?.find(c => c.id === cardId);
      
      // Use the database ID stored in _dbId if available, otherwise fall back to the provided ID
      const dbCardId = cardInDeck?._dbId || cardId;
      
      console.log(`[updateCardStatus] Using database card ID: ${dbCardId} (original card ID: ${cardId})`);

      // Always use the user-specific path for card status updates
      const userCardRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}/cards/${dbCardId}`);

      // The user's own deck (the usual case): write just the two changed
      // fields and don't wait for the server, so studying never stalls.
      // (This used to re-upload the whole card, embedded media included.)
      if (sourceRef.current === 'personal' && cardInDeck) {
        update(userCardRef, {
          isKnown,
          lastReviewed: new Date().toISOString()
        }).catch(logWriteError(`Updating card ${dbCardId}`));
        return true;
      }

      console.log(`[updateCardStatus] Checking user card path: users/${auth.currentUser.uid}/decks/${deckId}/cards/${dbCardId}`);
      
      const userCardSnapshot = await get(userCardRef);

      if (userCardSnapshot.exists()) {
        console.log(`[updateCardStatus] Found card in user's deck, updating status`);
        const cardData = userCardSnapshot.val();
        await set(userCardRef, {
          ...cardData,
          isKnown,
          lastReviewed: new Date().toISOString()
        });
        console.log(`[updateCardStatus] Successfully updated card: ${dbCardId}`);
        return true;
      } else {
        // For cards from shared decks, create a user-specific copy
        console.log(`[updateCardStatus] Card not found in user's deck, checking shared deck`);
        const sharedCardRef = ref(db, `decks/${deckId}/cards/${dbCardId}`);
        const sharedCardSnapshot = await get(sharedCardRef);

        if (sharedCardSnapshot.exists()) {
          console.log(`[updateCardStatus] Found card in shared deck, creating user copy`);
          const cardData = sharedCardSnapshot.val();
          // Create a user-specific copy of this card with updated status
          await set(userCardRef, {
            ...cardData,
            isKnown,
            lastReviewed: new Date().toISOString()
          });
          console.log(`[updateCardStatus] Created user copy with updated status`);
          return true;
        }
        
        // If still not found, try checking if there's a mapping issue
        console.log(`[updateCardStatus] Card not found in either location, checking if deck has the card in its cards array`);
        if (cardInDeck) {
          console.log(`[updateCardStatus] Card found in deck's cards array but not in database. Creating new entry.`);
          
          // Create a new card entry
          await set(userCardRef, {
            front: cardInDeck.front || "Unknown front",
            back: cardInDeck.back || "Unknown back",
            isKnown,
            lastReviewed: new Date().toISOString(),
            createdAt: cardInDeck.createdAt || new Date().toISOString()
          });
          
          console.log(`[updateCardStatus] Created new card entry with ID: ${dbCardId}`);
          return true;
        }
      }

      console.log(`[updateCardStatus] Card not found for status update: ${cardId}, Database ID: ${dbCardId}, Deck: ${deckId}`);
      return false;
    } catch (error) {
      console.error('Error updating card status:', error);
      return false;
    }
  };

  return {
    deck,
    loading,
    isCreator,
    error,
    addCard,
    deleteCard,
    updateCard,
    updateCardStatus,
    refreshDeck,
    forkDeck
  };
}
