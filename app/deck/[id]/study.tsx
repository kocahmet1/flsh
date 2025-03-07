import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, useWindowDimensions, SafeAreaView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useDeck } from '../../../src/hooks/useDeck';
import FlashCard from '../../../src/components/FlashCard.js';
import ProgressBar from '../../../src/components/ProgressBar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

// Modern color palette - matching FlashCard component
const Colors = {
  primary: '#6366F1', // Indigo
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  secondary: '#EC4899', // Pink
  secondaryLight: '#F472B6',
  accent: '#3B82F6', // Blue
  surface: '#FFFFFF',
  surfaceAlt: '#F8F8FF',
  backgroundGradient: ['#F9FAFB', '#F3F4F6'],
  cardShadow: '#000000',
  text: '#111827',
  textSecondary: '#4B5563',
  hint: '#6B7280',
  success: '#10B981', // Green
  error: '#EF4444', // Red
};

export default function StudyScreen() {
  // Use window dimensions hook for responsive layout
  const { width: screenWidth } = useWindowDimensions();

  const { id, mode } = useLocalSearchParams();
  const { deck, loading, updateCardStatus } = useDeck(id);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [studyCards, setStudyCards] = useState([]);

  // Animation values for the next card
  const nextCardScale = useSharedValue(0.92);
  const nextCardOpacity = useSharedValue(0.6);

  // Animated styles for the next card
  const nextCardAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: nextCardScale.value }],
      opacity: nextCardOpacity.value,
    };
  });

  // Calculate responsive sizes based on screen width
  const getResponsiveSize = (size) => {
    const scaleFactor = Math.min(screenWidth / 375, 1.3); // 375 is baseline width (iPhone 6/7/8)
    return Math.round(size * scaleFactor);
  };

  useEffect(() => {
    if (deck?.cards) {
      if (mode === 'unknown') {
        setStudyCards(deck.cards.filter(card => !card.isKnown));
      } else {
        setStudyCards(deck.cards);
      }
    }
  }, [deck, mode]);

  // Check if there are any known cards in the deck
  const hasKnownCards = deck?.cards?.some(card => card.isKnown) || false;

  const handleSwipe = async (direction) => {
    const currentCard = studyCards[currentIndex];

    if (direction === 'left') {
      // Remove the automatic marking as known when swiping left
      // await updateCardStatus(currentCard.id, true);

      if (currentIndex < studyCards.length - 1) {
        // Immediately animate the next card to full size
        nextCardScale.value = withSpring(1, { damping: 15, stiffness: 100 });
        nextCardOpacity.value = withTiming(1, { duration: 200 });

        // Set the new index after a very short delay
        // This ensures the next card is already visible and in position
        setTimeout(() => {
          setCurrentIndex(currentIndex + 1);

          // Reset the animation values for the next card in the stack after the index has changed
          // This ensures we don't see the old card content again
          setTimeout(() => {
            nextCardScale.value = withTiming(0.92, { duration: 100 });
            nextCardOpacity.value = withTiming(0.6, { duration: 100 });
          }, 100);
        }, 50);
      } else {
        router.push({
          pathname: `/deck/${id}/results`,
          params: {
            totalCards: studyCards.length,
            knownCards: studyCards.filter(card => card.isKnown).length
          }
        });
      }
    } else if (direction === 'right') {
      // Go to previous card when swiping right
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    }
  };

  const handleKnow = async (isMarkedKnown) => {
    const currentCard = studyCards[currentIndex];
    const success = await updateCardStatus(currentCard.id, isMarkedKnown);
    if (success) {
      // Update the local state to reflect the change
      const updatedCards = [...studyCards];
      updatedCards[currentIndex] = { ...updatedCards[currentIndex], isKnown: isMarkedKnown };
      setStudyCards(updatedCards);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <LinearGradient
          colors={Colors.backgroundGradient}
          style={styles.gradientBackground}
        >
          <ActivityIndicator size="large" color={Colors.primary} />
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (!deck) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <LinearGradient
          colors={Colors.backgroundGradient}
          style={styles.gradientBackground}
        >
          <Animated.Text 
            entering={FadeInUp.duration(300)}
            style={styles.errorMessage}
          >
            Deck not found
          </Animated.Text>
          <Animated.View
            entering={FadeInUp.duration(300).delay(100)}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <MaterialIcons name="arrow-back" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Go Back</Text>
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (!studyCards || studyCards.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <LinearGradient
          colors={Colors.backgroundGradient}
          style={styles.gradientBackground}
        >
          <Animated.View
            entering={FadeInUp.duration(300)}
            style={styles.emptyContainer}
          >
            <MaterialIcons name="school" size={getResponsiveSize(64)} color={Colors.primaryLight} style={styles.emptyIcon} />
            <Text style={styles.message}>
              {mode === 'unknown' ? 'No unchecked cards in this deck' : 'No cards in this deck'}
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push(`/deck/${id}/add-card`)}
            >
              <MaterialIcons name="add" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Add Cards</Text>
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const progress = ((currentIndex) / studyCards.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={Colors.backgroundGradient}
        style={styles.gradientBackground}
      >
        <View style={styles.headerContainer}>
          <View style={styles.titleRow}>
            <TouchableOpacity
              style={styles.backButtonSmall}
              onPress={() => router.back()}
            >
              <MaterialIcons name="arrow-back" size={getResponsiveSize(20)} color="#555" />
            </TouchableOpacity>
            <Text style={styles.deckTitle}>{deck.name}</Text>
            
            {/* Show Edit Set button in the title row when Study Whole Set won't appear */}
            {!(mode === 'unknown' && hasKnownCards) && (
              <TouchableOpacity
                style={[styles.detailsButton, styles.detailsButtonInline]}
                onPress={() => router.push(`/deck/${id}`)}
              >
                <Text style={styles.detailsButtonText}>Edit Set</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Only show buttons row when Study Whole Set button needs to appear */}
          {(mode === 'unknown' && hasKnownCards) && (
            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={styles.studyAllButton}
                onPress={() => router.push(`/deck/${id}/study`)}
              >
                <Text style={styles.studyAllButtonText}>Study Whole Set</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.detailsButton}
                onPress={() => router.push(`/deck/${id}`)}
              >
                <Text style={styles.detailsButtonText}>Edit Set</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Animated.View
          entering={FadeInDown.duration(300)}
          style={styles.progressContainer}
        >
          <ProgressBar progress={progress} color={Colors.success} enableAnimation={false} />
          <Text style={styles.counter}>
            <MaterialIcons name="style" size={16} color={Colors.textSecondary} style={styles.counterIcon} />
            {' '}{currentIndex + 1} / {studyCards.length}
          </Text>
        </Animated.View>

        <View style={styles.cardStackContainer}>
          {/* Next card container - always rendered but content is conditional */}
          <Animated.View style={[styles.nextCardContainer, nextCardAnimatedStyle]}>
            {currentIndex < studyCards.length - 1 && (
              <FlashCard
                front={studyCards[currentIndex + 1].front}
                back={studyCards[currentIndex + 1].back}
                sampleSentence={studyCards[currentIndex + 1].sampleSentence}
                onSwipe={() => {}} // Empty function since this card isn't interactive yet
                onKnow={() => {}}
                isKnown={studyCards[currentIndex + 1].isKnown}
                key={`next-card-${currentIndex + 1}`}
              />
            )}
          </Animated.View>

          {/* Current card (on top) */}
          <View style={styles.currentCardContainer}>
            {studyCards && studyCards.length > 0 && currentIndex < studyCards.length && (
              <FlashCard
                front={studyCards[currentIndex].front}
                back={studyCards[currentIndex].back}
                sampleSentence={studyCards[currentIndex].sampleSentence}
                onSwipe={handleSwipe}
                onKnow={handleKnow}
                isKnown={studyCards[currentIndex].isKnown}
                key={`card-${currentIndex}`}
              />
            )}
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  headerContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    position: 'relative',
    paddingLeft: 40, // Padding only on left to accommodate back button
    paddingRight: 0, // Remove right padding to allow button to align with edge
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 16, // Match with progressContainer's paddingHorizontal
    paddingRight: 0, // Align with container edge
  },
  deckTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    flex: 1, // Add flex to allow proper centering when buttons are present
  },
  backButtonSmall: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(240, 240, 240, 0.8)',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 10, // Ensure the button is always clickable
    position: 'absolute',
    left: 0,
  },
  studyAllButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    flexDirection: 'row',
  },
  studyAllButtonText: {
    color: '#10B981',
    fontWeight: '600',
    fontSize: 14,
  },
  detailsButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    flexDirection: 'row',
  },
  detailsButtonText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  detailsButtonInline: {
    minWidth: 80, // Ensure consistent width for alignment
    marginRight: 0, // Ensure it aligns with the edge
  },
  progressContainer: {
    paddingHorizontal: 16,
    marginBottom: 6,
    marginTop: 0,
  },
  counter: {
    textAlign: 'center',
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterIcon: {
    marginRight: 4,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: 24,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  errorMessage: {
    fontSize: 18,
    textAlign: 'center',
    color: Colors.error,
    marginBottom: 24,
    fontWeight: '600',
    paddingHorizontal: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  addButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    fontWeight: '600',
    fontSize: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  cardStackContainer: {
    flex: 1,
    position: 'relative',
  },
  nextCardContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  currentCardContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
});