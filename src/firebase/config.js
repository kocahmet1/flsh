import { initializeApp } from 'firebase/app';
import {
  browserSessionPersistence,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  setPersistence,
} from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { CLOUD_SYNC_ENABLED } from '../constants/FeatureFlags';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.appId &&
    firebaseConfig.projectId
);

export const firebaseEnabled = Boolean(
  CLOUD_SYNC_ENABLED && hasFirebaseConfig
);

const authStub = {
  currentUser: null,
  signOut: async () => {},
  onAuthStateChanged: () => () => {},
};

let app = null;
let auth = authStub;
let db = null;
let storage = null;

if (firebaseEnabled) {
  try {
    app = initializeApp(firebaseConfig);

    if (Platform.OS === 'web') {
      auth = getAuth(app);
      setPersistence(auth, browserSessionPersistence).catch(() => {});
    } else {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    }

    db = getDatabase(app);
    storage = getStorage(app);
  } catch (error) {
    console.warn('Firebase initialization disabled:', error);
    auth = authStub;
    db = null;
    storage = null;
  }
}

export { auth, db, storage };
export default app;
