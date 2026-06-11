/**
 * Repository for storing and retrieving user tracking statistics locally.
 * The mobile build intentionally keeps study history on-device and does not
 * depend on login or cloud sync.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createInitialStats } from '../utils/trackingStats';

const STORAGE_KEY = 'user_tracking_stats';

export async function getStats() {
  try {
    const statsJson = await AsyncStorage.getItem(STORAGE_KEY);
    if (statsJson) {
      return JSON.parse(statsJson);
    }

    const initialStats = createInitialStats();
    await saveStats(initialStats);
    return initialStats;
  } catch (error) {
    console.error('[TrackingRepo] Error loading stats:', error);
    return createInitialStats();
  }
}

export async function saveStats(stats) {
  try {
    const nextStats = {
      ...stats,
      lastUpdated: new Date().toISOString(),
    };

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextStats));
    return true;
  } catch (error) {
    console.error('[TrackingRepo] Error saving stats:', error);
    return false;
  }
}

export async function clearStats() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('[TrackingRepo] Error clearing stats:', error);
    return false;
  }
}

export async function clearLocalStorage() {
  return clearStats();
}

export async function syncStatsToCloud() {
  return false;
}
