import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Platform, Image, Animated } from 'react-native';
import { router } from 'expo-router';
import { useDecks } from '../../src/hooks/useDecks';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ProgressBar from '../../src/components/ProgressBar';

// Create a separate component for set items to properly use hooks
const SetItem = React.memo(({ item, index, onDelete }) => {
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

  // Create animations
  const itemFade = useRef(new Animated.Value(0)).current;
  const itemScale = useRef(new Animated.Value(0.9)).current;
  
  // Start animations when component mounts
  useEffect(() => {
    // Calculate staggered animation delay based on item index
    const itemDelay = index * 100;
    
    Animated.sequence([
      Animated.delay(itemDelay),
      Animated.parallel([
        Animated.timing(itemFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(itemScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: Platform.OS !== 'web',
        })
      ])
    ]).start();
  }, [index]);

  const handleDelete = (e) => {
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
        'Delete Set',
        'Are you sure you want to permanently delete this set? This action cannot be undone and all cards in this set will be lost.'
      );
      if (confirmed) {
        onDelete(item.id);
      }
    } else {
      Alert.alert(
        'Delete Set',
        'Are you sure you want to permanently delete this set? This action cannot be undone and all cards in this set will be lost.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Delete Permanently',
            style: 'destructive',
            onPress: () => onDelete(item.id)
          }
        ]
      );
    }
  };

  return (
    <Animated.View
      style={[
        Platform.OS !== 'web' ? {
          opacity: itemFade,
          transform: [{ scale: itemScale }]
        } : {}
      ]}
      className="set-card"
    >
      <TouchableOpacity 
        style={styles.setCard}
        onPress={() => router.push({
          pathname: `/deck/${item.id}/study`,
          params: { mode: 'unknown' }
        })}
      >
        <View style={styles.deleteButtonContainer}>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDelete}
          >
            <Text style={styles.deleteButtonText}>×</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.setName}>
          {item.name ? item.name.replace(/ \((?:Auto-)?Forked\)$/, '') : ''}
        </Text>
        <View style={styles.progressContainer}>
          {/* Using the enhanced ProgressBar component */}
          <View style={styles.progressBarOuter} className="progress-bar">
            <ProgressBar progress={progress} />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>
        <Text style={styles.cardCount}>{knownCards} of {totalCards} words learned</Text>
        {item.forkedFrom && (
          <Text style={styles.forkedFrom}>
            {item.autoForked ? "Shared by system" : `Forked from: ${item.forkedFrom.name}`}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function SetScreen() {
  const { decks, loading, error, deleteDeck, refreshDecks } = useDecks();
  const [refreshing, setRefreshing] = React.useState(false);
  
  // Animation values for card effects
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Debug: Log decks whenever they change
  useEffect(() => {
    console.log(`[MySets] Sets updated, count: ${decks?.length || 0}`);
    if (decks?.length > 0) {
      console.log(`[MySets] First set: ${decks[0].name}, id: ${decks[0].id}`);
    }
    
    // Start fade-in and scale-up animation when decks are loaded
    if (decks?.length >= 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: Platform.OS !== 'web',
        })
      ]).start();
    }
  }, [decks]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);

    // Force a refresh of the decks data
    console.log('[MySets] Forcing refresh of sets data');
    refreshDecks();

    // Set a timeout to reset the refreshing state
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, [refreshDecks]);

  const handleDeleteDeck = async (deckId) => {
    try {
      console.log('Attempting to delete set:', deckId);
      const success = await deleteDeck(deckId);
      console.log('Set deletion result:', success);

      if (success) {
        console.log('Set deleted successfully');
        // Force a refresh of the decks data
        refreshDecks();
      } else {
        console.error('Failed to delete set');
        Alert.alert('Error', 'Failed to delete set. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting set:', error);
      Alert.alert('Error', 'Failed to delete set. Please try again.');
    }
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
    <Animated.View 
      style={[
        styles.container,
        Platform.OS !== 'web' ? {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        } : {}
      ]}
    >
      <Image 
        source={require('../../assets/images/1630603219122.jpeg')} 
        style={styles.backgroundLogo}
        resizeMode="contain"
      />
      <FlatList
        key={`sets-list-${decks?.length || 0}`}
        data={decks}
        renderItem={({ item, index }) => (
          <SetItem 
            item={item} 
            index={index}
            onDelete={handleDeleteDeck}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No flashcard sets yet. Create one to get started!</Text>
        }
        ListFooterComponent={
          <View>
            <TouchableOpacity
              style={styles.createSetButton}
              onPress={() => router.push('/add-set')}
              className="create-button"
            >
              <View style={styles.circleButtonContent}>
                <View style={styles.circleIcon}>
                  <MaterialCommunityIcons name="plus" size={24} color="#0F766E" />
                </View>
                <Text style={styles.createSetButtonText}>Create New Set</Text>
              </View>
            </TouchableOpacity>

            {/* Import button removed as requested */}
          </View>
        }
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#2B2D42', 
    backgroundImage: Platform.OS === 'web' ? 
      'linear-gradient(180deg, #2B2D42 0%, #454869 100%), url("data:image/svg+xml,%3Csvg width=\'80\' height=\'80\' viewBox=\'0 0 80 80\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%236366F1\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10S0 25.523 0 20s4.477-10 10-10zm10 8c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm40 40c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z\' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' 
      : undefined,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 12,
  },
  setCard: {
    backgroundColor: '#FFFFFF',
    backgroundImage: Platform.OS === 'web' ? 
      'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 245, 249, 0.9) 100%), url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-.895-3-2-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-.895-3-2-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-.895-3-2-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-.895-3-2-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%238C9EFF\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")' 
      : undefined,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: Platform.OS === 'web' ? '#000' : '#FFD580', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    position: 'relative',
    ...(Platform.OS === 'web' && {
      boxShadow: '0 0 8px 3px rgba(255, 213, 128, 0.35)' 
    }),
    borderWidth: Platform.OS === 'web' ? 2 : 3,
    borderColor: '#0077e6', 
  },
  setName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#4338CA',
    textShadow: Platform.OS === 'web' ? '0 1px 1px rgba(67, 56, 202, 0.1)' : 'none',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressBarOuter: {
    flex: 1,
    marginRight: 10,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    width: 40,
    textAlign: 'right',
  },
  cardCount: {
    fontSize: 14,
    color: '#6D729E',
    fontWeight: '500',
  },
  forkedFrom: {
    fontSize: 12,
    color: '#A5B4FC',
    fontStyle: 'italic',
    marginTop: 6,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#E2E8F0',
    marginTop: 32,
    marginBottom: 32,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: '#F87171',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#8286d9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  deleteButtonContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
    lineHeight: 18,
    textAlign: 'center',
  },
  /* Styles for createSetButton removed */
  circleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#d8daff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  // Styles for importSetButton removed
  importSetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  importCircleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#d6c9fc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backgroundLogo: {
    position: 'absolute',
    width: 120,
    height: 120,
    opacity: 0.05,
    right: 10,
    bottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
});