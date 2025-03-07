import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Animated, TouchableOpacity, Dimensions, useWindowDimensions, Platform, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';

// Get initial dimensions but we'll use useWindowDimensions for responsive updates
const { width: initialScreenWidth, height: initialScreenHeight } = Dimensions.get('window');

// Modern color palette with vintage additions
const Colors = {
  primary: '#6366F1', // Indigo
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  secondary: '#EC4899', // Pink
  secondaryLight: '#F472B6',
  accent: '#3B82F6', // Blue
  surface: '#FFFFFF',
  surfaceAlt: '#F8F8FF',
  cardShadow: '#000000',
  text: '#111827',
  textSecondary: '#4B5563',
  hint: '#6B7280',
  success: '#10B981', // Green
  error: '#EF4444', // Red

  // Vintage card colors - adjusted for texture2.jpg
  vintageFrontGradient: ['#e6e6e6', '#d0d0d0'], // Slightly adjusted for texture2.jpg
  vintageBackGradient: ['#d8d8d8', '#c2c2c2'], // Slightly adjusted for texture2.jpg
  vintageText: '#333333',
  vintageAccent: '#666666',
  vintageShadow: '#555555',
};

const FlashCard = ({ front, back, onKnow, onSwipe, isKnown, showFront, sampleSentence }) => {
  // Use window dimensions hook for responsive layout
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const tickScale = useRef(new Animated.Value(1)).current;
  const [tickActive, setTickActive] = useState(isKnown);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Add tilt animation values for 3D effect
  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;

  // Calculate responsive font size based on screen width
  const getResponsiveFontSize = (size) => {
    const scaleFactor = Math.min(screenWidth / 375, 1.3); // 375 is baseline width (iPhone 6/7/8)
    return Math.round(size * scaleFactor);
  };

  // Pulse animation for hints
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Reset card state when front text changes (new card)
  useEffect(() => {
    // Reset tickActive when card changes
    setTickActive(isKnown);

    // Reset flip state to front when card changes
    setIsFlipped(false);
    flipAnim.setValue(0);

    // Start pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Initial animation when card appears - smoother with stacked cards
    // Start with the card invisible
    fadeAnim.setValue(0);

    // Set initial position and scale
    translateX.setValue(0);
    translateY.setValue(0);
    scale.setValue(0.95);

    // Fade in the card with a slight delay
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }, 50);
  }, [front, isKnown]);

  // Handle manual flipping when card is tapped
  const handleFlip = () => {
    const newFlipValue = isFlipped ? 0 : 1;

    // Flip animation with improved physics
    Animated.spring(flipAnim, {
      toValue: newFlipValue,
      friction: 6, // Lower friction for more bounce
      tension: 15, // Increased tension for more snap
      useNativeDriver: true,
    }).start();

    // Enhanced scale effect during flip
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.92, // Slightly smaller scale for more dramatic effect
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5, // Lower friction for more bounce
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Add a subtle vertical movement during flip for more realism
    Animated.sequence([
      Animated.timing(translateY, {
        toValue: -10, // Move up slightly
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 5,
        tension: 20,
        useNativeDriver: true,
      }),
    ]).start();

    // Update flip state
    setIsFlipped(!isFlipped);
  };

  // Handle gesture for swiping
  const handleGesture = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { 
      useNativeDriver: true,
      listener: ({ nativeEvent }) => {
        // Calculate tilt based on finger position
        const { locationX, locationY } = nativeEvent;
        if (locationX && locationY) {
          // Calculate tilt relative to the center of the card
          const tiltXValue = (locationY / screenHeight - 0.5) * 15; // -7.5 to 7.5 degrees
          const tiltYValue = (locationX / screenWidth - 0.5) * -15; // 7.5 to -7.5 degrees

          // Animate to the new tilt values
          Animated.spring(tiltX, {
            toValue: tiltXValue,
            friction: 10,
            tension: 40,
            useNativeDriver: true,
          }).start();

          Animated.spring(tiltY, {
            toValue: tiltYValue,
            friction: 10,
            tension: 40,
            useNativeDriver: true,
          }).start();
        }
      }
    }
  );

  // Handle swipe end
  const handleSwipeEnd = ({ nativeEvent }) => {
    // Reset tilt values
    Animated.parallel([
      Animated.spring(tiltX, {
        toValue: 0,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(tiltY, {
        toValue: 0,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    const { translationX, translationY, velocityX } = nativeEvent;

    // Use velocity to determine if it was a quick flick
    const isQuickFlick = Math.abs(velocityX) > 800;

    // Determine swipe direction and if it meets the threshold
    const direction = translationX > 0 ? 'right' : 'left';
    const swipeThreshold = isQuickFlick ? screenWidth * 0.15 : screenWidth * 0.25;

    if (Math.abs(translationX) > swipeThreshold) {
      // Calculate exit position based on direction
      const exitX = direction === 'right' ? screenWidth * 1.2 : -screenWidth * 1.2;
      const exitY = screenHeight * 0.3; // Upward movement for corner pivot

      // First fade out completely
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 100, // Very fast fade out
        useNativeDriver: true,
      }).start(() => {
        // After the card is invisible, immediately call onSwipe to change the card
        // This ensures the old card content is never seen again
        onSwipe(direction);

        // Reset the position off-screen (this won't be visible since opacity is 0)
        translateX.setValue(exitX);
        translateY.setValue(-exitY);

        // After a small delay, reset the position for the new card
        setTimeout(() => {
          translateX.setValue(0);
          translateY.setValue(0);
          scale.setValue(0.95); // Slightly smaller to start the entry animation

          // The fade in will happen in the useEffect when the new card is rendered
        }, 10);
      });
    } else {
      // Spring back animation if swipe threshold not met
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  // Handle marking card as known
  const handleKnow = () => {
    // Toggle the tick state
    setTickActive(current => {
      const newState = !current;
      // Call onKnow when marking as known or unmarking it
      onKnow(newState);
      return newState;
    });

    // Animation for tick
    Animated.sequence([
      Animated.timing(tickScale, {
        toValue: 1.5,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web', // Don't use native driver on web
      }),
      Animated.timing(tickScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web', // Don't use native driver on web
      })
    ]).start();
  };

  // Front to back rotation
  const frontAnimatedStyle = {
    transform: [
      { perspective: 2000 }, // Increased perspective for more dramatic 3D effect
      { rotateY: flipAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg']
      })},
      { scale },
    ],
    backfaceVisibility: 'hidden',
    opacity: flipAnim.interpolate({
      inputRange: [0.5, 0.5],
      outputRange: [1, 0]
    })
  };

  // Back to front rotation
  const backAnimatedStyle = {
    transform: [
      { perspective: 2000 }, // Increased perspective for more dramatic 3D effect
      { rotateY: flipAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['180deg', '360deg']
      })},
      { scale },
    ],
    backfaceVisibility: 'hidden',
    opacity: flipAnim.interpolate({
      inputRange: [0.5, 0.5],
      outputRange: [0, 1]
    })
  };

  // Card movement animation with bottom-corner pivot effect
  const cardAnimatedStyle = {
    // Single transform array with all transformations
    transform: [
      // Apply tilt effects first
      {
        rotateX: tiltX.interpolate({
          inputRange: [-15, 15],
          outputRange: ['15deg', '-15deg'],
          extrapolate: 'clamp',
        }),
      },
      {
        rotateY: tiltY.interpolate({
          inputRange: [-15, 15],
          outputRange: ['-15deg', '15deg'],
          extrapolate: 'clamp',
        }),
      },

      // First apply the raw horizontal translation for gesture tracking
      { translateX },

      // Then adjust vertical position based on horizontal movement direction
      // This simulates the card being anchored at the bottom corners
      {
        translateY: Animated.add(
          translateY,
          translateX.interpolate({
            inputRange: [-screenWidth, 0, screenWidth],
            outputRange: [-screenHeight * 0.3, 0, -screenHeight * 0.3], // Increased movement for more dramatic effect
            extrapolate: 'clamp',
          })
        ),
      },

      // Add rotation that increases with movement
      // The rotation is more pronounced for a realistic flick effect
      {
        rotate: translateX.interpolate({
          inputRange: [-screenWidth, -screenWidth * 0.5, 0, screenWidth * 0.5, screenWidth],
          outputRange: ['-70deg', '-40deg', '0deg', '40deg', '70deg'], // More rotation for flick effect
          extrapolate: 'clamp',
        }),
      },

      // Add subtle Z rotation for more realism
      {
        rotateZ: translateX.interpolate({
          inputRange: [-screenWidth, 0, screenWidth],
          outputRange: ['5deg', '0deg', '-5deg'],
          extrapolate: 'clamp',
        }),
      },

      // Finally apply scale
      { scale },

      // Add a subtle perspective shift based on swipe direction
      {
        perspective: translateX.interpolate({
          inputRange: [-screenWidth, 0, screenWidth],
          outputRange: [1500, 2000, 1500],
          extrapolate: 'clamp',
        }),
      },
    ],
    opacity: fadeAnim,
  };

  const tickAnimatedStyle = {
    transform: [{ scale: tickScale }]
  };

  const hintAnimatedStyle = {
    transform: [{ scale: pulseAnim }],
    opacity: pulseAnim.interpolate({
      inputRange: [1, 1.1],
      outputRange: [0.7, 1]
    })
  };

  // Import the texture image with more specific path
  const paperTexture = require('../../assets/images/textures/texture2.jpg');

  // Add a second texture for more depth (using the same image but with different styling)
  const depthTexture = require('../../assets/images/textures/texture2.jpg');

  // Add lighting effect that moves with the card tilt
  const lightingOpacity = tiltX.interpolate({
    inputRange: [-15, 0, 15],
    outputRange: [0.15, 0.25, 0.45], // Adjusted for texture2.jpg
    extrapolate: 'clamp',
  });

  const lightingPosition = tiltY.interpolate({
    inputRange: [-15, 0, 15],
    outputRange: ['30%', '50%', '70%'], // Light position shifts with tilt
    extrapolate: 'clamp',
  });

  return (
    <PanGestureHandler
      onGestureEvent={handleGesture}
      onHandlerStateChange={handleSwipeEnd}
    >
      <Animated.View style={[styles.container, cardAnimatedStyle, {
        width: screenWidth,
        height: Math.min(screenHeight * 0.8, 600), // Limit max height for very tall screens
      }]}>
        <TouchableOpacity
          style={styles.card}
          onPress={handleFlip}
          activeOpacity={0.9}
        >
          <Animated.View style={[styles.tickButton, tickAnimatedStyle]}>
            <TouchableOpacity
              onPress={handleKnow}
              style={[
                styles.tickButtonContainer, 
                tickActive && styles.tickButtonActive
              ]}
            >
              <MaterialIcons
                name={tickActive ? "check-circle" : "check-circle-outline"}
                size={Math.min(32, screenWidth * 0.08)} // Responsive icon size
                color={tickActive ? Colors.success : Colors.hint}
                style={styles.tickIcon}
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Front of card */}
          <Animated.View style={[styles.cardFace, frontAnimatedStyle]}>
            <LinearGradient
              colors={Colors.vintageFrontGradient}
              style={styles.gradientBackground}
            >
              {/* Base texture */}
              <Image 
                source={paperTexture} 
                style={styles.textureImage} 
                resizeMode="cover"
              />
              {/* Overlay texture with different blend mode for depth */}
              <Image 
                source={depthTexture} 
                style={[styles.textureImage, { 
                  opacity: 0.35, // Adjusted for texture2.jpg
                  transform: [{ scale: 1.05 }],
                  ...(Platform.OS === 'web' ? {
                    filter: 'brightness(1.4) contrast(0.85) blur(1px)', // Adjusted for texture2.jpg
                    mixBlendMode: 'overlay',
                  } : {})
                }]} 
                resizeMode="cover"
              />

              {/* Dynamic lighting effect */}
              {Platform.OS === 'web' && (
                <Animated.View style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  opacity: lightingOpacity,
                  backgroundImage: `radial-gradient(circle at ${lightingPosition} 50%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 75%)`, // Adjusted for texture2.jpg
                }} />
              )}

              {/* Emboss effect overlay */}
              {Platform.OS === 'web' && (
                <View style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  opacity: 0.35, // Adjusted for texture2.jpg
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), inset 0 -1px 1px rgba(0,0,0,0.15)', // Adjusted for texture2.jpg
                }} />
              )}

              <View style={styles.cardBorder} />

              {/* Edge lighting effect */}
              {Platform.OS === 'web' && (
                <Animated.View 
                  style={[
                    styles.edgeLighting,
                    {
                      opacity: tiltX.interpolate({
                        inputRange: [-15, 0, 15],
                        outputRange: [0.7, 0.2, 0.7],
                        extrapolate: 'clamp',
                      })
                    }
                  ]} 
                />
              )}
              <Image
                source={require('../../assets/images/1630603219122.jpeg')} //Corrected path
                style={styles.logoWatermark}
              />
              <View style={styles.contentContainer}>
                <Text style={[styles.text, { fontSize: getResponsiveFontSize(28) }]}>{front}</Text>
                <Animated.Text style={[styles.hint, hintAnimatedStyle]}>
                  Tap to flip
                </Animated.Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Back of card */}
          <Animated.View style={[styles.cardFace, styles.cardBack, backAnimatedStyle]}>
            <LinearGradient
              colors={Colors.vintageBackGradient}
              style={styles.gradientBackground}
            >
              {/* Base texture */}
              <Image 
                source={paperTexture} 
                style={styles.textureImage} 
                resizeMode="cover"
              />
              {/* Overlay texture with different blend mode for depth */}
              <Image 
                source={depthTexture} 
                style={[styles.textureImage, { 
                  opacity: 0.35, // Adjusted for texture2.jpg
                  transform: [{ scale: 1.05 }],
                  ...(Platform.OS === 'web' ? {
                    filter: 'brightness(1.4) contrast(0.85) blur(1px)', // Adjusted for texture2.jpg
                    mixBlendMode: 'overlay',
                  } : {})
                }]} 
                resizeMode="cover"
              />

              {/* Dynamic lighting effect */}
              {Platform.OS === 'web' && (
                <Animated.View style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  opacity: lightingOpacity,
                  backgroundImage: `radial-gradient(circle at ${lightingPosition} 50%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 75%)`, // Adjusted for texture2.jpg
                }} />
              )}

              {/* Emboss effect overlay */}
              {Platform.OS === 'web' && (
                <View style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  opacity: 0.35, // Adjusted for texture2.jpg
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), inset 0 -1px 1px rgba(0,0,0,0.15)', // Adjusted for texture2.jpg
                }} />
              )}

              <View style={styles.cardBorder} />

              {/* Edge lighting effect */}
              {Platform.OS === 'web' && (
                <Animated.View 
                  style={[
                    styles.edgeLighting,
                    {
                      opacity: tiltX.interpolate({
                        inputRange: [-15, 0, 15],
                        outputRange: [0.7, 0.2, 0.7],
                        extrapolate: 'clamp',
                      })
                    }
                  ]} 
                />
              )}
              <Image
                source={require('../../assets/images/1630603219122.jpeg')} //Corrected path
                style={styles.logoWatermark}
              />
              <View style={styles.contentContainer}>
                <Text style={[styles.text, { fontSize: getResponsiveFontSize(28) }]}>{back}</Text>
                {sampleSentence && (
                  <View style={styles.sampleSentenceContainer}>
                    <Text style={styles.sampleSentenceLabel}>Sample:</Text>
                    <Text style={styles.sampleSentenceText}>{sampleSentence}</Text>
                  </View>
                )}
                <Animated.Text style={[styles.hint, hintAnimatedStyle]}>
                  Tap to flip back
                </Animated.Text>
              </View>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </PanGestureHandler>
  );
};


const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    // width and height are now applied dynamically based on screen dimensions
  },
  card: {
    flex: 1,
    margin: 16,
    borderRadius: 16, // Slightly less rounded for vintage look
    elevation: 12, // Increased elevation
    shadowColor: Colors.vintageShadow,
    shadowOffset: {
      width: 0,
      height: 12, // Increased shadow height
    },
    shadowOpacity: 0.45, // Increased shadow opacity
    shadowRadius: 20, // Increased shadow radius
    overflow: 'hidden', // For the gradient to stay within borders
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 12px 24px rgba(0, 0, 0, 0.3), 0 6px 8px rgba(0, 0, 0, 0.2), 0 1px 1px rgba(255, 255, 255, 0.5) inset', // Enhanced shadow for web with inner highlight
    } : {}),
  },
  gradientBackground: {
    flex: 1,
    borderRadius: 16,
    ...(Platform.OS === 'web' ? {
      // Add subtle lighting effect for 3D appearance
      backgroundImage: 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 50%, rgba(0, 0, 0, 0.15) 100%)',
    } : {}),
  },
  textureImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 1.0, // Full opacity for maximum visibility
    ...(Platform.OS === 'web' ? {
      filter: 'grayscale(30%) brightness(1.1) contrast(1.2)', // Less grayscale, more contrast
      mixBlendMode: 'soft-light', // Changed blend mode for better texture visibility
    } : {}),
  },
  textureOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.08,
    backgroundColor: '#000000',
    // Create a noise pattern effect
    backgroundImage: Platform.OS === 'web' ? 
      'url("data:image/png;base64,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")' : 
      undefined,
  },
  cardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2, // Thicker border
    borderColor: 'rgba(100, 100, 100, 0.4)', // Grey border color
    borderRadius: 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: 'inset 0 0 12px rgba(80, 80, 80, 0.3), 0 0 1px rgba(255, 255, 255, 0.8)', // Enhanced inner shadow for depth on web
      borderTopColor: 'rgba(255, 255, 255, 0.6)', // Lighter top border for bevel effect
      borderLeftColor: 'rgba(255, 255, 255, 0.5)', // Lighter left border for bevel effect
      borderRightColor: 'rgba(80, 80, 80, 0.5)', // Darker right border for bevel effect
      borderBottomColor: 'rgba(80, 80, 80, 0.6)', // Darker bottom border for bevel effect
    } : {}),
  },
  edgeLighting: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 5px 1px rgba(255, 255, 255, 0.6)', // Adjusted for texture2.jpg
      pointerEvents: 'none', // Make sure it doesn't interfere with touch events
    } : {}),
  },
  cardFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardBack: {
    // Styling specific to the back of the card
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    ...(Platform.OS === 'web' ? {
      // Add subtle 3D effect to content
      transform: 'translateZ(20px)',
    } : {}),
  },
  text: {
    color: Colors.vintageText,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    // Add sepia-like text effect for web
    ...(Platform.OS === 'web' ? {
      textShadow: '0px 1px 2px rgba(74, 60, 43, 0.2), 0px 1px 0px rgba(255, 255, 255, 0.3)', // Enhanced text shadow for depth
    } : {}),
  },
  hint: {
    textAlign: 'center',
    marginTop: 16,
    color: Colors.hint,
    fontStyle: 'italic',
    fontSize: 14,
  },
  tickButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  tickButtonContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 4,
  },
  tickButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  tickIcon: {
    // Icon styling
  },
  logoWatermark: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 64,
    height: 64,
    resizeMode: 'contain',
    opacity: 0.2,
  },
  sampleSentenceContainer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  sampleSentenceLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.vintageAccent,
    marginBottom: 4,
  },
  sampleSentenceText: {
    fontSize: 16,
    color: Colors.vintageText,
    fontStyle: 'italic',
    lineHeight: 22,
  },
});

export default FlashCard;