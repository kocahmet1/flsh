// @ts-nocheck
import React, { useEffect, useCallback, useState, useRef } from 'react';

import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform, ActivityIndicator, Alert, Image, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useDeck } from '../../../src/hooks/useDeck';
import { useDecks } from '../../../src/hooks/useDecks';
import ImportCSV from '../../../src/components/ImportCSV';
import { isAdmin } from '../../../src/utils/authUtils';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInRight, Layout } from 'react-native-reanimated';
import AdminDeckControls from '../../../src/components/AdminDeckControls';
import TabBarIcon from '../../../src/components/TabBarIcon';
import { isCloudEnabled } from '../../../src/repositories';
import { generateImagesForDeck } from '../../../src/utils/imageGeneration';

const Colors = {
  primary: '#6366F1', // Indigo
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  secondary: '#EC4899', // Pink
  secondaryLight: '#F472B6',
  accent: '#3B82F6', // Blue
  surface: '#FFFFFF',
  surfaceAlt: '#F8F8FF',
  backgroundGradient: ['#F9FAFB', '#EDF2F7'],
  cardShadow: '#000000',
  text: '#111827',
  textSecondary: '#374151', // Darker for better visibility
  hint: '#4B5563', // Darker hint color
  success: '#10B981', // Green
  error: '#EF4444', // Red
  warning: '#F59E0B', // Amber
  divider: '#e1e7ef', // Lighter divider that still provides contrast
  cardBackground: '#ffffff',
  scrollBackground: '#f0f4f8',
};

export default function DeckScreen() {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();
  const { deck, loading, isCreator, deleteCard, error, refreshDeck, forkDeck } = useDeck(id);
  const { createDeck, shareDeck } = useDecks();
  const [refreshing, setRefreshing] = React.useState(false);
  const [generatingImages, setGeneratingImages] = React.useState(false);
  const [imageProgress, setImageProgress] = React.useState({ current: 0, total: 0, word: '' });
  const cloud = isCloudEnabled();
  const insets = useSafeAreaInsets();
  const didFocusRefresh = useRef(false);

  // Ensure deck data refreshes when returning to this screen
  useFocusEffect(
    useCallback(() => {
      // Refresh once when the screen gains focus; guard against re-entry
      if (!didFocusRefresh.current) {
        didFocusRefresh.current = true;
        refreshDeck();
      }
      // Reset guard when screen loses focus
      return () => {
        didFocusRefresh.current = false;
      };
    }, [])
  );

  useEffect(() => {
    console.log(`[DeckScreen] Params ID: ${id}, type: ${typeof id}`);
    if (deck) {
      console.log(`[DeckScreen] Deck loaded: ${deck.id}, name: ${deck.name}`);
      console.log(`[DeckScreen] Cards count: ${deck.cards?.length || 0}`);
      // Update the native header title to include the deck name
      navigation.setOptions({
        headerTitle: `Deck Details - ${deck.name || ''}`,
      });
    } else if (error) {
      console.log(`[DeckScreen] Error loading deck: ${error}`);
    }
  }, [deck, id, error]);

  const handleGenerateImages = async () => {
    if (!deck || !deck.cards || deck.cards.length === 0) {
      Alert.alert('No Cards', 'Add some cards with sample sentences first.');
      return;
    }

    const cardsWithSentences = deck.cards.filter(card => card.sampleSentence && !card.imageData);
    
    if (cardsWithSentences.length === 0) {
      Alert.alert('All Set!', 'All cards with sample sentences already have images.');
      return;
    }

    Alert.alert(
      'Generate Images',
      `Generate AI images for ${cardsWithSentences.length} card(s)?\n\nThis may take a few minutes.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Generate',
          onPress: async () => {
            try {
              setGeneratingImages(true);
              setImageProgress({ current: 0, total: cardsWithSentences.length, word: '' });
              
              const result = await generateImagesForDeck(
                id,
                cloud,
                (current, total, word) => {
                  setImageProgress({ current, total, word });
                }
              );
              
              setGeneratingImages(false);
              
              // Show appropriate message based on results
              if (result.success > 0 && result.failed === 0) {
                Alert.alert(
                  '✅ Success!',
                  `Generated ${result.success} image(s) successfully!`
                );
              } else if (result.success > 0 && result.failed > 0) {
                Alert.alert(
                  '⚠️ Partial Success',
                  `✅ Successfully generated: ${result.success}\n` +
                  `❌ Failed: ${result.failed}\n\n` +
                  `Tip: Failed images are often due to API overload. Try clicking "Generate Images" again in a few minutes.`
                );
              } else if (result.failed > 0) {
                Alert.alert(
                  '❌ Generation Failed',
                  `Failed to generate ${result.failed} image(s).\n\n` +
                  `Possible reasons:\n` +
                  `• API is overloaded (503 error)\n` +
                  `• Rate limit reached\n` +
                  `• Network issues\n\n` +
                  `Please try again in 5-10 minutes.`
                );
              }
              
              // Refresh deck to show new images
              if (result.success > 0) {
                refreshDeck();
              }
            } catch (error) {
              setGeneratingImages(false);
              console.error('Error generating images:', error);
              
              // Check for specific error types
              if (error.message?.includes('503') || error.message?.includes('overloaded')) {
                Alert.alert(
                  '⏳ API Overloaded',
                  'The Gemini API is currently experiencing high traffic. Please try again in 5-10 minutes.'
                );
              } else if (error.message?.includes('API key')) {
                Alert.alert(
                  '🔑 API Key Issue',
                  'There appears to be an issue with your API key. Please check your configuration.'
                );
              } else {
                Alert.alert(
                  '❌ Error',
                  'Failed to generate images. Check the console for details and try again.'
                );
              }
            }
          },
        },
      ]
    );
  };

  const handleForkDeck = async () => {
    if (!deck) return;

    try {
      const forkedDeckId = await forkDeck(String(id), deck.name || 'Deck');
      if (forkedDeckId) {
        router.push(`/deck/${forkedDeckId}`);
      } else {
        Alert.alert("Error", "Failed to fork deck. Please try again.");
      }
    } catch (error) {
      console.error("Error in handleForkDeck:", error);
      Alert.alert("Error", "An unexpected error occurred.");
    }
  };

  const handleShareDeck = async () => {
    if (!deck) return;

    try {
      const isCurrentlyShared = deck.isShared || false;
      const success = await shareDeck(id);

      if (success) {
        if (!isCurrentlyShared) {
          Alert.alert(
            'Success',
            'Your deck has been shared! Other users can now find it in the Deck Gallery.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Success',
            'Your deck has been unshared and is no longer visible to other users.',
            [{ text: 'OK' }]
          );
        }
        refreshDeck();
      } else {
        throw new Error('Failed to update sharing status');
      }
    } catch (error) {
      console.error('Error sharing deck:', error);
      Alert.alert(
        'Error',
        'Failed to update sharing status. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Trigger a fresh load from the data source
    refreshDeck();
    setTimeout(() => {
      setRefreshing(false);
    }, 300);
  }, [refreshDeck]);

  const handleToggleKnown = (cardId) => {
    console.log(`Toggling known status for card with ID: ${cardId}`);
    const updatedCards = deck.cards.map(card => {
      if (card.id === cardId) {
        return { ...card, known: !card.known };
      }
      return card;
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !deck) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || "Deck not found"}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderCardItem = ({ item, index }) => (
    <Animated.View
      entering={FadeInUp.duration(300).delay(index * 50)}
      layout={Layout.springify()}
      style={[styles.cardItem, item.isKnown ? styles.knownCardItem : {}]}
    >
      {item.isKnown && (
        <View style={styles.checkmarkContainer}>
          <Text style={styles.checkmark}>✓</Text>
        </View>
      )}
      {isCreator && (
        <TouchableOpacity
          style={styles.deleteButton}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          activeOpacity={0.6}
          onPress={() => {
            console.log('Delete button pressed for card:', item.id);

            if (Platform.OS === 'web') {
              const confirmDelete = window.confirm('Are you sure you want to delete this card?');
              if (confirmDelete) {
                (async () => {
                  try {
                    console.log('Attempting to delete card:', item.id);
                    const success = await deleteCard(item.id);
                    if (success) {
                      console.log('Card deleted successfully in UI');
                    } else {
                      console.error('Failed to delete card');
                      window.alert('Failed to delete card. Please try again.');
                    }
                  } catch (error) {
                    console.error('Error in delete card process:', error);
                    window.alert('An unexpected error occurred. Please try again.');
                  }
                })();
              }
            } else {
              Alert.alert(
                'Delete Card',
                'Are you sure you want to delete this card?',
                [
                  {
                    text: 'Cancel',
                    style: 'cancel'
                  },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        console.log('Attempting to delete card:', item.id);
                        const success = await deleteCard(item.id);
                        if (success) {
                          console.log('Card deleted successfully in UI');
                        } else {
                          console.error('Failed to delete card');
                          Alert.alert('Error', 'Failed to delete card. Please try again.');
                        }
                      } catch (error) {
                        console.error('Error in delete card process:', error);
                        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
                      }
                    }
                  }
                ]
              );
            }
          }}
        >
          <MaterialIcons name="close" size={14} color={Colors.textSecondary} />
        </TouchableOpacity>
      )}
      <Text style={styles.cardFront}>{item.front}</Text>
      <Text style={styles.cardBack}>{item.back}</Text>
    </Animated.View>
  );

  const showForkButton = deck.isShared && !isCreator;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Colors.backgroundGradient as [string, string]}
        style={styles.gradientBackground}
      >
        {/* Removed in-screen gradient header; using native header instead */}

        <Animated.View
          entering={FadeInRight.duration(300).delay(150)}
          style={styles.studySection}
        >
          {showForkButton ? (
            <TouchableOpacity
              style={styles.forkButton}
              onPress={handleForkDeck}
            >
              <MaterialIcons name="call-split" size={18} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.forkButtonText}>Add to My Sets</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.studyButtonsContainer}>
              <TouchableOpacity
                style={styles.studyButton}
                onPress={() => router.push(`/deck/${id}/study`)}
              >
                <MaterialIcons name="school" size={18} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Study All Words</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.studyUnknownButton}
                onPress={() => router.push({
                  pathname: `/deck/${id}/study`,
                  params: { mode: 'unknown' }
                })}
              >
                <MaterialIcons name="help-outline" size={18} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Study Unknown Words Only</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        <FlatList
          key={`deck-cards-${deck.cards?.length || 0}`}
          data={deck.cards}
          renderItem={renderCardItem}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.listContainer,
            // Ensure the last items are not hidden behind the bottom action bar
            { paddingBottom: (Math.max(insets.bottom, 16) + 96) }
          ]}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Image
                source={require('../../../assets/images/flashcard_logo.jpeg')}
                style={styles.emptyImage}
                resizeMode="contain"
              />
              <Text style={styles.emptyText}>No cards yet</Text>
              <Text style={styles.emptySubText}>Add your first card to get started</Text>
            </View>
          }
        />

        {!showForkButton && (
          <Animated.View
            entering={FadeInUp.duration(300).delay(200)}
            style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 16) }]}
          >
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/deck/${id}/add-card`)}
            >
              <MaterialIcons name="add" size={18} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Add New Word</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, generatingImages && styles.actionButtonDisabled]}
              onPress={handleGenerateImages}
              disabled={generatingImages}
            >
              {generatingImages ? (
                <>
                  <ActivityIndicator size="small" color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>
                    {imageProgress.current > 0 
                      ? `${imageProgress.current}/${imageProgress.total}`
                      : 'Generating...'}
                  </Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="auto-awesome" size={18} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Generate Images</Text>
                </>
              )}
            </TouchableOpacity>

            {cloud && isCreator && !deck.isShared && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleShareDeck}
              >
                <MaterialIcons name="share" size={18} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Share Set in Gallery</Text>
              </TouchableOpacity>
            )}

            {cloud && Platform.OS === 'web' && (
              <ImportCSV deckId={id} />
            )}
          </Animated.View>
        )}
        {cloud && isAdmin() && deck && <AdminDeckControls deck={deck} refreshDeck={refreshDeck} />}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  checkmarkContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
    zIndex: 1,
  },
  checkmark: {
    color: '#22c55e',
    fontSize: 24,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    position: 'relative',
  },
  gradientBackground: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : Platform.OS === 'android' ? 30 : 0,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    width: '100%',
  },
  headerContent: {
    width: '100%',
  },
  deckName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: Colors.text,
    width: '100%',
    flexShrink: 1,
  },
  cardCount: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardCountIcon: {
    marginRight: 4,
  },
  forkedFrom: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    flexDirection: 'row',
    alignItems: 'center',
  },
  listContainer: {
    padding: 20,
    flexGrow: 1,
  },
  cardItem: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    shadowColor: Colors.cardShadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    position: 'relative',
  },
  cardFront: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: Colors.text,
  },
  cardBack: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  buttonIcon: {
    marginRight: 6,
  },
  addButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  forkButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    flex: Platform.OS === 'web' ? 1 : 0,
    width: Platform.OS === 'web' ? undefined : '80%',
    maxWidth: 250,
  },
  shareButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  forkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 40,
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  emptyImage: {
    width: 80,
    height: 80,
    marginBottom: 20,
    borderRadius: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.surface,
  },
  errorText: {
    fontSize: 18,
    color: Colors.error,
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  studyButton: {
    backgroundColor: '#F06292', // Pink background for study button
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F06292',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  studyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  studyUnknownButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    flex: Platform.OS === 'web' ? 1 : 0,
    width: Platform.OS === 'web' ? undefined : '80%',
    maxWidth: 250,
  },
  studyButtonsContainer: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
  },
  actionButtonDisabled: {
    backgroundColor: Colors.hint,
    opacity: 0.7,
    shadowRadius: 3,
    elevation: 2,
    flex: 1,
    minWidth: 140,
    maxWidth: Platform.OS === 'web' ? 200 : 'auto',
  },
  searchContainer: {
    backgroundColor: '#e8eaed', // Light gray background for search area
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dadce0',
  },
  studySection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  deleteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: Colors.divider,
    shadowColor: Colors.cardShadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    opacity: 0.8,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      pointerEvents: 'auto',
    } : {}),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  knownCardItem: {
    borderColor: 'rgba(167, 243, 208, 0.5)',
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardContentWrapper: {
    flex: 1,
    paddingRight: 30,
  },
  cardFront: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    color: Colors.text,
  },
  cardSeparator: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.07)',
    marginBottom: 8,
  },
  cardBack: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  deleteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#EF4444', // Red color for better visibility
    fontWeight: '300',
    lineHeight: 22,
  },

  buttonIcon: {
    marginRight: 8,
  },
  addButton: {
    flex: 1,
    marginRight: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  shareButton: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  forkButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    flex: Platform.OS === 'web' ? 1 : 0,
    width: Platform.OS === 'web' ? undefined : '80%',
    maxWidth: 250,
  },
  forkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 18,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 15,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyImage: {
    width: 90,
    height: 90,
    marginBottom: 20,
    borderRadius: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    margin: 16,
  },
  errorText: {
    fontSize: 18,
    color: Colors.error,
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    justifyContent:'space-between',
    position: 'relative',
  },
  bottomActionsBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.5)',
  },
  progressBarContainer: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  progressBarBase: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadow: '0px 1px 1px rgba(0,0,0,0.2)',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  deckInfoContainer: {
    flex: 1,
  },
  deckNameHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  deckInfoText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  studyButtonsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginBottom: 14,
  },
  studyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: '#4F46E5', // Indigo
  },
  studyUnknownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: '#EC4899', // Pink
  },
  studyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cardsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: Colors.scrollBackground, // Light blue-gray background for scrollable content
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
  },
  cardItem: {
    backgroundColor: Colors.cardBackground, // Pure white for card items
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  cardWord: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: '#1a1f36', // Darker text for better contrast
  },
  cardDefinition: {
    fontSize: 16,
    color: '#3c4257', // Darker secondary text for better readability
    lineHeight: 22,
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    justifyContent:'space-between',
    position: 'relative',
  },
  bottomActionsBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.5)',
  },
  addCardButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  shareButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 10,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#7c3aed',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  deleteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#ef4444', // Red color for better visibility
    fontWeight: '300',
    lineHeight: 22,
  },

});