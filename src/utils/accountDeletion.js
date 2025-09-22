import { auth, db } from '../firebase/config';
import { ref, get, remove, query, orderByChild, equalTo } from 'firebase/database';
import { deleteUser } from 'firebase/auth';

/**
 * Deletes the authenticated user's account and associated data from Firebase.
 * - Removes user data under users/{uid}
 * - Removes any public/shared decks owned by the user under decks/ and sharedDecks/
 * - Deletes the Firebase Auth user
 *
 * Returns an object: { ok: boolean, error?: string, requiresRecentLogin?: boolean }
 */
export async function deleteAccountAndData() {
  const user = auth.currentUser;
  if (!user) return { ok: false, error: 'No authenticated user' };

  const uid = user.uid;

  try {
    // 1) Remove any public decks owned by the user
    try {
      const publicDecksByOwner = query(ref(db, 'decks'), orderByChild('owner'), equalTo(uid));
      const publicSnap = await get(publicDecksByOwner);
      if (publicSnap.exists()) {
        const removals = [];
        publicSnap.forEach(child => {
          removals.push(remove(ref(db, `decks/${child.key}`)).catch(() => {}));
        });
        await Promise.all(removals);
      }
    } catch (e) {
      console.warn('Error cleaning public decks:', e);
    }

    // 2) Remove any sharedDecks owned by the user
    try {
      const sharedByOwner = query(ref(db, 'sharedDecks'), orderByChild('owner'), equalTo(uid));
      const sharedSnap = await get(sharedByOwner);
      if (sharedSnap.exists()) {
        const removals = [];
        sharedSnap.forEach(child => {
          removals.push(remove(ref(db, `sharedDecks/${child.key}`)).catch(() => {}));
        });
        await Promise.all(removals);
      }
    } catch (e) {
      console.warn('Error cleaning sharedDecks:', e);
    }

    // 3) Remove user-scoped data under users/{uid}
    try {
      await remove(ref(db, `users/${uid}`));
    } catch (e) {
      console.warn('Error removing users node:', e);
    }

    // 4) Delete the Auth user
    try {
      await deleteUser(user);
    } catch (e) {
      if (e?.code === 'auth/requires-recent-login') {
        return { ok: false, requiresRecentLogin: true, error: 'Recent login required to delete account.' };
      }
      throw e;
    }

    return { ok: true };
  } catch (error) {
    console.error('Account deletion error:', error);
    return { ok: false, error: error?.message || 'Unknown error' };
  }
}
