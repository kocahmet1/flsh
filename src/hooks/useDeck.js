import { useState, useEffect } from 'react';
import { ref, onValue, push, set, remove, get, onDisconnect } from 'firebase/database';
import { auth, db } from '../firebase/config';
import { Platform } from 'react-native';

export function useDeck(deckId) {
  const [deck, setDeck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Function to manually refresh deck data
  const refreshDeck = () => {
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    console.log(`[useDeck] Loading deck with ID: ${deckId}, type: ${typeof deckId}`);

    if (!auth.currentUser) {
      console.log("[useDeck] No authenticated user");
      setDeck(null);
      setLoading(false);
      setError("You must be logged in to view this deck");
      return;
    }

    if (!deckId) {
      console.log("[useDeck] No deck ID provided");
      setDeck(null);
      setLoading(false);
      setError("No deck ID provided");
      return;
    }

    // Ensure deckId is a string
    const deckIdString = String(deckId);
    console.log(`[useDeck] Normalized deck ID: ${deckIdString}`);

    let unsubscribe = () => {};

    const loadDeck = async () => {
      try {
        // First try to get from user's personal decks
        const userDeckRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckIdString}`);
        console.log(`[useDeck] Checking user's personal decks at: users/${auth.currentUser.uid}/decks/${deckIdString}`);

        const userDeckSnapshot = await get(userDeckRef);

        if (userDeckSnapshot.exists()) {
          console.log(`[useDeck] Found deck in user's personal decks`);
          // Set up real-time listener for personal deck
          unsubscribe = onValue(userDeckRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
              // Log card data to help debug
              console.log(`[useDeck] Raw card data for debugging:`, 
                data.cards ? Object.keys(data.cards).length : 0, 
                'cards found');
              
              const cards = data.cards ? Object.entries(data.cards).map(([id, card]) => {
                // Make sure every card has the ID property set
                return {
                  id, // This is the key ID from the database
                  ...card,
                  _dbId: id // Store the original database ID to use for updates
                };
              }).sort((a, b) => {
                // Sort by createdAt in descending order (newest first)
                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
              }) : [];

              console.log(`[useDeck] Deck updated: ${deckIdString}, Cards count: ${cards.length}`);

              setDeck({
                id: deckIdString,
                ...data,
                cards
              });
              setIsCreator(true);
              setError(null);
            } else {
              console.log(`[useDeck] Deck data is null or empty`);
              setDeck(null);
              setIsCreator(false);
              setError("Deck not found");
            }
            setLoading(false);
          });
        } else {
          // If not found in personal decks, check shared decks
          const sharedDeckRef = ref(db, `decks/${deckIdString}`);
          console.log(`[useDeck] Checking shared decks at: decks/${deckIdString}`);
          const sharedDeckSnapshot = await get(sharedDeckRef);

          if (sharedDeckSnapshot.exists()) {
            console.log(`[useDeck] Found deck in shared decks`);
            // Set up real-time listener for shared deck
            unsubscribe = onValue(sharedDeckRef, (snapshot) => {
              const data = snapshot.val();
              if (data) {
                const cards = data.cards ? Object.entries(data.cards).map(([id, card]) => ({
                  id, // Key ID from database
                  ...card,
                  _dbId: id // Store original database ID
                })).sort((a, b) => {
                  // Sort by createdAt in descending order (newest first)
                  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                }) : [];

                const deckData = {
                  id: deckIdString,
                  ...data,
                  cards,
                  isShared: true
                };

                console.log(`[useDeck] Deck updated: ${deckIdString}, Cards count: ${cards.length}`);

                setDeck(deckData);
                setIsCreator(data.creatorId === auth.currentUser.uid);
                setError(null);
              } else {
                console.log(`[useDeck] Deck data is null or empty`);
                setDeck(null);
                setIsCreator(false);
                setError("Deck not found");
              }
              setLoading(false);
            });
          } else {
            // Deck not found in either location
            console.log(`[useDeck] Deck not found in either location`);
            setDeck(null);
            setIsCreator(false);
            setError("Deck not found");
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error loading deck:', error);
        setDeck(null);
        setIsCreator(false);
        setError("Error loading deck");
        setLoading(false);
      }
    };

    loadDeck();
    return () => unsubscribe();
  }, [deckId, refreshKey]);

  const forkDeck = async (originalDeckId, newDeckName) => {
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
    if (!auth.currentUser || !deckId || (deck?.isShared && !isCreator)) {
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

      // Always add to user's deck
      const userCardsRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}/cards`);
      const newCardRef = push(userCardsRef);
      await set(newCardRef, card);

      // If deck is shared, also add to public decks
      if (deck.isShared) {
        const publicCardsRef = ref(db, `decks/${deckId}/cards/${newCardRef.key}`);
        await set(publicCardsRef, card);
      }

      return newCardRef.key;
    } catch (error) {
      console.error('Error adding card:', error);
      return null;
    }
  };

  const deleteCard = async (cardId) => {
    if (!auth.currentUser || !deckId || !cardId || (deck?.isShared && !isCreator)) {
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

      // Check if this is a shared deck
      if (deck.isShared) {
        // If user is creator, delete from public deck
        if (isCreator) {
          const publicCardRef = ref(db, `decks/${deckId}/cards/${cardId}`);
          console.log('Deleting from public path:', publicCardRef.toString());
          await remove(publicCardRef);
        }

        // Always update user's personal copy of the deck
        const userCardRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}/cards/${cardId}`);
        console.log('Deleting from user path:', userCardRef.toString());
        await remove(userCardRef);
      } else {
        // For personal decks, just delete from user's deck
        const userCardRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}/cards/${cardId}`);
        console.log('Deleting from user path:', userCardRef.toString());
        await remove(userCardRef);
      }

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
    if (!auth.currentUser || !deckId || !cardId || (deck?.isShared && !isCreator)) {
      return false;
    }

    try {
      const cardRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}/cards/${cardId}`);
      await set(cardRef, { ...(deck.cards.find(c => c.id === cardId) || {}), ...updates });
      console.log(`Card updated: ${cardId}, Deck: ${deckId}`);
      return true;
    } catch (error) {
      console.error('Error updating card:', error);
      return false;
    }
  };

  const updateCardStatus = async (cardId, isKnown) => {
    if (!auth.currentUser || !deckId || !cardId) {
      console.log(`[updateCardStatus] Missing required data:`, { 
        hasUser: !!auth.currentUser, 
        deckId, 
        cardId 
      });
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