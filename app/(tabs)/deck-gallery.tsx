import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ref, onValue } from 'firebase/database';
import { auth, db } from '../../src/firebase/config';

export default function SetGallery() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (!auth.currentUser) {
      setSets([]);
      setLoading(false);
      return;
    }

    const setsRef = ref(db, 'decks');
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

  const renderSetItem = ({ item }) => {
    const cardsArray = item.cards ? Object.values(item.cards) : [];
    const totalCards = cardsArray.length;
    
    // Determine creator display name
    let creatorDisplay = 'Unknown';
    if (item.ownerEmail === 'ahmetkoc1@gmail.com') {
      creatorDisplay = 'Admin';
    } else if (item.creatorName) {
      creatorDisplay = item.creatorName;
    } else if (item.ownerEmail) {
      creatorDisplay = item.ownerEmail;
    }

    return (
      <TouchableOpacity 
        style={styles.setCard}
        onPress={() => router.push(`/deck/${item.id}`)}
      >
        <Text style={styles.setName}>{item.name}</Text>
        <Text style={styles.creatorName}>by {creatorDisplay}</Text>
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
  setCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  setName: {
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
