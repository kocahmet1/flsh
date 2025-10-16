import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY);

/**
 * Generate SAT-style quiz questions using AI for a deck's vocabulary words
 * @param {Array} cards - Array of card objects with {front, back, sampleSentence}
 * @param {number} questionCount - Number of questions to generate (default: 50)
 * @returns {Promise<Array>} - Array of generated quiz questions
 */
export async function generateAIQuizQuestions(cards, questionCount = 50) {
  try {
    if (!cards || cards.length < 4) {
      throw new Error('Need at least 4 vocabulary words to generate quiz questions');
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Prepare vocabulary data for the prompt
    const vocabList = cards.map((card, index) => 
      `${index + 1}. ${card.front}: ${card.back}${card.sampleSentence ? ` (Example: "${card.sampleSentence}")` : ''}`
    ).join('\n');

    const prompt = `You are an expert SAT vocabulary test creator. Generate ${questionCount} high-quality, SAT-style multiple choice questions for the following vocabulary words.

VOCABULARY WORDS:
${vocabList}

REQUIREMENTS:
1. Each question should be a complete sentence with a blank (indicated by _____) that needs to be filled with one of the vocabulary words
2. The sentences should be contextually rich and similar to real SAT reading comprehension passages
3. Each question should have 4 answer choices (labeled A, B, C, D), with only ONE correct answer
4. The answer choices should ONLY include words from the vocabulary list above
5. Choose 3 plausible but incorrect words as distractors for each question
6. Vary the difficulty - some easier, some harder
7. Make the sentences diverse in topic (science, history, literature, everyday situations, etc.)
8. Ensure the context clearly indicates which word is correct

OUTPUT FORMAT (JSON):
Return a valid JSON array where each question object has this structure:
{
  "question": "The complete sentence with _____ for the blank",
  "choices": [
    {"label": "A", "word": "word1"},
    {"label": "B", "word": "word2"},
    {"label": "C", "word": "word3"},
    {"label": "D", "word": "word4"}
  ],
  "correctAnswer": "A" (or B, C, or D),
  "explanation": "Brief explanation of why this word fits the context"
}

CRITICAL REQUIREMENTS: 
- Return ONLY valid JSON, no markdown formatting, no code blocks, no additional text
- Make sure all words used in choices are from the vocabulary list provided
- Distribute questions across all vocabulary words as evenly as possible
- Each vocabulary word should appear as the correct answer at least once (if possible given the question count)
- **VERY IMPORTANT**: Distribute the correct answers EVENLY across all positions (A, B, C, D). For ${questionCount} questions, aim for approximately ${Math.floor(questionCount/4)} questions with correct answer A, ${Math.floor(questionCount/4)} with B, ${Math.floor(questionCount/4)} with C, and ${Math.floor(questionCount/4)} with D. Do NOT favor position A!
- RANDOMIZE which choice position (A, B, C, or D) contains the correct answer for each question
- The correct answer should appear in ALL four positions roughly equally across the ${questionCount} questions

Generate ${questionCount} questions now:`;

    console.log('Generating AI quiz questions...');
    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();
    
    // Remove markdown code blocks if present
    let jsonText = response;
    if (response.startsWith('```json')) {
      jsonText = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (response.startsWith('```')) {
      jsonText = response.replace(/```\n?/g, '').trim();
    }
    
    // Parse JSON response
    const questions = JSON.parse(jsonText);
    
    if (!Array.isArray(questions)) {
      throw new Error('AI response is not an array of questions');
    }

    console.log(`Successfully generated ${questions.length} AI quiz questions`);
    
    // Transform to our internal format
    const transformedQuestions = questions.map((q, index) => ({
      id: `ai_q_${Date.now()}_${index}`,
      question: q.question,
      choices: q.choices.map(choice => ({
        id: `choice_${choice.label}`,
        label: choice.label,
        word: choice.word,
      })),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      generatedAt: new Date().toISOString(),
    }));

    // Verify answer distribution and log it
    const distribution = verifyAnswerDistribution(transformedQuestions);
    console.log('Answer distribution:', distribution);

    // Rebalance if needed
    return rebalanceAnswerDistribution(transformedQuestions);

  } catch (error) {
    console.error('Error generating AI quiz questions:', error);
    throw error;
  }
}

/**
 * Verify the distribution of correct answers across A, B, C, D
 * @param {Array} questions - Array of question objects
 * @returns {Object} - Distribution counts {A: count, B: count, C: count, D: count}
 */
function verifyAnswerDistribution(questions) {
  const distribution = { A: 0, B: 0, C: 0, D: 0 };
  
  questions.forEach(q => {
    if (distribution.hasOwnProperty(q.correctAnswer)) {
      distribution[q.correctAnswer]++;
    }
  });
  
  return distribution;
}

/**
 * Rebalance answer distribution by shuffling choices for questions
 * where correct answers are overrepresented
 * @param {Array} questions - Array of question objects
 * @returns {Array} - Rebalanced questions
 */
function rebalanceAnswerDistribution(questions) {
  // Check current distribution
  const distribution = verifyAnswerDistribution(questions);
  const total = questions.length;
  const target = Math.floor(total / 4); // Ideal count per position
  
  // Calculate how far off we are
  const maxCount = Math.max(...Object.values(distribution));
  const minCount = Math.min(...Object.values(distribution));
  
  // If distribution is already good (difference <= 25% of target), return as is
  if (maxCount - minCount <= Math.max(2, target * 0.25)) {
    console.log('Answer distribution is acceptable');
    return questions;
  }
  
  console.log('Rebalancing answer distribution...');
  
  // Find overrepresented and underrepresented positions
  const overrepresented = Object.entries(distribution)
    .filter(([_, count]) => count > target)
    .sort((a, b) => b[1] - a[1]) // Sort by count descending
    .map(([label]) => label);
  
  const underrepresented = Object.entries(distribution)
    .filter(([_, count]) => count < target)
    .sort((a, b) => a[1] - b[1]) // Sort by count ascending
    .map(([label]) => label);
  
  // Rebalance by shuffling choices for some questions
  const rebalanced = questions.map(q => {
    // If this question's correct answer is overrepresented, shuffle choices
    if (overrepresented.includes(q.correctAnswer) && underrepresented.length > 0) {
      // Find which choice has the correct word
      const correctChoice = q.choices.find(c => c.label === q.correctAnswer);
      if (!correctChoice) return q;
      
      // Pick a random underrepresented position
      const newPosition = underrepresented[Math.floor(Math.random() * underrepresented.length)];
      
      // Shuffle choices to move correct answer to new position
      const shuffledChoices = [...q.choices];
      const oldPosition = q.correctAnswer;
      
      // Swap the correct answer to the new position
      const oldIndex = shuffledChoices.findIndex(c => c.label === oldPosition);
      const newIndex = shuffledChoices.findIndex(c => c.label === newPosition);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        // Swap the words, keep labels
        const tempWord = shuffledChoices[oldIndex].word;
        shuffledChoices[oldIndex].word = shuffledChoices[newIndex].word;
        shuffledChoices[newIndex].word = tempWord;
        
        return {
          ...q,
          choices: shuffledChoices,
          correctAnswer: newPosition,
        };
      }
    }
    
    return q;
  });
  
  const newDistribution = verifyAnswerDistribution(rebalanced);
  console.log('New answer distribution after rebalancing:', newDistribution);
  
  return rebalanced;
}

/**
 * Check if deck has changed significantly since questions were generated
 * @param {Object} deck - Current deck object
 * @param {Array} existingQuestions - Existing questions with metadata
 * @returns {boolean} - True if deck has changed significantly
 */
export function shouldRegenerateQuestions(deck, existingQuestions) {
  if (!existingQuestions || existingQuestions.length === 0) {
    return true; // No questions exist, need to generate
  }

  // Get current cards
  let currentCards = [];
  if (Array.isArray(deck.cards)) {
    currentCards = deck.cards;
  } else if (deck.cards) {
    currentCards = Object.values(deck.cards);
  }

  // Check if we have metadata about when questions were generated
  const metadata = existingQuestions[0]?.metadata;
  if (!metadata) {
    return false; // No metadata, keep existing questions
  }

  const cardCountAtGeneration = metadata.cardCount || 0;
  const currentCardCount = currentCards.length;

  // Regenerate if card count changed by 20% or more
  const changePercentage = Math.abs(currentCardCount - cardCountAtGeneration) / cardCountAtGeneration;
  if (changePercentage >= 0.2) {
    console.log(`Card count changed by ${(changePercentage * 100).toFixed(1)}%, regenerating questions`);
    return true;
  }

  // Check if vocabulary words have changed significantly
  const wordsAtGeneration = new Set(metadata.vocabularyWords || []);
  const currentWords = new Set(currentCards.map(card => card.front));
  
  // Count how many words are different
  const removedWords = [...wordsAtGeneration].filter(word => !currentWords.has(word));
  const addedWords = [...currentWords].filter(word => !wordsAtGeneration.has(word));
  const totalChanges = removedWords.length + addedWords.length;
  
  if (totalChanges >= Math.max(3, currentCardCount * 0.2)) {
    console.log(`${totalChanges} vocabulary words changed, regenerating questions`);
    return true;
  }

  return false;
}

/**
 * Create metadata for storing with generated questions
 * @param {Object} deck - The deck object
 * @param {Array} questions - Generated questions
 * @returns {Object} - Metadata object
 */
export function createQuestionMetadata(deck, questions) {
  let cards = [];
  if (Array.isArray(deck.cards)) {
    cards = deck.cards;
  } else if (deck.cards) {
    cards = Object.values(deck.cards);
  }

  return {
    deckId: deck.id,
    deckName: deck.name,
    generatedAt: new Date().toISOString(),
    questionCount: questions.length,
    cardCount: cards.length,
    vocabularyWords: cards.map(card => card.front),
    version: '1.0',
  };
}

