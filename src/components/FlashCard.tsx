import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

interface FlashCardProps {
  front: string;
  back: string;
  onSwipe: (direction: 'left' | 'right') => void;
  onKnow: () => void;
  isKnown: boolean;
}

export default function FlashCard({ front, back, onSwipe, onKnow, isKnown }: FlashCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [animatedValue] = useState(new Animated.Value(0));

  const flipCard = () => {
    setIsFlipped(!isFlipped);
    Animated.spring(animatedValue, {
      toValue: isFlipped ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  };

  const frontInterpolate = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
  };

  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
  };

  const pan = Gesture.Pan()
    .onEnd((event) => {
      if (event.velocityX > 1500) {
        onSwipe('right');
      } else if (event.velocityX < -1500) {
        onSwipe('left');
      }
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.container}>
        <TouchableOpacity activeOpacity={1} onPress={flipCard} style={styles.cardContainer}>
          <Animated.View style={[styles.card, styles.frontCard, frontAnimatedStyle]}>
            <Text style={styles.cardText}>{front}</Text>
          </Animated.View>
          <Animated.View style={[styles.card, styles.backCard, backAnimatedStyle, styles.cardBack]}>
            <Text style={styles.cardText}>{back}</Text>
          </Animated.View>
        </TouchableOpacity>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.dontKnowButton]}
            onPress={() => onSwipe('left')}
          >
            <Text style={styles.buttonText}>Don't Know</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.knowButton]}
            onPress={() => onSwipe('right')}
          >
            <Text style={styles.buttonText}>Know</Text>
          </TouchableOpacity>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  cardContainer: {
    width: '100%',
    height: 400,
    position: 'relative',
  },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 20,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backfaceVisibility: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  frontCard: {
    backgroundColor: '#fff',
  },
  backCard: {
    backgroundColor: '#f8f8f8',
  },
  cardBack: {
    transform: [{ rotateY: '180deg' }],
  },
  cardText: {
    fontSize: 24,
    textAlign: 'center',
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  dontKnowButton: {
    backgroundColor: '#ff6b6b',
  },
  knowButton: {
    backgroundColor: '#51cf66',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
