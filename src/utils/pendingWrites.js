import { Alert, Platform } from 'react-native';

// Writes the person starts (create a deck, add a card, mark a card known...)
// are applied locally at once and confirmed by the server in the background.
// This keeps track of them so that:
//   - a failure is shown, instead of the item silently disappearing when
//     Firebase rolls the local change back;
//   - on the web, closing the tab while something is still saving asks first
//     (unsent changes live only in memory until the server has them).

let pending = 0;
let guardInstalled = false;

function installUnloadGuard() {
  if (guardInstalled || Platform.OS !== 'web' || typeof window === 'undefined') return;
  guardInstalled = true;
  window.addEventListener('beforeunload', (event) => {
    if (pending > 0) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
}

function showFailure(message) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Deferred so it never interrupts the code that started the write.
    setTimeout(() => window.alert(message), 0);
  } else {
    Alert.alert('Not saved', message);
  }
}

/**
 * Track a write the person started. Returns the same promise; failures are
 * logged and reported with failureMessage.
 */
export function trackUserWrite(promise, failureMessage) {
  installUnloadGuard();
  pending += 1;
  promise.then(
    () => {
      pending -= 1;
    },
    (error) => {
      pending -= 1;
      console.error('[save] Write failed:', error?.message || error);
      if (failureMessage) showFailure(failureMessage);
    }
  );
  return promise;
}

export function pendingUserWrites() {
  return pending;
}
