import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence, browserSessionPersistence, setPersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Flag to force sign out on app start (set to true to force sign out)
const FORCE_SIGN_OUT = true;

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth based on platform
let auth;
if (Platform.OS === 'web') {
  // Use standard getAuth for web
  auth = getAuth(app);
  // Set web persistence
  setPersistence(auth, browserSessionPersistence)
    .catch((error) => {
      console.error("Error setting auth persistence:", error);
    });
} else {
  // Use React Native specific initialization with AsyncStorage persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });

  // For mobile, force sign out if needed
  if (FORCE_SIGN_OUT) {
    // We need to sign out in the next tick to ensure auth is fully initialized
    setTimeout(() => {
      auth.signOut().then(() => {
        console.log("Forced sign out on app initialization");
      }).catch(error => {
        console.error("Error during forced sign out:", error);
      });
    }, 0);
  }
}

// Export auth
export { auth };

// Initialize Realtime Database with app instance
export const db = getDatabase(app);

// Export the app instance
export default app;