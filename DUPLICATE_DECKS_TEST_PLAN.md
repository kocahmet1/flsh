# Test Plan: Duplicate Decks Fix

## Test Scenario 1: New User Signup
**Purpose**: Verify that new users only receive one copy of the default deck

### Steps:
1. Clear browser cache/storage (or use incognito mode)
2. Navigate to the app
3. Create a new account (sign up with a new email)
4. After successful signup, check the "My Vocab Sets" screen
5. Open browser console and check logs

### Expected Results:
- Only ONE "SAT Vocab List 1" deck should appear
- Console should show logs:
  ```
  [ensureCloudDefaultsSeeded] Starting to seed default decks
  [ensureCloudDefaultsSeeded] Created deck: SAT Vocab List 1
  [ensureCloudDefaultsSeeded] Seeding completed successfully
  [cleanupDuplicateDecks] Checking for duplicate decks...
  [cleanupDuplicateDecks] No duplicate decks found
  ```

---

## Test Scenario 2: Existing User with Duplicates
**Purpose**: Verify that existing users with duplicates get them automatically cleaned up

### Steps:
1. Log in with an account that already has duplicate "SAT Vocab List 1" decks
2. Wait for the decks to load
3. Check the "My Vocab Sets" screen
4. Open browser console and check logs

### Expected Results:
- Only ONE "SAT Vocab List 1" deck should remain after cleanup
- The oldest deck should be kept (to preserve any user progress)
- Console should show logs:
  ```
  [cleanupDuplicateDecks] Checking for duplicate decks...
  [cleanupDuplicateDecks] Found 2 decks named "SAT Vocab List 1"
  [cleanupDuplicateDecks] Marking duplicate deck for deletion: [deck-id] (SAT Vocab List 1)
  [cleanupDuplicateDecks] Deleting 1 duplicate deck(s)
  [cleanupDuplicateDecks] Duplicate decks removed successfully
  ```

---

## Test Scenario 3: Multiple Page Refreshes
**Purpose**: Verify that the race condition is fixed and no new duplicates are created

### Steps:
1. Log in with a user account
2. Note the number of decks
3. Refresh the page multiple times quickly (5-10 times)
4. Check if any new duplicate decks were created

### Expected Results:
- No new decks should be created
- The deck count should remain the same
- Console should show logs indicating seeding/cleanup was skipped:
  ```
  [ensureCloudDefaultsSeeded] Already seeded, skipping
  [cleanupDuplicateDecks] (should see this only once, then it's marked complete)
  ```

---

## Test Scenario 4: Network Error During Seeding
**Purpose**: Verify that error handling works correctly

### Steps:
1. Open browser DevTools > Network tab
2. Enable "Offline" mode
3. Create a new account (if possible, or simulate this scenario)
4. Check console for error handling

### Expected Results:
- Error should be logged in console
- Seeding flag should be reset to allow retry
- Console should show:
  ```
  [ensureCloudDefaultsSeeded] Error: [error message]
  [ensureCloudDefaultsSeeded] Failed to reset seeding flag (if network is still offline)
  ```

---

## Verification Checklist

- [ ] New users only get ONE default deck
- [ ] Existing users with duplicates have them automatically removed
- [ ] Multiple page refreshes don't create new duplicates
- [ ] Seeding only happens once per user
- [ ] Cleanup only happens once per user
- [ ] Proper logging appears in console
- [ ] No errors in console (except in error test scenarios)
- [ ] User progress is preserved (oldest deck is kept)

---

## Manual Cleanup (If Needed)

If you need to manually test the cleanup or reset the flags for testing:

### Reset Seeding Flag (to test seeding again):
```javascript
// In browser console
const { ref, update, auth } = require('./src/firebase/config');
const prefsRef = ref(db, `users/${auth.currentUser.uid}/preferences`);
await update(prefsRef, { seededDefaultsV1: false });
```

### Reset Cleanup Flag (to test cleanup again):
```javascript
// In browser console
const { ref, update, auth } = require('./src/firebase/config');
const prefsRef = ref(db, `users/${auth.currentUser.uid}/preferences`);
await update(prefsRef, { duplicateDecksCleanedV1: false });
```

### Manually Delete a Deck:
Use the X button on each deck in the UI, or use Firebase Console.

