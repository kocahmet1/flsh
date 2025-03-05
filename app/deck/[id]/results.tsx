import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import ConfettiCannon from 'react-native-confetti-cannon';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Modern color palette - matching other components
const Colors = {
  primary: '#6366F1', // Indigo
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  secondary: '#EC4899', // Pink
  secondaryLight: '#F472B6',
  accent: '#3B82F6', // Blue
  surface: '#FFFFFF',
  surfaceAlt: '#F8F8FF',
  backgroundGradient: ['#F9FAFB', '#F3F4F6'],
  cardShadow: '#000000',
  text: '#111827',
  textSecondary: '#4B5563',
  hint: '#6B7280',
  success: '#10B981', // Green
  error: '#EF4444', // Red
  warning: '#F59E0B', // Amber
};

export default function ResultsScreen() {
  const { id, totalCards, knownCards } = useLocalSearchParams();
  const percentage = (Number(knownCards) / Number(totalCards)) * 100;
  
  // Determine performance level and corresponding color/icon
  const getPerformanceDetails = () => {
    if (percentage >= 90) {
      return {
        icon: 'emoji-events',
        color: Colors.success,
        message: 'Excellent! You\'ve mastered this deck!'
      };
    } else if (percentage >= 70) {
      return {
        icon: 'thumb-up',
        color: Colors.primary,
        message: 'Great job! You\'re doing well!'
      };
    } else if (percentage >= 50) {
      return {
        icon: 'trending-up',
        color: Colors.accent,
        message: 'Good progress! Keep practicing!'
      };
    } else {
      return {
        icon: 'school',
        color: Colors.warning,
        message: 'Keep studying! You\'ll improve with practice.'
      };
    }
  };
  
  const performanceDetails = getPerformanceDetails();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Colors.backgroundGradient}
        style={styles.gradientBackground}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButtonSmall}
            onPress={() => router.replace('/')}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <MaterialIcons name="assessment" size={24} color={Colors.primary} />
            <Text style={styles.headerTitle}>Results</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
        {percentage > 70 && (
          <ConfettiCannon
            count={200}
            origin={{ x: screenWidth / 2, y: screenHeight }}
            fadeOut={true}
            autoStart={true}
          />
        )}
        
        <Animated.View 
          entering={FadeIn.duration(400)}
          style={styles.contentContainer}
        >
          <Animated.View 
            entering={FadeInUp.duration(500)}
            style={styles.iconContainer}
          >
            <MaterialIcons 
              name={performanceDetails.icon} 
              size={80} 
              color={performanceDetails.color} 
            />
          </Animated.View>
          
          <Animated.Text 
            entering={FadeInUp.duration(500)}
            style={styles.title}
          >
            Study Complete!
          </Animated.Text>
          
          <Animated.View 
            entering={FadeInUp.duration(500)}
            style={styles.statsContainer}
          >
            <Text style={styles.statsLabel}>Cards Known:</Text>
            <Text style={styles.statsValue}>
              {knownCards}/{totalCards}
            </Text>
            <View style={styles.percentageContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${percentage}%`,
                      backgroundColor: performanceDetails.color 
                    }
                  ]} 
                />
              </View>
              <Text style={styles.percentageText}>
                {percentage.toFixed(1)}%
              </Text>
            </View>
          </Animated.View>
          
          <Animated.Text 
            entering={FadeInUp.duration(500).delay(200)}
            style={[styles.message, { color: performanceDetails.color }]}
          >
            {performanceDetails.message}
          </Animated.Text>
          
          <Animated.View 
            entering={FadeInUp.duration(500).delay(300)}
            style={styles.buttonsContainer}
          >
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => router.replace('/')}
            >
              <MaterialIcons name="arrow-back" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Back to My Decks</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => router.push(`/deck/${id}/study`)}
            >
              <MaterialIcons name="replay" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Study Again</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButtonSmall: {
    padding: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  headerRight: {
    width: 24,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  statsContainer: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 24,
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    shadowColor: Colors.cardShadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statsLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  statsValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  percentageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    marginRight: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  percentageText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    width: 60,
    textAlign: 'right',
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 32,
  },
  buttonsContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    backgroundColor: Colors.accent,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
});
