
import { Platform } from 'react-native';
import Animated, { 
  FadeInDown, 
  FadeInUp,
  withSpring,
  withTiming,
  withSequence
} from 'react-native-reanimated';

/**
 * Platform-specific animation selector
 * Returns appropriate animation values based on platform
 */
export const getAnimationConfig = () => {
  // Web-specific configurations
  if (Platform.OS === 'web') {
    return {
      useNativeDriver: false,
      duration: 800,
      // Other web-specific animation settings
    };
  }
  
  // Native platforms
  return {
    useNativeDriver: true,
    duration: 600,
    // Other native-specific animation settings
  };
};

/**
 * Creates a fade-in animation compatible with both web and native
 */
export const createFadeInAnimation = (value, delay = 0) => {
  if (Platform.OS === 'web') {
    // For web, use JS driver
    return withTiming(1, {
      duration: 800,
      delay,
      useNativeDriver: false
    });
  }
  
  // For native, use native driver
  return withTiming(1, {
    duration: 600,
    delay,
    useNativeDriver: true
  });
};

/**
 * Creates a spring animation compatible with both web and native
 */
export const createSpringAnimation = (value, toValue, delay = 0) => {
  if (Platform.OS === 'web') {
    // For web, use JS driver with gentler spring settings
    return withSpring(toValue, {
      damping: 14,
      stiffness: 80,
      delay,
      useNativeDriver: false
    });
  }
  
  // For native, use native driver with more pronounced spring
  return withSpring(toValue, {
    damping: 12,
    stiffness: 100,
    delay,
    useNativeDriver: true
  });
};

/**
 * Helper to determine if animations should use native driver
 */
export const shouldUseNativeDriver = Platform.OS !== 'web';
