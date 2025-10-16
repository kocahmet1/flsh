import { useState, useEffect, useCallback } from 'react';
import { ref, get, set } from 'firebase/database';
import { db, auth } from '../firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateAIQuizQuestions, shouldRegenerateQuestions, createQuestionMetadata } from '../utils/aiQuizGenerator';
import { getDeckRepository, isCloudEnabled } from '../repositories';

/**
 * Hook to manage quiz questions for a deck
 * Handles generation, caching, and retrieval of AI-generated quiz questions
 */
export function useQuizQuestions(deckId, deck) {
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const cloud = isCloudEnabled();
  const repo = getDeckRepository();

  // Load questions from database/storage
  const loadQuestions = useCallback(async () => {
    if (!deckId) return;

    try {
      setLoading(true);
      setError(null);

      if (!cloud) {
        // Local storage
        const storageKey = `quiz_questions_${deckId}`;
        const storedData = await AsyncStorage.getItem(storageKey);
        
        if (storedData) {
          const data = JSON.parse(storedData);
          setQuestions(data);
        } else {
          setQuestions(null);
        }
      } else {
        // Firebase
        if (!auth.currentUser) {
          setQuestions(null);
          return;
        }

        const questionsRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}/quizQuestions`);
        const snapshot = await get(questionsRef);

        if (snapshot.exists()) {
          const data = snapshot.val();
          setQuestions(data);
        } else {
          setQuestions(null);
        }
      }
    } catch (err) {
      console.error('Error loading quiz questions:', err);
      setError(err.message);
      setQuestions(null);
    } finally {
      setLoading(false);
    }
  }, [deckId, cloud]);

  // Save questions to database/storage
  const saveQuestions = useCallback(async (questionsData, metadata) => {
    if (!deckId) return;

    try {
      const dataToSave = {
        questions: questionsData,
        metadata: metadata,
      };

      if (!cloud) {
        // Local storage
        const storageKey = `quiz_questions_${deckId}`;
        await AsyncStorage.setItem(storageKey, JSON.stringify(dataToSave));
      } else {
        // Firebase
        if (!auth.currentUser) {
          throw new Error('User not authenticated');
        }

        const questionsRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}/quizQuestions`);
        await set(questionsRef, dataToSave);
      }

      setQuestions(dataToSave);
      console.log(`Saved ${questionsData.length} quiz questions for deck ${deckId}`);
    } catch (err) {
      console.error('Error saving quiz questions:', err);
      throw err;
    }
  }, [deckId, cloud]);

  // Generate new questions using AI
  const generateQuestions = useCallback(async (forceRegenerate = false) => {
    if (!deck) {
      throw new Error('Deck data not available');
    }

    // Check if we need to regenerate
    if (!forceRegenerate && questions) {
      const needsRegeneration = shouldRegenerateQuestions(deck, questions.questions);
      if (!needsRegeneration) {
        console.log('Questions are up to date, no need to regenerate');
        return questions;
      }
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Get cards array
      let cards = [];
      if (Array.isArray(deck.cards)) {
        cards = deck.cards;
      } else if (deck.cards) {
        cards = Object.values(deck.cards);
      }

      // Filter out invalid cards
      cards = cards.filter(card => card && card.front && card.back);

      if (cards.length < 4) {
        throw new Error('Need at least 4 vocabulary words to generate quiz questions');
      }

      console.log(`Generating AI quiz questions for deck: ${deck.name} (${cards.length} words)`);

      // Generate questions using AI
      const generatedQuestions = await generateAIQuizQuestions(cards, 50);

      // Create metadata
      const metadata = createQuestionMetadata(deck, generatedQuestions);

      // Save to database
      await saveQuestions(generatedQuestions, metadata);

      console.log('Quiz questions generated and saved successfully');
      return { questions: generatedQuestions, metadata };

    } catch (err) {
      console.error('Error generating quiz questions:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [deck, questions, saveQuestions]);

  // Get quiz questions for taking a quiz (selects random 10 from the pool)
  const getQuizQuestions = useCallback(async (count = 10) => {
    try {
      // If no questions exist, generate them
      if (!questions || !questions.questions || questions.questions.length === 0) {
        console.log('No questions available, generating new ones...');
        const generated = await generateQuestions();
        
        if (!generated || !generated.questions || generated.questions.length === 0) {
          throw new Error('Failed to generate questions');
        }

        // Select random questions
        const shuffled = [...generated.questions].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
      }

      // Check if we need to regenerate
      if (deck && shouldRegenerateQuestions(deck, questions.questions)) {
        console.log('Deck has changed significantly, regenerating questions...');
        const regenerated = await generateQuestions(true);
        const shuffled = [...regenerated.questions].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
      }

      // Select random questions from existing pool
      const shuffled = [...questions.questions].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, Math.min(count, shuffled.length));

    } catch (err) {
      console.error('Error getting quiz questions:', err);
      throw err;
    }
  }, [questions, deck, generateQuestions]);

  // Load questions on mount
  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  return {
    questions: questions?.questions || null,
    metadata: questions?.metadata || null,
    loading,
    error,
    isGenerating,
    generateQuestions,
    getQuizQuestions,
    refreshQuestions: loadQuestions,
  };
}

