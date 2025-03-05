
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Alert, ActivityIndicator } from 'react-native';
import { auth, db } from '../firebase/config';
import { ref, update, set, get } from 'firebase/database';
import { isAdmin } from '../utils/authUtils';

export default function AdminDeckControls({ deck, refreshDeck }) {
  const [isAutoFork, setIsAutoFork] = useState(deck?.autoForkForAll || false);
  const [isLoading, setIsLoading] = useState(false);

  // Update local state when deck prop changes
  useEffect(() => {
    if (deck) {
      setIsAutoFork(deck.autoForkForAll || false);
    }
  }, [deck]);

  if (!isAdmin()) return null;

  const toggleAutoFork = async () => {
    try {
      setIsLoading(true);
      const newValue = !isAutoFork;

      // First, check if we have write permissions by trying to update the user's own deck
      const userDeckRef = ref(db, `users/${auth.currentUser.uid}/decks/${deck.id}`);

      // Check if deck exists in user's collection
      const snapshot = await get(userDeckRef);
      if (!snapshot.exists()) {
        throw new Error('Deck not found in your collection');
      }

      // First, update just in the user's own deck
      await update(userDeckRef, {
        autoForkForAll: newValue
      });

      // If the deck is shared, try to update in public collections
      if (deck.isShared) {
        try {
          // Try to update in decks collection
          const publicDeckRef = ref(db, `decks/${deck.id}`);
          await update(publicDeckRef, {
            autoForkForAll: newValue
          });

          // Try to update in sharedDecks collection - only if current user is the admin
          if (auth.currentUser.email === 'ahmetkoc1@gmail.com') {
            const sharedDeckRef = ref(db, `sharedDecks/${deck.id}`);
            
            // If enabling auto-fork, ensure the deck is in sharedDecks collection
            if (newValue) {
              await set(sharedDeckRef, {
                ...deck,
                autoForkForAll: true
              });
            } else {
              await update(sharedDeckRef, {
                autoForkForAll: false
              });
            }
          } else {
            console.log('Not an admin user - skipping sharedDecks update');
          }
        } catch (error) {
          console.warn('Could not update shared deck collections:', error.message);
          // Continue anyway since we at least updated the user's own deck
        }
      } else if (newValue) {
        // If enabling auto-fork but deck isn't shared, show warning
        Alert.alert(
          'Deck Not Shared',
          'This deck needs to be shared to auto-fork for all users. Would you like to share it now?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                // Reset switch state
                setIsAutoFork(false);
                setIsLoading(false);
              }
            },
            {
              text: 'Share & Enable Auto-Fork',
              onPress: async () => {
                try {
                  // Update the user's deck first
                  await update(userDeckRef, {
                    isShared: true,
                    autoForkForAll: true
                  });

                  // Only admin can update sharedDecks collection
                  if (auth.currentUser.email === 'ahmetkoc1@gmail.com') {
                    try {
                      // Try to update shared collections
                      const publicDeckRef = ref(db, `decks/${deck.id}`);
                      await set(publicDeckRef, {
                        ...deck,
                        isShared: true,
                        autoForkForAll: true
                      });

                      const sharedDeckRef = ref(db, `sharedDecks/${deck.id}`);
                      await set(sharedDeckRef, {
                        ...deck,
                        isShared: true,
                        autoForkForAll: true
                      });
                    } catch (error) {
                      console.warn('Could not update shared deck collections:', error.message);
                      // Show a notification but continue since we at least updated the user's deck
                      Alert.alert(
                        'Partial Success',
                        'The deck was marked as shared in your collection, but there was an issue with the public collections. Some auto-fork features may be limited.'
                      );
                    }
                  } else {
                    console.log('Not an admin user - skipping sharedDecks update');
                  }

                  if (refreshDeck) refreshDeck();
                  setIsAutoFork(true);
                } catch (error) {
                  console.error('Error sharing deck:', error);
                  Alert.alert('Error', 'Failed to share the deck');
                  setIsAutoFork(false);
                } finally {
                  setIsLoading(false);
                }
              }
            }
          ]
        );
        return;
      }

      setIsAutoFork(newValue);
      if (refreshDeck) refreshDeck();

      Alert.alert(
        'Success',
        newValue 
          ? 'This deck will now be automatically forked for all users in your own collection' 
          : 'This deck will no longer be auto-forked for new users in your own collection'
      );
    } catch (error) {
      console.error('Error updating auto-fork status:', error);
      Alert.alert('Error', `Failed to update auto-fork settings: ${error.message}`);
      // Reset to previous state
      setIsAutoFork(!isAutoFork);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Auto-fork for all users:</Text>
        <Switch
          value={isAutoFork}
          onValueChange={toggleAutoFork}
          disabled={isLoading}
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={isAutoFork ? "#f5dd4b" : "#f4f3f4"}
        />
        {isLoading && <ActivityIndicator size="small" style={styles.loader} />}
      </View>
      <Text style={styles.description}>
        When enabled, this deck will be automatically forked for new users in your collection
        {auth.currentUser.email !== 'ahmetkoc1@gmail.com' && (
          ". Note: Full auto-fork features require admin privileges."
        )}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  description: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  loader: {
    marginLeft: 8,
  }
});
