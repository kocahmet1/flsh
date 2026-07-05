import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Animated, TouchableOpacity, useWindowDimensions, Platform, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';

// Modern color palette with vintage additions and notebook colors
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

  // Notebook card colors
  notebookBackground: '#ffffff', // Pure white paper
  notebookLine: '#6ba4d1',       // Stronger, more vibrant blue for the lines
  notebookText: '#333333',
  notebookAccent: '#666666',
  notebookShadow: '#555555',
  notebookGradient: ['#ffffff', '#f9f9f9'], // Very subtle gradient for white notebook paper
};

const FlashCard = ({
  front,
  back,
  onKnow = () => {},
  onSwipe = () => {},
  isKnown,
  sampleSentence,
  imageData,
  cardHeight,
  containerWidth,
  shouldShowBack,
  nextCardFront,
  prevCardFront,
}) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const resolvedCardWidth = Math.min(containerWidth || screenWidth, screenWidth);
  const resolvedCardHeight = cardHeight || (
    Platform.OS === 'web'
      ? Math.min(screenHeight * 0.65, 700)
      : Math.min(screenHeight * 0.88, 800)
  );
  const swipeRange = Math.max(screenWidth, resolvedCardWidth);
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const tickScale = useRef(new Animated.Value(1)).current;
  const [tickActive, setTickActive] = useState(isKnown);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;
  const getResponsiveFontSize = (size) => {
    const scaleFactor = Math.min(resolvedCardWidth / 375, 1.3);
    return Math.round(size * scaleFactor);
  };
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Peek card scale — starts small (stacked below), grows as you drag
  const peekScale = translateX.interpolate({
    inputRange: [-swipeRange, -swipeRange * 0.4, 0, swipeRange * 0.4, swipeRange],
    outputRange: [1, 0.97, 0.92, 0.97, 1],
    extrapolate: 'clamp',
  });
  const peekOpacity = translateX.interpolate({
    inputRange: [-swipeRange * 0.6, -swipeRange * 0.15, 0, swipeRange * 0.15, swipeRange * 0.6],
    outputRange: [1, 0.7, 0.35, 0.7, 1],
    extrapolate: 'clamp',
  });
  // The peek card shifts slightly in the opposite direction to create depth
  const peekTranslateY = translateX.interpolate({
    inputRange: [-swipeRange, 0, swipeRange],
    outputRange: [0, 8, 0],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    // Stop ALL running animations before resetting — prevents a
    // still-running flip animation from overriding the reset values.
    flipAnim.stopAnimation();
    fadeAnim.stopAnimation();
    translateX.stopAnimation();
    translateY.stopAnimation();
    scale.stopAnimation();

    setTickActive(isKnown);
    setIsFlipped(false);
    flipAnim.setValue(0);
    pulseAnim.setValue(1);
    const pulseLoop = Animated.loop(
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
    );
    pulseLoop.start();
    // Set card to fully visible immediately - no fade animation
    fadeAnim.setValue(1);
    translateX.setValue(0);
    translateY.setValue(0);
    scale.setValue(1);
    return () => pulseLoop.stop();
  }, [front, isKnown]);

  // Handle external flip control from audio player
  useEffect(() => {
    if (shouldShowBack !== undefined) {
      const shouldBeFlipped = shouldShowBack === true;
      if (shouldBeFlipped !== isFlipped) {
        const newFlipValue = shouldBeFlipped ? 1 : 0;
        Animated.timing(flipAnim, {
          toValue: newFlipValue,
          duration: 400,
          useNativeDriver: true,
        }).start();
        setIsFlipped(shouldBeFlipped);
      }
    }
  }, [shouldShowBack, isFlipped, flipAnim]);

  // Realistic card flip — clean Y-axis rotation with no bounce/scale tricks
  const handleFlip = () => {
    const newFlipValue = isFlipped ? 0 : 1;
    Animated.timing(flipAnim, {
      toValue: newFlipValue,
      duration: 400,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const handleGesture = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    {
      useNativeDriver: true,
      listener: ({ nativeEvent }) => {
        const { locationX, locationY } = nativeEvent;
        if (locationX && locationY) {
          const tiltXValue = (locationY / screenHeight - 0.5) * 15;
          const tiltYValue = (locationX / screenWidth - 0.5) * -15;
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

  const handleSwipeEnd = ({ nativeEvent }) => {
    if (nativeEvent.oldState !== State.ACTIVE) {
      return;
    }

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
    const { translationX, velocityX } = nativeEvent;
    const isQuickFlick = Math.abs(velocityX) > 800;
    const direction = translationX > 0 ? 'right' : 'left';
    const swipeThreshold = isQuickFlick ? swipeRange * 0.15 : swipeRange * 0.25;
    if (Math.abs(translationX) > swipeThreshold) {
      const shouldAdvance = onSwipe(direction);
      if (shouldAdvance === false) {
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
        return;
      }

      const exitX = direction === 'right' ? swipeRange * 1.2 : -swipeRange * 1.2;
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start(() => {
        translateX.setValue(exitX);
        translateY.setValue(0);
        setTimeout(() => {
          translateX.setValue(0);
          translateY.setValue(0);
          scale.setValue(0.95);
        }, 10);
      });
    } else {
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

  const handleKnow = () => {
    setTickActive(current => {
      const newState = !current;
      onKnow(newState);
      return newState;
    });
    Animated.sequence([
      Animated.timing(tickScale, {
        toValue: 1.5,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(tickScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      })
    ]).start();
  };

  // ── Card flip animation styles ─────────────────────────
  // Clean 3D Y-axis flip — the front face rotates 0→180° and
  // the back face rotates 180→360°. We cut visibility at 90°.
  const frontAnimatedStyle = {
    transform: [
      { perspective: 1200 },
      { rotateY: flipAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg']
      })},
    ],
    backfaceVisibility: 'hidden',
    opacity: flipAnim.interpolate({
      inputRange: [0, 0.499, 0.5, 1],
      outputRange: [1, 1, 0, 0]
    })
  };

  const backAnimatedStyle = {
    transform: [
      { perspective: 1200 },
      { rotateY: flipAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['180deg', '360deg']
      })},
    ],
    backfaceVisibility: 'hidden',
    opacity: flipAnim.interpolate({
      inputRange: [0, 0.499, 0.5, 1],
      outputRange: [0, 0, 1, 1]
    })
  };

  // Dynamic shadow that moves during flip
  const flipShadowStyle = {
    shadowOpacity: flipAnim.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [0.35, 0.6, 0.7, 0.6, 0.35]
    }),
    shadowRadius: flipAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [16, 32, 16]
    }),
    elevation: flipAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [10, 24, 10]
    }),
    shadowOffset: {
      width: flipAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, -20, 0]
      }),
      height: flipAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [8, 4, 8]
      })
    }
  };

  // Border opacity - fade out during flip
  const borderOpacityStyle = {
    opacity: flipAnim.interpolate({
      inputRange: [0, 0.1, 0.9, 1],
      outputRange: [1, 0, 0, 1]
    })
  };

  // ── Top card: swipe transform ─────────────────────────
  const cardAnimatedStyle = {
    transform: [
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
      { translateX },
      { translateY },
      // Gentle rotation during drag to look like picking up a card
      {
        rotate: translateX.interpolate({
          inputRange: [-swipeRange, -swipeRange * 0.5, 0, swipeRange * 0.5, swipeRange],
          outputRange: ['-18deg', '-10deg', '0deg', '10deg', '18deg'],
          extrapolate: 'clamp',
        }),
      },
      { scale },
      {
        perspective: translateX.interpolate({
          inputRange: [-swipeRange, 0, swipeRange],
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

  const paperTexture = require('../../assets/images/textures/texture2.jpg');
  const depthTexture = require('../../assets/images/textures/texture2.jpg');
  const lightingOpacity = tiltX.interpolate({
    inputRange: [-15, 0, 15],
    outputRange: [0.15, 0.25, 0.45],
    extrapolate: 'clamp',
  });
  const lightingPosition = tiltY.interpolate({
    inputRange: [-15, 0, 15],
    outputRange: ['30%', '50%', '70%'],
    extrapolate: 'clamp',
  });

  // Function to render notebook lines
  const renderNotebookLines = () => {
    const estimatedCardHeight = resolvedCardHeight;
    const lineSpacing = 35;
    const lineCount = Math.ceil(estimatedCardHeight / lineSpacing) + 5;
    const lines = [];

    for (let i = 0; i < lineCount; i++) {
      lines.push(
        <View
          key={`line-${i}`}
          style={[
            styles.notebookLine,
            { top: (i + 1) * lineSpacing }
          ]}
        />
      );
    }

    return lines;
  };

  // Shadow cast on background during flip
  const backgroundShadowStyle = {
    shadowOpacity: flipAnim.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [0, 0.6, 0.8, 0.6, 0]
    }),
    shadowRadius: flipAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 50, 0]
    }),
    elevation: flipAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 30, 0]
    }),
    transform: [
      {
        translateX: flipAnim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, -40, 0]
        })
      },
      {
        rotateY: flipAnim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: ['0deg', '3deg', '0deg']
        })
      }
    ]
  };

  // Determine which peek card text to show based on drag direction
  const peekText = nextCardFront || prevCardFront || '';

  // ── Render: peek card (below) + top card ─────────────────────────
  const renderCardFaceContent = (text, isBack = false) => (
    <LinearGradient
      colors={Colors.notebookGradient}
      style={styles.gradientBackground}
    >
      <View style={styles.notebookLines}>
        {Platform.OS !== 'web' && renderNotebookLines()}
      </View>
      <Image
        source={paperTexture}
        style={styles.textureImage}
        resizeMode="cover"
      />
      <Image
        source={depthTexture}
        style={[styles.textureImage, {
          opacity: 0.35,
          transform: [{ scale: 1.05 }],
          ...(Platform.OS === 'web' ? {
            filter: 'brightness(1.4) contrast(0.85) blur(1px)',
            mixBlendMode: 'overlay',
          } : {})
        }]}
        resizeMode="cover"
      />
      {Platform.OS === 'web' && (
        <Animated.View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: lightingOpacity,
          backgroundImage: `radial-gradient(circle at ${lightingPosition} 50%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 75%)`,
        }} />
      )}
      {Platform.OS === 'web' && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.35,
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), inset 0 -1px 1px rgba(0,0,0,0.15)',
        }} />
      )}
      <Animated.View style={[styles.cardBorder, borderOpacityStyle]} />
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
        source={require('../../assets/images/1630603219122.jpeg')}
        style={styles.logoWatermark}
      />
      <View style={styles.contentContainer}>
        {!isBack ? (
          <>
            <Text style={[styles.text, { fontSize: getResponsiveFontSize(28), color: Colors.notebookText }]}>{text}</Text>
            <Animated.Text style={[styles.hint, hintAnimatedStyle]}>
              Tap to flip
            </Animated.Text>
          </>
        ) : (
          <>
            <Text style={[styles.text, { fontSize: getResponsiveFontSize(20), color: Colors.notebookText }]}>{text}</Text>
            {imageData && (() => {
              const imageFormat = imageData.startsWith('/9j/') ? 'jpeg' : 
                                 imageData.startsWith('iVBOR') ? 'png' : 
                                 imageData.startsWith('R0lGO') ? 'gif' : 'jpeg';
              console.log(`[FlashCard] Rendering image with data length: ${imageData.length}, format: ${imageFormat}, preview: ${imageData.substring(0, 30)}...`);
              
              return (
                <View style={styles.generatedImageContainer}>
                  {Platform.OS === 'web' ? (
                    <img
                      src={`data:image/${imageFormat};base64,${imageData}`}
                      style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 10, display: 'block' }}
                      alt="Generated"
                      onLoad={() => console.log('[FlashCard] <img> loaded successfully')}
                      onError={(e) => console.error('[FlashCard] <img> failed to load', e)}
                    />
                  ) : (
                    <Image
                      source={{ uri: `data:image/${imageFormat};base64,${imageData}` }}
                      style={styles.generatedImage}
                      resizeMode="cover"
                      onLoad={() => console.log('[FlashCard] <Image> loaded successfully')}
                      onError={(e) => console.error('[FlashCard] <Image> failed to load', e.nativeEvent)}
                    />
                  )}
                </View>
              );
            })()}
            {sampleSentence && (
              <View style={styles.sampleSentenceContainer}>
                <Text style={styles.sampleSentenceLabel}>Sample:</Text>
                <Text style={styles.sampleSentenceText}>{sampleSentence}</Text>
              </View>
            )}
            <Animated.Text style={[styles.hint, hintAnimatedStyle]}>
              Tap to flip back
            </Animated.Text>
          </>
        )}
      </View>
    </LinearGradient>
  );

  return (
    <View style={[styles.deckContainer, {
      width: resolvedCardWidth,
      height: resolvedCardHeight,
    }]}>
      {/* ── Peek card (the card underneath) ── */}
      {peekText ? (
        <Animated.View style={[styles.peekCard, {
          width: resolvedCardWidth,
          height: resolvedCardHeight,
          transform: [
            { scale: peekScale },
            { translateY: peekTranslateY },
          ],
          opacity: peekOpacity,
        }]}>
          <View style={styles.peekCardInner}>
            <LinearGradient
              colors={Colors.notebookGradient}
              style={styles.gradientBackground}
            >
              <View style={styles.notebookLines}>
                {Platform.OS !== 'web' && renderNotebookLines()}
              </View>
              <Image
                source={paperTexture}
                style={styles.textureImage}
                resizeMode="cover"
              />
              <View style={styles.contentContainer}>
                <Text style={[styles.text, { fontSize: getResponsiveFontSize(28), color: Colors.notebookText }]}>{peekText}</Text>
              </View>
            </LinearGradient>
          </View>
        </Animated.View>
      ) : null}

      {/* ── Top card (the one you interact with) ── */}
      <PanGestureHandler
        onGestureEvent={handleGesture}
        onHandlerStateChange={handleSwipeEnd}
      >
        <Animated.View style={[styles.container, cardAnimatedStyle, {
          width: resolvedCardWidth,
          height: resolvedCardHeight,
        }]}>
          {/* Background shadow layer */}
          <Animated.View style={[styles.backgroundShadow, backgroundShadowStyle]} />
          
          <Animated.View style={[styles.card, flipShadowStyle]}>
            <TouchableOpacity
              style={styles.cardTouchable}
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
                    size={Math.min(32, resolvedCardWidth * 0.08)}
                    color={tickActive ? Colors.success : Colors.hint}
                    style={styles.tickIcon}
                  />
                </TouchableOpacity>
              </Animated.View>

              {/* Subtle overlay during flip for 3D lighting */}
              <Animated.View style={[styles.flipOverlay, {
                opacity: flipAnim.interpolate({
                  inputRange: [0, 0.25, 0.5, 0.75, 1],
                  outputRange: [0, 0.15, 0.25, 0.15, 0]
                })
              }]} pointerEvents="none" />

              <Animated.View style={[styles.cardFace, frontAnimatedStyle]}>
                {renderCardFaceContent(front, false)}
              </Animated.View>

              <Animated.View style={[styles.cardFace, styles.cardBack, backAnimatedStyle]}>
                {renderCardFaceContent(back, true)}
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  deckContainer: {
    alignSelf: 'center',
    position: 'relative',
  },
  peekCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 0,
    alignSelf: 'center',
  },
  peekCardInner: {
    flex: 1,
    margin: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.notebookBackground,
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 6px 16px rgba(0, 0, 0, 0.25)',
    } : {}),
  },
  container: {
    alignSelf: 'center',
    zIndex: 1,
  },
  backgroundShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    margin: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    ...(Platform.OS === 'web' ? {
      filter: 'blur(20px)',
      transition: 'all 0.3s ease',
    } : {}),
  },
  card: {
    flex: 1,
    margin: 8,
    borderRadius: 16,
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    overflow: 'hidden',
    backgroundColor: Colors.notebookBackground,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 12px 24px rgba(0, 0, 0, 0.4), 0 6px 12px rgba(0, 0, 0, 0.3), 0 1px 1px rgba(255, 255, 255, 0.5) inset',
      transition: 'box-shadow 0.3s ease',
    } : {}),
  },
  cardTouchable: {
    flex: 1,
  },
  flipOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    zIndex: 5,
  },
  gradientBackground: {
    flex: 1,
    borderRadius: 16,
    ...(Platform.OS === 'web' ? {
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
    opacity: 1.0,
    ...(Platform.OS === 'web' ? {
      filter: 'grayscale(30%) brightness(1.1) contrast(1.2)',
      mixBlendMode: 'soft-light',
    } : {}),
  },
  cardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: 'rgba(100, 100, 100, 0.4)',
    borderRadius: 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: 'inset 0 0 12px rgba(80, 80, 80, 0.3), 0 0 1px rgba(255, 255, 255, 0.8)',
      borderTopColor: 'rgba(255, 255, 255, 0.6)',
      borderLeftColor: 'rgba(255, 255, 255, 0.5)',
      borderRightColor: 'rgba(80, 80, 80, 0.5)',
      borderBottomColor: 'rgba(80, 80, 80, 0.6)',
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
      boxShadow: '0 0 5px 1px rgba(255, 255, 255, 0.6)',
      pointerEvents: 'none',
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
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    width: '100%',
    ...(Platform.OS === 'web' ? {
      transform: 'translateZ(20px)',
    } : {}),
  },
  text: {
    color: Colors.notebookText,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    ...(Platform.OS === 'web' ? {
      textShadow: '0px 1px 2px rgba(74, 60, 43, 0.2), 0px 1px 0px rgba(255, 255, 255, 0.3)',
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
  generatedImageContainer: {
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 2,
    borderColor: 'rgba(100, 100, 100, 0.2)',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    width: '100%',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    } : {}),
  },
  generatedImage: {
    width: '100%',
    height: 220,
    objectFit: 'cover',
    borderRadius: 10,
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
  notebookLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    borderTopWidth: 0,
    borderColor: 'transparent',
    ...Platform.select({
      web: {
        backgroundImage: `repeating-linear-gradient(0deg, transparent 0px, transparent 34px, ${Colors.notebookLine} 34px, ${Colors.notebookLine} 35px)`,
      },
      default: {
      }
    }),
  },
  notebookLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.notebookLine,
  },
});

export default FlashCard;
