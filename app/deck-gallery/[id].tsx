// @ts-nocheck

import { useEffect, useState, useCallback } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { ref, get, push, set, type Database } from 'firebase/database';
import type { Auth } from 'firebase/auth';
import { db, auth } from '../../src/firebase/config';
import AdminDeckControls from '../../src/components/AdminDeckControls';

export default function DeckGalleryDetail() {
  const { id } = useLocalSearchParams();
  type DeckType = {
    id: string;
    name: string;
    creatorName?: string;
    cards?: Record<string, any> | any[];
    isShared?: boolean;
  };
  const [deck, setDeck] = useState<DeckType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const authInst = (auth as unknown) as Auth;
  const dbInst = (db as unknown) as Database;
  
  useEffect(() => {
    const fetchDeck = async () => {
      try {
        const deckRef = ref(dbInst, `sharedDecks/${id}`);
        const snapshot = await get(deckRef);
        
        if (snapshot.exists()) {
          const val = snapshot.val() as any;
          setDeck({ id: String(snapshot.key), ...(val || {}) });
        }
        
        // Check if current user is admin
        setIsAdmin(authInst?.currentUser?.email === 'ahmetkoc1@gmail.com');
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching shared deck:', error);
        setLoading(false);
      }
    };
    
    fetchDeck();
  }, [id]);
  
  const handleImport = useCallback(async () => {
    try {
      if (!deck) return;
      if (!authInst?.currentUser) {
        Alert.alert('Sign in required', 'Please sign in to import this set into your library.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/login') }
        ]);
        return;
      }

      // Re-fetch to ensure latest
      const sharedRef = ref(dbInst, `sharedDecks/${deck.id}`);
      const snap = await get(sharedRef);
      if (!snap.exists()) {
        Alert.alert('Not found', 'This set is no longer available.');
        return;
      }
      const data = (snap.val() as any) || {};

      const newDeckRef = push(ref(dbInst, `users/${authInst.currentUser!.uid}/decks`));
      const newDeckId = newDeckRef.key;

      const cardsOut: Record<string, any> = {};
      if (data.cards) {
        if (Array.isArray(data.cards)) {
          data.cards.forEach((card: any, idx: number) => {
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
          Object.entries(data.cards as Record<string, any>).forEach(([cidOld, card]: [string, any]) => {
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
        name: data.name || 'Imported Set',
        createdAt: new Date().toISOString(),
        creatorId: authInst.currentUser!.uid,
        creatorName: authInst.currentUser!.displayName || authInst.currentUser!.email || 'User',
        isShared: false,
        forkedFrom: {
          id: deck.id,
          name: data.name || 'Unknown Set',
          creatorName: data.creatorName || 'Unknown',
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
  }, [deck]);
  
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!deck) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>Set not found</Text>
      </View>
    );
  }

  const cardsArray = deck.cards ? (Array.isArray(deck.cards) ? deck.cards : Object.values(deck.cards)) : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>{deck.name}</Text>
      <Text style={styles.subtitle}>by {deck.creatorName || 'Unknown'}</Text>
      <Text style={styles.meta}>{cardsArray.length} words</Text>

      <TouchableOpacity style={styles.importButton} onPress={handleImport}>
        <Text style={styles.importButtonText}>Import to My Sets</Text>
      </TouchableOpacity>

      {isAdmin && deck && (
        <View style={{ marginTop: 16 }}>
          <AdminDeckControls deck={deck as any} refreshDeck={() => {}} />
        </View>
      )}

      <View style={{ marginTop: 20 }}>
        {cardsArray.slice(0, 50).map((card: any, idx: number) => (
          <View key={idx} style={styles.cardRow}>
            <Text style={styles.cardFront}>{card.front}</Text>
            <Text style={styles.cardBack}>{card.back}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  meta: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
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
  },
  cardRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cardFront: {
    fontWeight: '600',
    marginBottom: 2,
  },
  cardBack: {
    color: '#444',
  },
  // Your existing styles...
});
