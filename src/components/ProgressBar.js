import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform, TouchableWithoutFeedback } from 'react-native';

const ProgressBar = ({ progress, width = '100%', className = '', color, enableAnimation = true, style, onPress }) => {
  // Animation value for the shimmer effect
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim2 = useRef(new Animated.Value(0)).current;
  const shimmerAnim3 = useRef(new Animated.Value(0)).current;
  const shimmerAnim4 = useRef(new Animated.Value(0)).current;
  const shimmerAnim5 = useRef(new Animated.Value(0)).current;

  // Animation for background neon glow effect
  const neonGlowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (enableAnimation) {
      // Create infinite shimmer animations with staggered delays
      const createShimmerAnimation = (animValue, delay = 0) => {
        return Animated.loop(
          Animated.timing(animValue, {
            toValue: 1,
            duration: 6000,
            delay: delay,
            useNativeDriver: Platform.OS !== 'web',
          })
        ).start();
      };

      // Start all shimmer animations with staggered delays
      createShimmerAnimation(shimmerAnim, 0);
      createShimmerAnimation(shimmerAnim2, 400);
      createShimmerAnimation(shimmerAnim3, 800);
      createShimmerAnimation(shimmerAnim4, 1200);
      createShimmerAnimation(shimmerAnim5, 1600);

      // Neon glow animation for the red bar
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
    }
  }, [enableAnimation]);

  // Interpolate shimmer animations
  const createShimmerInterpolation = (animValue) => {
    return animValue.interpolate({
      inputRange: [0, 1],
      outputRange: Platform.OS === 'web' ? ['0%', '100%'] : [0, 200]
    });
  };

  // Create opacity interpolation to fade out shimmer effects
  const createShimmerOpacityInterpolation = (animValue) => {
    return animValue.interpolate({
      inputRange: [0, 0.8, 0.98, 1],
      outputRange: [1, 1, 0.3, 0]
    });
  };

  const shimmerTranslate = createShimmerInterpolation(shimmerAnim);
  const shimmerTranslate2 = createShimmerInterpolation(shimmerAnim2);
  const shimmerTranslate3 = createShimmerInterpolation(shimmerAnim3);
  const shimmerTranslate4 = createShimmerInterpolation(shimmerAnim4);
  const shimmerTranslate5 = createShimmerInterpolation(shimmerAnim5);

  // Create opacity values for each shimmer effect
  const shimmerOpacity = createShimmerOpacityInterpolation(shimmerAnim);
  const shimmerOpacity2 = createShimmerOpacityInterpolation(shimmerAnim2);
  const shimmerOpacity3 = createShimmerOpacityInterpolation(shimmerAnim3);
  const shimmerOpacity4 = createShimmerOpacityInterpolation(shimmerAnim4);
  const shimmerOpacity5 = createShimmerOpacityInterpolation(shimmerAnim5);

  // Interpolate neon glow animation
  const neonShadow = neonGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0px 0px 15px #ff0000', '0px 0px 45px #ff0000']  
  });

  // Handle touch on progress bar
  const handlePress = (event) => {
    if (!onPress) return;
    
    // Get the touch position and bar width
    const { locationX, pageX } = event.nativeEvent;
    const touchX = locationX !== undefined ? locationX : pageX;
    
    // Get the width of the progress bar container
    const barWidth = event.nativeEvent.target?.offsetWidth || event.currentTarget?.offsetWidth;
    
    if (touchX !== undefined && barWidth) {
      // Calculate the percentage (0-100) where the user clicked
      const clickedPercentage = (touchX / barWidth) * 100;
      
      // Call the onPress callback with the percentage
      onPress(clickedPercentage);
    }
  };

  // Handle press for web
  const handleWebPress = (event) => {
    if (!onPress || Platform.OS !== 'web') return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const barWidth = rect.width;
    
    if (clickX !== undefined && barWidth) {
      const clickedPercentage = (clickX / barWidth) * 100;
      onPress(clickedPercentage);
    }
  };

  const progressBarContent = (
    <View style={[styles.container, style]} onStartShouldSetResponder={() => true}>
      <View style={styles.baseBar}>
        {/* Add the blue progress section */}
        <Animated.View 
          style={[
            styles.progressBar,
            {
              width: `${progress}%`,
              ...(Platform.OS === 'web' ? {
                boxShadow: '0px 0px 15px #6366F1',
                position: 'relative',
                overflow: 'hidden'
              } : {
                overflow: 'hidden'
              })
            }
          ]}
        >
          <View key="highlight-blue" style={styles.highlight}/>
          <View key="shadow-blue" style={styles.shadow}/>
        </Animated.View>
        
        {/* Your existing progress bar code for the red section */}
        <Animated.View 
          style={[
            styles.remainingBar,
            {
              width: `${100 - progress}%`,
              backgroundColor: 'rgba(255, 0, 0, 0.7)', 
              ...(Platform.OS === 'web' ? {
                boxShadow: enableAnimation ? neonShadow : '0px 0px 15px #ff0000',
                position: 'relative',
                overflow: 'hidden'
              } : {
                overflow: 'hidden'
              })
            }
          ]}
        >
          {/* Add your remaining implementation here */}
          {enableAnimation ? (
            <>
              {/* Create multiple shimmer elements with staggered animations and varying widths */}
              {[
                { key: 'shimmer1', translate: shimmerTranslate, opacity: shimmerOpacity, webWidth: '1.2%', nativeWidth: '2.0%' },
                { key: 'shimmer2', translate: shimmerTranslate2, opacity: shimmerOpacity2, webWidth: '6.0%', nativeWidth: '8.2%' },
                { key: 'shimmer3', translate: shimmerTranslate3, opacity: shimmerOpacity3, webWidth: '0.85%', nativeWidth: '1.5%' },
                { key: 'shimmer4', translate: shimmerTranslate4, opacity: shimmerOpacity4, webWidth: '4.8%', nativeWidth: '7.1%' },
                { key: 'shimmer5', translate: shimmerTranslate5, opacity: shimmerOpacity5, webWidth: '1.7%', nativeWidth: '2.5%' },
              ].map(shimmer => (
                <Animated.View 
                  key={shimmer.key}
                  style={[
                    styles.shimmer,
                    Platform.OS === 'web' ? {
                      left: shimmer.translate,
                      opacity: shimmer.opacity,
                      position: 'absolute',
                      top: 0,
                      height: '100%',
                      width: shimmer.webWidth,
                      backgroundColor: 'transparent',
                      backgroundImage: 'linear-gradient(90deg, transparent, rgba(255, 160, 160, 0.5), transparent)',
                      right: 'auto',
                      maxWidth: '100%',
                    } : {
                      transform: [{ translateX: shimmer.translate }],
                      opacity: shimmer.opacity,
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: shimmer.nativeWidth,
                      height: '100%',
                      backgroundColor: 'rgba(255, 180, 180, 0.5)',
                      maxWidth: '100%',
                    }
                  ]}
                />
              ))}
            </>
          ) : null}
          <View key="highlight-red" style={styles.highlight}/>
          <View key="shadow-red" style={styles.shadow}/>
        </Animated.View>
      </View>
    </View>
  );

  // Return the progress bar wrapped in a touchable component
  if (onPress) {
    if (Platform.OS === 'web') {
      // For web, use onClick
      return (
        <div onClick={handleWebPress} style={{ width: '100%', cursor: 'pointer' }}>
          {progressBarContent}
        </div>
      );
    } else {
      // For native, use TouchableWithoutFeedback
      return (
        <TouchableWithoutFeedback onPress={handlePress}>
          {progressBarContent}
        </TouchableWithoutFeedback>
      );
    }
  }
  
  // If no onPress handler, return the progress bar as is
  return progressBarContent;
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 20,
    borderRadius: 10,
    overflow: 'hidden'
  },
  baseBar: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: '#303030',
    overflow: 'hidden'
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: '#6366F1', // Blue/purple color matching the circle loaders
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10
  },
  remainingBar: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: '100%',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  shadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  }
});

export default ProgressBar;