# 🎤 Voice Feature - Quick Setup Guide

## ✅ What's Been Implemented

The voice feature is now fully integrated into your flashcard app! Here's what's ready:

### 1. ✅ Core Functionality
- OpenAI TTS service for generating audio
- Firebase Storage integration for storing audio files
- Audio player component with playlist functionality
- Batch audio generation for entire decks
- Progress tracking and cost estimation

### 2. ✅ User Interface
- **Study Screen**: Audio player appears at the top
  - "Play All" button to start playlist
  - Pause, skip, and stop controls
  - Progress bar and track counter
  
- **Deck Screen**: "Generate Audio" button (green)
  - Shows cost estimate before generation
  - Real-time progress tracking
  - Error handling and user feedback

### 3. ✅ Database Integration
- Updated card schema with audio URL fields
- Local storage support (AsyncStorage)
- Cloud storage support (Firebase)
- Audio caching for offline playback

## 🚀 How to Start Using It

### Step 1: Set Up OpenAI API Key

You need an OpenAI API key to generate audio. Here's how:

1. **Get an API Key**
   - Go to https://platform.openai.com/api-keys
   - Sign in or create an account
   - Click "Create new secret key"
   - Copy the key (starts with `sk-...`)

2. **Add to Your Project**
   
   Create or update your `.env` file in the project root:
   ```bash
   EXPO_PUBLIC_OPENAI_API_KEY=sk-your-actual-key-here
   ```
   
   Or add to `app.json`:
   ```json
   {
     "expo": {
       "extra": {
         "EXPO_PUBLIC_OPENAI_API_KEY": "sk-your-actual-key-here"
       }
     }
   }
   ```

3. **Restart Development Server**
   ```bash
   npm start
   ```

### Step 2: Test the Feature

#### Test 1: Generate Audio for a Deck

1. Open the app
2. Navigate to any deck with cards
3. Scroll down and click the green "Generate Audio" button
4. Review the cost estimate (should be very small, like $0.01 for 10 cards)
5. Click "Generate"
6. Watch the progress: "1/5", "2/5", etc.
7. Wait for completion (about 1 second per card)
8. See success message!

#### Test 2: Play Audio in Study Mode

1. Open the same deck
2. Click "Study" or "Study Unknown Cards"
3. Look for the audio player (dark box with play button)
4. Click "Play All" (green play button)
5. Listen as it plays:
   - Word pronunciation
   - Definition reading
   - Sample sentence
   - Then moves to next card
6. Use controls:
   - Pause/Resume button
   - Skip next button
   - Stop button

#### Test 3: Verify Audio Persistence

1. Close the app
2. Reopen it
3. Go back to study mode
4. Audio player should still be there
5. Click play - audio should play without re-generating

## 💡 Usage Tips

### For Best Results

1. **Start Small**: Test with 2-3 cards first
2. **Check Costs**: Always review the cost estimate
3. **Be Patient**: Generation takes ~1 second per card (rate limiting)
4. **Internet Required**: For first-time generation only
5. **Offline Support**: Audio is cached for offline playback

### Voice Options

Currently using **"alloy"** voice (neutral, balanced). To change:

Edit `app/deck/[id]/index.tsx`, line ~223:
```javascript
'alloy', // Change to: echo, fable, onyx, nova, or shimmer
```

## 🧪 Testing Checklist

- [ ] API key is set in environment
- [ ] Development server is restarted
- [ ] Can see "Generate Audio" button in deck view
- [ ] Cost estimate shows when clicked
- [ ] Audio generation completes successfully
- [ ] Audio player appears in study screen
- [ ] Can click "Play All" and hear audio
- [ ] Pause/resume works
- [ ] Skip to next audio works
- [ ] Stop playback works
- [ ] Progress bar updates during playback
- [ ] Track counter shows (e.g., "3 / 9")

## 🎯 Expected Behavior

### When Generating Audio

```
Click "Generate Audio"
    ↓
Shows alert: "Generate audio for X card(s)?"
    ↓
Shows: "Total audio files: Y"
    ↓
Shows: "Estimated cost: ~$0.XX"
    ↓
User clicks "Generate"
    ↓
Button shows: "1/X" → "2/X" → ... → "X/X"
    ↓
Alert: "✅ Success! Generated X audio files!"
```

### When Playing Audio

```
Click "Play All"
    ↓
Shows progress bar (green)
    ↓
Shows: "📝 Word: hello"
    ↓
Plays word audio
    ↓
Shows: "📖 Definition: a greeting"
    ↓
Plays definition audio
    ↓
Shows: "💬 Sentence: Hello, how are you?"
    ↓
Plays sentence audio
    ↓
Moves to next card (repeats)
    ↓
Finishes entire playlist
    ↓
Shows: "Play All" button again
```

## ⚠️ Common Issues & Solutions

### Issue: "API Key not configured"

**Cause**: OpenAI API key is missing or incorrect

**Solution**:
1. Double-check the API key in `.env` or `app.json`
2. Make sure it starts with `sk-`
3. Restart the development server: `npm start`
4. Clear cache: `npm start --clear`

### Issue: "Rate Limit Reached"

**Cause**: Too many requests to OpenAI API

**Solution**:
- Wait 1-2 minutes
- Free tier: 3 requests/minute
- Upgrade to paid tier for 3,500 requests/minute

### Issue: Audio Player Not Showing

**Cause**: Cards don't have audio generated yet

**Solution**:
1. Generate audio first using "Generate Audio" button
2. Refresh the deck data
3. Go back to study screen

### Issue: Firebase Permission Denied

**Cause**: Firebase Storage rules not configured

**Solution**:
1. Go to Firebase Console → Storage → Rules
2. Add the rules from `VOICE_FEATURE_GUIDE.md`
3. Publish the rules

## 📊 Monitoring Costs

### View OpenAI Usage

1. Go to https://platform.openai.com/usage
2. See your API usage and costs
3. Set up usage limits if needed

### Estimate Before Generating

The app shows estimated cost before generation:
- **10 cards** ≈ $0.01 (1 cent)
- **100 cards** ≈ $0.15 (15 cents)
- **1000 cards** ≈ $1.50 (1 dollar 50 cents)

## 🎉 Success Indicators

You'll know it's working when:

1. ✅ Green "Generate Audio" button appears in deck view
2. ✅ Cost estimate shows in confirmation dialog
3. ✅ Progress updates during generation (1/5, 2/5, etc.)
4. ✅ Success alert appears after generation
5. ✅ Audio player shows in study screen (dark box)
6. ✅ Clicking "Play All" plays audio sequentially
7. ✅ Can hear word, definition, and sentence pronunciations
8. ✅ Controls work (pause, skip, stop)

## 🔧 Development Notes

### File Locations

- **Audio Generation**: `src/utils/audioGeneration.js`
- **Deck Audio**: `src/utils/deckAudioGeneration.js`
- **Audio Player**: `src/components/AudioPlayer.jsx`
- **Study Screen**: `app/deck/[id]/study.tsx`
- **Deck Screen**: `app/deck/[id]/index.tsx`

### Key Functions

- `generateCardAudio()` - Generate audio for one card
- `generateAudioForDeck()` - Batch generate for multiple cards
- `AudioPlayer` component - Playlist player UI

### Database Fields

New card fields:
- `wordAudioUrl` - URL to word audio (Firebase Storage)
- `definitionAudioUrl` - URL to definition audio
- `sentenceAudioUrl` - URL to sentence audio
- `audioGeneratedAt` - Timestamp of generation

## 📞 Need Help?

1. Check console logs for detailed error messages
2. Review `VOICE_FEATURE_GUIDE.md` for full documentation
3. Verify API key is correct and active
4. Check Firebase Storage permissions
5. Ensure network connection is stable

---

**Quick Start**: Set API key → Restart server → Click "Generate Audio" → Click "Play All" → Enjoy! 🎵

