# Automatic Media Generation for Default Decks

## Overview

When a new user signs up for the first time, they receive a default deck called "Essential Vocabulary" with 75 vocabulary cards. Previously, these cards only contained text content (word, definition, and sample sentence). 

As of this update, **images and audio are now automatically generated in the background** for all cards in the default deck immediately after account creation.

## How It Works

### 1. User Signup Flow

```
User Signs Up → Default Deck Created → Background Media Generation Starts
```

### 2. Automatic Media Generation Process

When a new user creates an account:

1. **Deck Creation**: The default "Essential Vocabulary" deck is created with 75 cards containing:
   - Front (word) - English vocabulary words
   - Back (definition) - **Turkish definitions**
   - Sample sentence - **English example sentences**

2. **Background Process Initiated** (3 seconds after deck creation):
   - **Image Generation**: For each card with a sample sentence, an AI-generated image is created using Pollinations.ai
   - **Audio Generation**: For each card, three audio files are generated using OpenAI's TTS:
     - Word pronunciation
     - Definition audio
     - Sample sentence audio

3. **Non-Blocking Execution**: 
   - The user can immediately start using the app
   - Media generation happens in the background
   - Cards update automatically as media becomes available

### 3. Technical Implementation

**Location**: `src/hooks/useDecks.js`

**Key Functions**:

1. `ensureCloudDefaultsSeeded()`: Creates the default deck for new users
2. `startDefaultDeckMediaGeneration()`: Initiates background media generation

**Process Flow**:

```javascript
// After creating default deck
startDefaultDeckMediaGeneration(createdDeckIds)
  ↓
setTimeout(3000) // Wait 3 seconds
  ↓
For each deck:
  → Get all cards
  → Start image generation (parallel)
  → Wait 2 seconds
  → Start audio generation (parallel)
```

### 4. Rate Limiting & Performance

- **Image Generation**: ~1 second delay between cards
- **Audio Generation**: ~1 second delay between cards
- **Staggered Start**: Audio generation starts 2 seconds after image generation
- **Background Execution**: All processes run asynchronously without blocking the UI

### 5. API Services Used

1. **Gemini API** (Google):
   - Generates image prompts from sample sentences
   - Used before calling Pollinations.ai

2. **Pollinations.ai**:
   - Generates images from prompts
   - Free, no API key required

3. **OpenAI TTS API**:
   - Generates audio for words, definitions, and sample sentences
   - Uses "alloy" voice by default
   - **Cost**: ~$0.015 per 1,000 characters (for 75 cards ≈ $0.50-$1.00)

## Progress Tracking

Users can see the progress of media generation through:

1. **Real-Time Info Box** (UI component):
   - A beautiful animated status indicator appears at the top of the screen
   - Shows current word being processed
   - Displays image generation progress with progress bars
   - Displays audio generation progress with progress bars  
   - Includes a spinning sync icon while generating
   - Can be collapsed/expanded by clicking
   - Auto-dismisses 3 seconds after completion
   - Shows a success checkmark when done

2. **Console Logs** (for developers):
   ```
   [Image Progress] 1/75 - colleague
   [Audio Progress] 1/75 - colleague
   [startDefaultDeckMediaGeneration] Image generation complete for deck xxx: {success: 75, failed: 0, skipped: 0}
   [startDefaultDeckMediaGeneration] Audio generation complete for deck xxx: {successful: 75, failed: 0, total: 75}
   ```

3. **UI Updates**: Cards automatically refresh as media becomes available

## Estimated Time

For a 75-card default deck:

- **Image Generation**: ~75-90 seconds (1 second delay per card)
- **Audio Generation**: ~75-90 seconds (1 second delay per card)
- **Total Time**: ~2.5-3 minutes for complete media generation

## Error Handling

- If image generation fails for a card, it continues with the next card
- If audio generation fails for a card, it continues with the next card
- Errors are logged but don't stop the overall process
- The user experience is not affected by failures

## Testing New User Signup

To test this feature:

1. Create a new Firebase user account
2. Sign in with the new account
3. The default deck should appear immediately
4. Check browser console for media generation progress
5. Wait 2-3 minutes and verify that cards have images and audio

## Future Enhancements

Possible improvements:

1. **Progress UI**: Show a notification or progress bar for media generation
2. **Priority Queue**: Generate media for recently viewed cards first
3. **Retry Logic**: Automatically retry failed generations
4. **Batch Optimization**: Generate multiple images/audio files in parallel
5. **User Preferences**: Allow users to disable auto-generation to save API costs

## Cost Considerations

For each new user:

- **Images**: Free (Pollinations.ai)
- **Audio**: ~$0.50-$1.00 per user (75 cards × 3 audio files × average 50 characters)

For 100 new users per month: ~$50-$100/month in OpenAI TTS costs

## Configuration

To disable automatic media generation, comment out this line in `src/hooks/useDecks.js`:

```javascript
// startDefaultDeckMediaGeneration(createdDeckIds);
```

## Related Files

- `src/hooks/useDecks.js` - Main implementation
- `src/components/MediaGenerationStatus.jsx` - Real-time status UI component
- `app/(tabs)/index.tsx` - Main screen where status component is displayed
- `src/utils/imageGeneration.js` - Image generation utilities
- `src/utils/deckAudioGeneration.js` - Audio generation utilities
- `src/utils/audioGeneration.js` - Low-level audio generation
- `src/utils/gemini.js` - AI image prompt generation

## Notes

- This feature only runs for **new users** who don't have any existing decks
- Existing users are not affected
- The process is designed to be resilient and non-intrusive
- All generation happens client-side (browser), reducing server load

