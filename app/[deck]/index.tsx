import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { useDecks } from '../../src/hooks/useDecks';
import { LinearGradient } from 'expo-linear-gradient';
import ImportButton from '../../src/components/ImportButton';
import { auth } from '../../src/firebase/config';
import AdminDeckControls from '../../src/components/AdminDeckControls';
import { Platform } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  withTiming,
  interpolate,
  Easing
} from 'react-native-reanimated';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import ProgressBar from '../../src/components/ProgressBar'; // Added import for ProgressBar

export default function DeckScreen() {
  const [newDeckName, setNewDeckName] = useState('');
  const { decks, loading, error, addDeck } = useDecks();
  const user = auth.currentUser;
  const animatedValue = useSharedValue(0); // Updated to use useSharedValue

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 800,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, []);

  const handleCreateDeck = async () => {
    if (newDeckName.trim()) {
      const deckId = await addDeck(newDeckName.trim());
      setNewDeckName('');
      if (deckId) {
        router.push(`/deck/${deckId}`);
      }
    }
  };

  const Particle = ({ delay, size, color, top, left }) => {
    const translateY = useSharedValue(0);
    const translateX = useSharedValue(0);
    const opacity = useSharedValue(1);
    const scale = useSharedValue(1);
    const rotate = useSharedValue(0);

    useEffect(() => {
      translateY.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withSpring(-80 - Math.random() * 40, { damping: 8 }),
            withSpring(0, { damping: 7 })
          ),
          -1,
          true
        )
      );

      translateX.value = withDelay(
        delay + 100,
        withRepeat(
          withSequence(
            withSpring((Math.random() - 0.5) * 30, { damping: 10 }),
            withSpring(0, { damping: 9 })
          ),
          -1,
          true
        )
      );

      opacity.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        )
      );

      scale.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(0.8, { duration: 800, easing: Easing.out(Easing.ease) }),
            withTiming(1.2, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 1000, easing: Easing.in(Easing.ease) })
          ),
          -1,
          true
        )
      );

      rotate.value = withDelay(
        delay + 200,
        withRepeat(
          withSequence(
            withTiming(Math.random() * 30, { duration: 2000 }),
            withTiming(-Math.random() * 30, { duration: 2000 })
          ),
          -1,
          true
        )
      );
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [
          { translateY: translateY.value },
          { translateX: translateX.value },
          { scale: scale.value },
          { rotate: `${rotate.value}deg` }
        ],
        opacity: opacity.value
      };
    });

    return (
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            top: top,
            left: left,
          },
          animatedStyle
        ]}
      />
    );
  };

  const renderDeckItem = ({ item, index }) => {
    let cardsArray = [];
    if (item.cards) {
      cardsArray = Array.isArray(item.cards)
        ? item.cards
        : Object.values(item.cards);
    }

    const knownCards = cardsArray.filter(card => card.isKnown)?.length || 0;
    const totalCards = cardsArray.length;
    const progress = totalCards > 0 ? (knownCards / totalCards) * 100 : 0;

    const progressAnim = useSharedValue(0);
    const cardScale = useSharedValue(0.9);
    const cardElevation = useSharedValue(2);

    useEffect(() => {
      progressAnim.value = withDelay(
        300 + index * 150,
        withSpring(progress / 100, {
          damping: 12,
          stiffness: 80,
          useNativeDriver: Platform.OS !== 'web'
        })
      );

      cardScale.value = withRepeat(
        withSequence(
          withSpring(1.02, {
            damping: 8,
            useNativeDriver: Platform.OS !== 'web'
          }),
          withSpring(1, {
            damping: 8,
            useNativeDriver: Platform.OS !== 'web'
          })
        ),
        -1,
        true
      );

      cardElevation.value = withRepeat(
        withSequence(
          withSpring(6, {
            damping: 9,
            useNativeDriver: Platform.OS !== 'web'
          }),
          withSpring(4, {
            damping: 9,
            useNativeDriver: Platform.OS !== 'web'
          })
        ),
        -1,
        true
      );
    }, [progress]);

    const progressWidthStyle = useAnimatedStyle(() => {
      return {
        width: `${progressAnim.value * 100}%`,
      };
    });

    const cardAnimStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: cardScale.value }],
        shadowOpacity: interpolate(cardElevation.value, [2, 6], [0.1, 0.2]),
        shadowRadius: cardElevation.value,
      };
    });

    const getGradientColors = () => {
      if (progress < 25) return ['#FF5252', '#FF8A80', '#FFCDD2'];
      if (progress < 50) return ['#800020', '#9B2335', '#A4262C'];
      if (progress < 75) return ['#800020', '#6D071A', '#4E0011'];
      return ['#66BB6A', '#4CAF50', '#388E3C'];
    };

    const renderParticles = () => {
      if (progress >= 95) {
        const particles = [];
        const colors = [
          '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107',
          '#FF9800', '#FF5722', '#E91E63', '#9C27B0', '#3F51B5'
        ];

        for (let i = 0; i < 18; i++) {
          particles.push(
            <Particle
              key={`particle-${index}-${i}`}
              delay={i * 300}
              size={3 + Math.random() * 8}
              color={colors[Math.floor(Math.random() * colors.length)]}
              top={5 + Math.random() * 120}
              left={5 + Math.random() * (totalCards > 0 ? 320 : 220)}
            />
          );
        }
        return particles;
      } else if (progress >= 75) {
        const particles = [];
        const colors = ['#8BC34A', '#CDDC39', '#FFEB3B'];

        for (let i = 0; i < 6; i++) {
          particles.push(
            <Particle
              key={`particle-${index}-${i}`}
              delay={i * 600}
              size={2 + Math.random() * 4}
              color={colors[Math.floor(Math.random() * colors.length)]}
              top={20 + Math.random() * 80}
              left={20 + Math.random() * (totalCards > 0 ? 280 : 180)}
            />
          );
        }
        return particles;
      }
      return null;
    };

    const cardScale2 = useSharedValue(1);

    const handlePressIn = () => {
      cardScale2.value = withTiming(0.97, { duration: 200 });
    };

    const handlePressOut = () => {
      cardScale2.value = withTiming(1, { duration: 300 });
    };

    const combinedCardStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: cardScale.value * cardScale2.value }],
        shadowOpacity: interpolate(cardElevation.value, [2, 6], [0.1, 0.2]),
        shadowRadius: cardElevation.value,
      };
    });

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 100).springify().damping(12)}
        style={[
          combinedCardStyle,
          {
            marginBottom: 16,
            ...(Platform.OS === 'web' ? {
              transition: 'transform 0.3s ease, opacity 0.4s ease, box-shadow 0.3s ease',
            } : {})
          }
        ]}
        layout={Animated.Layout.springify()}
      >
        <TouchableOpacity
          style={[styles.deckCard, { overflow: 'hidden' }]}
          onPress={() => router.push(`/deck/${item.id}`)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          {renderParticles()}
          <View style={styles.shimmerContainer}>
            <Animated.View
              entering={FadeInUp.delay(index * 100 + 300).springify()}
              style={[
                styles.shimmer,
                {
                  backgroundColor: progress >= 95
                    ? 'rgba(255, 215, 0, 0.25)'
                    : progress >= 75
                      ? 'rgba(190, 240, 190, 0.22)'
                      : 'rgba(255, 255, 255, 0.2)'
                }
              ]}
            />
            {progress >= 50 && progress < 85 && (
              <Animated.View
                entering={FadeInUp.delay(index * 100 + 400).springify()}
                style={[
                  styles.shimmer,
                  {
                    backgroundColor: 'rgba(155, 35, 53, 0.15)',
                    top: -50,
                    left: -100,
                    transform: [{ rotate: '20deg' }],
                  }
                ]}
              />
            )}
            {progress >= 85 && (
              <Animated.View
                entering={FadeInUp.delay(index * 100 + 500).springify()}
                style={[
                  styles.shimmer,
                  {
                    backgroundColor: 'rgba(255, 215, 0, 0.15)',
                    top: -40,
                    left: -80,
                    transform: [{ rotate: '15deg' }],
                  }
                ]}
              />
            )}
          </View>
          <View style={styles.deckTitleContainer}>
            <Animated.View
              entering={FadeInDown.delay(index * 100 + 100).springify()}
              style={{
                transform: [{ scale: cardScale.value }]
              }}
            >
              <FontAwesome5
                name={progress >= 95 ? "crown" : progress >= 75 ? "star" : "book"}
                size={18}
                color={
                  progress >= 95 ? "#FFC107" :
                    progress >= 75 ? "#FF9800" :
                      "#3B82F6"
                }
                style={styles.deckIcon}
              />
            </Animated.View>
            <View style={styles.deckTitleTextContainer}>
              <Text style={styles.deckName}>{item.name}</Text>
              {progress > 0 && (
                <Animated.Text
                  entering={FadeInUp.delay(index * 100 + 300).springify().damping(14)}
                  style={styles.deckSubtitle}
                >
                  {progress >= 95
                    ? "Mastered!"
                    : progress >= 75
                      ? "Almost complete"
                      : progress >= 50
                        ? "Good progress"
                        : "In progress"}
                </Animated.Text>
              )}
            </View>
            {progress >= 95 && (
              <Animated.View
                entering={FadeInDown.delay(index * 100 + 200).springify()}
                style={{
                  marginLeft: 6,
                  transform: [{ scale: cardScale.value }]
                }}
              >
                <FontAwesome5 name="medal" size={16} color="#FFD700" />
              </Animated.View>
            )}
          </View>
          <View style={styles.progressBarContainer}>
            <ProgressBar
              progress={progress}
              enableAnimation={true}
              color={getGradientColors()[0]}
              style={{ width: '100%' }}
            />
          </View>
          <View style={styles.cardInfoContainer}>
            <View style={styles.cardCountWrapper}>
              <FontAwesome5 name="check-circle" size={14} color="#4CAF50" style={{ marginRight: 6 }} />
              <Text style={styles.cardCount}>
                {knownCards} of {totalCards} words learned
              </Text>
            </View>
            <Text style={[
              styles.percentageText,
              {
                color: progress >= 95
                  ? '#4CAF50'
                  : progress >= 50
                    ? '#FF9800'
                    : '#3B82F6'
              }
            ]}>
              {Math.round(progress)}%
            </Text>
          </View>
          {item.forkedFrom && (
            <View style={styles.forkedFromContainer}>
              <FontAwesome5 name="code-branch" size={12} color="#94A3B8" style={{ marginRight: 4 }} />
              <Text style={styles.forkedFrom}>
                Forked from: {item.forkedFrom.name}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.replace('/deck')}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderBackgroundPatterns = () => {
    const patterns = [];
    for (let i = 0; i < 12; i++) {
      const size = 20 + Math.random() * 60;
      patterns.push(
        <Animated.View
          key={`pattern-${i}`}
          entering={FadeInUp.delay(i * 150).springify()}
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: `rgba(${59 + Math.random() * 20}, ${130 + Math.random() * 30}, ${246 + Math.random() * 10}, ${0.03 + Math.random() * 0.04})`,
            top: Math.random() * 700,
            left: Math.random() * 350,
          }}
        />
      );
    }
    return patterns;
  };

  return (
    <View style={styles.container}>
      <Animated.View
        entering={FadeInDown.duration(800).springify()}
        style={styles.backgroundContainer}
      >
        <LinearGradient
          colors={['rgba(15, 23, 42, 1)', 'rgba(20, 30, 50, 0.9)']}
          style={styles.backgroundGradient}
        />
        <Animated.View
          entering={FadeInUp.delay(400).duration(1200)}
          style={[styles.gradientOverlay, styles.gradientOverlay1]}
        >
          <LinearGradient
            colors={['rgba(30, 41, 59, 0)', 'rgba(30, 41, 59, 0.4)', 'rgba(30, 41, 59, 0)']}
            start={{ x: 0, y: 0.2 }}
            end={{ x: 1, y: 0.8 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
        <Animated.View
          entering={FadeInUp.delay(700).duration(1500)}
          style={[styles.gradientOverlay, styles.gradientOverlay2]}
        >
          <LinearGradient
            colors={['rgba(240, 249, 255, 0)', 'rgba(186, 230, 253, 0.3)', 'rgba(240, 249, 255, 0)']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
        {renderBackgroundPatterns()}
      </Animated.View>
      <Animated.View
        entering={FadeInDown.duration(1000).springify()}
        style={[styles.decorativeCircle, styles.circle1]}
      />
      <Animated.View
        entering={FadeInUp.duration(1000).springify()}
        style={[styles.decorativeCircle, styles.circle2]}
      />
      <Animated.View
        entering={FadeInDown.delay(300).duration(1000).springify()}
        style={[styles.decorativeCircle, styles.circle3]}
      />
      <Animated.View
        entering={FadeInDown.springify().damping(12)}
        style={styles.headerContainer}
      >
        <View style={styles.titleRow}>
          <FontAwesome5 name="layer-group" size={24} color="#3B82F6" style={{ marginRight: 10 }} />
          <Text style={styles.title}>My Decks</Text>
        </View>
        <Text style={styles.subtitle}>Track your learning progress</Text>
      </Animated.View>
      <Animated.View
        entering={FadeInUp.delay(200).springify().damping(14)}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.input}
          value={newDeckName}
          onChangeText={setNewDeckName}
          placeholder="Enter new deck name"
          placeholderTextColor="#9CA3AF"
        />
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateDeck}
        >
          <LinearGradient
            colors={['#3B82F6', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.createButtonGradient}
          >
            <FontAwesome5 name="plus" size={14} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.createButtonText}>Create Deck</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
      <FlatList
        data={decks}
        renderItem={renderDeckItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Animated.View
            style={{
              opacity: animatedValue.value, //Updated to use animatedValue.value
              transform: [{ scale: animatedValue.value }], //Updated to use animatedValue.value
              alignItems: 'center',
              paddingTop: 40
            }}
          >
            <Ionicons name="documents-outline" size={60} color="#CBD5E1" />
            <Text style={styles.emptyText}>
              No flashcard decks yet. Create one to get started!
            </Text>
          </Animated.View>
        }
      />
      {user && user.email === 'ahmetkoc1@gmail.com' && (
        <ImportButton onPress={handleImportWords} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundGradient: {
    flex: 1,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientOverlay1: {
    transform: [{ rotate: '45deg' }],
  },
  deckGalleryContent: {
    paddingBottom: 100,
  },
  headerContainer: {
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    marginBottom: 16,
  },
  addDeckContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  input: {
    flex: 1,
    padding: 8,
    color: '#E2E8F0',
    backgroundColor: '#334155',
    borderRadius: 8,
    marginRight: 8,
  },
  createButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  deckCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  shimmerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderRadius: 12,
  },
  shimmer: {
    position: 'absolute',
    width: 300,
    height: 100,
    top: -60,
    left: -60,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    transform: [{ rotate: '25deg' }],
  },
  deckTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deckIcon: {
    marginRight: 8,
  },
  deckTitleTextContainer: {
    flex: 1,
  },
  deckName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  deckSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  progressBarContainer: {
    marginVertical: 12,
    height: 14,
    position: 'relative',
  },
  progressBarBase: {
    height: 14,
    backgroundColor: 'transparent',
    borderRadius: 7,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: 14,
    borderRadius: 7,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  transform3D: {
    position: 'relative',
    overflow: 'hidden',
  },
  cylinderTopHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
  cylinderBottomShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
  },
  cylinderLeftShadow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderTopLeftRadius: 7,
    borderBottomLeftRadius: 7,
  },
  cylinderRightShadow: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderTopRightRadius: 7,
    borderBottomRightRadius: 7,
  },
  progressPulse: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  cardInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  cardCountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardCount: {
    fontSize: 13,
    color: '#94A3B8',
  },
  percentageText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  forkedFromContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  forkedFrom: {
    fontSize: 11,
    color: '#94A3B8',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
    opacity: 0.8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  createFirstButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  createFirstButtonText: {
    color: '#F8FAFC',
    fontWeight: 'bold',
    fontSize: 16,
  },
  adminControls: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  adminHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  adminButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  adminButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 8,
    width: '48%',
    alignItems: 'center',
  },
  adminButtonText: {
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  adminMessage: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listContainer: {
    flexGrow: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    padding: 8,
    color: '#E2E8F0',
    backgroundColor: '#334155',
    borderRadius: 8,
    marginRight: 8,
  },
  createButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonGradient: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  createButtonText: {
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  decorativeCircle: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    top: 80,
    left: 20,
  },
  circle2: {
bottom: 120,
    right: 40,
  },
  circle3: {
    top: 200,
    left: 160,
  },
  headerContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
  },
  importButton: {
    marginTop: 20,
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  importButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});