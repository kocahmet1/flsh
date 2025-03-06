import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';

const ProgressBar = ({ progress, width = '100%', className = '' }) => {
  // Animation value for the shimmer effect
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  
  // Animation for pulsating effect
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Animation for background neon glow effect
  const neonGlowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Create infinite shimmer animation
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: Platform.OS !== 'web', // Native driver doesn't work with some web animations
      })
    ).start();
    
    // Create subtle pulsating effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        })
      ])
    ).start();

    // Neon glow animation for the background bar
    Animated.loop(
      Animated.sequence([
        Animated.timing(neonGlowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(neonGlowAnim, {
          toValue: 0.6,
          duration: 1500,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();
  }, []);

  // Use a modern gradient for the bar
  const barColor = '#007AFF'; // Base color
  
  // Interpolate shimmer animation
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-100%', '100%']
  });

  // Interpolate neon glow animation to create a pulsating crimson effect
  const neonOpacity = neonGlowAnim.interpolate({
    inputRange: [0, 0.3, 0.6, 1],
    outputRange: [0.2, 0.5, 0.8, 1],
  });

  // Fix the shadow pattern - each value must use the same pattern format
  const neonShadow = neonGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0px 0px 15px #ff0000', '0px 0px 45px #ff0000']  
  });

  // Calculate progress width safely
  const progressWidth = `${Math.min(Math.max(progress, 0), 100)}%`;

  return (
    <View style={[styles.container, { width }]} className={className}>
      {/* Base bar with 3D effect */}
      <View style={styles.baseBar}>
        <Animated.View 
          style={[
            styles.bar, 
            { 
              width: progressWidth,
              backgroundColor: barColor,
              opacity: neonOpacity, // Apply fading animation to blue bar
              ...(Platform.OS !== 'web' ? {
                transform: [{ scaleY: pulseAnim }]
              } : {})
            }
          ]} 
        >
          {/* 3D effect highlight */}
          <View style={styles.highlight} />
          
          {/* 3D effect shadow */}
          <View style={styles.shadow} />
        </Animated.View>
        <Animated.View 
          style={[
            styles.remainingBar,
            {
              width: `${100 - progress}%`,
              backgroundColor: 'rgba(255, 0, 0, 0.7)', 
              ...(Platform.OS === 'web' ? {
                boxShadow: neonShadow
              } : {})
            }
          ]}
        >
          {/* Shimmer overlay - now on red bar */}
          <Animated.View 
            style={[
              styles.shimmer,
              Platform.OS === 'web' ? {
                left: shimmerTranslate
              } : {
                transform: [{ translateX: shimmerTranslate }]
              }
            ]}
          />
          
          {/* Add 3D effect highlight to red bar */}
          <View style={styles.highlight} />
          
          {/* Add 3D effect shadow to red bar */}
          <View style={styles.shadow} />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 18,
    borderRadius: 9,
    overflow: 'hidden',
    position: 'relative',
  },
  baseBar: {
    height: '100%',
    backgroundColor: '#E0E0E0',
    borderRadius: 9,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }
    }),
  },
  bar: {
    height: '100%',
    borderRadius: 9,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        background: 'linear-gradient(90deg, #007AFF 0%, #8E54E9 100%)'
      },
      default: {
        backgroundColor: '#007AFF'
      }
    }),
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    width: '30%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    ...Platform.select({
      web: {
        position: 'absolute',
        top: 0,
        height: '100%',
        width: '30%',
        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
      }
    })
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
  },
  shadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 9,
  },
  remainingBar: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: '100%',
    borderRadius: 9,
    ...Platform.select({
      ios: {
        shadowColor: '#983d5b',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});

export default ProgressBar;