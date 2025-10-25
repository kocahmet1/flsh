import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, useWindowDimensions, SafeAreaView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useDeck } from '../../../src/hooks/useDeck';
import { useTracking } from '../../../src/hooks/useTracking';
import FlashCard from '../../../src/components/FlashCard.js';
import ProgressBar from '../../../src/components/ProgressBar';
import AudioPlayer from '../../../src/components/AudioPlayer';
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
  backgroundGradient: ['#3D4B7A', '#2C3E6B'], // Deep blue gradient like reference image for better shadow visibility
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
  const { recordStudySession } = useTracking();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [studyCards, setStudyCards] = useState([]);
  const [cardShouldShowBack, setCardShouldShowBack] = useState(false);
  const [audioPlayingForCard, setAudioPlayingForCard] = useState(null);
  const [jumpAnimation, setJumpAnimation] = useState({ active: false, direction: null, count: 0 });
  
  // Track study session timing
  const studyStartTime = useRef(null);
  const cardsStudiedCount = useRef(0);
  
  // Animation values for jump effect
  const jumpAnimValue = useSharedValue(0);
  const jumpOpacity = useSharedValue(1);

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

  // Animated styles for jump effect
  const jumpAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { 
          translateX: jumpAnimValue.value 
        },
        {
          rotateZ: `${jumpAnimValue.value / 20}deg`
        }
      ],
      opacity: jumpOpacity.value,
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

  // Start study session timer when component mounts
  useEffect(() => {
    studyStartTime.current = new Date();
    console.log('[StudyScreen] Study session started');

    // Record study session when component unmounts
    return () => {
      if (deck && studyStartTime.current) {
        const endTime = new Date();
        const durationMinutes = (endTime - studyStartTime.current) / (1000 * 60);
        
        // Only record if user studied for at least 5 seconds
        if (durationMinutes > 0.08) {
          console.log(`[StudyScreen] Recording study session on unmount: ${durationMinutes.toFixed(2)} minutes, ${cardsStudiedCount.current} cards studied`);
          
          // Fire and forget - record stats in background
          // Note: Words mastered is now calculated from actual deck data in real-time
          recordStudySession(deck.id, deck.name, cardsStudiedCount.current, durationMinutes).catch(err => {
            console.error('[StudyScreen] Error recording session on unmount:', err);
          });
        }
      }
    };
  }, [deck, recordStudySession]);

  // Check if there are any known cards in the deck
  const hasKnownCards = deck?.cards?.some(card => card.isKnown) || false;

  // Handle audio playback changes to sync card flipping
  const handleAudioChange = ({ cardIndex, audioType, text }) => {
    console.log(`[StudyScreen] Audio change: card ${cardIndex}, type: ${audioType}`);
    
    // Update the displayed card index if different
    if (cardIndex !== currentIndex) {
      setCurrentIndex(cardIndex);
      setCardShouldShowBack(false); // Reset to front for new card
    }
    
    // Control card flip based on audio type
    if (audioType === 'word') {
      // Show front (word) when word audio is playing
      setCardShouldShowBack(false);
    } else if (audioType === 'definition' || audioType === 'sentence') {
      // Show back (definition + sentence) when definition or sentence audio is playing
      setCardShouldShowBack(true);
    }
    
    setAudioPlayingForCard(cardIndex);
  };

  const handleSwipe = async (direction) => {
    const currentCard = studyCards[currentIndex];

    if (direction === 'left') {
      // Track that user studied this card
      cardsStudiedCount.current++;
      
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
        // Record final stats before leaving
        if (deck && studyStartTime.current) {
          const endTime = new Date();
          const durationMinutes = (endTime - studyStartTime.current) / (1000 * 60);
          await recordStudySession(deck.id, deck.name, cardsStudiedCount.current, durationMinutes);
        }
        
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
      
      // Note: Words mastered count is now calculated in real-time from deck data
      // No need to track incremental changes here
    }
  };

  const handleProgressBarPress = (clickedPercentage) => {
    // Calculate which card index corresponds to the clicked position
    // Clamp the percentage between 0 and 100
    const clampedPercentage = Math.max(0, Math.min(100, clickedPercentage));
    
    // Calculate the card index (0-based)
    // We use Math.floor to round down, so clicking at the very end goes to the last card
    const targetIndex = Math.floor((clampedPercentage / 100) * studyCards.length);
    
    // Make sure we don't go beyond the last card
    const newIndex = Math.min(targetIndex, studyCards.length - 1);
    
    // Don't do anything if clicking on the same card
    if (newIndex === currentIndex) {
      return;
    }
    
    // Determine direction and distance
    const direction = newIndex > currentIndex ? 'forward' : 'backward';
    const distance = Math.abs(newIndex - currentIndex);
    
    console.log(`[StudyScreen] Progress bar clicked at ${clampedPercentage.toFixed(1)}%, jumping ${direction} by ${distance} cards to card ${newIndex + 1}/${studyCards.length}`);
    
    // Reset card flip state when jumping to a new card
    setCardShouldShowBack(false);
    
    // Trigger jump animation
    const targetX = direction === 'forward' ? -screenWidth * 1.5 : screenWidth * 1.5;
    
    // Animate cards flying away
    jumpAnimValue.value = 0;
    jumpOpacity.value = 1;
    
    jumpAnimValue.value = withTiming(targetX, { 
      duration: 300,
    });
    jumpOpacity.value = withTiming(0, { 
      duration: 300,
    });
    
    // Set animation state for visual effect
    setJumpAnimation({ active: true, direction, count: Math.min(distance, 3) });
    
    // Update the index after animation starts
    setTimeout(() => {
      setCurrentIndex(newIndex);
      
      // Reset animation values for next card entrance
      jumpAnimValue.value = direction === 'forward' ? screenWidth * 0.3 : -screenWidth * 0.3;
      jumpOpacity.value = 0;
      
      // Animate new card in
      jumpAnimValue.value = withSpring(0, {
        damping: 15,
        stiffness: 100,
      });
      jumpOpacity.value = withTiming(1, {
        duration: 200,
      });
      
      // Clear animation state after animation completes
      setTimeout(() => {
        // First, ensure animation values are at their final position
        jumpAnimValue.value = 0;
        jumpOpacity.value = 1;
        // Then clear the animation state (which stops applying the animated style)
        setJumpAnimation({ active: false, direction: null, count: 0 });
      }, 300);
    }, 150);
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
              <MaterialIcons name="arrow-back" size={getResponsiveSize(20)} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.deckTitle}>{deck.name}</Text>
            
            {/* Always show Edit Set button with edit icon */}
            <TouchableOpacity
              style={[styles.editDeckButton]}
              onPress={() => router.push(`/deck/${id}`)}
            >
              <MaterialIcons name="edit" size={18} color={Colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.editDeckButtonText}>Edit Deck</Text>
            </TouchableOpacity>
          </View>
          
          {/* Show Study Whole Set button when in unknown mode with known cards */}
          {(mode === 'unknown' && hasKnownCards) && (
            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={styles.studyAllButton}
                onPress={() => router.push(`/deck/${id}/study`)}
              >
                <MaterialIcons name="school" size={16} color="#10B981" style={{ marginRight: 4 }} />
                <Text style={styles.studyAllButtonText}>Study Whole Set</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Animated.View
          entering={FadeInDown.duration(300)}
          style={styles.progressContainer}
        >
          <ProgressBar 
            progress={progress} 
            color={Colors.success} 
            enableAnimation={false} 
            onPress={handleProgressBarPress}
          />
          <Text style={styles.counter}>
            <MaterialIcons name="style" size={16} color="#FFFFFF" style={styles.counterIcon} />
            {' '}{currentIndex + 1} / {studyCards.length}
          </Text>
        </Animated.View>

        {/* Audio Player */}
        {studyCards && studyCards.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(300).delay(100)}
            style={styles.audioPlayerContainer}
          >
            <AudioPlayer 
              cards={studyCards} 
              currentCardIndex={currentIndex}
              onPlaybackComplete={() => console.log('Playback completed!')}
              onAudioChange={handleAudioChange}
            />
          </Animated.View>
        )}

        <View style={styles.cardStackContainer}>
          {/* Next card container - always rendered but content is conditional */}
          <Animated.View style={[styles.nextCardContainer, nextCardAnimatedStyle]}>
            {currentIndex < studyCards.length - 1 && (
              <FlashCard
                front={studyCards[currentIndex + 1].front}
                back={studyCards[currentIndex + 1].back}
                sampleSentence={studyCards[currentIndex + 1].sampleSentence}
                imageData={studyCards[currentIndex + 1].imageData}
                onSwipe={() => {}} // Empty function since this card isn't interactive yet
                onKnow={() => {}}
                isKnown={studyCards[currentIndex + 1].isKnown}
                key={`next-card-${currentIndex + 1}`}
              />
            )}
          </Animated.View>

          {/* Flying cards during jump animation - show 1-2 shadow cards */}
          {jumpAnimation.active && jumpAnimation.count > 1 && (
            <>
              <Animated.View 
                style={[
                  styles.flyingCardContainer,
                  jumpAnimatedStyle,
                  { 
                    zIndex: 1.5,
                  }
                ]}
              >
                <View style={[styles.flyingCardPlaceholder, { transform: [{ scale: 0.97 }, { translateY: -8 }], opacity: 0.6 }]} />
              </Animated.View>
              
              {jumpAnimation.count > 2 && (
                <Animated.View 
                  style={[
                    styles.flyingCardContainer,
                    jumpAnimatedStyle,
                    { 
                      zIndex: 1.3,
                    }
                  ]}
                >
                  <View style={[styles.flyingCardPlaceholder, { transform: [{ scale: 0.94 }, { translateY: -16 }], opacity: 0.4 }]} />
                </Animated.View>
              )}
            </>
          )}

          {/* Current card (on top) */}
          <Animated.View style={[styles.currentCardContainer, jumpAnimation.active ? jumpAnimatedStyle : null]}>
            {studyCards && studyCards.length > 0 && currentIndex < studyCards.length && (
              <>
                {console.log('[StudyScreen] Rendering card:', {
                  cardId: studyCards[currentIndex].id,
                  front: studyCards[currentIndex].front,
                  hasImageData: !!studyCards[currentIndex].imageData,
                  imageDataLength: studyCards[currentIndex].imageData?.length || 0,
                  imageDataPreview: studyCards[currentIndex].imageData?.substring(0, 50) || 'none'
                })}
                <FlashCard
                  front={studyCards[currentIndex].front}
                  back={studyCards[currentIndex].back}
                  sampleSentence={studyCards[currentIndex].sampleSentence}
                  imageData={studyCards[currentIndex].imageData}
                  onSwipe={handleSwipe}
                  onKnow={handleKnow}
                  isKnown={studyCards[currentIndex].isKnown}
                  shouldShowBack={cardShouldShowBack}
                  key={`card-${currentIndex}`}
                />
              </>
            )}
          </Animated.View>
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
    padding: 12,
    paddingBottom: 4,
    zIndex: 100, // Ensure header stays on top
    backgroundColor: 'transparent',
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
    color: '#FFFFFF', // White text for dark background
    textAlign: 'center',
    flex: 1, // Add flex to allow proper centering when buttons are present
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  backButtonSmall: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
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
  editDeckButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 101, // Ensure button stays clickable and visible
  },
  editDeckButtonText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  progressContainer: {
    paddingHorizontal: 12,
    marginBottom: 4,
    marginTop: 0,
    zIndex: 90, // Ensure progress bar stays on top
  },
  audioPlayerContainer: {
    paddingHorizontal: 12,
    marginBottom: 8,
    zIndex: 85, // Ensure audio player stays on top
  },
  counter: {
    textAlign: 'center',
    fontSize: 14,
    color: '#FFFFFF', // White text for dark background
    marginTop: 2,
    marginBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.9,
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
  flyingCardContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  flyingCardPlaceholder: {
    flex: 1,
    margin: 8,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    shadowColor: Colors.cardShadow,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
});