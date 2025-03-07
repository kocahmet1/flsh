import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Alert, ActivityIndicator, TouchableOpacity, Modal, Platform } from 'react-native';
import { auth, db } from '../firebase/config';
import { ref, update, set, get, remove, query, orderByChild, equalTo } from 'firebase/database';
import { isAdmin } from '../utils/authUtils';

export default function AdminDeckControls({ deck, refreshDeck }) {
  const [isAutoFork, setIsAutoFork] = useState(deck?.autoForkForAll || false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showFinalConfirmModal, setShowFinalConfirmModal] = useState(false);

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
        if (Platform.OS === 'web') {
          alert(
            'Deck Not Shared',
            'This deck needs to be shared to auto-fork for all users. Would you like to share it now?'
          );
        } else {
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
                        if (Platform.OS === 'web') {
                          alert(
                            'Partial Success',
                            'The deck was marked as shared in your collection, but there was an issue with the public collections. Some auto-fork features may be limited.'
                          );
                        } else {
                          Alert.alert(
                            'Partial Success',
                            'The deck was marked as shared in your collection, but there was an issue with the public collections. Some auto-fork features may be limited.'
                          );
                        }
                      }
                    } else {
                      console.log('Not an admin user - skipping sharedDecks update');
                    }

                    if (refreshDeck) refreshDeck();
                    setIsAutoFork(true);
                  } catch (error) {
                    console.error('Error sharing deck:', error);
                    if (Platform.OS === 'web') {
                      alert('Error', 'Failed to share the deck');
                    } else {
                      Alert.alert('Error', 'Failed to share the deck');
                    }
                    setIsAutoFork(false);
                  } finally {
                    setIsLoading(false);
                  }
                }
              }
            ]
          );
        }
        return;
      }

      setIsAutoFork(newValue);
      if (refreshDeck) refreshDeck();

      if (Platform.OS === 'web') {
        alert(
          'Success',
          newValue 
            ? 'This deck will now be automatically forked for all users in your own collection' 
            : 'This deck will no longer be auto-forked for new users in your own collection'
        );
      } else {
        Alert.alert(
          'Success',
          newValue 
            ? 'This deck will now be automatically forked for all users in your own collection' 
            : 'This deck will no longer be auto-forked for new users in your own collection'
        );
      }
    } catch (error) {
      console.error('Error updating auto-fork status:', error);
      if (Platform.OS === 'web') {
        alert('Error', `Failed to update auto-fork settings: ${error.message}`);
      } else {
        Alert.alert('Error', `Failed to update auto-fork settings: ${error.message}`);
      }
      // Reset to previous state
      setIsAutoFork(!isAutoFork);
    } finally {
      setIsLoading(false);
    }
  };

  const removeAllAutoForkedCopies = async () => {
    if (!isAdmin()) return;

    if (Platform.OS === 'web') {
      // Show first confirmation modal for web
      setShowConfirmModal(true);
    } else {
      // Use Alert for native platforms
      Alert.alert(
        '⚠️ WARNING: Destructive Action',
        'This will permanently delete this deck from ALL users who received it through auto-forking. This action CANNOT be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            style: 'destructive',
            onPress: () => showSecondConfirmation()
          }
        ]
      );
    }
  };

  const showSecondConfirmation = () => {
    if (Platform.OS === 'web') {
      // Show second confirmation modal for web
      setShowFinalConfirmModal(true);
    } else {
      // Use Alert for native platforms
      Alert.alert(
        '⚠️ FINAL WARNING',
        'Are you absolutely sure? This will remove the deck from ALL users and cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Remove All Copies',
            style: 'destructive',
            onPress: () => executeRemoval()
          }
        ]
      );
    }
  };

  const executeRemoval = async () => {
    try {
      setIsRemoving(true);
      
      // First turn off auto-forking if it's on
      if (isAutoFork) {
        console.log("Turning off autoforking before removing copies");
        const sharedDeckRef = ref(db, `sharedDecks/${deck.id}`);
        await update(sharedDeckRef, {
          autoForkForAll: false
        });
        setIsAutoFork(false);
      }
      
      // Instead of directly deleting from user collections (which causes permission issues),
      // mark the deck as "removed from autoforking" in a central location
      console.log(`Marking deck ${deck.id} for removal from all auto-forked copies`);
      
      // Update the deck in sharedDecks to indicate it should be removed from autoforked copies
      const sharedDeckRef = ref(db, `sharedDecks/${deck.id}`);
      await update(sharedDeckRef, {
        autoForkForAll: false,
        removedFromAutoFork: true,
        removedFromAutoForkAt: new Date().toISOString(),
        removedFromAutoForkBy: auth.currentUser.uid
      });
      
      // Also mark in admin's own preferences that this deck should be deleted
      const userPrefsRef = ref(db, `users/${auth.currentUser.uid}/preferences`);
      const userPrefsSnapshot = await get(userPrefsRef);
      const userPrefs = userPrefsSnapshot.exists() ? userPrefsSnapshot.val() : {};
      
      const deletedAutoForkedDecks = userPrefs.deletedAutoForkedDecks || [];
      if (!deletedAutoForkedDecks.includes(deck.id)) {
        deletedAutoForkedDecks.push(deck.id);
        await update(userPrefsRef, { deletedAutoForkedDecks });
      }
      
      // Success message
      if (Platform.OS === 'web') {
        alert("The deck has been marked for removal from all auto-forked copies. Users will see these decks removed the next time they log in or refresh.");
      } else {
        Alert.alert(
          'Success',
          "The deck has been marked for removal from all auto-forked copies. Users will see these decks removed the next time they log in or refresh.",
          [{ text: 'OK' }]
        );
      }
      
      // After removing copies, refresh the deck data
      if (refreshDeck) {
        refreshDeck();
      }
    } catch (error) {
      console.error('Error removing auto-forked copies:', error);
      if (Platform.OS === 'web') {
        alert('Error: Failed to remove auto-forked copies: ' + error.message);
      } else {
        Alert.alert(
          'Error',
          'Failed to remove auto-forked copies: ' + error.message,
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsRemoving(false);
      setShowConfirmModal(false);
      setShowFinalConfirmModal(false);
    }
  };

  // Custom confirmation dialog component for web platform
  const ConfirmationDialog = ({ visible, title, message, onCancel, onConfirm, confirmText, isDestructive }) => {
    if (!visible) return null;
    
    // If not web, use native Alert
    if (Platform.OS !== 'web') {
      Alert.alert(
        title,
        message,
        [
          { text: 'Cancel', style: 'cancel', onPress: onCancel },
          { 
            text: confirmText || 'Confirm', 
            style: isDestructive ? 'destructive' : 'default',
            onPress: onConfirm
          }
        ]
      );
      return null;
    }
    
    // Custom modal for web
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Text style={styles.modalMessage}>{message}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={onCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, isDestructive ? styles.destructiveButton : styles.confirmButton]} 
                onPress={onConfirm}
              >
                <Text style={isDestructive ? styles.destructiveButtonText : styles.confirmButtonText}>
                  {confirmText || 'Confirm'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Auto-Fork Controls</Text>
        <Text style={styles.description}>
          When enabled, this deck will be automatically added to all users' collections.
        </Text>
        
        <View style={styles.optionRow}>
          <Text style={styles.optionLabel}>Auto-Fork for All Users</Text>
          <Switch
            trackColor={{ false: "#767577", true: "#4F46E5" }}
            thumbColor={isAutoFork ? "#f5dd4b" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={toggleAutoFork}
            value={isAutoFork}
          />
        </View>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#DC2626' }]}
          onPress={removeAllAutoForkedCopies}
          disabled={isRemoving || isLoading}
        >
          {isRemoving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Remove All Auto-Forked Copies</Text>
          )}
        </TouchableOpacity>
        
        <Text style={styles.note}>
          Note: Removing auto-forked copies will delete this deck from all users who received it through auto-forking.
        </Text>
      </View>

      {/* Confirmation dialogs for web platform */}
      <ConfirmationDialog 
        visible={showConfirmModal}
        title="⚠️ WARNING: Destructive Action"
        message="This will permanently delete this deck from ALL users who received it through auto-forking. This action CANNOT be undone."
        onCancel={() => setShowConfirmModal(false)}
        onConfirm={() => {
          setShowConfirmModal(false);
          showSecondConfirmation();
        }}
        confirmText="Continue"
        isDestructive={true}
      />
      
      <ConfirmationDialog 
        visible={showFinalConfirmModal}
        title="⚠️ FINAL WARNING"
        message="Are you absolutely sure? This will remove the deck from ALL users and cannot be undone."
        onCancel={() => setShowFinalConfirmModal(false)}
        onConfirm={() => {
          setShowFinalConfirmModal(false);
          executeRemoval();
        }}
        confirmText="Yes, Remove All Copies"
        isDestructive={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#4B5563',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1F2937',
  },
  description: {
    color: '#4B5563',
    marginBottom: 12,
    fontSize: 14,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionLabel: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  note: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
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
    borderRadius: 8,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1F2937'
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
    color: '#4B5563'
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
  },
  confirmButton: {
    backgroundColor: '#4F46E5',
  },
  destructiveButton: {
    backgroundColor: '#DC2626',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  destructiveButtonText: {
    color: 'white',
    fontWeight: '600',
  }
});
