// @ts-nocheck

import { useEffect, useState, useCallback } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [importedDeck, setImportedDeck] = useState<{id: string, name: string} | null>(null);
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
              // Copy media assets
              imageData: card.imageData || null,
              imageGeneratedAt: card.imageGeneratedAt || null,
              wordAudioUrl: card.wordAudioUrl || null,
              definitionAudioUrl: card.definitionAudioUrl || null,
              sentenceAudioUrl: card.sentenceAudioUrl || null,
              audioGeneratedAt: card.audioGeneratedAt || null,
              // Reset progress
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
              // Copy media assets
              imageData: card.imageData || null,
              imageGeneratedAt: card.imageGeneratedAt || null,
              wordAudioUrl: card.wordAudioUrl || null,
              definitionAudioUrl: card.definitionAudioUrl || null,
              sentenceAudioUrl: card.sentenceAudioUrl || null,
              audioGeneratedAt: card.audioGeneratedAt || null,
              // Reset progress
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
      
      // Store imported deck info and show modal
      setImportedDeck({
        id: newDeckId,
        name: data.name || 'Imported Set'
      });
      setShowSuccessModal(true);
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

  // Success Modal Component
  const SuccessModal = () => {
    if (!showSuccessModal || !importedDeck) return null;

    return (
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>✅</Text>
            <Text style={styles.modalTitle}>Set Imported Successfully!</Text>
            <Text style={styles.modalMessage}>
              "{importedDeck.name}" has been added to your library and is ready to use from your Deck Gallery.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.closeButton]} 
                onPress={() => setShowSuccessModal(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.viewButton]} 
                onPress={() => {
                  setShowSuccessModal(false);
                  router.push(`/deck/${importedDeck.id}`);
                }}
              >
                <Text style={styles.viewButtonText}>See the Set</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <>
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
      <SuccessModal />
    </>
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    alignItems: 'center',
  },
  modalEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    color: '#1F2937',
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 24,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButton: {
    backgroundColor: '#E5E7EB',
  },
  closeButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 16,
  },
  viewButton: {
    backgroundColor: '#4F46E5',
  },
  viewButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
