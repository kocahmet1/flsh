import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, push, set, update, remove, get, query, orderByChild, equalTo } from 'firebase/database';
import { db, auth } from '../firebase/config';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeckRepository, isCloudEnabled } from '../repositories';
import { AUTO_FORK_ENABLED } from '../constants/FeatureFlags';

export function useDecks() {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // Add a refresh key to force re-fetching
  const cloud = isCloudEnabled();
  const repo = getDeckRepository();

  // --- Default deck seeding helpers ---
  const DEFAULT_SEED_FLAG = 'defaults_seeded_v1';

  const defaultDeckSpecs = [
    {
      name: 'SAT Vocab List 1',
      cards: [
        { front: 'abate', back: 'to become less intense or widespread', sampleSentence: 'The storm began to abate after midnight.' },
        { front: 'aberrant', back: 'deviating from the norm', sampleSentence: 'The scientist noted an aberrant result in the data.' },
        { front: 'abhor', back: 'to regard with disgust; to hate', sampleSentence: 'He abhors cruelty of any kind.' },
        { front: 'abjure', back: 'to renounce formally', sampleSentence: 'She abjured her previous beliefs.' },
        { front: 'abrogate', back: 'to abolish or annul by authority', sampleSentence: 'The law was abrogated by the new administration.' },
      ],
    },
  ];

  const ensureLocalDefaultsSeeded = async () => {
    try {
      const seeded = await AsyncStorage.getItem(DEFAULT_SEED_FLAG);
      if (seeded === 'true') return;

      const current = await repo.getAllDecks();
      if ((current?.length || 0) > 0) {
        await AsyncStorage.setItem(DEFAULT_SEED_FLAG, 'true');
        return;
      }

      // Create default decks and seed sample cards
      for (const spec of defaultDeckSpecs) {
        const newDeck = await repo.createDeck(spec.name);
        if (newDeck?.id && Array.isArray(spec.cards)) {
          for (const card of spec.cards) {
            await repo.addCard(newDeck.id, card);
          }
        }
      }

      await AsyncStorage.setItem(DEFAULT_SEED_FLAG, 'true');
    } catch (e) {
      // Non-fatal; continue without defaults
      console.warn('ensureLocalDefaultsSeeded error:', e?.message || e);
    }
  };

  const ensureCloudDefaultsSeeded = async () => {
    if (!auth.currentUser) return;
    try {
      const prefsRef = ref(db, `users/${auth.currentUser.uid}/preferences`);
      const prefsSnap = await get(prefsRef);
      const prefs = prefsSnap.exists() ? prefsSnap.val() : {};
      if (prefs.seededDefaultsV1 === true) return;

      // Check if user has any decks already
      const userDecksRef = ref(db, `users/${auth.currentUser.uid}/decks`);
      const decksSnap = await get(userDecksRef);
      const hasDecks = decksSnap.exists() && Object.keys(decksSnap.val() || {}).length > 0;
      if (hasDecks) {
        await update(prefsRef, { seededDefaultsV1: true });
        return;
      }

      // Seed both default decks with a few sample cards
      for (const spec of defaultDeckSpecs) {
        const newDeckRef = push(userDecksRef);
        const newDeckId = newDeckRef.key;
        const cardsObj = {};
        if (Array.isArray(spec.cards)) {
          spec.cards.forEach((card, idx) => {
            const cardId = `card_${idx}`;
            cardsObj[cardId] = {
              id: cardId,
              front: card.front,
              back: card.back,
              sampleSentence: card.sampleSentence || '',
              isKnown: false,
              lastReviewed: null,
              createdAt: new Date().toISOString(),
            };
          });
        }

        const newDeck = {
          id: newDeckId,
          name: spec.name,
          createdAt: new Date().toISOString(),
          creatorId: auth.currentUser.uid,
          creatorName: auth.currentUser.displayName || auth.currentUser.email || 'User',
          isShared: false,
          cards: cardsObj,
        };

        await set(newDeckRef, newDeck);
      }

      await update(prefsRef, { seededDefaultsV1: true });
    } catch (e) {
      console.warn('ensureCloudDefaultsSeeded error:', e?.message || e);
    }
  };

  // Function to force refresh the decks data
  const refreshDecks = () => {
    console.log("Forcing refresh of decks data");
    setRefreshKey(prevKey => prevKey + 1);
  };

  // Function to check and auto-fork decks
  const checkAndAutoForkDecks = useCallback(async () => {
    if (!auth.currentUser) return;

    try {
      // Get shared decks that are marked for auto-forking
      const sharedDecksRef = ref(db, 'sharedDecks');
      const sharedDecksSnapshot = await get(sharedDecksRef);

      if (!sharedDecksSnapshot.exists()) {
        return;
      }

      // Get user's preferences to check for deleted decks
      const userPrefsRef = ref(db, `users/${auth.currentUser.uid}/preferences`);
      const userPrefsSnapshot = await get(userPrefsRef);
      const userPrefs = userPrefsSnapshot.exists() ? userPrefsSnapshot.val() : {};
      const deletedAutoForkedDecks = userPrefs.deletedAutoForkedDecks || [];

      // Get user's current decks
      const userDecksRef = ref(db, `users/${auth.currentUser.uid}/decks`);
      const userDecksSnapshot = await get(userDecksRef);
      const userDecks = userDecksSnapshot.exists() ? userDecksSnapshot.val() : {};

      // Process decks to auto-fork and to remove (if marked as removedFromAutoFork)
      const decksToFork = [];
      const decksToRemove = [];

      sharedDecksSnapshot.forEach((deckSnapshot) => {
        const deckId = deckSnapshot.key;
        const deckData = deckSnapshot.val();

        // Check if this deck is marked for removal from auto-fork
        if (deckData.removedFromAutoFork === true) {
          // Find any existing copies of this deck in user's collection to remove
          Object.entries(userDecks).forEach(([userDeckId, userDeckData]) => {
            if (
              userDeckData.autoForked === true &&
              userDeckData.forkedFrom &&
              userDeckData.forkedFrom.id === deckId
            ) {
              decksToRemove.push(userDeckId);
            }
          });

          // Add to deletedAutoForkedDecks if not already there
          if (!deletedAutoForkedDecks.includes(deckId)) {
            deletedAutoForkedDecks.push(deckId);
          }
        }
        // Check if this deck should be auto-forked and hasn't been deleted by user
        else if (
          deckData.autoForkForAll === true &&
          !deletedAutoForkedDecks.includes(deckId)
        ) {
          // Check if user already has this deck or a forked version
          let alreadyHasDeck = false;

          Object.values(userDecks).forEach((userDeck) => {
            if (
              userDeck.id === deckId ||
              (userDeck.forkedFrom && userDeck.forkedFrom.id === deckId)
            ) {
              alreadyHasDeck = true;
            }
          });

          if (!alreadyHasDeck) {
            decksToFork.push({
              id: deckId,
              ...deckData
            });
          }
        }
      });

      // Handle decks that need to be removed
      const removePromises = decksToRemove.map(deckId => {
        console.log(`Removing auto-forked deck ${deckId} that was marked for removal`);
        const deckRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}`);
        return remove(deckRef);
      });

      // Handle decks that need to be auto-forked
      const forkPromises = decksToFork.map((deckToFork) => {
        return forkDeck(deckToFork, true); // Second param indicates this is an auto-fork
      });

      // Update user preferences with deleted decks list
      if (deletedAutoForkedDecks.length > 0) {
        await update(userPrefsRef, { deletedAutoForkedDecks });
      }

      // Execute all operations
      if (removePromises.length > 0 || forkPromises.length > 0) {
        await Promise.all([...removePromises, ...forkPromises]);

        // Refresh decks after changes
        setRefreshKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error checking for auto-fork decks:', error);
    }
  }, [auth.currentUser?.uid]);

  useEffect(() => {
    console.log(`useDecks hook - refreshKey: ${refreshKey} - cloud: ${cloud}`);

    // Offline-first branch (no auth required)
    if (!cloud) {
      let cancelled = false;
      const load = async () => {
        try {
          setLoading(true);
          // Seed default decks on first run if needed (local mode)
          await ensureLocalDefaultsSeeded();
          const data = await repo.getAllDecks();
          if (!cancelled) {
            setDecks(data);
            setError(null);
          }
        } catch (e) {
          console.error('Error loading local decks:', e);
          if (!cancelled) {
            setDecks([]);
            setError('Error loading decks');
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      load();
      return () => {
        cancelled = true;
      };
    }

    // Cloud branch (Firebase)
    console.log(`useDecks hook - auth.currentUser:`, auth.currentUser ? auth.currentUser.uid : "No user");

    if (!auth.currentUser) {
      console.log("useDecks: No current user, returning empty decks");
      setDecks([]);
      setLoading(false);
      return;
    }

    // Check for auto-fork decks first (guarded by feature flag)
    if (AUTO_FORK_ENABLED) {
      checkAndAutoForkDecks();
    }
    let unsubscribe;
    let cancelled = false;
    (async () => {
      try {
        // Seed default decks on first run if needed (cloud mode)
        await ensureCloudDefaultsSeeded();

        if (cancelled) return;
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
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [cloud, auth.currentUser?.uid, refreshKey]); // Re-run when mode/user/refreshKey changes

  const createDeck = async (name, isShared = false) => {
    if (!cloud) {
      try {
        const deck = await repo.createDeck(name);
        // Refresh local state
        const data = await repo.getAllDecks();
        setDecks(data);
        return deck;
      } catch (error) {
        console.error('Error creating local deck:', error);
        throw error;
      }
    }

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

  // Backward-compatible helper used by some screens
  const addDeck = async (name) => {
    const deck = await createDeck(name);
    return deck?.id;
  };

  const deleteDeck = async (deckId) => {
    if (!cloud) {
      try {
        const ok = await repo.deleteDeck(deckId);
        const data = await repo.getAllDecks();
        setDecks(data);
        return ok;
      } catch (error) {
        console.error('Error deleting local deck:', error);
        throw error;
      }
    }

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

        // If this is an autoforked deck, track it in user preferences to prevent re-adding
        if (deckData.autoForked === true && deckData.forkedFrom && deckData.forkedFrom.id) {
          console.log("This is an autoforked deck - marking as explicitly deleted");

          // Get the original deck ID from forkedFrom
          const originalDeckId = deckData.forkedFrom.id;

          // Add to list of explicitly deleted autoforked decks
          const userPrefsRef = ref(db, `users/${auth.currentUser.uid}/preferences`);
          const userPrefsSnapshot = await get(userPrefsRef);
          const userPrefs = userPrefsSnapshot.exists() ? userPrefsSnapshot.val() : {};

          // Initialize or update the list of deleted autoforked decks
          const deletedAutoForkedDecks = userPrefs.deletedAutoForkedDecks || [];
          if (!deletedAutoForkedDecks.includes(originalDeckId)) {
            deletedAutoForkedDecks.push(originalDeckId);
          }

          // Update user preferences
          await update(userPrefsRef, { deletedAutoForkedDecks });

          // If admin deletes an autoforked deck, also turn off autoforking for all if admin
          if (isAdmin() && deckData.forkedFrom && deckData.forkedFrom.id) {
            const sharedDeckRef = ref(db, `sharedDecks/${deckData.forkedFrom.id}`);
            const sharedDeckSnapshot = await get(sharedDeckRef);

            if (sharedDeckSnapshot.exists()) {
              // Turn off autoforking
              await update(sharedDeckRef, {
                autoForkForAll: false
              });

              console.log(`Admin deleted autoforked deck - turned off autoforking for ${deckData.forkedFrom.id}`);
            }
          }
        }

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
    if (!cloud) {
      // Not supported in local mode
      return false;
    }

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
                const { ownerEmail: _omitOwnerEmail, ...safeDeck } = deckData || {};
                await set(sharedDeckRef, {
                  ...safeDeck,
                  owner: auth.currentUser.uid,
                  creatorName: 'Admin',
                  isShared: true,
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

  // Function to check if user is admin
  const isAdmin = () => {
    return auth.currentUser && (
      auth.currentUser.email === 'ahmetkoc1@gmail.com'
    );
  };

  // Add this function for handling auto-forking
  const forkDeck = async (sourceDeck, isAutoForked = false) => {
    if (!cloud) {
      // Not supported in local mode
      return null;
    }

    if (!auth.currentUser) return null;

    try {
      // Check if this is a deck that was marked for removal
      if (isAutoForked && sourceDeck.removedFromAutoFork === true) {
        console.log(`Skipping auto-fork for deck ${sourceDeck.id} as it was marked for removal`);
        return null;
      }

      // Check user preferences to see if this deck was explicitly deleted
      const userPrefsRef = ref(db, `users/${auth.currentUser.uid}/preferences`);
      const userPrefsSnapshot = await get(userPrefsRef);
      const userPrefs = userPrefsSnapshot.exists() ? userPrefsSnapshot.val() : {};
      const deletedAutoForkedDecks = userPrefs.deletedAutoForkedDecks || [];

      // Skip if user has explicitly deleted this deck
      if (isAutoForked && deletedAutoForkedDecks.includes(sourceDeck.id)) {
        console.log(`Skipping auto-fork for deck ${sourceDeck.id} as user has explicitly deleted it`);
        return null;
      }

      // Create a new deck reference
      const newDeckRef = push(ref(db, `users/${auth.currentUser.uid}/decks`));
      const newDeckId = newDeckRef.key;

      // Prepare the new deck object
      const newDeck = {
        ...sourceDeck,
        id: newDeckId,
        name: sourceDeck.name || 'Deck',
        creatorId: auth.currentUser.uid,
        creatorName: auth.currentUser.displayName || auth.currentUser.email || 'User',
        isShared: false,
        forkedFrom: {
          id: sourceDeck.id || '',
          name: sourceDeck.name || 'Unknown Deck',
          creatorName: sourceDeck.creatorName || 'Unknown Creator'
        },
        autoForked: isAutoForked
      };

      // Handle cards properly whether they're an array or object
      if (sourceDeck.cards) {
        newDeck.cards = {};
        // Handle both array and object formats
        if (Array.isArray(sourceDeck.cards)) {
          sourceDeck.cards.forEach((card, index) => {
            newDeck.cards[`card_${index}`] = card;
          });
        } else {
          newDeck.cards = { ...sourceDeck.cards };
        }
      }

      // Save the new forked deck
      await set(newDeckRef, newDeck);
      console.log(`Deck forked successfully. New ID: ${newDeckId}`);

      // Return the new deck ID
      return newDeckId;
    } catch (error) {
      console.error("Error forking deck:", error);
      return null;
    }
  };

  return { decks, loading, error, createDeck, addDeck, deleteDeck, shareDeck, refreshDecks };
}