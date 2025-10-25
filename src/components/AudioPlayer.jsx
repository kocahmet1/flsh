import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { cacheAudioFile } from '../utils/audioGeneration';

/**
 * AudioPlayer component for playing flashcard audio in sequence
 * Plays word -> definition -> sentence for each card like a playlist
 */
export default function AudioPlayer({ cards, currentCardIndex, onPlaybackComplete, onAudioChange }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAudioType, setCurrentAudioType] = useState(null); // 'word', 'definition', or 'sentence'
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const soundRef = useRef(null);
  const playbackQueueRef = useRef([]);
  const currentTrackIndexRef = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Play a subtle chime sound to indicate word transition
  const playTransitionChime = async () => {
    try {
      // Try multiple sound sources for better reliability
      const soundSources = [
        'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
        'https://freesound.org/data/previews/320/320655_5260872-lq.mp3', // Notification bell
        'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3', // UI notification
      ];
      
      console.log('🔔 Attempting to play transition chime...');
      
      // Try the first sound source
      const { sound: chimeSound } = await Audio.Sound.createAsync(
        { uri: soundSources[0] },
        { 
          shouldPlay: true, 
          volume: 0.5, // Increased volume to 50% to be more noticeable
        }
      );
      
      console.log('✅ Chime sound loaded and playing');
      
      // Clean up after playing
      chimeSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          console.log('✅ Chime finished playing');
          chimeSound.unloadAsync();
        }
        if (status.error) {
          console.error('❌ Chime playback error:', status.error);
        }
      });
      
    } catch (error) {
      console.error('⚠️ Chime sound failed to load:', error.message);
      // Fail silently if sound doesn't load
    }
  };

  // Build playlist from cards
  const buildPlaylist = () => {
    const playlist = [];
    
    // Start from current card and include all subsequent cards
    for (let i = currentCardIndex; i < cards.length; i++) {
      const card = cards[i];
      
      // Add word audio if available (URL or base64 data)
      if (card.wordAudioUrl || card.wordAudioData) {
        playlist.push({
          url: card.wordAudioUrl,
          data: card.wordAudioData,
          type: 'word',
          text: card.front,
          cardIndex: i,
          cacheKey: `${card.id}_word`,
        });
      }
      
      // Add definition audio if available (URL or base64 data)
      if (card.definitionAudioUrl || card.definitionAudioData) {
        playlist.push({
          url: card.definitionAudioUrl,
          data: card.definitionAudioData,
          type: 'definition',
          text: card.back,
          cardIndex: i,
          cacheKey: `${card.id}_definition`,
        });
      }
      
      // Add sentence audio if available (URL or base64 data)
      if (card.sentenceAudioUrl || card.sentenceAudioData) {
        playlist.push({
          url: card.sentenceAudioUrl,
          data: card.sentenceAudioData,
          type: 'sentence',
          text: card.sampleSentence,
          cardIndex: i,
          cacheKey: `${card.id}_sentence`,
        });
      }
    }
    
    return playlist;
  };

  // Play a single audio track
  const playTrack = async (track) => {
    try {
      setIsLoading(true);
      setCurrentAudioType(track.type);

      // Notify parent about audio change (card index and type)
      if (onAudioChange) {
        onAudioChange({
          cardIndex: track.cardIndex,
          audioType: track.type,
          text: track.text
        });
      }

      // Unload previous sound if exists
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // Determine audio source (URL or base64 data)
      let audioUri;
      if (track.data) {
        // Use base64 data (web workaround)
        audioUri = `data:audio/mp3;base64,${track.data}`;
      } else {
        // Cache the audio file from URL for better performance
        audioUri = await cacheAudioFile(track.url, track.cacheKey);
      }
      
      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Create and load the sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      setIsLoading(false);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing track:', error);
      setIsLoading(false);
      setIsPlaying(false);
      
      // Try next track if this one fails
      playNextTrack();
    }
  };

  // Playback status update handler
  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      if (status.durationMillis > 0) {
        setPlaybackProgress(status.positionMillis / status.durationMillis);
      }
      
      // Track finished playing
      if (status.didJustFinish) {
        playNextTrack();
      }
    }
  };

  // Play next track in the playlist
  const playNextTrack = async () => {
    const previousTrackIndex = currentTrackIndexRef.current;
    currentTrackIndexRef.current += 1;
    
    if (currentTrackIndexRef.current < playbackQueueRef.current.length) {
      const previousTrack = playbackQueueRef.current[previousTrackIndex];
      const nextTrack = playbackQueueRef.current[currentTrackIndexRef.current];
      
      // Determine the type of transition and apply appropriate pause
      const isNewCard = previousTrack.cardIndex !== nextTrack.cardIndex;
      
      if (isNewCard) {
        // Longer pause between different words (1.5 seconds)
        console.log('🔄 Moving to next word, adding long pause...');
        
        // Play transition chime sound
        playTransitionChime();
        
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else if (previousTrack.type === 'word' && nextTrack.type === 'definition') {
        // Medium pause between word and definition (700ms)
        console.log('📖 Word → Definition, adding medium pause...');
        await new Promise(resolve => setTimeout(resolve, 700));
      } else if (previousTrack.type === 'definition' && nextTrack.type === 'sentence') {
        // Small pause between definition and sentence (500ms)
        console.log('💬 Definition → Sentence, adding small pause...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      await playTrack(nextTrack);
    } else {
      // Playlist finished
      stopPlayback();
      if (onPlaybackComplete) {
        onPlaybackComplete();
      }
    }
  };

  // Start playback
  const startPlayback = async () => {
    const playlist = buildPlaylist();
    
    if (playlist.length === 0) {
      alert('No audio available for these cards. Generate audio first!');
      return;
    }

    playbackQueueRef.current = playlist;
    currentTrackIndexRef.current = 0;
    
    const firstTrack = playlist[0];
    await playTrack(firstTrack);
  };

  // Stop playback
  const stopPlayback = async () => {
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentAudioType(null);
    setPlaybackProgress(0);
    currentTrackIndexRef.current = 0;
    playbackQueueRef.current = [];

    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      } catch (error) {
        console.error('Error stopping playback:', error);
      }
    }
  };

  // Pause/Resume playback
  const togglePause = async () => {
    if (!soundRef.current) return;

    try {
      const status = await soundRef.current.getStatusAsync();
      if (status.isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling pause:', error);
    }
  };

  // Skip to next track
  const skipNext = async () => {
    if (currentTrackIndexRef.current < playbackQueueRef.current.length - 1) {
      await playNextTrack();
    }
  };

  // Get display text for current audio
  const getCurrentDisplayText = () => {
    if (!currentAudioType || currentTrackIndexRef.current >= playbackQueueRef.current.length) {
      return '';
    }

    const currentTrack = playbackQueueRef.current[currentTrackIndexRef.current];
    const typeLabel = currentAudioType === 'word' ? '📝 Word' : 
                     currentAudioType === 'definition' ? '📖 Definition' : 
                     '💬 Sentence';
    
    return `${typeLabel}: ${currentTrack.text.substring(0, 50)}${currentTrack.text.length > 50 ? '...' : ''}`;
  };

  const hasAudio = cards.some(card => 
    card.wordAudioUrl || card.definitionAudioUrl || card.sentenceAudioUrl ||
    card.wordAudioData || card.definitionAudioData || card.sentenceAudioData
  );

  if (!hasAudio) {
    return null; // Don't show player if no audio available
  }

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      {isPlaying && (
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${playbackProgress * 100}%` }]} />
        </View>
      )}

      {/* Current Audio Display */}
      {(isPlaying || isLoading) && (
        <Text style={styles.currentAudioText} numberOfLines={1}>
          {getCurrentDisplayText()}
        </Text>
      )}

      {/* Control Buttons */}
      <View style={styles.controlsContainer}>
        {!isPlaying && !isLoading ? (
          <TouchableOpacity 
            style={styles.playButton} 
            onPress={startPlayback}
            activeOpacity={0.7}
          >
            <MaterialIcons name="play-circle-filled" size={48} color="#10B981" />
            <Text style={styles.playButtonText}>Play All</Text>
          </TouchableOpacity>
        ) : (
          <>
            {isLoading ? (
              <ActivityIndicator size="large" color="#10B981" />
            ) : (
              <View style={styles.playbackControls}>
                <TouchableOpacity 
                  onPress={togglePause}
                  style={styles.controlButton}
                  activeOpacity={0.7}
                >
                  <MaterialIcons 
                    name={isPlaying ? "pause-circle-filled" : "play-circle-filled"} 
                    size={48} 
                    color="#10B981" 
                  />
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={skipNext}
                  style={styles.controlButton}
                  activeOpacity={0.7}
                  disabled={currentTrackIndexRef.current >= playbackQueueRef.current.length - 1}
                >
                  <MaterialIcons 
                    name="skip-next" 
                    size={40} 
                    color={currentTrackIndexRef.current >= playbackQueueRef.current.length - 1 ? "#94A3B8" : "#10B981"} 
                  />
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={stopPlayback}
                  style={styles.controlButton}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="stop" size={40} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>

      {/* Track Counter */}
      {isPlaying && playbackQueueRef.current.length > 0 && (
        <Text style={styles.trackCounter}>
          {currentTrackIndexRef.current + 1} / {playbackQueueRef.current.length}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    ...(Platform.OS === 'web' ? {
      position: 'relative',
      zIndex: 80, // Ensure buttons stay on top on web
    } : {}),
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  currentAudioText: {
    fontSize: 14,
    color: '#F8FAFC',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  controlsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  playButtonText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  controlButton: {
    padding: 4,
  },
  trackCounter: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
});

