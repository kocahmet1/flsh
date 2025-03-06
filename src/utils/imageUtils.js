import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Convert image URI to base64 string with platform-specific handling
 * @param {string} uri - URI of the image
 * @returns {Promise<string>} Base64 string of the image
 */
export async function convertImageToBase64(uri) {
  try {
    // Web platform implementation
    if (Platform.OS === 'web') {
      return await fetchImageAsBase64(uri);
    } 
    // Native platforms implementation (iOS, Android)
    else {
      // Read the file as base64 using FileSystem
      return await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
}

/**
 * Fetch an image and convert it to base64 for web platform
 * @param {string} uri - URI of the image
 * @returns {Promise<string>} - Base64 string of the image
 */
async function fetchImageAsBase64(uri) {
  try {
    // Fetch the image as a blob
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Convert blob to base64 using FileReader
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // reader.result contains the base64 data URL like:
        // "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
        // We need to extract just the base64 part
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = () => {
        reject(new Error('Failed to convert image to base64'));
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error fetching image as base64:', error);
    throw error;
  }
}
