/**
 * User statistics tracking and management
 * Tracks study sessions, quiz attempts, words mastered, and more
 */

/**
 * Create initial stats object
 */
export function createInitialStats() {
  return {
    // Overall statistics
    totalWordsLearned: 0,
    totalStudySessions: 0,
    totalQuizzesTaken: 0,
    totalQuizQuestionsSolved: 0,
    totalQuizQuestionsCorrect: 0,
    
    // Time tracking
    firstStudyDate: null,
    lastStudyDate: null,
    totalStudyTimeMinutes: 0, // Track total study time
    
    // Streaks
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: null,
    
    // Deck-specific tracking
    deckStats: {
      // Format: deckId: { studyCount, lastStudied, timeSpentMinutes, quizzesTaken }
    },
    
    // Daily activity (for streak calculation)
    studyDates: [], // Array of ISO date strings when user studied
    
    // Quiz history (last 10 attempts)
    recentQuizzes: [],
    
    // Achievements/Milestones (optional for future)
    achievements: [],
    
    version: '1.0',
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Record a study session
 * @param {Object} stats - Current stats
 * @param {String} deckId - ID of the deck studied
 * @param {String} deckName - Name of the deck
 * @param {Number} cardsStudied - Number of cards studied
 * @param {Number} durationMinutes - Time spent studying (optional)
 * @returns {Object} - Updated stats
 */
export function recordStudySession(stats, deckId, deckName, cardsStudied = 0, durationMinutes = 0) {
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Update overall stats
  stats.totalStudySessions++;
  stats.lastStudyDate = now.toISOString();
  stats.totalStudyTimeMinutes += durationMinutes;
  
  if (!stats.firstStudyDate) {
    stats.firstStudyDate = now.toISOString();
  }
  
  // Update deck-specific stats
  if (!stats.deckStats) stats.deckStats = {};
  if (!stats.deckStats[deckId]) {
    stats.deckStats[deckId] = {
      deckName: deckName,
      studyCount: 0,
      lastStudied: null,
      timeSpentMinutes: 0,
      quizzesTaken: 0,
    };
  }
  
  stats.deckStats[deckId].studyCount++;
  stats.deckStats[deckId].lastStudied = now.toISOString();
  stats.deckStats[deckId].timeSpentMinutes += durationMinutes;
  
  // Update study dates for streak calculation
  if (!stats.studyDates) stats.studyDates = [];
  if (!stats.studyDates.includes(today)) {
    stats.studyDates.push(today);
    // Keep only last 365 days
    if (stats.studyDates.length > 365) {
      stats.studyDates = stats.studyDates.slice(-365);
    }
  }
  
  // Calculate streak
  stats = calculateStreak(stats);
  
  stats.lastUpdated = now.toISOString();
  return stats;
}

/**
 * Record words learned (cards marked as known)
 * @param {Object} stats - Current stats
 * @param {Number} wordsLearned - Number of words newly marked as known
 * @returns {Object} - Updated stats
 */
export function recordWordsLearned(stats, wordsLearned) {
  stats.totalWordsLearned += wordsLearned;
  stats.lastUpdated = new Date().toISOString();
  return stats;
}

/**
 * Record a quiz attempt
 * @param {Object} stats - Current stats
 * @param {String} deckId - ID of the deck
 * @param {String} deckName - Name of the deck
 * @param {Number} questionsTotal - Total questions in quiz
 * @param {Number} questionsCorrect - Number of correct answers
 * @param {Number} durationMinutes - Time spent on quiz (optional)
 * @returns {Object} - Updated stats
 */
export function recordQuizAttempt(stats, deckId, deckName, questionsTotal, questionsCorrect, durationMinutes = 0) {
  const now = new Date();
  
  // Update overall stats
  stats.totalQuizzesTaken++;
  stats.totalQuizQuestionsSolved += questionsTotal;
  stats.totalQuizQuestionsCorrect += questionsCorrect;
  stats.lastStudyDate = now.toISOString();
  
  if (!stats.firstStudyDate) {
    stats.firstStudyDate = now.toISOString();
  }
  
  // Update deck-specific stats
  if (!stats.deckStats) stats.deckStats = {};
  if (!stats.deckStats[deckId]) {
    stats.deckStats[deckId] = {
      deckName: deckName,
      studyCount: 0,
      lastStudied: null,
      timeSpentMinutes: 0,
      quizzesTaken: 0,
    };
  }
  stats.deckStats[deckId].quizzesTaken++;
  stats.deckStats[deckId].timeSpentMinutes += durationMinutes;
  
  // Add to recent quizzes
  if (!stats.recentQuizzes) stats.recentQuizzes = [];
  stats.recentQuizzes.unshift({
    deckId,
    deckName,
    date: now.toISOString(),
    questionsTotal,
    questionsCorrect,
    percentage: Math.round((questionsCorrect / questionsTotal) * 100),
  });
  
  // Keep only last 20 quizzes
  if (stats.recentQuizzes.length > 20) {
    stats.recentQuizzes = stats.recentQuizzes.slice(0, 20);
  }
  
  stats.lastUpdated = now.toISOString();
  return stats;
}

/**
 * Calculate current and longest streak
 * @param {Object} stats - Current stats
 * @returns {Object} - Updated stats with streak info
 */
export function calculateStreak(stats) {
  if (!stats.studyDates || stats.studyDates.length === 0) {
    stats.currentStreak = 0;
    stats.longestStreak = 0;
    return stats;
  }
  
  // Sort dates in descending order
  const sortedDates = [...stats.studyDates].sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  
  // Calculate current streak
  let currentStreak = 0;
  let checkDate = new Date(today);
  
  for (let i = 0; i < sortedDates.length; i++) {
    const studyDate = sortedDates[i];
    const expectedDate = checkDate.toISOString().split('T')[0];
    
    if (studyDate === expectedDate) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1); // Move to previous day
    } else {
      break; // Streak broken
    }
  }
  
  stats.currentStreak = currentStreak;
  
  // Calculate longest streak
  let longestStreak = 1;
  let tempStreak = 1;
  
  const sortedAsc = [...stats.studyDates].sort();
  for (let i = 1; i < sortedAsc.length; i++) {
    const prevDate = new Date(sortedAsc[i - 1]);
    const currDate = new Date(sortedAsc[i]);
    const daysDiff = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }
  
  stats.longestStreak = Math.max(stats.longestStreak || 0, longestStreak);
  
  return stats;
}

/**
 * Get overall quiz accuracy percentage
 * @param {Object} stats - Current stats
 * @returns {Number} - Percentage (0-100)
 */
export function getQuizAccuracy(stats) {
  if (!stats.totalQuizQuestionsSolved || stats.totalQuizQuestionsSolved === 0) {
    return 0;
  }
  return Math.round((stats.totalQuizQuestionsCorrect / stats.totalQuizQuestionsSolved) * 100);
}

/**
 * Get most studied decks
 * @param {Object} stats - Current stats
 * @param {Number} limit - Number of top decks to return
 * @returns {Array} - Array of deck stats sorted by study count
 */
export function getMostStudiedDecks(stats, limit = 5) {
  if (!stats.deckStats) return [];
  
  return Object.entries(stats.deckStats)
    .map(([deckId, deckData]) => ({
      deckId,
      ...deckData,
    }))
    .sort((a, b) => b.studyCount - a.studyCount)
    .slice(0, limit);
}

/**
 * Get study insights and summary
 * @param {Object} stats - Current stats
 * @returns {Object} - Summary object with key metrics
 */
export function getStudySummary(stats) {
  const accuracy = getQuizAccuracy(stats);
  const avgQuizScore = stats.totalQuizzesTaken > 0 
    ? Math.round((stats.totalQuizQuestionsCorrect / stats.totalQuizQuestionsSolved) * 100)
    : 0;
    
  return {
    totalWordsLearned: stats.totalWordsLearned || 0,
    totalStudySessions: stats.totalStudySessions || 0,
    totalQuizzesTaken: stats.totalQuizzesTaken || 0,
    totalQuestionsSolved: stats.totalQuizQuestionsSolved || 0,
    quizAccuracy: accuracy,
    currentStreak: stats.currentStreak || 0,
    longestStreak: stats.longestStreak || 0,
    totalTimeMinutes: stats.totalStudyTimeMinutes || 0,
    recentQuizzes: stats.recentQuizzes || [],
    mostStudiedDecks: getMostStudiedDecks(stats, 3),
  };
}

/**
 * Format time duration for display
 * @param {Number} minutes - Duration in minutes
 * @returns {String} - Formatted string
 */
export function formatStudyTime(minutes) {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Get a motivational message based on stats
 * @param {Object} stats - Current stats
 * @returns {String} - Motivational message
 */
export function getMotivationalMessage(stats) {
  const streak = stats.currentStreak || 0;
  const wordsLearned = stats.totalWordsLearned || 0;
  const accuracy = getQuizAccuracy(stats);
  
  if (streak >= 30) return "🔥 Incredible 30+ day streak! You're unstoppable!";
  if (streak >= 14) return "⚡ Two weeks strong! Keep the momentum!";
  if (streak >= 7) return "🌟 One week streak! You're on fire!";
  if (streak >= 3) return "💪 Great consistency! Keep it going!";
  
  if (wordsLearned >= 500) return "🏆 500+ words mastered! Outstanding!";
  if (wordsLearned >= 200) return "🎯 200+ words learned! Impressive progress!";
  if (wordsLearned >= 100) return "✨ 100 words milestone reached!";
  if (wordsLearned >= 50) return "🚀 50 words learned! Great start!";
  
  if (accuracy >= 90) return "🎓 90%+ accuracy! You're a vocab master!";
  if (accuracy >= 80) return "📚 80%+ accuracy! Excellent work!";
  if (accuracy >= 70) return "📖 Solid progress! Keep learning!";
  
  return "🌱 Start your learning journey today!";
}





