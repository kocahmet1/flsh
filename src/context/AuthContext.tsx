// @ts-nocheck
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { get, ref, update } from 'firebase/database';
import { auth, db, firebaseEnabled } from '../firebase/config';
import { CLOUD_SYNC_ENABLED } from '../constants/FeatureFlags';
import { isAdminEmail } from '../constants/Admin';

const AuthContext = createContext({
  user: null,
  initializing: true,
  isAdmin: false,
  cloudEnabled: CLOUD_SYNC_ENABLED,
  firebaseReady: firebaseEnabled,
  signOut: async () => {},
});

async function upsertUserProfile(user) {
  if (!firebaseEnabled || !db || !user?.uid) return;

  const profileRef = ref(db, `userProfiles/${user.uid}`);
  const existing = await get(profileRef);
  const now = new Date().toISOString();

  await update(profileRef, {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    providerId: user.providerData?.[0]?.providerId || 'password',
    createdAt: existing.exists() ? existing.val()?.createdAt || now : now,
    lastSeenAt: now,
  });
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(CLOUD_SYNC_ENABLED);

  useEffect(() => {
    if (!CLOUD_SYNC_ENABLED || !firebaseEnabled) {
      setInitializing(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setInitializing(false);

      if (nextUser) {
        try {
          await upsertUserProfile(nextUser);
        } catch (error) {
          console.warn('[AuthContext] Could not update user profile:', error?.message || error);
        }
      }
    });

    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      user,
      initializing,
      isAdmin: isAdminEmail(user?.email),
      cloudEnabled: CLOUD_SYNC_ENABLED,
      firebaseReady: firebaseEnabled,
      signOut: async () => {
        if (firebaseEnabled) {
          await firebaseSignOut(auth);
        }
      },
    }),
    [user, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
