import OpenAI from 'openai';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
import { Platform } from 'react-native';

// Conditionally import FileSystem only for native platforms
let FileSystem = null;
if (Platform.OS !== 'web') {
  FileSystem = require('expo-file-system');
}

// Initialize OpenAI API for TTS
const openai = process.env.EXPO_PUBLIC_OPENAI_API_KEY 
  ? new OpenAI({
      apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true // Required for Expo/React Native
    })
  : null;

/**
 * Generate audio for text using OpenAI TTS API
 * @param {string} text - The text to convert to speech
 * @param {string} voice - Voice to use (alloy, echo, fable, onyx, nova, shimmer)
 * @returns {Promise<ArrayBuffer>} - Audio data as ArrayBuffer
 */
export async function generateAudio(text, voice = 'alloy') {
  if (!openai) {
    throw new Error('OpenAI API key not configured. Please set EXPO_PUBLIC_OPENAI_API_KEY in your environment variables.');
  }

  if (!text || text.trim() === '') {
    console.warn('No text provided for audio generation');
    return null;
  }

  try {
    console.log(`🎤 Generating audio for: "${text.substring(0, 50)}..." with voice: ${voice}`);
    
    // Call OpenAI TTS API
    // Using tts-1 model (faster and cheaper than tts-1-hd)
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice,
      input: text,
      response_format: 'mp3',
    });

    // Get the audio data as ArrayBuffer
    const audioBuffer = await response.arrayBuffer();
    
    console.log('✅ Audio generated successfully');
    return audioBuffer;
  } catch (error) {
    console.error('❌ Error generating audio:', error);
    throw error;
  }
}

/**
 * Upload audio to Firebase Storage
 * @param {ArrayBuffer} audioBuffer - Audio data as ArrayBuffer
 * @param {string} deckId - Deck ID
 * @param {string} cardId - Card ID
 * @param {string} type - Audio type (word, definition, or sentence)
 * @returns {Promise<string>} - Download URL of the uploaded audio
 */
export async function uploadAudioToStorage(audioBuffer, deckId, cardId, type) {
  if (!storage) {
    throw new Error('Firebase Storage is not initialized');
  }

  try {
    console.log(`📤 Uploading ${type} audio to Firebase Storage...`);
    
    // Create a reference to the audio file in Firebase Storage
    const audioPath = `audio/${deckId}/${cardId}/${type}.mp3`;
    const audioRef = storageRef(storage, audioPath);
    
    // Convert ArrayBuffer to Blob
    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    
    // Upload the audio file
    await uploadBytes(audioRef, blob);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(audioRef);
    
    console.log(`✅ ${type} audio uploaded successfully`);
    return downloadURL;
  } catch (error) {
    console.error(`❌ Error uploading ${type} audio:`, error);
    throw error;
  }
}

/**
 * Generate and store audio for a flashcard
 * @param {string} deckId - Deck ID
 * @param {string} cardId - Card ID
 * @param {Object} cardData - Card data with front, back, and sampleSentence
 * @param {string} voice - Voice to use (alloy, echo, fable, onyx, nova, shimmer)
 * @returns {Promise<Object>} - Object with audio URLs { wordAudioUrl, definitionAudioUrl, sentenceAudioUrl }
 */
const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function arrayBufferToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.length;
  let base64 = '';
  
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;
    
    const chunk = (b1 << 16) | (b2 << 8) | b3;
    
    const c1 = (chunk >> 18) & 63;
    const c2 = (chunk >> 12) & 63;
    const c3 = (chunk >> 6) & 63;
    const c4 = chunk & 63;
    
    base64 += base64Chars[c1] + base64Chars[c2];
    base64 += i + 1 < len ? base64Chars[c3] : '=';
    base64 += i + 2 < len ? base64Chars[c4] : '=';
  }
  
  return base64;
}

export async function generateCardAudio(deckId, cardId, cardData, voice = 'alloy') {
  const audioUrls = {
    wordAudioUrl: null,
    definitionAudioUrl: null,
    sentenceAudioUrl: null,
    wordAudioData: null,
    definitionAudioData: null,
    sentenceAudioData: null,
  };

  try {
    // Generate and upload audio for the word (front)
    if (cardData.front && cardData.front.trim()) {
      console.log('🎤 Generating audio for word...');
      const wordAudio = await generateAudio(cardData.front, voice);
      if (wordAudio) {
        try {
          audioUrls.wordAudioUrl = await uploadAudioToStorage(wordAudio, deckId, cardId, 'word');
          audioUrls.wordAudioData = null;
        } catch (uploadError) {
          console.warn('⚠️ Firebase Storage upload failed. Falling back to base64 database storage:', uploadError.message);
          audioUrls.wordAudioUrl = null;
          audioUrls.wordAudioData = arrayBufferToBase64(wordAudio);
        }
      }
    }

    // Generate and upload audio for the definition (back)
    if (cardData.back && cardData.back.trim()) {
      console.log('🎤 Generating audio for definition...');
      const definitionAudio = await generateAudio(cardData.back, voice);
      if (definitionAudio) {
        try {
          audioUrls.definitionAudioUrl = await uploadAudioToStorage(definitionAudio, deckId, cardId, 'definition');
          audioUrls.definitionAudioData = null;
        } catch (uploadError) {
          console.warn('⚠️ Firebase Storage upload failed. Falling back to base64 database storage:', uploadError.message);
          audioUrls.definitionAudioUrl = null;
          audioUrls.definitionAudioData = arrayBufferToBase64(definitionAudio);
        }
      }
    }

    // Generate and upload audio for the sample sentence
    if (cardData.sampleSentence && cardData.sampleSentence.trim()) {
      console.log('🎤 Generating audio for sample sentence...');
      const sentenceAudio = await generateAudio(cardData.sampleSentence, voice);
      if (sentenceAudio) {
        try {
          audioUrls.sentenceAudioUrl = await uploadAudioToStorage(sentenceAudio, deckId, cardId, 'sentence');
          audioUrls.sentenceAudioData = null;
        } catch (uploadError) {
          console.warn('⚠️ Firebase Storage upload failed. Falling back to base64 database storage:', uploadError.message);
          audioUrls.sentenceAudioUrl = null;
          audioUrls.sentenceAudioData = arrayBufferToBase64(sentenceAudio);
        }
      }
    }

    console.log('✅ Card audio generation / upload step complete');
    return audioUrls;
  } catch (error) {
    console.error('❌ Error generating card audio:', error);
    // Return partial results if some audio was generated
    return audioUrls;
  }
}

/**
 * Generate audio for multiple cards in a batch
 * @param {string} deckId - Deck ID
 * @param {Array} cards - Array of card objects with id and card data
 * @param {string} voice - Voice to use
 * @param {Function} onProgress - Callback for progress updates (current, total)
 * @returns {Promise<Object>} - Object mapping cardId to audio URLs
 */
export async function generateBatchCardAudio(deckId, cards, voice = 'alloy', onProgress = null) {
  const results = {};
  
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    console.log(`Processing card ${i + 1}/${cards.length}: ${card.front}`);
    
    try {
      const audioUrls = await generateCardAudio(deckId, card.id, card, voice);
      results[card.id] = audioUrls;
      
      if (onProgress) {
        onProgress(i + 1, cards.length);
      }
      
      // Add a small delay to avoid rate limiting (OpenAI has rate limits)
      if (i < cards.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Failed to generate audio for card ${card.id}:`, error);
      results[card.id] = { error: error.message };
    }
  }
  
  return results;
}

/**
 * Download audio file to local cache for offline playback
 * @param {string} audioUrl - Remote audio URL
 * @param {string} cacheKey - Unique key for caching
 * @returns {Promise<string>} - Local file URI
 */
export async function cacheAudioFile(audioUrl, cacheKey) {
  if (!audioUrl) return null;
  
  // On web, browser handles caching automatically
  if (Platform.OS === 'web') {
    return audioUrl;
  }
  
  // On mobile, use FileSystem caching
  if (!FileSystem) {
    console.warn('FileSystem not available, returning original URL');
    return audioUrl;
  }
  
  try {
    const cacheDir = FileSystem.cacheDirectory + 'audio/';
    const localUri = cacheDir + cacheKey + '.mp3';
    
    // Check if file already exists in cache
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (fileInfo.exists) {
      console.log('✅ Audio file found in cache:', localUri);
      return localUri;
    }
    
    // Create cache directory if it doesn't exist
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
    }
    
    // Download the file to cache
    console.log('📥 Downloading audio to cache...');
    const downloadResult = await FileSystem.downloadAsync(audioUrl, localUri);
    
    if (downloadResult.status === 200) {
      console.log('✅ Audio cached successfully:', localUri);
      return downloadResult.uri;
    } else {
      throw new Error(`Download failed with status ${downloadResult.status}`);
    }
  } catch (error) {
    console.error('❌ Error caching audio file:', error);
    // Return original URL if caching fails
    return audioUrl;
  }
}

/**
 * Available voice options for TTS
 */
export const VOICE_OPTIONS = [
  { value: 'alloy', label: 'Alloy (Neutral)', description: 'Balanced and versatile' },
  { value: 'echo', label: 'Echo (Male)', description: 'Clear male voice' },
  { value: 'fable', label: 'Fable (British)', description: 'British accent' },
  { value: 'onyx', label: 'Onyx (Deep)', description: 'Deep, authoritative' },
  { value: 'nova', label: 'Nova (Female)', description: 'Warm female voice' },
  { value: 'shimmer', label: 'Shimmer (Soft)', description: 'Soft and gentle' },
];

/**
 * Estimate cost for generating audio
 * @param {number} characterCount - Total number of characters
 * @returns {number} - Estimated cost in USD
 */
export function estimateAudioCost(characterCount) {
  // OpenAI TTS-1 costs $15 per 1 million characters
  const costPerCharacter = 15 / 1000000;
  return characterCount * costPerCharacter;
}

