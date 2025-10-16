// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useDeck } from '../../src/hooks/useDeck';
import { useQuizQuestions } from '../../src/hooks/useQuizQuestions';
import { useTracking } from '../../src/hooks/useTracking';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function QuizScreen() {
  const { deckId } = useLocalSearchParams();
  const { deck, loading: deckLoading } = useDeck(deckId);
  const { 
    questions: cachedQuestions, 
    isGenerating, 
    error: questionsError, 
    getQuizQuestions 
  } = useQuizQuestions(deckId, deck);
  const { recordQuizAttempt } = useTracking();
  
  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  
  // Track quiz timing
  const quizStartTime = useRef(null);

  // Load quiz questions when deck is ready
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
        setQuiz({ error: 'Unable to generate quiz questions. Please try again.' });
        return;
      }

      // Transform AI questions to quiz format
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
      
      // Start quiz timer
      quizStartTime.current = new Date();
      console.log('[QuizScreen] Quiz started');
    } catch (error) {
      console.error('Error loading quiz questions:', error);
      setQuiz({ 
        error: error.message || 'Failed to load quiz questions. Please try again.' 
      });
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleChoiceSelect = (choiceLabel) => {
    setSelectedChoice(choiceLabel);
  };

  const handleNext = async () => {
    if (!selectedChoice) return;

    // Save the answer
    const newAnswers = [
      ...answers,
      {
        questionId: quiz.questions[currentQuestionIndex].id,
        selectedAnswer: selectedChoice,
      },
    ];
    setAnswers(newAnswers);

    // Move to next question or finish quiz
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedChoice(null);
    } else {
      // Quiz completed - calculate score and record attempt
      const results = calculateScore();
      
      // Record quiz attempt with tracking
      if (deck && quizStartTime.current) {
        const endTime = new Date();
        const durationMinutes = (endTime - quizStartTime.current) / (1000 * 60);
        
        console.log(`[QuizScreen] Recording quiz attempt: ${results.score}/${results.total} correct, ${durationMinutes.toFixed(2)} minutes`);
        await recordQuizAttempt(
          deck.id,
          deck.name,
          results.total,
          results.score,
          durationMinutes
        );
      }
      
      setQuizCompleted(true);
      setShowResult(true);
    }
  };

  const handleRestart = async () => {
    setQuiz(null);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setSelectedChoice(null);
    setShowResult(false);
    setQuizCompleted(false);
    quizStartTime.current = null; // Reset timer
    await loadQuizQuestions();
  };

  // Calculate score from answers
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

  const handleExit = () => {
    router.back();
  };

  if (deckLoading || loadingQuiz || isGenerating) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>
          {isGenerating 
            ? 'Generating quiz questions with AI...\nThis may take a moment...' 
            : loadingQuiz
            ? 'Loading quiz...'
            : 'Loading deck...'}
        </Text>
      </View>
    );
  }

  if (!quiz) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Unable to generate quiz</Text>
        <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
          <Text style={styles.exitButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (quiz.error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{quiz.error}</Text>
        <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
          <Text style={styles.exitButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (quizCompleted && showResult) {
    const results = calculateScore();
    const passed = results.percentage >= 70;

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.resultContainer}>
        <View style={styles.resultCard}>
          <MaterialCommunityIcons
            name={passed ? 'trophy' : 'emoticon-sad'}
            size={80}
            color={passed ? '#10B981' : '#F59E0B'}
          />
          <Text style={styles.resultTitle}>
            {passed ? 'Great Job!' : 'Keep Practicing!'}
          </Text>
          <Text style={styles.scoreText}>
            {results.score} / {results.total}
          </Text>
          <Text style={styles.percentageText}>{results.percentage}%</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.restartButton} onPress={handleRestart}>
              <MaterialCommunityIcons name="restart" size={20} color="#FFFFFF" />
              <Text style={styles.restartButtonText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
              <MaterialCommunityIcons name="arrow-left" size={20} color="#FFFFFF" />
              <Text style={styles.exitButtonText}>Back to Sets</Text>
            </TouchableOpacity>
          </View>

          {/* Show review of questions */}
          <View style={styles.reviewSection}>
            <Text style={styles.reviewTitle}>Review</Text>
            {quiz.questions.map((question, index) => {
              const userAnswer = answers[index];
              const isCorrect = userAnswer?.selectedAnswer === question.correctAnswer;
              const correctChoice = question.choices.find(c => c.label === question.correctAnswer);
              const selectedChoice = question.choices.find(c => c.label === userAnswer?.selectedAnswer);

              return (
                <View
                  key={question.id}
                  style={[
                    styles.reviewItem,
                    isCorrect ? styles.reviewItemCorrect : styles.reviewItemWrong,
                  ]}
                >
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewQuestionNumber}>Question {index + 1}</Text>
                    <MaterialCommunityIcons
                      name={isCorrect ? 'check-circle' : 'close-circle'}
                      size={24}
                      color={isCorrect ? '#10B981' : '#EF4444'}
                    />
                  </View>
                  <Text style={styles.reviewQuestion}>{question.question}</Text>
                  <View style={styles.reviewAnswers}>
                    <Text style={styles.reviewAnswerLabel}>Correct Answer:</Text>
                    <Text style={styles.reviewAnswerText}>
                      {correctChoice?.label}. {correctChoice?.word}
                    </Text>
                    {question.explanation && (
                      <Text style={styles.reviewExplanation}>{question.explanation}</Text>
                    )}
                    {!isCorrect && selectedChoice && (
                      <>
                        <Text style={styles.reviewAnswerLabel}>Your Answer:</Text>
                        <Text style={styles.reviewAnswerTextWrong}>
                          {selectedChoice?.label}. {selectedChoice?.word}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.quizTitle}>{quiz.deckName} - Quiz</Text>
        <Text style={styles.progressText}>
          Question {currentQuestionIndex + 1} of {quiz.questions.length}
        </Text>
      </View>

      <ScrollView style={styles.questionContainer}>
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>
          <Text style={styles.instructionText}>
            Select the word that best completes the sentence:
          </Text>

          <View style={styles.choicesContainer}>
            {currentQuestion.choices.map((choice) => {
              const isSelected = selectedChoice === choice.label;
              return (
                <TouchableOpacity
                  key={choice.label}
                  style={[styles.choiceButton, isSelected && styles.choiceButtonSelected]}
                  onPress={() => handleChoiceSelect(choice.label)}
                >
                  <View style={styles.choiceContent}>
                    <Text style={[styles.choiceLabel, isSelected && styles.choiceLabelSelected]}>
                      {choice.label}.
                    </Text>
                    <View style={styles.choiceTextContainer}>
                      <Text style={[styles.choiceWord, isSelected && styles.choiceWordSelected]}>
                        {choice.word}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, !selectedChoice && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!selectedChoice}
        >
          <Text style={styles.nextButtonText}>
            {currentQuestionIndex < quiz.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  header: {
    backgroundColor: '#6366F1',
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 40,
  },
  quizTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 16,
    color: '#E0E7FF',
  },
  questionContainer: {
    flex: 1,
    padding: 16,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
    lineHeight: 28,
  },
  instructionText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  choicesContainer: {
    gap: 12,
  },
  choiceButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  choiceButtonSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  choiceContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  choiceLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#475569',
    marginRight: 12,
    minWidth: 24,
  },
  choiceLabelSelected: {
    color: '#4F46E5',
  },
  choiceTextContainer: {
    flex: 1,
  },
  choiceWord: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  choiceWordSelected: {
    color: '#4F46E5',
  },
  choiceDefinition: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  choiceDefinitionSelected: {
    color: '#6366F1',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  nextButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    padding: 16,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 24,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  percentageText: {
    fontSize: 36,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 32,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  restartButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  exitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  reviewSection: {
    width: '100%',
    marginTop: 24,
  },
  reviewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  reviewItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
  },
  reviewItemCorrect: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  reviewItemWrong: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewQuestionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  reviewQuestion: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 12,
    lineHeight: 20,
  },
  reviewAnswers: {
    marginTop: 8,
  },
  reviewAnswerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 8,
    marginBottom: 4,
  },
  reviewAnswerText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  reviewAnswerTextWrong: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  reviewExplanation: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 18,
  },
});


