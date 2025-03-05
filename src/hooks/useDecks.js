import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, push, set, update, remove, get, query, orderByChild, equalTo } from 'firebase/database';
import { db, auth } from '../firebase/config';
import { Platform } from 'react-native';

export function useDecks() {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // Add a refresh key to force re-fetching

  // Function to force refresh the decks data
  const refreshDecks = () => {
    console.log("Forcing refresh of decks data");
    setRefreshKey(prevKey => prevKey + 1);
  };

  const checkAndAutoForkDecks = useCallback(async () => {
    if (!auth.currentUser) return;

    try {
      // Check if user has a flag indicating they've received auto-forked decks
      const userPrefsRef = ref(db, `users/${auth.currentUser.uid}/preferences`);
      const userPrefsSnapshot = await get(userPrefsRef);
      const userPrefs = userPrefsSnapshot.exists() ? userPrefsSnapshot.val() : {};

      if (userPrefs.autoForkedComplete) {
        return; // User already has auto-forked decks
      }

      // Get all decks marked for auto-forking
      const autoForkDecksRef = ref(db, 'sharedDecks');
      const autoForkDecksQuery = query(autoForkDecksRef, orderByChild('autoForkForAll'), equalTo(true));
      const autoForkSnapshot = await get(autoForkDecksQuery);

      if (!autoForkSnapshot.exists()) {
        // Mark as complete even if no decks to fork
        await update(userPrefsRef, { autoForkedComplete: true });
        return;
      }

      // Fork each deck marked for auto-forking
      const autoForkDecks = [];
      autoForkSnapshot.forEach(childSnapshot => {
        autoForkDecks.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });

      console.log(`Auto-forking ${autoForkDecks.length} decks for user`);

      // Also check for globally auto-forked decks from sharedDecks
      try {
        const sharedDecksRef = ref(db, 'sharedDecks');
        const sharedDecksSnapshot = await get(sharedDecksRef);
        
        if (sharedDecksSnapshot.exists()) {
          sharedDecksSnapshot.forEach(childSnapshot => {
            const sharedDeck = {
              id: childSnapshot.key,
              ...childSnapshot.val()
            };
            
            // Add to auto-fork list if marked for all users
            if (sharedDeck.autoForkForAll === true) {
              // Check if user already has this deck (by original ID)
              const alreadyInList = autoForkDecks.some(d => d.id === sharedDeck.id);
              if (!alreadyInList) {
                autoForkDecks.push(sharedDeck);
              }
            }
          });
        }
      } catch (error) {
        console.error("Error checking shared decks for auto-forking:", error);
      }

      // Use the forkDeck function (similar to the one in useDeck.js)
      for (const deckToFork of autoForkDecks) {
        try {
          const newDeckRef = push(ref(db, `users/${auth.currentUser.uid}/decks`));
          const newDeckId = newDeckRef.key;

          const newDeck = {
            ...deckToFork,
            id: newDeckId,
            name: `${deckToFork.name || 'Deck'} (Auto-Forked)`,
            creatorId: auth.currentUser.uid,
            creatorName: auth.currentUser.displayName || auth.currentUser.email || 'User',
            isShared: false,
            forkedFrom: {
              id: deckToFork.id || '',
              name: deckToFork.name || 'Unknown Deck',
              creatorName: deckToFork.creatorName || 'Unknown Creator'
            },
            autoForked: true
          };

          // Handle cards properly whether they're an array or object
          if (deckToFork.cards) {
            newDeck.cards = {};
            // Handle both array and object formats
            if (Array.isArray(deckToFork.cards)) {
              deckToFork.cards.forEach((card, index) => {
                newDeck.cards[`card_${index}`] = card;
              });
            } else {
              newDeck.cards = { ...deckToFork.cards };
            }
          }

          await set(newDeckRef, newDeck);
        } catch (error) {
          console.error("Error auto-forking deck:", error);
        }
      }

      // Mark auto-forking as complete for this user
      await update(userPrefsRef, { autoForkedComplete: true });

      console.log('Auto-forking complete');
      // Force a refresh of decks
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error auto-forking decks:', error);
    }
  }, []);

  useEffect(() => {
    console.log(`useDecks hook - refreshKey: ${refreshKey} - auth.currentUser:`, auth.currentUser ? auth.currentUser.uid : "No user");

    if (!auth.currentUser) {
      console.log("useDecks: No current user, returning empty decks");
      setDecks([]);
      setLoading(false);
      return;
    }

    // Check for auto-fork decks first
    checkAndAutoForkDecks();

    let unsubscribe;
    try {
      const userDecksRef = ref(db, `users/${auth.currentUser.uid}/decks`);
      console.log("Fetching decks from:", `users/${auth.currentUser.uid}/decks`);

      unsubscribe = onValue(userDecksRef, (snapshot) => {
        try {
          const data = snapshot.val();
          console.log("Decks data received:", data ? "Data exists" : "No data");

          if (data) {
            const decksArray = Object.entries(data).map(([id, deck]) => ({
              id,
              ...deck,
            }));
            console.log(`Found ${decksArray.length} decks`);
            setDecks(decksArray);
          } else {
            console.log("No decks found, setting empty array");
            setDecks([]);
          }
          setError(null);
        } catch (err) {
          console.error('Error processing decks data:', err);
          setError('Error loading decks');
          setDecks([]);
        } finally {
          setLoading(false);
        }
      }, (error) => {
        console.error('Error loading decks:', error);
        setError('Error loading decks');
        setDecks([]);
        setLoading(false);
      });
    } catch (error) {
      console.error('Error setting up decks listener:', error);
      setError('Error loading decks');
      setDecks([]);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [auth.currentUser?.uid, refreshKey, checkAndAutoForkDecks]); // Re-run when user ID changes or refreshKey changes

  const createDeck = async (name, isShared = false) => {
    if (!auth.currentUser) {
      console.error("Cannot create deck: No authenticated user");
      throw new Error('You must be logged in to create a deck');
    }

    try {
      console.log(`Creating deck: "${name}", isShared: ${isShared}`);

      const userDecksRef = ref(db, `users/${auth.currentUser.uid}/decks`);
      const newDeckRef = push(userDecksRef);
      const newDeckId = newDeckRef.key;

      const newDeck = {
        id: newDeckId,
        name,
        createdAt: new Date().toISOString(),
        creatorId: auth.currentUser.uid,
        isShared: isShared === true, // Ensure boolean
        cards: [],
      };

      console.log(`Setting deck with ID: ${newDeckId}`, newDeck);
      await set(newDeckRef, newDeck);
      console.log("Deck created successfully:", newDeckId);

      return {
        id: newDeckId,
        ...newDeck,
      };
    } catch (error) {
      console.error('Error creating deck:', error);
      throw error;
    }
  };

  const deleteDeck = async (deckId) => {
    if (!auth.currentUser) {
      console.error("Cannot delete deck: No authenticated user");
      throw new Error('You must be logged in to delete a deck');
    }

    try {
      console.log("Attempting to delete deck:", deckId);

      // First check if this deck is shared
      const userDeckRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}`);
      const userDeckSnapshot = await get(userDeckRef);

      if (userDeckSnapshot.exists()) {
        const deckData = userDeckSnapshot.val();

        // If deck is shared and user is creator, also delete from public decks
        if (deckData.isShared) {
          console.log("Deck is shared, checking if user is creator");

          if (deckData.creatorId === auth.currentUser.uid) {
            console.log("User is creator, deleting from public decks");
            const publicDeckRef = ref(db, `decks/${deckId}`);
            await remove(publicDeckRef);
          }
        }

        // Always delete from user's decks
        console.log("Deleting deck from user's decks");
        await remove(userDeckRef);

        if (Platform.OS === 'web') {
          // Manually update state on web platform
          setDecks(decks.filter(deck => deck.id !== deckId));
        }

        console.log("Deck deleted successfully:", deckId);

        return true;
      } else {
        console.error("Deck not found in user's decks");
        return false;
      }
    } catch (error) {
      console.error('Error deleting deck:', error);
      throw error;
    }
  };

  const shareDeck = async (deckId, isShared = undefined) => {
    if (!auth.currentUser) {
      console.error("Cannot share deck: No authenticated user");
      throw new Error('You must be logged in to share a deck');
    }

    try {
      // First, get the deck data
      const userDeckRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}`);

      // Create a new listener just for this operation
      return new Promise((resolve, reject) => {
        onValue(userDeckRef, async (snapshot) => {
          try {
            const deckData = snapshot.val();
            if (!deckData) {
              throw new Error('Deck not found');
            }

            // If isShared is not provided, toggle the current value or default to true
            const currentIsShared = deckData.isShared || false;
            const newIsShared = isShared !== undefined ? isShared : !currentIsShared;

            // Update the isShared flag in user's deck
            const userDeckShareRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}/isShared`);
            await set(userDeckShareRef, newIsShared);

            if (newIsShared) {
              // If sharing, copy to public decks
              const publicDeckRef = ref(db, `decks/${deckId}`);
              await set(publicDeckRef, {
                ...deckData,
                isShared: true,
                owner: auth.currentUser.uid,
                ownerEmail: auth.currentUser.email,
              });
              
              // If admin, also copy to sharedDecks for potential auto-forking
              if (auth.currentUser.email === 'ahmetkoc1@gmail.com') {
                const sharedDeckRef = ref(db, `sharedDecks/${deckId}`);
                await set(sharedDeckRef, {
                  ...deckData,
                  isShared: true,
                  owner: auth.currentUser.uid,
                  ownerEmail: auth.currentUser.email,
                  autoForkForAll: deckData.autoForkForAll || false
                });
              }
              
              console.log("Deck shared successfully:", deckId);
            } else {
              // If unsharing, remove from public decks
              const publicDeckRef = ref(db, `decks/${deckId}`);
              await remove(publicDeckRef);
              
              // If admin, also remove from sharedDecks
              if (auth.currentUser.email === 'ahmetkoc1@gmail.com') {
                const sharedDeckRef = ref(db, `sharedDecks/${deckId}`);
                await remove(sharedDeckRef);
              }
              
              console.log("Deck unshared successfully:", deckId);
            }

            resolve(true);
          } catch (error) {
            console.error('Error in share deck operation:', error);
            reject(error);
          }
        }, { onlyOnce: true });
      });
    } catch (error) {
      console.error('Error sharing deck:', error);
      throw error;
    }
  };

  return { decks, loading, error, createDeck, deleteDeck, shareDeck, refreshDecks };
}