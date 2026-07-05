import { Audio } from 'expo-av';

let currentSound = null;

/**
 * Play an audio file given a URL or base64 audio data
 * @param {string} url - Remote audio URL
 * @param {string} base64Data - Base64 audio data string
 * @returns {Promise<Audio.Sound|null>} - Sound object
 */
export async function playSound(url, base64Data) {
  try {
    // Stop and unload any currently playing sound
    if (currentSound) {
      await currentSound.unloadAsync().catch(() => {});
      currentSound = null;
    }

    const source = base64Data 
      ? { uri: `data:audio/mp3;base64,${base64Data}` } 
      : (url ? { uri: url } : null);

    if (!source) {
      console.warn('No audio source (URL or base64) provided to playSound');
      return null;
    }

    // Configure audio mode for playback
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    const { sound } = await Audio.Sound.createAsync(
      source,
      { shouldPlay: true }
    );
    currentSound = sound;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        if (currentSound === sound) {
          currentSound = null;
        }
      }
    });

    return sound;
  } catch (error) {
    console.error('Error playing sound:', error);
    return null;
  }
}

/**
 * Stop any currently playing audio
 */
export async function stopSound() {
  if (currentSound) {
    try {
      await currentSound.stopAsync().catch(() => {});
      await currentSound.unloadAsync().catch(() => {});
    } catch (e) {
      console.error('Error stopping sound:', e);
    } finally {
      currentSound = null;
    }
  }
}
