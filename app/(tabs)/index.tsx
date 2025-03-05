import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Platform, Image } from 'react-native';
import { router } from 'expo-router';
import { useDecks } from '../../src/hooks/useDecks';
import React, { useState, useCallback, useEffect } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function DeckScreen() {
  const { decks, loading, error, deleteDeck, refreshDecks } = useDecks();
  const [refreshing, setRefreshing] = React.useState(false);

  // Debug: Log decks whenever they change
  useEffect(() => {
    console.log(`[MyDecks] Decks updated, count: ${decks?.length || 0}`);
    if (decks?.length > 0) {
      console.log(`[MyDecks] First deck: ${decks[0].name}, id: ${decks[0].id}`);
    }
  }, [decks]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);

    // Force a refresh of the decks data
    console.log('[MyDecks] Forcing refresh of decks data');
    refreshDecks();

    // Set a timeout to reset the refreshing state
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, [refreshDecks]);

  const renderDeckItem = ({ item }) => {
    // Handle both array and object data structures for cards
    let cardsArray = [];
    if (item.cards) {
      cardsArray = Array.isArray(item.cards) 
        ? item.cards 
        : Object.values(item.cards);
    }

    const knownCards = cardsArray.filter(card => card.isKnown)?.length || 0;
    const totalCards = cardsArray.length;
    const progress = totalCards > 0 ? (knownCards / totalCards) * 100 : 0;

    return (
      <TouchableOpacity 
        style={styles.deckCard}
        onPress={() => router.push(`/deck/${item.id}`)}
      >
        <View style={styles.deleteButtonContainer}>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={(e) => {
              // Prevent the parent TouchableOpacity from being triggered
              if (e && e.stopPropagation) {
                e.stopPropagation();
              }

              // For web, we need to prevent default as well
              if (Platform.OS === 'web' && e && e.preventDefault) {
                e.preventDefault();
              }

              if (Platform.OS === 'web') {
                const confirmed = window.confirm(
                  'Delete Deck',
                  'Are you sure you want to permanently delete this deck? This action cannot be undone and all cards in this deck will be lost.'
                );
                if (confirmed) {
                  deleteDeck(item.id).then((success) => {
                    if (success) {
                      console.log('Deck deleted successfully');
                      // Force a refresh of the decks data
                      refreshDecks();
                    } else {
                      console.error('Failed to delete deck');
                      Alert.alert('Error', 'Failed to delete deck. Please try again.');
                    }
                  }).catch((error) => {
                    console.error('Error deleting deck:', error);
                    Alert.alert('Error', 'Failed to delete deck. Please try again.');
                  });
                }
              } else {
                Alert.alert(
                  'Delete Deck',
                  'Are you sure you want to permanently delete this deck? This action cannot be undone and all cards in this deck will be lost.',
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel'
                    },
                    {
                      text: 'Delete Permanently',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          console.log('Attempting to delete deck:', item.id);
                          const success = await deleteDeck(item.id);
                          console.log('Deck deletion result:', success);

                          if (success) {
                            console.log('Deck deleted successfully');
                            // Force a refresh of the decks data
                            refreshDecks();
                          } else {
                            console.error('Failed to delete deck');
                            Alert.alert('Error', 'Failed to delete deck. Please try again.');
                          }
                        } catch (error) {
                          console.error('Error deleting deck:', error);
                          Alert.alert('Error', 'Failed to delete deck. Please try again.');
                        }
                      }
                    }
                  ]
                );
              }
            }}
          >
            <Text style={styles.deleteButtonText}>×</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.deckName}>{item.name}</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBarOuter}>
            <View style={styles.progressBarShadow}>
              <View style={styles.progressBarInner}>
                {/* Orange background (unchecked words) */}
                <View style={[styles.progressFill, styles.orangeFill]} />

                {/* Green overlay for checked words */}
                {progress > 0 && (
                  <View 
                    style={[
                      styles.progressFill,
                      styles.greenFill,
                      { width: `${progress}%` }
                    ]} 
                  />
                )}
              </View>
            </View>
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>
        <Text style={styles.cardCount}>{knownCards} of {totalCards} words learned</Text>
        {item.forkedFrom && (
          <Text style={styles.forkedFrom}>
            Forked from: {item.forkedFrom.name}
          </Text>
        )}
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
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image 
        source={require('../../assets/images/1630603219122.jpeg')} 
        style={styles.backgroundLogo}
        resizeMode="contain"
      />
      <FlatList
        key={`decks-list-${decks?.length || 0}`}
        data={decks}
        renderItem={renderDeckItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No flashcard decks yet. Create one to get started!</Text>
        }
        ListFooterComponent={
          <View>
            <TouchableOpacity
              style={styles.createDeckButton}
              onPress={() => router.push('/add-deck')}
            >
              <View style={styles.circleButtonContent}>
                <View style={styles.circleIcon}>
                  <MaterialCommunityIcons name="plus" size={24} color="#007AFF" />
                </View>
                <Text style={styles.createDeckButtonText}>Create New Deck</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.importDeckButton}
              onPress={() => router.push('/deck-gallery')}
            >
              <View style={styles.circleButtonContent}>
                <View style={styles.importCircleIcon}>
                  <MaterialCommunityIcons name="download" size={24} color="#E57C23" />
                </View>
                <Text style={styles.importDeckButtonText}>Import Deck from Gallery</Text>
              </View>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 12,
  },
  deckCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    paddingVertical: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  deckName: {
    fontSize: 18,
    fontWeight: 'normal',
    marginBottom: 10,
    color: '#333',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressBarOuter: {
    flex: 1,
    height: 32,
    backgroundColor: '#e0e0e0',
    borderRadius: 16,
    padding: 3,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  progressBarShadow: {
    flex: 1,
    borderRadius: 13,
    backgroundColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 3,
  },
  progressBarInner: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '100%',
    borderRadius: 10,
  },
  orangeFill: {
    backgroundColor: '#FFB74D',
    borderRightWidth: 1,
    borderColor: '#F57C00',
    shadowColor: '#F57C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    elevation: 6,
  },
  greenFill: {
    backgroundColor: '#4CAF50',
    borderRightWidth: 1,
    borderColor: '#2E7D32',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 7,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    width: 40,
    textAlign: 'right',
  },
  cardCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  forkedFrom: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 6,
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
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButtonContainer: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 10,
  },
  deleteButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
    opacity: 0.7,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      pointerEvents: 'auto',
    } : {}),
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
    lineHeight: 18,
    textAlign: 'center',
  },
  createDeckButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 16,
    marginTop: 20,
    borderRadius: 8,
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  createDeckButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  circleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  importDeckButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 16,
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: '#fff0da', 
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  importDeckButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#E57C23', 
  },
  importCircleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#E57C23',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backgroundLogo: {
    position: 'absolute',
    width: '100%',
    height: 300,
    opacity: 0.1,
    alignSelf: 'center',
    top: '40%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
});