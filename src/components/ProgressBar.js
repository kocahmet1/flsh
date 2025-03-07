import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';

const ProgressBar = ({ progress, width = '100%', className = '', color, enableAnimation = true }) => {
  // Animation value for the shimmer effect
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  
  // Animation for pulsating effect
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Animation for background neon glow effect
  const neonGlowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (enableAnimation) {
      // Create infinite shimmer animation (only for red bar)
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: Platform.OS !== 'web', // Native driver doesn't work with some web animations
        })
      ).start();
      
      // Create subtle pulsating effect (for blue bar)
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

      // Neon glow animation for the blue bar
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
    } else {
      // Set default values when animations are disabled
      shimmerAnim.setValue(0);
      pulseAnim.setValue(1);
      neonGlowAnim.setValue(1);
    }
  }, [enableAnimation]);

  // Use a modern gradient for the bar - allow color customization
  const barColor = color || '#007AFF'; // Base color with fallback to blue
  
  // Interpolate shimmer animation
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
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
              opacity: enableAnimation ? neonOpacity : 1, // Apply fading animation to bar only when enabled
              ...(Platform.OS !== 'web' ? {
                transform: enableAnimation ? [{ scaleY: pulseAnim }] : []
              } : {}),
              ...(Platform.OS === 'web' ? {
                background: color 
                  ? `linear-gradient(90deg, ${color} 0%, ${color} 100%)`
                  : 'linear-gradient(90deg, #007AFF 0%, #8E54E9 100%)'
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
                boxShadow: enableAnimation ? neonShadow : '0px 0px 15px #ff0000'
              } : {})
            }
          ]}
        >
          {/* Shimmer overlay - only on red bar */}
          {enableAnimation && (
            <Animated.View 
              style={[
                styles.shimmer,
                Platform.OS === 'web' ? {
                  left: shimmerTranslate,
                  position: 'absolute',
                  top: 0,
                  height: '100%',
                  width: '30%',
                  backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                } : {
                  transform: [{ translateX: shimmerTranslate }],
                  position: 'absolute',
                  top: 0,
                  width: '30%',
                  height: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                }
              ]}
            />
          )}
          
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
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  baseBar: {
    height: '100%',
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
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
    borderRadius: 12,
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
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  shadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  remainingBar: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: '100%',
    borderRadius: 12,
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