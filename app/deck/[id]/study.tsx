// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import FlashCard from '../../../src/components/FlashCard.js';
import AudioPlayer from '../../../src/components/AudioPlayer';
import { useDeck } from '../../../src/hooks/useDeck';
import { useTracking } from '../../../src/hooks/useTracking';
import { useApp } from '../../../src/context/AppContext';

export default function StudyScreen() {
  const { id, mode } = useLocalSearchParams();
  const { theme } = useApp();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c, theme.name === 'dark'), [c, theme.name]);
  const { deck, loading, updateCardStatus } = useDeck(id);
  const { recordStudySession } = useTracking();
  const isAllCardsMode = mode === 'all';

  const [studyCards, setStudyCards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardShouldShowBack, setCardShouldShowBack] = useState(false);
  const [cardStageHeight, setCardStageHeight] = useState(0);
  const [audioPlayingForCard, setAudioPlayingForCard] = useState<number | null>(null);
  const [isExpelling, setIsExpelling] = useState(false);

  const handleAudioChange = ({ cardIndex, audioType, text }: { cardIndex: number; audioType: string; text: string }) => {
    console.log(`[StudyScreen] Audio change: card ${cardIndex}, type: ${audioType}`);
    
    if (cardIndex !== currentIndex) {
      setCurrentIndex(cardIndex);
      setCardShouldShowBack(false);
    }
    
    if (audioType === 'word') {
      setCardShouldShowBack(false);
    } else if (audioType === 'definition' || audioType === 'sentence') {
      setCardShouldShowBack(true);
    }
    
    setAudioPlayingForCard(cardIndex);
  };

  const startTimeRef = useRef<Date | null>(null);
  const seenCardIdsRef = useRef<Set<string>>(new Set());
  const sessionRecordedRef = useRef(false);
  const initializedSessionRef = useRef<string | null>(null);
  const cardExitY = useRef(new Animated.Value(0)).current;
  const cardExitOpacity = useRef(new Animated.Value(1)).current;
  const cardExitScale = useRef(new Animated.Value(1)).current;
  const cardUpdateInProgressRef = useRef(false);
  const flashCardWidth = useMemo(() => Math.min(windowWidth - 32, 560), [windowWidth]);
  const flashCardHeight = useMemo(
    () => {
      const preferredHeight = Math.min(Math.max(windowHeight * 0.6, 320), 620);
      if (!cardStageHeight) return preferredHeight;

      return Math.max(240, Math.min(preferredHeight, cardStageHeight - 16));
    },
    [cardStageHeight, windowHeight]
  );
  const handleCardStageLayout = useCallback((event: any) => {
    const nextHeight = Math.floor(event.nativeEvent.layout.height);
    setCardStageHeight((currentHeight) =>
      Math.abs(currentHeight - nextHeight) > 1 ? nextHeight : currentHeight
    );
  }, []);

  const resetCardExitAnimation = useCallback(() => {
    cardExitY.setValue(0);
    cardExitOpacity.setValue(1);
    cardExitScale.setValue(1);
  }, [cardExitOpacity, cardExitScale, cardExitY]);

  const animateCardExit = useCallback(
    () =>
      new Promise<void>((resolve) => {
        const exitDistance = Math.max(cardStageHeight * 0.85, windowHeight * 0.55, 360);

        Animated.parallel([
          Animated.timing(cardExitY, {
            toValue: exitDistance,
            duration: 240,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(cardExitOpacity, {
            toValue: 0,
            duration: 180,
            delay: 45,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(cardExitScale, {
            toValue: 0.92,
            duration: 240,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start(() => resolve());
      }),
    [cardExitOpacity, cardExitScale, cardExitY, cardStageHeight, windowHeight]
  );

  useEffect(() => {
    if (!deck?.cards) return;

    const sessionKey = `${String(id)}:${isAllCardsMode ? 'all' : 'unknown'}`;
    if (initializedSessionRef.current === sessionKey) return;

    const filteredCards = isAllCardsMode
      ? deck.cards
      : deck.cards.filter((card: any) => !card.isKnown);

    initializedSessionRef.current = sessionKey;
    setStudyCards(filteredCards);
    setCurrentIndex(0);
    startTimeRef.current = new Date();
    seenCardIdsRef.current = filteredCards[0]?.id ? new Set([filteredCards[0].id]) : new Set();
    sessionRecordedRef.current = false;
  }, [deck, id, isAllCardsMode]);

  const currentCard = studyCards[currentIndex];
  const nextCard = studyCards[currentIndex + 1] || null;
  const prevCard = currentIndex > 0 ? studyCards[currentIndex - 1] : null;

  useEffect(() => {
    if (currentCard?.id) {
      seenCardIdsRef.current.add(currentCard.id);
    }
  }, [currentCard?.id]);

  const finishSession = useCallback(async () => {
    if (sessionRecordedRef.current || !deck || !startTimeRef.current) return;

    const durationMinutes = (Date.now() - startTimeRef.current.getTime()) / (1000 * 60);
    sessionRecordedRef.current = true;

    if (durationMinutes > 0.05) {
      await recordStudySession(
        deck.id,
        deck.name,
        seenCardIdsRef.current.size,
        durationMinutes
      );
    }
  }, [deck, recordStudySession]);

  useEffect(() => {
    return () => {
      finishSession();
    };
  }, [finishSession]);

  const toggleKnown = async (targetKnown?: boolean) => {
    if (!currentCard || cardUpdateInProgressRef.current) return;

    const nextKnown =
      typeof targetKnown === 'boolean' ? targetKnown : !currentCard.isKnown;
    const shouldExpel = nextKnown && !isAllCardsMode;
    cardUpdateInProgressRef.current = true;
    if (shouldExpel) setIsExpelling(true);

    try {
      const ok = await updateCardStatus(currentCard.id, nextKnown);
      if (!ok) return;

      if (shouldExpel) {
        await animateCardExit();
      }

      setCardShouldShowBack(false);
      resetCardExitAnimation();
      setStudyCards((cards) => {
        if (shouldExpel) {
          const remainingCards = cards.filter((card) => card.id !== currentCard.id);
          setCurrentIndex((index) => Math.min(index, Math.max(remainingCards.length - 1, 0)));
          return remainingCards;
        }

        return cards.map((card) =>
          card.id === currentCard.id ? { ...card, isKnown: nextKnown } : card
        );
      });
    } finally {
      setIsExpelling(false);
      cardUpdateInProgressRef.current = false;
    }
  };

  const goNext = async () => {
    if (!studyCards.length) return;

    if (currentIndex >= studyCards.length - 1) {
      await finishSession();
      const knownCards = studyCards.filter((card) => card.isKnown).length;
      router.replace({
        pathname: `/deck/${id}/results`,
        params: {
          totalCards: studyCards.length,
          knownCards,
        },
      });
      return;
    }

    setCardShouldShowBack(false);
    setCurrentIndex((value) => value + 1);
  };

  const goPrevious = () => {
    if (currentIndex === 0) return;
    setCardShouldShowBack(false);
    setCurrentIndex((value) => value - 1);
  };

  const handleCardSwipe = useCallback(
    (direction: 'left' | 'right') => {
      if (direction === 'right') {
        if (currentIndex === 0) return false;
        goPrevious();
        return true;
      }

      void goNext();
      return true;
    },
    [currentIndex, goNext]
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={c.tabBarActive} />
      </View>
    );
  }

  if (!deck || !studyCards.length) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="cards-outline" size={48} color={c.textSecondary} />
        <Text style={styles.emptyTitle}>
          {!isAllCardsMode ? 'No unknown cards to study' : 'This deck has no cards yet'}
        </Text>
        <Text style={styles.emptyBody}>
          {!isAllCardsMode
            ? 'Everything in this deck is already marked known.'
            : 'Add cards first, then come back to study.'}
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() =>
            !isAllCardsMode
              ? router.replace({
                  pathname: `/deck/${id}/study`,
                  params: { mode: 'all' },
                })
              : router.push(`/deck/${id}/add-card`)
          }
        >
          <Text style={styles.emptyButtonText}>
            {!isAllCardsMode ? 'Study All Cards' : 'Add Cards'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progress = Math.round(((currentIndex + 1) / studyCards.length) * 100);

  return (
    <LinearGradient
      colors={theme.name === 'dark' ? ['#0F172A', '#172554'] : ['#EFF6FF', '#FFFFFF']}
      style={styles.screen}
    >
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={c.text} />
        </TouchableOpacity>
        <View style={styles.topBarTitleWrap}>
          <Text style={styles.deckTitle}>{deck.name}</Text>
          <Text style={styles.counter}>
            Card {currentIndex + 1} of {studyCards.length}
          </Text>
        </View>
        <View style={styles.topBarActions}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Study all cards"
            accessibilityState={{ selected: isAllCardsMode }}
            style={[
              styles.allCardsButton,
              isAllCardsMode && styles.allCardsButtonActive,
            ]}
            onPress={() =>
              router.replace({
                pathname: `/deck/${id}/study`,
                params: { mode: 'all' },
              })
            }
          >
            <MaterialCommunityIcons
              name={isAllCardsMode ? 'cards' : 'cards-outline'}
              size={17}
              color="#713F12"
            />
            <Text style={styles.allCardsButtonText}>All Cards</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Edit deck"
            style={styles.iconButton}
            onPress={() => router.push(`/deck/${id}`)}
          >
            <MaterialCommunityIcons name="pencil-outline" size={22} color={c.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      {studyCards && studyCards.length > 0 && (
        <View style={styles.audioPlayerContainer}>
          <AudioPlayer 
            cards={studyCards} 
            currentCardIndex={currentIndex}
            onPlaybackComplete={() => console.log('Playback completed!')}
            onAudioChange={handleAudioChange}
          />
        </View>
      )}

      <View style={styles.cardStage} onLayout={handleCardStageLayout}>
        <Animated.View
          pointerEvents={isExpelling ? 'none' : 'auto'}
          style={{
            opacity: cardExitOpacity,
            transform: [
              { translateY: cardExitY },
              { scale: cardExitScale },
              {
                rotate: cardExitY.interpolate({
                  inputRange: [0, Math.max(cardStageHeight, 1)],
                  outputRange: ['0deg', '4deg'],
                  extrapolate: 'clamp',
                }),
              },
            ],
          }}
        >
          <FlashCard
            front={currentCard.front}
            back={currentCard.back}
            sampleSentence={currentCard.sampleSentence}
            imageData={currentCard.imageData}
            isKnown={currentCard.isKnown}
            onKnow={toggleKnown}
            onSwipe={handleCardSwipe}
            cardHeight={flashCardHeight}
            containerWidth={flashCardWidth}
            nextCardFront={nextCard?.front}
            prevCardFront={prevCard?.front}
            shouldShowBack={cardShouldShowBack}
            onFlipChange={setCardShouldShowBack}
            wordAudioUrl={currentCard.wordAudioUrl}
            definitionAudioUrl={currentCard.definitionAudioUrl}
            sentenceAudioUrl={currentCard.sentenceAudioUrl}
            wordAudioData={currentCard.wordAudioData}
            definitionAudioData={currentCard.definitionAudioData}
            sentenceAudioData={currentCard.sentenceAudioData}
          />
        </Animated.View>
      </View>

      <View style={styles.statusRow}>
        <View
          style={[
            styles.knownBadge,
            currentCard.isKnown ? styles.knownBadgeActive : styles.knownBadgeIdle,
          ]}
        >
          <MaterialCommunityIcons
            name={currentCard.isKnown ? 'check-circle' : 'progress-question'}
            size={16}
            color={currentCard.isKnown ? '#FFFFFF' : c.text}
          />
          <Text
            style={[
              styles.knownBadgeText,
              currentCard.isKnown && styles.knownBadgeTextActive,
            ]}
          >
            {currentCard.isKnown ? 'Marked known' : 'Still learning'}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.navButton,
            (currentIndex === 0 || isExpelling) && styles.disabledButton,
          ]}
          onPress={goPrevious}
          disabled={currentIndex === 0 || isExpelling}
        >
          <MaterialCommunityIcons name="chevron-left" size={18} color={c.text} />
          <Text style={styles.navButtonText}>Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, isExpelling && styles.disabledButton]}
          onPress={toggleKnown}
          disabled={isExpelling}
        >
          <MaterialCommunityIcons
            name={currentCard.isKnown ? 'close-circle-outline' : 'check-circle-outline'}
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.primaryButtonText}>
            {currentCard.isKnown ? 'Mark Unknown' : 'Mark Known'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, isExpelling && styles.disabledButton]}
          onPress={goNext}
          disabled={isExpelling}
        >
          <Text style={styles.navButtonText}>
            {currentIndex === studyCards.length - 1 ? 'Finish' : 'Next'}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={c.text} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

function createStyles(c: any, isDark: boolean) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 24,
    },
    centered: {
      flex: 1,
      backgroundColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    emptyTitle: {
      color: c.text,
      fontSize: 22,
      fontWeight: '800',
      marginTop: 14,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyBody: {
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 18,
    },
    emptyButton: {
      backgroundColor: c.buttonPrimaryBg,
      borderRadius: 14,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    emptyButtonText: {
      color: c.buttonPrimaryText,
      fontWeight: '800',
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      gap: 10,
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBarTitleWrap: {
      flex: 1,
      alignItems: 'center',
    },
    topBarActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    allCardsButton: {
      height: 42,
      borderRadius: 14,
      paddingHorizontal: 10,
      backgroundColor: '#FDE68A',
      borderWidth: 1,
      borderColor: '#FCD34D',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 5,
    },
    allCardsButtonActive: {
      backgroundColor: '#FBBF24',
      borderColor: '#F59E0B',
    },
    allCardsButtonText: {
      color: '#713F12',
      fontSize: 12,
      fontWeight: '800',
    },
    deckTitle: {
      color: c.text,
      fontSize: 20,
      fontWeight: '800',
      textAlign: 'center',
    },
    counter: {
      color: c.textSecondary,
      fontSize: 13,
      marginTop: 4,
    },
    progressTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: c.progressTrack,
      overflow: 'hidden',
      marginBottom: 20,
    },
    progressFill: {
      height: '100%',
      backgroundColor: c.progress,
      borderRadius: 999,
    },
    cardStage: {
      flex: 1,
      minHeight: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      zIndex: 1,
    },
    cardShell: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: c.border,
      padding: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardSideLabel: {
      color: c.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 14,
    },
    cardWord: {
      color: c.text,
      fontSize: 28,
      fontWeight: '800',
      textAlign: 'center',
      lineHeight: 36,
      marginBottom: 16,
    },
    cardSentence: {
      color: c.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      fontStyle: 'italic',
      marginBottom: 18,
    },
    cardHint: {
      color: c.textSecondary,
      fontSize: 13,
    },
    statusRow: {
      marginTop: 4,
      marginBottom: 12,
      alignItems: 'center',
    },
    knownBadge: {
      minHeight: 40,
      borderRadius: 999,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      borderWidth: 1,
    },
    knownBadgeIdle: {
      backgroundColor: c.surface,
      borderColor: c.border,
    },
    knownBadgeActive: {
      backgroundColor: '#10B981',
      borderColor: '#10B981',
    },
    knownBadgeText: {
      color: c.text,
      fontWeight: '700',
    },
    knownBadgeTextActive: {
      color: '#FFFFFF',
    },
    footer: {
      flexDirection: 'row',
      gap: 10,
    },
    navButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    navButtonText: {
      color: c.text,
      fontWeight: '700',
      fontSize: 13,
    },
    primaryButton: {
      flex: 1.2,
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: c.buttonPrimaryBg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    primaryButtonText: {
      color: c.buttonPrimaryText,
      fontWeight: '800',
      fontSize: 13,
    },
    disabledButton: {
      opacity: 0.45,
    },
    audioPlayerContainer: {
      paddingHorizontal: 12,
      marginBottom: 8,
      zIndex: 85,
    },
  });
}
