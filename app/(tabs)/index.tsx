// @ts-nocheck
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Platform, Image, Animated, Dimensions, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useDecks } from '../../src/hooks/useDecks';
import { useTracking } from '../../src/hooks/useTracking';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ProgressBar from '../../src/components/ProgressBar';
import TrackingCard from '../../src/components/TrackingCard';
import { useApp } from '../../src/context/AppContext';
import { isCloudEnabled } from '../../src/repositories';
import { useDeck } from '../../src/hooks/useDeck';
import { useQuizQuestions } from '../../src/hooks/useQuizQuestions';
import { PanGestureHandler } from 'react-native-gesture-handler';

// Create a separate component for set items to properly use hooks
const SetItem = React.memo(({ item, index, onDelete, onStudy }) => {
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
        onPress={() => onStudy(item.id)}
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

// Inline Card Component for Study View
const InlineCard = ({ front, back, sampleSentence, onSwipe, onKnow, isKnown }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const tickScale = useRef(new Animated.Value(1)).current;
  const [tickActive, setTickActive] = useState(isKnown);

  useEffect(() => {
    setTickActive(isKnown);
    setIsFlipped(false);
    flipAnim.setValue(0);
    translateX.setValue(0);
    translateY.setValue(0);
    scale.setValue(0.95);
    
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [front, isKnown]);

  const handleFlip = () => {
    const newFlipValue = isFlipped ? 0 : 1;
    Animated.spring(flipAnim, {
      toValue: newFlipValue,
      friction: 6,
      tension: 15,
      useNativeDriver: true,
    }).start();
    
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    
    setIsFlipped(!isFlipped);
  };

  const handleGesture = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: true }
  );

  const handleSwipeEnd = ({ nativeEvent }) => {
    const { translationX, velocityX } = nativeEvent;
    const isQuickFlick = Math.abs(velocityX) > 800;
    const direction = translationX > 0 ? 'right' : 'left';
    const swipeThreshold = isQuickFlick ? 80 : 120;
    
    if (Math.abs(translationX) > swipeThreshold) {
      const exitX = direction === 'right' ? 400 : -400;
      
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: exitX,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -100,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onSwipe(direction);
      });
    } else {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handleKnow = () => {
    setTickActive(current => {
      const newState = !current;
      onKnow(newState);
      return newState;
    });
    
    Animated.sequence([
      Animated.timing(tickScale, {
        toValue: 1.5,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(tickScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      })
    ]).start();
  };

  const frontAnimatedStyle = {
    transform: [
      { perspective: 1000 },
      { rotateY: flipAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg']
      })},
    ],
    backfaceVisibility: 'hidden',
  };

  const backAnimatedStyle = {
    transform: [
      { perspective: 1000 },
      { rotateY: flipAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['180deg', '360deg']
      })},
    ],
    backfaceVisibility: 'hidden',
  };

  const cardAnimatedStyle = {
    transform: [
      { translateX },
      { translateY },
      { rotate: translateX.interpolate({
        inputRange: [-200, 0, 200],
        outputRange: ['-30deg', '0deg', '30deg'],
        extrapolate: 'clamp',
      })},
      { scale },
    ],
    opacity: fadeAnim,
  };

  const tickAnimatedStyle = {
    transform: [{ scale: tickScale }]
  };

  return (
    <PanGestureHandler
      onGestureEvent={handleGesture}
      onHandlerStateChange={handleSwipeEnd}
    >
      <Animated.View style={[styles.inlineCardContainer2, cardAnimatedStyle]}>
        <TouchableOpacity
          style={styles.inlineCard}
          onPress={handleFlip}
          activeOpacity={0.9}
        >
          {/* Check button */}
          <Animated.View style={[styles.inlineTickButton, tickAnimatedStyle]}>
            <TouchableOpacity
              onPress={handleKnow}
              style={[
                styles.inlineTickButtonContainer,
                tickActive && styles.inlineTickButtonActive
              ]}
            >
              <MaterialCommunityIcons
                name={tickActive ? "check-circle" : "check-circle-outline"}
                size={28}
                color={tickActive ? '#10B981' : '#94A3B8'}
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Front of card */}
          <Animated.View style={[styles.inlineCardFace, frontAnimatedStyle]}>
            <View style={styles.inlineCardContent}>
              <Text style={styles.inlineCardText}>{front}</Text>
              <Text style={styles.inlineCardHint}>Tap to flip</Text>
            </View>
          </Animated.View>

          {/* Back of card */}
          <Animated.View style={[styles.inlineCardFace, styles.inlineCardBack, backAnimatedStyle]}>
            <View style={styles.inlineCardContent}>
              <Text style={styles.inlineCardText}>{back}</Text>
              {sampleSentence && (
                <View style={styles.inlineSampleContainer}>
                  <Text style={styles.inlineSampleLabel}>Sample:</Text>
                  <Text style={styles.inlineSampleText}>{sampleSentence}</Text>
                </View>
              )}
              <Text style={styles.inlineCardHint}>Tap to flip back</Text>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </PanGestureHandler>
  );
};

// Inline Study Component
const InlineStudyView = ({ deckId, onClose }) => {
  const { deck, loading, updateCardStatus } = useDeck(deckId);
  const { recordStudySession } = useTracking();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [studyCards, setStudyCards] = useState([]);
  const studyStartTime = useRef(null);
  const cardsStudiedCount = useRef(0);

  useEffect(() => {
    if (deck?.cards) {
      setStudyCards(deck.cards.filter(card => !card.isKnown));
    }
  }, [deck]);

  useEffect(() => {
    studyStartTime.current = new Date();
    return () => {
      if (deck && studyStartTime.current) {
        const endTime = new Date();
        const durationMinutes = (endTime - studyStartTime.current) / (1000 * 60);
        if (durationMinutes > 0.08) {
          recordStudySession(deck.id, deck.name, cardsStudiedCount.current, durationMinutes).catch(err => {
            console.error('[InlineStudy] Error recording session:', err);
          });
        }
      }
    };
  }, [deck, recordStudySession]);

  const handleSwipe = async (direction) => {
    const currentCard = studyCards[currentIndex];
    if (direction === 'left') {
      cardsStudiedCount.current++;
      if (currentIndex < studyCards.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        if (deck && studyStartTime.current) {
          const endTime = new Date();
          const durationMinutes = (endTime - studyStartTime.current) / (1000 * 60);
          await recordStudySession(deck.id, deck.name, cardsStudiedCount.current, durationMinutes);
        }
        onClose();
      }
    } else if (direction === 'right') {
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    }
  };

  const handleKnow = async (isMarkedKnown) => {
    const currentCard = studyCards[currentIndex];
    const success = await updateCardStatus(currentCard.id, isMarkedKnown);
    if (success) {
      const updatedCards = [...studyCards];
      updatedCards[currentIndex] = { ...updatedCards[currentIndex], isKnown: isMarkedKnown };
      setStudyCards(updatedCards);
    }
  };

  if (loading) {
    return (
      <View style={styles.inlineStudyContainer}>
        <View style={styles.inlineHeader}>
          <Text style={styles.inlineTitle}>Loading...</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>
        <View style={styles.inlineCentered}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      </View>
    );
  }

  if (!studyCards || studyCards.length === 0) {
    return (
      <View style={styles.inlineStudyContainer}>
        <View style={styles.inlineHeader}>
          <Text style={styles.inlineTitle}>Study</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>
        <View style={styles.inlineCentered}>
          <Text style={styles.inlineEmptyText}>No unchecked cards to study</Text>
        </View>
      </View>
    );
  }

  const progress = ((currentIndex) / studyCards.length) * 100;

  return (
    <View style={styles.inlineStudyContainer}>
      <View style={styles.inlineHeader}>
        <Text style={styles.inlineTitle}>{deck?.name}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={24} color="#64748B" />
        </TouchableOpacity>
      </View>
      <View style={styles.inlineProgressContainer}>
        <ProgressBar progress={progress} />
        <Text style={styles.inlineCounter}>
          {currentIndex + 1} / {studyCards.length}
        </Text>
      </View>
      <View style={styles.inlineCardContainer}>
        {studyCards && studyCards.length > 0 && currentIndex < studyCards.length && (
          <InlineCard
            front={studyCards[currentIndex].front}
            back={studyCards[currentIndex].back}
            sampleSentence={studyCards[currentIndex].sampleSentence}
            onSwipe={handleSwipe}
            onKnow={handleKnow}
            isKnown={studyCards[currentIndex].isKnown}
            key={`inline-card-${currentIndex}`}
          />
        )}
        <View style={styles.swipeHint}>
          <MaterialCommunityIcons name="gesture-swipe-horizontal" size={20} color="#94A3B8" />
          <Text style={styles.swipeHintText}>Swipe left to continue, right to go back</Text>
        </View>
      </View>
    </View>
  );
};

// Inline Quiz Component
const InlineQuizView = ({ deckId, onClose }) => {
  const { deck, loading: deckLoading } = useDeck(deckId);
  const { questions: cachedQuestions, isGenerating, error: questionsError, getQuizQuestions } = useQuizQuestions(deckId, deck);
  const { recordQuizAttempt } = useTracking();
  
  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const quizStartTime = useRef(null);

  useEffect(() => {
    if (deck && !quiz && !loadingQuiz) {
      loadQuizQuestions();
    }
  }, [deck]);

  const loadQuizQuestions = async () => {
    setLoadingQuiz(true);
    try {
      const questions = await getQuizQuestions(10);
      if (!questions || questions.length === 0) {
        setQuiz({ error: 'Unable to generate quiz questions.' });
        return;
      }
      setQuiz({
        id: `quiz_${deckId}_${Date.now()}`,
        deckId: deckId,
        deckName: deck.name,
        questions: questions.map((q) => ({
          id: q.id,
          question: q.question,
          choices: q.choices,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
        })),
        totalQuestions: questions.length,
      });
      quizStartTime.current = new Date();
    } catch (error) {
      setQuiz({ error: error.message || 'Failed to load quiz questions.' });
    } finally {
      setLoadingQuiz(false);
    }
  };

  const calculateScore = () => {
    if (!answers || !quiz || !quiz.questions) {
      return { score: 0, total: 0, percentage: 0 };
    }
    let correct = 0;
    const total = quiz.questions.length;
    answers.forEach(answer => {
      const question = quiz.questions.find(q => q.id === answer.questionId);
      if (question && answer.selectedAnswer === question.correctAnswer) {
        correct++;
      }
    });
    return {
      score: correct,
      total: total,
      percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
    };
  };

  const handleNext = async () => {
    if (!selectedChoice) return;
    const newAnswers = [...answers, {
      questionId: quiz.questions[currentQuestionIndex].id,
      selectedAnswer: selectedChoice,
    }];
    setAnswers(newAnswers);

    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedChoice(null);
    } else {
      const results = calculateScore();
      if (deck && quizStartTime.current) {
        const endTime = new Date();
        const durationMinutes = (endTime - quizStartTime.current) / (1000 * 60);
        await recordQuizAttempt(deck.id, deck.name, results.total, results.score, durationMinutes);
      }
      setQuizCompleted(true);
    }
  };

  const handleRestart = async () => {
    setQuiz(null);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setSelectedChoice(null);
    setQuizCompleted(false);
    quizStartTime.current = null;
    await loadQuizQuestions();
  };

  if (deckLoading || loadingQuiz || isGenerating) {
    return (
      <View style={styles.inlineQuizContainer}>
        <View style={styles.inlineHeader}>
          <Text style={styles.inlineTitle}>Loading Quiz...</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>
        <View style={styles.inlineCentered}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>
            {isGenerating ? 'Generating quiz questions...' : 'Loading...'}
          </Text>
        </View>
      </View>
    );
  }

  if (quiz?.error) {
    return (
      <View style={styles.inlineQuizContainer}>
        <View style={styles.inlineHeader}>
          <Text style={styles.inlineTitle}>Quiz Error</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>
        <View style={styles.inlineCentered}>
          <Text style={styles.inlineEmptyText}>{quiz.error}</Text>
        </View>
      </View>
    );
  }

  if (quizCompleted) {
    const results = calculateScore();
    const passed = results.percentage >= 70;

    return (
      <View style={styles.inlineQuizContainer}>
        <View style={styles.inlineHeader}>
          <Text style={styles.inlineTitle}>Quiz Complete!</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.inlineScrollView}>
          <View style={styles.inlineResultCard}>
            <MaterialCommunityIcons
              name={passed ? 'trophy' : 'emoticon-sad'}
              size={60}
              color={passed ? '#10B981' : '#F59E0B'}
            />
            <Text style={styles.inlineResultTitle}>
              {passed ? 'Great Job!' : 'Keep Practicing!'}
            </Text>
            <Text style={styles.inlineScoreText}>
              {results.score} / {results.total}
            </Text>
            <Text style={styles.inlinePercentageText}>{results.percentage}%</Text>
            <TouchableOpacity style={styles.inlineRestartButton} onPress={handleRestart}>
              <MaterialCommunityIcons name="restart" size={18} color="#FFFFFF" />
              <Text style={styles.inlineRestartButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!quiz) return null;

  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <View style={styles.inlineQuizContainer}>
      <View style={styles.inlineHeader}>
        <Text style={styles.inlineTitle}>{quiz.deckName} - Quiz</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={24} color="#64748B" />
        </TouchableOpacity>
      </View>
      <View style={styles.inlineProgressContainer}>
        <Text style={styles.inlineQuizProgress}>
          Question {currentQuestionIndex + 1} of {quiz.questions.length}
        </Text>
      </View>
      <ScrollView style={styles.inlineScrollView}>
        <View style={styles.inlineQuestionCard}>
          <Text style={styles.inlineQuestionText}>{currentQuestion.question}</Text>
          <Text style={styles.inlineInstructionText}>
            Select the word that best completes the sentence:
          </Text>
          <View style={styles.inlineChoicesContainer}>
            {currentQuestion.choices.map((choice) => {
              const isSelected = selectedChoice === choice.label;
              return (
                <TouchableOpacity
                  key={choice.label}
                  style={[styles.inlineChoiceButton, isSelected && styles.inlineChoiceButtonSelected]}
                  onPress={() => setSelectedChoice(choice.label)}
                >
                  <Text style={[styles.inlineChoiceLabel, isSelected && styles.inlineChoiceLabelSelected]}>
                    {choice.label}.
                  </Text>
                  <Text style={[styles.inlineChoiceWord, isSelected && styles.inlineChoiceWordSelected]}>
                    {choice.word}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <View style={styles.inlineFooter}>
        <TouchableOpacity
          style={[styles.inlineNextButton, !selectedChoice && styles.inlineNextButtonDisabled]}
          onPress={handleNext}
          disabled={!selectedChoice}
        >
          <Text style={styles.inlineNextButtonText}>
            {currentQuestionIndex < quiz.questions.length - 1 ? 'Next' : 'Finish'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function SetScreen() {
  const { decks, loading, error, deleteDeck, refreshDecks } = useDecks();
  const { stats, loading: trackingLoading, refreshStats } = useTracking();
  const [refreshing, setRefreshing] = React.useState(false);
  const { theme } = useApp();
  const c = theme.colors;
  const cloud = isCloudEnabled();
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
  
  // State for inline quiz and study
  const [activeQuizDeckId, setActiveQuizDeckId] = useState(null);
  const [activeStudyDeckId, setActiveStudyDeckId] = useState(null);
  
  // State for mobile tabs
  const [activeTab, setActiveTab] = useState('decks'); // 'decks', 'quizzes', 'tracking'
  
  // Animation values for card effects
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Detect window resize for responsive layout
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowWidth(window.width);
    });

    return () => subscription?.remove();
  }, []);

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

  // Refresh tracking stats when screen comes into focus (only once per focus)
  // This ensures stats update after completing a quiz or study session
  const lastRefreshTime = useRef(0);
  
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      // Only refresh if it's been at least 1 second since last refresh
      if (now - lastRefreshTime.current > 1000) {
        console.log('[MySets] Screen focused, refreshing tracking stats');
        lastRefreshTime.current = now;
        refreshStats();
      }
    }, [refreshStats])
  );

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

  const isDesktop = Platform.OS === 'web' && windowWidth >= 1024;

  // Render mobile tab bar
  const renderTabBar = () => {
    if (isDesktop) return null;

    const tabs = [
      { id: 'decks', label: 'My Sets', icon: 'card-multiple' },
      { id: 'quizzes', label: 'Quizzes', icon: 'head-question' },
      { id: 'tracking', label: 'Progress', icon: 'chart-line' },
    ];

    return (
      <View style={styles.mobileTabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.mobileTab,
              activeTab === tab.id && styles.mobileTabActive
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <MaterialCommunityIcons
              name={tab.icon}
              size={24}
              color={activeTab === tab.id ? '#6366F1' : '#94A3B8'}
            />
            <Text style={[
              styles.mobileTabText,
              activeTab === tab.id && styles.mobileTabTextActive
            ]}>
              {tab.label}
            </Text>
            {activeTab === tab.id && <View style={styles.mobileTabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render tracking column for desktop
  const renderTrackingColumn = () => {
    if (!isDesktop) return null;

    return (
      <View style={styles.trackingColumn}>
        <View style={styles.trackingHeaderRow}>
          <Text style={styles.columnTitle}>Your Progress</Text>
          <MaterialCommunityIcons name="chart-line" size={16} color="#6366F1" />
        </View>
        <Text style={styles.trackingSubtitle}>Track your learning journey</Text>
        <TrackingCard stats={stats} loading={trackingLoading} decks={decks} />
      </View>
    );
  };

  // Render quiz list for desktop
  const renderQuizList = () => {
    if (!isDesktop) return null;

    // If a quiz is active, show the inline quiz view
    if (activeQuizDeckId) {
      return (
        <View style={styles.quizColumn}>
          <InlineQuizView 
            deckId={activeQuizDeckId} 
            onClose={() => {
              setActiveQuizDeckId(null);
              refreshStats();
            }} 
          />
        </View>
      );
    }

    return (
      <View style={styles.quizColumn}>
        <View style={styles.quizHeaderRow}>
          <Text style={styles.columnTitle}>Vocab Quizzes</Text>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={16} color="#FCD34D" />
        </View>
        <FlatList
          key={`quiz-list-${decks?.length || 0}`}
          data={decks}
          renderItem={({ item, index }) => {
            // Handle both array and object data structures for cards
            let cardsArray = [];
            if (item.cards) {
              cardsArray = Array.isArray(item.cards) 
                ? item.cards 
                : Object.values(item.cards);
            }
            const totalCards = cardsArray.length;
            const canTakeQuiz = totalCards >= 4;

            return (
              <View style={styles.quizCard}>
                <Text style={styles.quizSetName}>
                  {item.name ? item.name.replace(/ \((?:Auto-)?Forked\)$/, '') : ''}
                </Text>
                <Text style={styles.quizDescription}>
                  10 SAT-style multiple choice questions
                </Text>
                <Text style={styles.quizCardCount}>
                  {totalCards} word{totalCards !== 1 ? 's' : ''} available
                </Text>
                <TouchableOpacity
                  style={[
                    styles.takeQuizButton,
                    !canTakeQuiz && styles.takeQuizButtonDisabled
                  ]}
                  onPress={() => {
                    if (isDesktop) {
                      setActiveQuizDeckId(item.id);
                    } else {
                      router.push(`/quiz/${item.id}`);
                    }
                  }}
                  disabled={!canTakeQuiz}
                >
                  <MaterialCommunityIcons 
                    name="head-question-outline" 
                    size={20} 
                    color={canTakeQuiz ? "#FFFFFF" : "#94A3B8"} 
                  />
                  <Text style={[
                    styles.takeQuizButtonText,
                    !canTakeQuiz && styles.takeQuizButtonTextDisabled
                  ]}>
                    {canTakeQuiz ? 'Take Quiz' : 'Need 4+ words'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
          keyExtractor={item => `quiz-${item.id}`}
          contentContainerStyle={styles.quizListContainer}
          ListEmptyComponent={
            <Text style={styles.emptyQuizText}>Create sets to unlock quizzes!</Text>
          }
        />
      </View>
    );
  };

  // Render content for the active mobile tab
  const renderMobileContent = () => {
    if (isDesktop) return null;

    // Decks tab content
    if (activeTab === 'decks') {
      return (
        <View style={styles.mobileTabContent}>
          <FlatList
            key={`sets-list-${decks?.length || 0}`}
            data={decks}
            renderItem={({ item, index }) => (
              <SetItem 
                item={item} 
                index={index}
                onDelete={handleDeleteDeck}
                onStudy={(deckId) => {
                  router.push({
                    pathname: `/deck/${deckId}/study`,
                    params: { mode: 'unknown' }
                  });
                }}
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
                  onPress={() => router.push('/add-deck')}
                  className="create-button"
                >
                  <View style={styles.circleButtonContent}>
                    <View style={styles.circleIcon}>
                      <MaterialCommunityIcons name="plus" size={24} color="#0F766E" />
                    </View>
                    <Text style={styles.createSetButtonText}>Create New Set</Text>
                  </View>
                </TouchableOpacity>
                {cloud && (
                  <TouchableOpacity
                    style={styles.importSetButton}
                    onPress={() => router.push('/deck-gallery')}
                    className="import-button"
                  >
                    <View style={styles.circleButtonContent}>
                      <View style={styles.importCircleIcon}>
                        <MaterialCommunityIcons name="view-grid-outline" size={24} color="#6D28D9" />
                      </View>
                      <Text style={styles.importSetButtonText}>Import more sets from Gallery</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        </View>
      );
    }

    // Quizzes tab content
    if (activeTab === 'quizzes') {
      return (
        <View style={styles.mobileTabContent}>
          <FlatList
            key={`quiz-list-${decks?.length || 0}`}
            data={decks}
            renderItem={({ item, index }) => {
              let cardsArray = [];
              if (item.cards) {
                cardsArray = Array.isArray(item.cards) 
                  ? item.cards 
                  : Object.values(item.cards);
              }
              const totalCards = cardsArray.length;
              const canTakeQuiz = totalCards >= 4;

              return (
                <View style={styles.quizCard}>
                  <Text style={styles.quizSetName}>
                    {item.name ? item.name.replace(/ \((?:Auto-)?Forked\)$/, '') : ''}
                  </Text>
                  <Text style={styles.quizDescription}>
                    10 SAT-style multiple choice questions
                  </Text>
                  <Text style={styles.quizCardCount}>
                    {totalCards} word{totalCards !== 1 ? 's' : ''} available
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.takeQuizButton,
                      !canTakeQuiz && styles.takeQuizButtonDisabled
                    ]}
                    onPress={() => router.push(`/quiz/${item.id}`)}
                    disabled={!canTakeQuiz}
                  >
                    <MaterialCommunityIcons 
                      name="head-question-outline" 
                      size={20} 
                      color={canTakeQuiz ? "#FFFFFF" : "#94A3B8"} 
                    />
                    <Text style={[
                      styles.takeQuizButtonText,
                      !canTakeQuiz && styles.takeQuizButtonTextDisabled
                    ]}>
                      {canTakeQuiz ? 'Take Quiz' : 'Need 4+ words'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }}
            keyExtractor={item => `quiz-${item.id}`}
            contentContainerStyle={styles.quizListContainer}
            ListEmptyComponent={
              <Text style={styles.emptyQuizText}>Create sets to unlock quizzes!</Text>
            }
          />
        </View>
      );
    }

    // Tracking tab content
    if (activeTab === 'tracking') {
      return (
        <View style={styles.mobileTabContent}>
          <ScrollView contentContainerStyle={styles.trackingScrollContent}>
            <Text style={styles.mobileTrackingTitle}>Your Progress</Text>
            <Text style={styles.trackingSubtitle}>Track your learning journey</Text>
            <TrackingCard stats={stats} loading={trackingLoading} decks={decks} />
          </ScrollView>
        </View>
      );
    }
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        { backgroundColor: c.background },
        Platform.OS === 'web' && theme.name === 'light' ? { backgroundImage: 'none' } : {},
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
      {renderTabBar()}
      <View style={[styles.contentWrapper, isDesktop && styles.contentWrapperDesktop]}>
        {!isDesktop ? (
          renderMobileContent()
        ) : (
          <>
            <View style={[styles.setsColumn, isDesktop && styles.setsColumnDesktop]}>
              {/* Show inline study view if active on desktop */}
              {isDesktop && activeStudyDeckId ? (
                <InlineStudyView 
                  deckId={activeStudyDeckId} 
                  onClose={() => {
                    setActiveStudyDeckId(null);
                    refreshDecks();
                    refreshStats();
                  }} 
                />
              ) : (
                <>
                  {isDesktop && <Text style={styles.columnTitle}>My Vocab Sets</Text>}
                  <FlatList
                key={`sets-list-${decks?.length || 0}`}
                data={decks}
                renderItem={({ item, index }) => (
                  <SetItem 
                    item={item} 
                    index={index}
                    onDelete={handleDeleteDeck}
                    onStudy={(deckId) => {
                      if (isDesktop) {
                        setActiveStudyDeckId(deckId);
                      } else {
                        router.push({
                          pathname: `/deck/${deckId}/study`,
                          params: { mode: 'unknown' }
                        });
                      }
                    }}
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
                      onPress={() => router.push('/add-deck')}
                      className="create-button"
                    >
                      <View style={styles.circleButtonContent}>
                        <View style={styles.circleIcon}>
                          <MaterialCommunityIcons name="plus" size={24} color="#0F766E" />
                        </View>
                        <Text style={styles.createSetButtonText}>Create New Set</Text>
                      </View>
                    </TouchableOpacity>
                    {cloud && (
                      <TouchableOpacity
                        style={styles.importSetButton}
                        onPress={() => router.push('/deck-gallery')}
                        className="import-button"
                      >
                        <View style={styles.circleButtonContent}>
                          <View style={styles.importCircleIcon}>
                            <MaterialCommunityIcons name="view-grid-outline" size={24} color="#6D28D9" />
                          </View>
                          <Text style={styles.importSetButtonText}>Import more sets from Gallery</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                }
              />
                </>
              )}
            </View>
            {renderQuizList()}
            {renderTrackingColumn()}
          </>
        )}
      </View>
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
  createSetButton: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ECFEF5',
    borderRadius: 12,
    borderWidth: Platform.OS === 'web' ? 2 : 1,
    borderColor: '#10B981',
    marginBottom: 8,
  },
  createSetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
  },
  importSetButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    borderWidth: Platform.OS === 'web' ? 2 : 1,
    borderColor: '#7C3AED',
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
  // Three-column layout styles
  contentWrapper: {
    flex: 1,
  },
  contentWrapperDesktop: {
    flexDirection: 'row',
    gap: 12,
  },
  setsColumn: {
    flex: 1,
  },
  setsColumnDesktop: {
    flex: 1,
    maxWidth: '33.33%',
  },
  quizColumn: {
    flex: 1,
    maxWidth: '33.33%',
    paddingLeft: 4,
    paddingRight: 4,
  },
  trackingColumn: {
    flex: 1,
    maxWidth: '33.33%',
    paddingLeft: 4,
  },
  quizHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  trackingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  columnTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E0E7FF',
  },
  quizSubtitle: {
    fontSize: 12,
    color: '#A5B4FC',
    paddingHorizontal: 12,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  trackingSubtitle: {
    fontSize: 12,
    color: '#A5B4FC',
    paddingHorizontal: 12,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  // Quiz card styles
  quizListContainer: {
    padding: 12,
  },
  quizCard: {
    backgroundColor: '#FFFFFF',
    backgroundImage: Platform.OS === 'web' ? 
      'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 245, 249, 0.9) 100%)' 
      : undefined,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    ...(Platform.OS === 'web' && {
      boxShadow: '0 0 8px 3px rgba(99, 102, 241, 0.25)'
    }),
    borderWidth: Platform.OS === 'web' ? 2 : 3,
    borderColor: '#6366F1',
  },
  quizSetName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#4338CA',
  },
  quizDescription: {
    fontSize: 14,
    color: '#6D729E',
    marginBottom: 4,
  },
  quizCardCount: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 12,
  },
  takeQuizButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  takeQuizButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  takeQuizButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  takeQuizButtonTextDisabled: {
    color: '#94A3B8',
  },
  emptyQuizText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#E2E8F0',
    marginTop: 32,
    marginBottom: 32,
    fontWeight: '500',
  },
  // Inline Study Styles
  inlineStudyContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#0077e6',
  },
  inlineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  inlineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  inlineCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  inlineEmptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  inlineProgressContainer: {
    padding: 12,
    paddingBottom: 8,
  },
  inlineCounter: {
    textAlign: 'center',
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  inlineCardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  inlineCardContainer2: {
    width: '100%',
    aspectRatio: 0.7, // Poker card aspect ratio (roughly 2.5:3.5)
    maxWidth: 280,
    maxHeight: 400,
    alignSelf: 'center',
  },
  inlineCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), 0 10px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 15,
      },
    }),
  },
  inlineCardFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    backgroundImage: Platform.OS === 'web' 
      ? 'repeating-linear-gradient(0deg, transparent 0px, transparent 34px, #93C5FD 34px, #93C5FD 35px), linear-gradient(135deg, #FAFAFA 0%, #F0F0F0 100%)'
      : undefined,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    ...Platform.select({
      web: {
        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
      },
    }),
  },
  inlineCardBack: {
    backgroundColor: '#FEFEFE',
  },
  inlineCardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  inlineCardText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
    ...Platform.select({
      web: {
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  inlineCardHint: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 8,
  },
  inlineTickButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  inlineTickButtonContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  inlineTickButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  inlineSampleContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    width: '100%',
  },
  inlineSampleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inlineSampleText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  swipeHintText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  // Inline Quiz Styles
  inlineQuizContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  inlineQuizProgress: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
    textAlign: 'center',
  },
  inlineScrollView: {
    flex: 1,
  },
  inlineQuestionCard: {
    padding: 16,
  },
  inlineQuestionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
    lineHeight: 24,
  },
  inlineInstructionText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  inlineChoicesContainer: {
    gap: 10,
  },
  inlineChoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  inlineChoiceButtonSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  inlineChoiceLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#475569',
    marginRight: 8,
    minWidth: 20,
  },
  inlineChoiceLabelSelected: {
    color: '#4F46E5',
  },
  inlineChoiceWord: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  inlineChoiceWordSelected: {
    color: '#4F46E5',
  },
  inlineFooter: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  inlineNextButton: {
    backgroundColor: '#6366F1',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  inlineNextButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  inlineNextButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  inlineResultCard: {
    padding: 20,
    alignItems: 'center',
  },
  inlineResultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 12,
    marginBottom: 16,
  },
  inlineScoreText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  inlinePercentageText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 20,
  },
  inlineRestartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  inlineRestartButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  // Mobile tab bar styles
  mobileTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 6,
    elevation: 6,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E7FF',
    ...(Platform.OS === 'web' && {
      boxShadow: '0 4px 16px rgba(99, 102, 241, 0.25), 0 2px 8px rgba(0, 0, 0, 0.1)'
    }),
  },
  mobileTab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    position: 'relative',
    minHeight: 70,
  },
  mobileTabActive: {
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#C7D2FE',
    ...(Platform.OS === 'web' && {
      boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)'
    }),
    elevation: 2,
  },
  mobileTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 6,
    textAlign: 'center',
  },
  mobileTabTextActive: {
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: 14,
  },
  mobileTabIndicator: {
    position: 'absolute',
    bottom: 2,
    left: '15%',
    right: '15%',
    height: 4,
    backgroundColor: '#6366F1',
    borderRadius: 2,
    ...(Platform.OS === 'web' && {
      boxShadow: '0 2px 4px rgba(99, 102, 241, 0.4)'
    }),
  },
  mobileTabContent: {
    flex: 1,
  },
  trackingScrollContent: {
    padding: 12,
  },
  mobileTrackingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E0E7FF',
    marginBottom: 4,
  },
});