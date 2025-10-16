/**
 * TrackingCard component - Displays user statistics and progress
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { calculateTotalWordsMastered } from '../utils/deckStatsCalculator';

export default function TrackingCard({ stats, loading, decks }) {
  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.statRow}>
          <Text style={styles.loadingText}>Loading stats...</Text>
        </View>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.card}>
        <View style={styles.statRow}>
          <Text style={styles.emptyText}>No stats yet. Start studying!</Text>
        </View>
      </View>
    );
  }

  // Calculate actual words mastered from deck data (real-time)
  const actualWordsMastered = decks ? calculateTotalWordsMastered(decks) : 0;

  const {
    totalStudySessions = 0,
    totalQuizzesTaken = 0,
    totalQuizQuestionsSolved = 0,
    totalQuizQuestionsCorrect = 0,
    currentStreak = 0,
  } = stats;

  const quizAccuracy = totalQuizQuestionsSolved > 0
    ? Math.round((totalQuizQuestionsCorrect / totalQuizQuestionsSolved) * 100)
    : 0;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="chart-line" size={20} color="#6366F1" />
        <Text style={styles.title}>Your Progress</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {/* Words Learned */}
        <View style={[styles.statItem, styles.statItemPrimary]}>
          <View style={styles.statIconContainer}>
            <MaterialCommunityIcons name="book-check" size={24} color="#10B981" />
          </View>
          <Text style={styles.statValue}>{actualWordsMastered}</Text>
          <Text style={styles.statLabel}>Words Mastered</Text>
        </View>

        {/* Study Sessions */}
        <View style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <MaterialCommunityIcons name="school" size={24} color="#6366F1" />
          </View>
          <Text style={styles.statValue}>{totalStudySessions}</Text>
          <Text style={styles.statLabel}>Study Sessions</Text>
        </View>

        {/* Quizzes Taken */}
        <View style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <MaterialCommunityIcons name="head-question" size={24} color="#F59E0B" />
          </View>
          <Text style={styles.statValue}>{totalQuizzesTaken}</Text>
          <Text style={styles.statLabel}>Quizzes Taken</Text>
        </View>

        {/* Quiz Questions */}
        <View style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <MaterialCommunityIcons name="help-circle" size={24} color="#8B5CF6" />
          </View>
          <Text style={styles.statValue}>{totalQuizQuestionsSolved}</Text>
          <Text style={styles.statLabel}>Questions Solved</Text>
        </View>

        {/* Quiz Accuracy */}
        <View style={[styles.statItem, styles.statItemHighlight]}>
          <View style={styles.statIconContainer}>
            <MaterialCommunityIcons 
              name={quizAccuracy >= 70 ? "check-circle" : "progress-check"} 
              size={24} 
              color={quizAccuracy >= 70 ? "#10B981" : "#64748B"} 
            />
          </View>
          <Text style={[
            styles.statValue,
            quizAccuracy >= 90 ? styles.statValueExcellent : 
            quizAccuracy >= 70 ? styles.statValueGood : {}
          ]}>
            {quizAccuracy}%
          </Text>
          <Text style={styles.statLabel}>Quiz Accuracy</Text>
        </View>

        {/* Current Streak */}
        <View style={[styles.statItem, currentStreak >= 3 && styles.statItemStreak]}>
          <View style={styles.statIconContainer}>
            <MaterialCommunityIcons 
              name={currentStreak >= 3 ? "fire" : "calendar-star"} 
              size={24} 
              color={currentStreak >= 3 ? "#F97316" : "#94A3B8"} 
            />
          </View>
          <Text style={[
            styles.statValue,
            currentStreak >= 7 && styles.statValueStreak
          ]}>
            {currentStreak}
          </Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
      </View>

      {/* Motivational Message */}
      {(currentStreak >= 3 || actualWordsMastered >= 50 || quizAccuracy >= 80) && (
        <View style={styles.motivationContainer}>
          <Text style={styles.motivationText}>
            {currentStreak >= 7 
              ? "🔥 Amazing streak! Keep it up!" 
              : actualWordsMastered >= 100
              ? "🏆 100+ words mastered! Outstanding!"
              : quizAccuracy >= 90
              ? "🎓 90%+ accuracy! You're a master!"
              : quizAccuracy >= 80
              ? "⭐ Great accuracy! Keep learning!"
              : "💪 Great progress! Keep going!"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4338CA',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statItem: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
    alignItems: 'center',
  },
  statItemPrimary: {
    // Special styling for primary stat
  },
  statItemHighlight: {
    // Special styling for highlighted stat
  },
  statItemStreak: {
    // Special styling for streak
  },
  statIconContainer: {
    marginBottom: 6,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 2,
  },
  statValueGood: {
    color: '#10B981',
  },
  statValueExcellent: {
    color: '#059669',
  },
  statValueStreak: {
    color: '#F97316',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    padding: 20,
  },
  motivationContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  motivationText: {
    fontSize: 13,
    color: '#6366F1',
    textAlign: 'center',
    fontWeight: '600',
    fontStyle: 'italic',
  },
});

