# Duplicate Decks Fix

## Problem
When new users signed up, they were getting duplicate "SAT Vocab List 1" decks instead of just one. The issue was caused by a race condition in the deck seeding process.

## Root Cause
The `ensureCloudDefaultsSeeded` function in `src/hooks/useDecks.js` had a race condition:

1. The function would check if the user had already been seeded by reading a flag from Firebase
2. If not seeded, it would create the default decks
3. **After** creating the decks, it would set the seeding flag

The problem occurred when:
- The `useEffect` that calls this function would run multiple times (due to component re-renders or dependency changes)
- Before the seeding flag was set in Firebase, the function would run again
- This resulted in duplicate decks being created

## Solution

### 1. Added Seeding Guard (`seedingInProgress` state)
Added a local state variable to prevent concurrent seeding operations:
```javascript
const [seedingInProgress, setSeedingInProgress] = useState(false);
```

### 2. Optimistic Flag Setting
Changed the order of operations to set the seeding flag **before** creating the decks:
```javascript
// Set the flag FIRST (optimistically) to prevent race conditions
await update(prefsRef, { seededDefaultsV1: true });

// Then seed the decks
for (const spec of defaultDeckSpecs) {
  // ... create decks
}
```

### 3. Error Handling
Added proper error handling that resets the flag if deck creation fails:
```javascript
catch (e) {
  // If there was an error, reset the flag so seeding can be retried
  await update(prefsRef, { seededDefaultsV1: false });
}
```

### 4. Automatic Cleanup Function
Added a one-time cleanup function `cleanupDuplicateDecks()` that:
- Runs once per user (tracked via `duplicateDecksCleanedV1` preference)
- Detects duplicate decks with the same name
- Keeps the oldest deck (most likely to have user progress)
- Automatically removes the duplicate(s)

## Changes Made

### Files Modified
- `src/hooks/useDecks.js`
  - Added `seedingInProgress` state guard
  - Modified `ensureCloudDefaultsSeeded()` to set flag before creating decks
  - Added `cleanupDuplicateDecks()` function for one-time cleanup
  - Added comprehensive logging for debugging
  - Called cleanup function in main useEffect

## Testing
After deploying this fix:

1. **New Users**: Will only receive one copy of the default deck
2. **Existing Users with Duplicates**: Will have duplicates automatically removed on next login
3. **Logging**: Check browser console for detailed logs prefixed with `[ensureCloudDefaultsSeeded]` and `[cleanupDuplicateDecks]`

## Verification
To verify the fix is working:
1. Create a new user account
2. Check that only ONE "SAT Vocab List 1" deck appears
3. Check browser console for logs showing seeding process
4. For existing users with duplicates, they should see logs showing cleanup happening

## Prevention
This fix prevents future occurrences by:
- Using a seeding-in-progress guard to prevent concurrent operations
- Setting the completion flag optimistically before performing operations
- Adding comprehensive logging to track the seeding process
- Including error recovery to handle edge cases

