/**
 * Hook for managing user tracking statistics
 */

import { useState, useEffect, useCallback } from 'react';
import * as trackingRepo from '../repositories/trackingRepository';
import * as trackingStats from '../utils/trackingStats';

export function useTracking() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const loadedStats = await trackingRepo.getStats();
      setStats(loadedStats);
      setError(null);
    } catch (err) {
      console.error('[useTracking] Error loading stats:', err);
      setError(err.message);
      // Set initial stats on error
      setStats(trackingStats.createInitialStats());
    } finally {
      setLoading(false);
    }
  }, []);

  const saveStats = useCallback(async (updatedStats) => {
    try {
      const success = await trackingRepo.saveStats(updatedStats);
      if (success) {
        setStats(updatedStats);
      }
      return success;
    } catch (err) {
      console.error('[useTracking] Error saving stats:', err);
      return false;
    }
  }, []);

  /**
   * Record a study session
   */
  const recordStudySession = useCallback(async (deckId, deckName, cardsStudied = 0, durationMinutes = 0) => {
    if (!stats) return false;
    
    try {
      const updatedStats = trackingStats.recordStudySession(
        { ...stats }, 
        deckId, 
        deckName, 
        cardsStudied, 
        durationMinutes
      );
      return await saveStats(updatedStats);
    } catch (err) {
      console.error('[useTracking] Error recording study session:', err);
      return false;
    }
  }, [stats, saveStats]);

  /**
   * Record words learned
   */
  const recordWordsLearned = useCallback(async (count) => {
    if (!stats) return false;
    
    try {
      const updatedStats = trackingStats.recordWordsLearned({ ...stats }, count);
      return await saveStats(updatedStats);
    } catch (err) {
      console.error('[useTracking] Error recording words learned:', err);
      return false;
    }
  }, [stats, saveStats]);

  /**
   * Record a quiz attempt
   */
  const recordQuizAttempt = useCallback(async (
    deckId, 
    deckName, 
    questionsTotal, 
    questionsCorrect, 
    durationMinutes = 0
  ) => {
    if (!stats) return false;
    
    try {
      const updatedStats = trackingStats.recordQuizAttempt(
        { ...stats },
        deckId,
        deckName,
        questionsTotal,
        questionsCorrect,
        durationMinutes
      );
      return await saveStats(updatedStats);
    } catch (err) {
      console.error('[useTracking] Error recording quiz attempt:', err);
      return false;
    }
  }, [stats, saveStats]);

  /**
   * Get study summary with all key metrics
   */
  const getStudySummary = useCallback(() => {
    if (!stats) return null;
    return trackingStats.getStudySummary(stats);
  }, [stats]);

  /**
   * Get quiz accuracy percentage
   */
  const getQuizAccuracy = useCallback(() => {
    if (!stats) return 0;
    return trackingStats.getQuizAccuracy(stats);
  }, [stats]);

  /**
   * Get motivational message
   */
  const getMotivationalMessage = useCallback(() => {
    if (!stats) return 'Start learning today!';
    return trackingStats.getMotivationalMessage(stats);
  }, [stats]);

  /**
   * Reset all stats (for testing)
   */
  const resetStats = useCallback(async () => {
    try {
      await trackingRepo.clearStats();
      const newStats = trackingStats.createInitialStats();
      setStats(newStats);
      return true;
    } catch (err) {
      console.error('[useTracking] Error resetting stats:', err);
      return false;
    }
  }, []);

  /**
   * Sync stats to cloud
   */
  const syncToCloud = useCallback(async () => {
    try {
      await trackingRepo.syncStatsToCloud();
      await loadStats(); // Reload after sync
      return true;
    } catch (err) {
      console.error('[useTracking] Error syncing to cloud:', err);
      return false;
    }
  }, [loadStats]);

  /**
   * Refresh stats from storage
   */
  const refreshStats = useCallback(async () => {
    await loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    recordStudySession,
    recordWordsLearned,
    recordQuizAttempt,
    getStudySummary,
    getQuizAccuracy,
    getMotivationalMessage,
    resetStats,
    syncToCloud,
    refreshStats,
  };
}





