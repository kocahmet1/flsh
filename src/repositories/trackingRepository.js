/**
 * Repository for storing and retrieving user tracking statistics
 * Supports both Firebase (cloud) and AsyncStorage (local)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, set, get } from 'firebase/database';
import { db, auth } from '../firebase/config';
import { createInitialStats } from '../utils/trackingStats';

const STORAGE_KEY = 'user_tracking_stats';

/**
 * Get user statistics
 * @returns {Promise<Object>} - User stats object
 */
export async function getStats() {
  try {
    // Try Firebase first (if user is authenticated)
    const user = auth.currentUser;
    if (user) {
      const statsRef = ref(db, `users/${user.uid}/stats`);
      const snapshot = await get(statsRef);
      
      if (snapshot.exists()) {
        console.log('[TrackingRepo] Stats loaded from Firebase');
        return snapshot.val();
      }
    }
    
    // Fall back to AsyncStorage
    const statsJson = await AsyncStorage.getItem(STORAGE_KEY);
    if (statsJson) {
      console.log('[TrackingRepo] Stats loaded from AsyncStorage');
      return JSON.parse(statsJson);
    }
    
    // Return initial stats if none exist
    console.log('[TrackingRepo] No stats found, creating initial stats');
    const initialStats = createInitialStats();
    await saveStats(initialStats);
    return initialStats;
    
  } catch (error) {
    console.error('[TrackingRepo] Error loading stats:', error);
    return createInitialStats();
  }
}

/**
 * Save user statistics
 * @param {Object} stats - Stats object to save
 * @returns {Promise<boolean>} - Success status
 */
export async function saveStats(stats) {
  try {
    // Update timestamp
    stats.lastUpdated = new Date().toISOString();
    
    // Save to AsyncStorage (always)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    console.log('[TrackingRepo] Stats saved to AsyncStorage');
    
    // Save to Firebase if user is authenticated
    const user = auth.currentUser;
    if (user) {
      const statsRef = ref(db, `users/${user.uid}/stats`);
      await set(statsRef, stats);
      console.log('[TrackingRepo] Stats saved to Firebase');
    }
    
    return true;
  } catch (error) {
    console.error('[TrackingRepo] Error saving stats:', error);
    return false;
  }
}

/**
 * Clear all stats (for testing or reset)
 * @returns {Promise<boolean>}
 */
export async function clearStats() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    
    const user = auth.currentUser;
    if (user) {
      const statsRef = ref(db, `users/${user.uid}/stats`);
      await set(statsRef, null);
    }
    
    console.log('[TrackingRepo] Stats cleared');
    return true;
  } catch (error) {
    console.error('[TrackingRepo] Error clearing stats:', error);
    return false;
  }
}

/**
 * Sync local stats to Firebase (useful after login)
 * @returns {Promise<boolean>}
 */
export async function syncStatsToCloud() {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log('[TrackingRepo] No user logged in, cannot sync');
      return false;
    }
    
    // Get local stats
    const statsJson = await AsyncStorage.getItem(STORAGE_KEY);
    if (!statsJson) {
      console.log('[TrackingRepo] No local stats to sync');
      return false;
    }
    
    const localStats = JSON.parse(statsJson);
    
    // Get cloud stats
    const statsRef = ref(db, `users/${user.uid}/stats`);
    const snapshot = await get(statsRef);
    
    if (snapshot.exists()) {
      // Merge stats (prefer higher values)
      const cloudStats = snapshot.val();
      const mergedStats = mergeStats(localStats, cloudStats);
      await set(statsRef, mergedStats);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mergedStats));
      console.log('[TrackingRepo] Stats merged and synced');
    } else {
      // Upload local stats to cloud
      await set(statsRef, localStats);
      console.log('[TrackingRepo] Local stats uploaded to cloud');
    }
    
    return true;
  } catch (error) {
    console.error('[TrackingRepo] Error syncing stats:', error);
    return false;
  }
}

/**
 * Merge two stats objects (prefer higher values)
 * @param {Object} stats1 - First stats object
 * @param {Object} stats2 - Second stats object
 * @returns {Object} - Merged stats object
 */
function mergeStats(stats1, stats2) {
  return {
    totalWordsLearned: Math.max(stats1.totalWordsLearned || 0, stats2.totalWordsLearned || 0),
    totalStudySessions: Math.max(stats1.totalStudySessions || 0, stats2.totalStudySessions || 0),
    totalQuizzesTaken: Math.max(stats1.totalQuizzesTaken || 0, stats2.totalQuizzesTaken || 0),
    totalQuizQuestionsSolved: Math.max(stats1.totalQuizQuestionsSolved || 0, stats2.totalQuizQuestionsSolved || 0),
    totalQuizQuestionsCorrect: Math.max(stats1.totalQuizQuestionsCorrect || 0, stats2.totalQuizQuestionsCorrect || 0),
    totalStudyTimeMinutes: Math.max(stats1.totalStudyTimeMinutes || 0, stats2.totalStudyTimeMinutes || 0),
    
    firstStudyDate: stats1.firstStudyDate && stats2.firstStudyDate 
      ? (new Date(stats1.firstStudyDate) < new Date(stats2.firstStudyDate) ? stats1.firstStudyDate : stats2.firstStudyDate)
      : (stats1.firstStudyDate || stats2.firstStudyDate),
      
    lastStudyDate: stats1.lastStudyDate && stats2.lastStudyDate
      ? (new Date(stats1.lastStudyDate) > new Date(stats2.lastStudyDate) ? stats1.lastStudyDate : stats2.lastStudyDate)
      : (stats1.lastStudyDate || stats2.lastStudyDate),
    
    currentStreak: Math.max(stats1.currentStreak || 0, stats2.currentStreak || 0),
    longestStreak: Math.max(stats1.longestStreak || 0, stats2.longestStreak || 0),
    
    studyDates: [...new Set([...(stats1.studyDates || []), ...(stats2.studyDates || [])])].sort(),
    
    deckStats: mergeDeckStats(stats1.deckStats || {}, stats2.deckStats || {}),
    
    recentQuizzes: mergeRecentQuizzes(stats1.recentQuizzes || [], stats2.recentQuizzes || []),
    
    achievements: [...new Set([...(stats1.achievements || []), ...(stats2.achievements || [])])],
    
    version: '1.0',
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Merge deck stats from two sources
 */
function mergeDeckStats(deckStats1, deckStats2) {
  const merged = { ...deckStats1 };
  
  Object.keys(deckStats2).forEach(deckId => {
    if (merged[deckId]) {
      merged[deckId] = {
        deckName: deckStats2[deckId].deckName || merged[deckId].deckName,
        studyCount: Math.max(merged[deckId].studyCount || 0, deckStats2[deckId].studyCount || 0),
        quizzesTaken: Math.max(merged[deckId].quizzesTaken || 0, deckStats2[deckId].quizzesTaken || 0),
        timeSpentMinutes: Math.max(merged[deckId].timeSpentMinutes || 0, deckStats2[deckId].timeSpentMinutes || 0),
        lastStudied: merged[deckId].lastStudied && deckStats2[deckId].lastStudied
          ? (new Date(merged[deckId].lastStudied) > new Date(deckStats2[deckId].lastStudied) 
              ? merged[deckId].lastStudied 
              : deckStats2[deckId].lastStudied)
          : (merged[deckId].lastStudied || deckStats2[deckId].lastStudied),
      };
    } else {
      merged[deckId] = deckStats2[deckId];
    }
  });
  
  return merged;
}

/**
 * Merge recent quizzes from two sources
 */
function mergeRecentQuizzes(quizzes1, quizzes2) {
  const combined = [...quizzes1, ...quizzes2];
  // Remove duplicates and sort by date
  const unique = combined.reduce((acc, quiz) => {
    const key = `${quiz.deckId}_${quiz.date}`;
    if (!acc.map[key]) {
      acc.map[key] = true;
      acc.list.push(quiz);
    }
    return acc;
  }, { map: {}, list: [] }).list;
  
  return unique
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 20);
}

