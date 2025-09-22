// @ts-nocheck
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { ref, onValue, get, push, set } from 'firebase/database';
import { auth, db } from '../../src/firebase/config';
import { useApp } from '../../src/context/AppContext';

export default function SetGallery() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { theme } = useApp();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);

  useEffect(() => {
    // Public shared gallery reads from sharedDecks
    const setsRef = ref(db, 'sharedDecks');
    const unsubscribe = onValue(setsRef, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          const setsArray = Object.entries(data)
            .map(([id, set]) => ({
              id,
              ...set,
            }))
            .filter(set => set.isShared); // Only show shared sets

          setSets(setsArray);
        } else {
          setSets([]);
        }
        setError(null);
      } catch (err) {
        console.error('Error processing sets data:', err);
        setError('Error loading sets');
        setSets([]);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error('Error loading sets:', error);
      setError('Error loading sets');
      setSets([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleImport = useCallback(async (item) => {
    try {
      if (!auth.currentUser) {
        Alert.alert('Sign in required', 'Please sign in to import this set into your library.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/login') }
        ]);
        return;
      }

      // Fetch latest deck data from sharedDecks to ensure we import current version
      const sharedRef = ref(db, `sharedDecks/${item.id}`);
      const snap = await get(sharedRef);
      if (!snap.exists()) {
        Alert.alert('Not found', 'This set is no longer available.');
        return;
      }

      const deckData = snap.val() || {};
      // Create a new deck under the user's collection
      const newDeckRef = push(ref(db, `users/${auth.currentUser.uid}/decks`));
      const newDeckId = newDeckRef.key;

      // Prepare deep-copied cards with fresh IDs and reset progress
      const cardsOut = {};
      if (deckData.cards) {
        if (Array.isArray(deckData.cards)) {
          deckData.cards.forEach((card, idx) => {
            const cid = `card_${idx}_${Date.now()}`;
            cardsOut[cid] = {
              id: cid,
              front: card.front,
              back: card.back,
              sampleSentence: card.sampleSentence || '',
              isKnown: false,
              lastReviewed: null,
              createdAt: new Date().toISOString(),
            };
          });
        } else {
          Object.entries(deckData.cards).forEach(([cidOld, card]) => {
            const cid = `${cidOld}_${Date.now()}`;
            cardsOut[cid] = {
              id: cid,
              front: card.front,
              back: card.back,
              sampleSentence: card.sampleSentence || '',
              isKnown: false,
              lastReviewed: null,
              createdAt: new Date().toISOString(),
            };
          });
        }
      }

      const newDeck = {
        id: newDeckId,
        name: deckData.name || 'Imported Set',
        createdAt: new Date().toISOString(),
        creatorId: auth.currentUser.uid,
        creatorName: auth.currentUser.displayName || auth.currentUser.email || 'User',
        isShared: false,
        forkedFrom: {
          id: item.id,
          name: deckData.name || 'Unknown Set',
          creatorName: deckData.creatorName || 'Unknown',
        },
        cards: cardsOut,
      };

      await set(newDeckRef, newDeck);
      Alert.alert('Imported', 'Set added to your library.', [
        { text: 'View', onPress: () => router.push(`/deck/${newDeckId}`) },
        { text: 'OK' }
      ]);
    } catch (e) {
      console.error('Import error:', e);
      Alert.alert('Error', 'Failed to import the set. Please try again later.');
    }
  }, []);

  const renderSetItem = ({ item }) => {
    const cardsArray = item.cards ? Object.values(item.cards) : [];
    const totalCards = cardsArray.length;
    
    // Determine creator display name
    let creatorDisplay = 'Unknown';
    if (item.ownerEmail === 'ahmetkoc1@gmail.com') {
      creatorDisplay = 'Admin';
    } else if (item.creatorName) {
      creatorDisplay = item.creatorName;
    } else {
      creatorDisplay = 'Unknown';
    }

    return (
      <View style={styles.setCard}>
        <TouchableOpacity onPress={() => router.push(`/deck-gallery/${item.id}`)}>
          <Text style={styles.setName}>{item.name}</Text>
          <Text style={styles.creatorName}>by {creatorDisplay}</Text>
          <Text style={styles.cardCount}>{totalCards} words</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.importButton} onPress={() => handleImport(item)}>
          <Text style={styles.importButtonText}>Import to My Sets</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sets}
        renderItem={renderSetItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No shared sets available</Text>
        }
      />
    </View>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    listContainer: {
      padding: 16,
    },
    setCard: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.border,
      gap: 10,
    },
    setName: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 4,
      color: c.text,
    },
    creatorName: {
      fontSize: 14,
      color: c.textSecondary,
      marginBottom: 8,
    },
    cardCount: {
      fontSize: 14,
      color: c.textSecondary,
    },
    emptyText: {
      textAlign: 'center',
      fontSize: 16,
      color: c.textSecondary,
      marginTop: 32,
    },
    errorText: {
      fontSize: 16,
      color: '#FF3B30',
      marginBottom: 16,
      textAlign: 'center',
    },
    importButton: {
      alignSelf: 'flex-start',
      backgroundColor: '#4F46E5',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    importButtonText: {
      color: 'white',
      fontWeight: '600',
      fontSize: 14,
    },
  });
