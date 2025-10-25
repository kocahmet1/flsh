import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

/**
 * Real-time media generation status indicator
 * Shows progress for image and audio generation
 */
export default function MediaGenerationStatus() {
  const [visible, setVisible] = useState(false);
  const [imageProgress, setImageProgress] = useState({ current: 0, total: 0, status: 'idle' });
  const [audioProgress, setAudioProgress] = useState({ current: 0, total: 0, status: 'idle' });
  const [currentWord, setCurrentWord] = useState('');
  const [expanded, setExpanded] = useState(true);
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const spinAnim = useState(new Animated.Value(0))[0];
  
  // Detect if desktop (3-column layout)
  const isDesktop = Platform.OS === 'web' && windowWidth >= 1024;
  
  // Different slide animation for mobile (bottom) vs desktop (top)
  const slideAnim = useState(new Animated.Value(isDesktop ? -100 : 100))[0];

  useEffect(() => {
    // Listen for window resize
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowWidth(window.width);
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    // Listen for media generation events
    const handleMediaProgress = (event) => {
      const { type, data } = event.detail;
      
      if (type === 'image_progress') {
        setImageProgress({ 
          current: data.current, 
          total: data.total, 
          status: 'generating' 
        });
        setCurrentWord(data.word || '');
        setVisible(true);
      } else if (type === 'image_complete') {
        setImageProgress(prev => ({ ...prev, status: 'complete' }));
      } else if (type === 'audio_progress') {
        setAudioProgress({ 
          current: data.current, 
          total: data.total, 
          status: 'generating' 
        });
        setCurrentWord(data.word || '');
        setVisible(true);
      } else if (type === 'audio_complete') {
        setAudioProgress(prev => ({ ...prev, status: 'complete' }));
      } else if (type === 'all_complete') {
        // Wait 3 seconds then hide
        setTimeout(() => {
          hideStatus();
        }, 3000);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('mediaGenerationProgress', handleMediaProgress);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('mediaGenerationProgress', handleMediaProgress);
      }
    };
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Start spinner rotation
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: isDesktop ? -100 : 100, // Slide up on mobile, down on desktop
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Reset spinner
      spinAnim.setValue(0);
    }
  }, [visible, isDesktop]);

  const hideStatus = () => {
    setVisible(false);
    // Reset after animation
    setTimeout(() => {
      setImageProgress({ current: 0, total: 0, status: 'idle' });
      setAudioProgress({ current: 0, total: 0, status: 'idle' });
      setCurrentWord('');
    }, 300);
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  if (!visible) return null;

  const imagePercent = imageProgress.total > 0 
    ? Math.round((imageProgress.current / imageProgress.total) * 100) 
    : 0;
  const audioPercent = audioProgress.total > 0 
    ? Math.round((audioProgress.current / audioProgress.total) * 100) 
    : 0;

  const isGenerating = imageProgress.status === 'generating' || audioProgress.status === 'generating';
  const allComplete = imageProgress.status === 'complete' && audioProgress.status === 'complete';

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <Animated.View 
      style={[
        styles.container,
        isDesktop ? styles.containerDesktop : styles.containerMobile,
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <TouchableOpacity 
        onPress={toggleExpanded} 
        style={styles.header}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons 
            name={allComplete ? "checkmark-circle" : "cloud-upload"} 
            size={20} 
            color={allComplete ? Colors.success : Colors.accent} 
          />
          <Text style={styles.headerTitle}>
            {allComplete ? 'Media Generation Complete!' : 'Generating Media...'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {isGenerating && (
            <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]}>
              <Ionicons name="sync" size={16} color={Colors.accent} />
            </Animated.View>
          )}
          <Ionicons 
            name={expanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={Colors.textSecondary} 
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          {/* Current Word */}
          {currentWord && isGenerating && (
            <Text style={styles.currentWord}>
              Processing: <Text style={styles.wordHighlight}>{currentWord}</Text>
            </Text>
          )}

          {/* Image Progress */}
          {imageProgress.total > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <View style={styles.progressLabel}>
                  <Ionicons name="image" size={16} color={Colors.accent} />
                  <Text style={styles.progressText}>Images</Text>
                </View>
                <Text style={styles.progressCount}>
                  {imageProgress.current}/{imageProgress.total}
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: `${imagePercent}%`,
                      backgroundColor: imageProgress.status === 'complete' ? Colors.success : Colors.accent
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressPercent}>{imagePercent}%</Text>
            </View>
          )}

          {/* Audio Progress */}
          {audioProgress.total > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <View style={styles.progressLabel}>
                  <Ionicons name="volume-high" size={16} color={Colors.accent} />
                  <Text style={styles.progressText}>Audio</Text>
                </View>
                <Text style={styles.progressCount}>
                  {audioProgress.current}/{audioProgress.total}
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: `${audioPercent}%`,
                      backgroundColor: audioProgress.status === 'complete' ? Colors.success : Colors.accent
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressPercent}>{audioPercent}%</Text>
            </View>
          )}

          {/* Info Message */}
          <Text style={styles.infoText}>
            {allComplete 
              ? '✨ All media files have been generated successfully!' 
              : '⚡ Generating in the background. You can continue using the app.'}
          </Text>

          {/* Close Button */}
          {allComplete && (
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={hideStatus}
            >
              <Text style={styles.closeButtonText}>Dismiss</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    backgroundColor: 'rgba(30, 26, 64, 0.98)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(108, 100, 251, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  containerDesktop: {
    // Desktop: position over the right column only, at the top
    top: 60,
    right: 16,
    width: '32%', // Roughly 1/3 of screen width (for the right column)
    maxWidth: 450,
    minWidth: 300,
  },
  containerMobile: {
    // Mobile: span full width at the bottom (above tab bar)
    bottom: 80, // Above the bottom navigation bar
    left: 16,
    right: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  spinner: {
    // Animation handled by Animated.View
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  currentWord: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  wordHighlight: {
    color: Colors.accent,
    fontWeight: '600',
  },
  progressSection: {
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  progressCount: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(108, 100, 251, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  progressPercent: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  infoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  closeButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  closeButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});

