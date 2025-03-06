import React, { useRef, useEffect } from 'react';
import { Animated, View, Platform, StyleSheet } from 'react-native';

/**
 * AnimatedCard - A component that provides animation effects for cards
 * Support for both web (CSS animations) and native platforms (Animated API)
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Card content
 * @param {number} props.index - Index for staggered animations
 * @param {string} props.className - Optional CSS class name for web animations
 * @param {Object} props.style - Additional styles for the card
 */
const AnimatedCard = ({ children, index = 0, className = '', style = {} }) => {
  // Animation values for native platforms
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  useEffect(() => {
    // Calculate staggered delay based on index
    const staggerDelay = index * 100;
    
    // Start animations
    Animated.sequence([
      Animated.delay(staggerDelay),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        })
      ])
    ]).start();
  }, [index, fadeAnim, scaleAnim]);

  if (Platform.OS === 'web') {
    // For web, use CSS animations via className
    return (
      <View 
        className={`animated-card ${className}`}
        style={[styles.card, style]}
      >
        {children}
      </View>
    );
  }
  
  // For native platforms, use React Native's Animated API
  return (
    <Animated.View
      style={[
        styles.card,
        style,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
});

export default AnimatedCard;
