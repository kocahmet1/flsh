import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ref, onValue } from 'firebase/database';
import { auth, db } from '../../src/firebase/config';

export default function DeckGallery() {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (!auth.currentUser) {
      setDecks([]);
      setLoading(false);
      return;
    }

    const decksRef = ref(db, 'decks');
    const unsubscribe = onValue(decksRef, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          const decksArray = Object.entries(data)
            .map(([id, deck]) => ({
              id,
              ...deck,
            }))
            .filter(deck => deck.isShared); // Only show shared decks

          setDecks(decksArray);
        } else {
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

    return () => unsubscribe();
  }, []);

  const renderDeckItem = ({ item }) => {
    const cardsArray = item.cards ? Object.values(item.cards) : [];
    const totalCards = cardsArray.length;

    return (
      <TouchableOpacity 
        style={styles.deckCard}
        onPress={() => router.push(`/deck/${item.id}`)}
      >
        <Text style={styles.deckName}>{item.name}</Text>
        <Text style={styles.creatorName}>by {item.creatorName}</Text>
        <Text style={styles.cardCount}>{totalCards} words</Text>
      </TouchableOpacity>
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
        data={decks}
        renderItem={renderDeckItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No shared decks available</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  deckCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  deckName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  creatorName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  cardCount: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  },
});
