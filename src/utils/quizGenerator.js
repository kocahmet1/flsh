/**
 * Generates SAT-style vocab quiz questions from deck cards
 */

// SAT-style sentence templates with blanks
const sentenceTemplates = [
  "Despite her initial hesitation, Maria's _____ nature eventually led her to accept the invitation with enthusiasm.",
  "The scientist's research was considered _____ by his colleagues, as it challenged conventional theories.",
  "The politician's _____ remarks during the debate alienated many potential supporters.",
  "His _____ handling of the delicate negotiations impressed even the most skeptical observers.",
  "The teacher's _____ demeanor made her immediately popular with students on the first day of school.",
  "The company's decision to _____ the outdated policy was met with widespread approval from employees.",
  "After careful consideration, she decided to _____ her former stance on the controversial issue.",
  "The protesters refused to _____ to the government's demands, despite mounting pressure.",
  "He attempted to _____ any wrongdoing, though the evidence suggested otherwise.",
  "The ancient custom has been _____ in many modern societies, though some traditionalists resist.",
  "The CEO responded with _____ when offered the opportunity to expand the business internationally.",
  "The debate became increasingly _____, with both sides exchanging harsh criticisms.",
  "As the hurricane moved inland, its intensity began to _____, bringing relief to coastal residents.",
  "Many citizens _____ the use of force, believing peaceful solutions are always preferable.",
  "The witness's testimony contained several _____ details that contradicted the official report.",
  "Her _____ skills in photography were evident in every composition she captured.",
  "The new policy will effectively _____ all previous regulations on the matter.",
  "The committee members quickly _____ to the chairman's proposal without much discussion.",
  "The contract contains a clause allowing either party to _____ the agreement under certain conditions.",
  "His _____ personality helped him navigate difficult social situations with grace and tact.",
];

/**
 * Generate a quiz question for a specific word
 * @param {Object} correctCard - The card with the correct answer
 * @param {Array} allCards - All cards from the deck to use as distractors
 * @returns {Object} Quiz question object
 */
function generateQuestion(correctCard, allCards) {
  // Get 3 random distractor cards (wrong answers)
  const otherCards = allCards.filter(card => card.id !== correctCard.id);
  
  // Shuffle and take 3 distractors
  const shuffled = [...otherCards].sort(() => Math.random() - 0.5);
  const distractors = shuffled.slice(0, 3);
  
  // If we don't have enough distractors, return null
  if (distractors.length < 3) {
    return null;
  }
  
  // Combine correct answer with distractors and shuffle
  const choices = [correctCard, ...distractors].sort(() => Math.random() - 0.5);
  
  // Select a random sentence template
  const template = sentenceTemplates[Math.floor(Math.random() * sentenceTemplates.length)];
  
  // Create the question by replacing the blank with the word in context
  const question = template;
  
  return {
    id: `q_${correctCard.id}_${Date.now()}`,
    question: question,
    choices: choices.map(card => ({
      id: card.id,
      word: card.front,
      definition: card.back,
    })),
    correctAnswerId: correctCard.id,
    correctWord: correctCard.front,
    correctDefinition: correctCard.back,
  };
}

/**
 * Generate a complete quiz from a deck
 * @param {Object} deck - The deck object containing cards
 * @param {number} questionCount - Number of questions to generate (default: 10)
 * @returns {Object} Quiz object with questions
 */
export function generateQuiz(deck, questionCount = 10) {
  if (!deck || !deck.cards) {
    return null;
  }
  
  // Convert cards to array if they're an object
  let cardsArray = [];
  if (Array.isArray(deck.cards)) {
    cardsArray = deck.cards;
  } else {
    cardsArray = Object.values(deck.cards);
  }
  
  // Filter out cards without proper data
  cardsArray = cardsArray.filter(card => 
    card && card.front && card.back && card.front.trim() && card.back.trim()
  );
  
  // We need at least 4 cards to create a multiple choice question
  if (cardsArray.length < 4) {
    return {
      id: `quiz_${deck.id}_${Date.now()}`,
      deckId: deck.id,
      deckName: deck.name,
      questions: [],
      error: 'This deck needs at least 4 cards to generate a quiz.',
    };
  }
  
  // Determine actual number of questions we can generate
  const actualQuestionCount = Math.min(questionCount, cardsArray.length);
  
  // Shuffle cards and select the ones we'll use for questions
  const shuffledCards = [...cardsArray].sort(() => Math.random() - 0.5);
  const selectedCards = shuffledCards.slice(0, actualQuestionCount);
  
  // Generate questions
  const questions = selectedCards
    .map(card => generateQuestion(card, cardsArray))
    .filter(q => q !== null); // Remove any null questions
  
  return {
    id: `quiz_${deck.id}_${Date.now()}`,
    deckId: deck.id,
    deckName: deck.name,
    questions: questions,
    totalQuestions: questions.length,
  };
}

/**
 * Calculate quiz score
 * @param {Array} answers - Array of user answers {questionId, selectedChoiceId}
 * @param {Object} quiz - The quiz object
 * @returns {Object} Score results
 */
export function calculateScore(answers, quiz) {
  if (!answers || !quiz || !quiz.questions) {
    return { score: 0, total: 0, percentage: 0 };
  }
  
  let correct = 0;
  const total = quiz.questions.length;
  
  answers.forEach(answer => {
    const question = quiz.questions.find(q => q.id === answer.questionId);
    if (question && answer.selectedChoiceId === question.correctAnswerId) {
      correct++;
    }
  });
  
  return {
    score: correct,
    total: total,
    percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
  };
}


