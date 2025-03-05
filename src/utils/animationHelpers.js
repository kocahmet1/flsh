
// Helper function for cross-platform animation handling
import { Platform } from 'react-native';

/**
 * Creates animation config with appropriate useNativeDriver setting based on platform
 * @param {Object} config - The animation configuration
 * @returns {Object} - Animation config with useNativeDriver properly set
 */
export const createAnimationConfig = (config) => {
  return {
    ...config,
    useNativeDriver: Platform.OS !== 'web' && (config.useNativeDriver !== false)
  };
};

/**
 * Conditionally use timing animation with proper platform settings
 */
export const safeTiming = (value, config) => {
  return Animated.timing(value, createAnimationConfig(config));
};

/**
 * Conditionally use spring animation with proper platform settings
 */
export const safeSpring = (value, config) => {
  return Animated.spring(value, createAnimationConfig(config));
};

/**
 * Conditionally use sequence animation with proper platform settings
 */
export const safeSequence = (animations) => {
  return Animated.sequence(animations);
};
