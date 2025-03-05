import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebase/config';
import { Platform } from 'react-native';

/**
 * Clears Firebase auth data from AsyncStorage and signs out the user
 * This is useful for debugging auth issues or forcing a re-login
 */
export const clearAuthData = async () => {
  try {
    // Sign out from Firebase
    await auth.signOut();

    // On React Native, clear the AsyncStorage keys used by Firebase Auth
    if (Platform.OS !== 'web') {
      // Get all keys
      const keys = await AsyncStorage.getAllKeys();

      // Filter for Firebase Auth related keys
      const firebaseAuthKeys = keys.filter(key => 
        key.startsWith('firebase:authUser:') || 
        key.includes('firebaseLocalStorage')
      );

      // Remove the keys
      if (firebaseAuthKeys.length > 0) {
        await AsyncStorage.multiRemove(firebaseAuthKeys);
        console.log('Firebase Auth data cleared from AsyncStorage');
      }
    }

    return true;
  } catch (error) {
    console.error('Error clearing auth data:', error);
    return false;
  }
};
/**
 * Checks if the current user is an admin
 * @returns {boolean} True if the user is admin, false otherwise
 */
export const isAdmin = () => {
  const user = auth.currentUser;
  // Only return true if the user exists AND their email is the admin email
  return !!user && user.email === 'ahmetkoc1@gmail.com';
};