# 🎤 Voice Feature - Text-to-Speech for Flashcards

## Overview

The Voice Feature adds text-to-speech functionality to your flashcard app, allowing users to hear pronunciations of words, definitions, and sample sentences. Audio is generated using OpenAI's TTS API and stored in Firebase Storage for quick playback.

## 🎯 Features

- **AI-Generated Audio**: Uses OpenAI's high-quality TTS-1 model
- **Multiple Voice Options**: 6 different voices (alloy, echo, fable, onyx, nova, shimmer)
- **Playlist Mode**: Plays all cards sequentially like a playlist
- **Offline Caching**: Audio files are cached locally for offline playback
- **Firebase Storage**: Audio stored in cloud for persistence
- **Batch Generation**: Generate audio for entire decks at once
- **Progress Tracking**: Real-time progress during generation
- **Cost Estimation**: Shows estimated cost before generating

## 📋 Implementation Details

### Files Created

1. **`src/utils/audioGeneration.js`**
   - Core TTS functionality using OpenAI API
   - Firebase Storage upload/download
   - Audio caching for offline use
   - Cost estimation utilities

2. **`src/utils/deckAudioGeneration.js`**
   - Batch audio generation for decks
   - Database integration (local & cloud)
   - Progress tracking
   - Card filtering (only cards without audio)

3. **`src/components/AudioPlayer.jsx`**
   - Playlist-style audio player component
   - Sequential playback (word → definition → sentence)
   - Playback controls (play, pause, skip, stop)
   - Progress indicator
   - Auto-cache audio files

### Files Modified

1. **`src/firebase/config.js`**
   - Added Firebase Storage initialization
   - Exported storage instance

2. **`src/repositories/LocalDeckRepository.js`**
   - Updated card schema to include audio URLs
   - Added `updateCardAudio()` method
   - Added `getCardsWithoutAudio()` method

3. **`app/deck/[id]/study.tsx`**
   - Integrated AudioPlayer component
   - Shows audio player in study screen

4. **`app/deck/[id]/index.tsx`**
   - Added "Generate Audio" button
   - Audio generation progress tracking
   - Cost estimation before generation

5. **`package.json`**
   - Added `expo-av` dependency

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
npm install expo-av
```

Already installed packages:
- `openai` (v6.6.0) - For TTS API
- `firebase` (v11.3.1) - For storage

### 2. Configure OpenAI API Key

Add your OpenAI API key to your environment variables:

```bash
# .env or app.json
EXPO_PUBLIC_OPENAI_API_KEY=your-openai-api-key
```

Get your API key from: https://platform.openai.com/api-keys

### 3. Firebase Storage Rules

Update your Firebase Storage rules to allow authenticated users to upload/read audio:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /audio/{deckId}/{cardId}/{audioType} {
      allow read: if true; // Allow anyone to read audio
      allow write: if request.auth != null; // Only authenticated users can write
    }
  }
}
```

## 💰 Costs

### OpenAI TTS Pricing

- **Model**: TTS-1 (faster, cheaper)
- **Cost**: $15 per 1 million characters
- **Example**: 
  - Average card: ~100 characters (word + definition + sentence)
  - 10 cards = ~1000 characters = $0.015 (less than 2 cents)
  - 100 cards = ~10,000 characters = $0.15 (15 cents)
  - 1000 cards = ~100,000 characters = $1.50

### Firebase Storage Pricing

- **Storage**: $0.026 per GB/month
- **Download**: $0.12 per GB
- **Example**:
  - Average audio file: ~50KB per audio (word/definition/sentence)
  - 100 cards × 3 audio files = 300 files × 50KB = 15MB
  - Storage cost: ~$0.0004/month (negligible)
  - Download cost: 100 plays = 1.5MB = ~$0.0002

**Total estimated cost for 100 cards**: ~$0.15 (audio generation) + negligible storage/bandwidth

## 🎬 Usage

### For Users

#### 1. Generate Audio for a Deck

1. Open a deck
2. Click "Generate Audio" button
3. Review cost estimate
4. Confirm generation
5. Wait for completion (1 second per card for rate limiting)

#### 2. Study with Audio

1. Open a deck
2. Click "Study" or "Study Unknown Cards"
3. See the audio player at the top
4. Click "Play All" to start
5. Audio plays sequentially: Word → Definition → Sentence → Next Card
6. Use controls to pause, skip, or stop

### For Developers

#### Generate Audio Programmatically

```javascript
import { generateCardAudio } from '../utils/audioGeneration';

// Generate audio for a single card
const audioUrls = await generateCardAudio(
  deckId,
  cardId,
  {
    front: "hello",
    back: "a greeting",
    sampleSentence: "Hello, how are you?"
  },
  'alloy' // voice option
);

// Returns: { wordAudioUrl, definitionAudioUrl, sentenceAudioUrl }
```

#### Generate Audio for Multiple Cards

```javascript
import { generateAudioForDeck } from '../utils/deckAudioGeneration';

const results = await generateAudioForDeck(
  deckId,
  cards,
  'alloy',
  (current, total, card) => {
    console.log(`Processing ${current}/${total}: ${card.front}`);
  }
);

console.log(`Success: ${results.successful}, Failed: ${results.failed}`);
```

#### Use Audio Player Component

```jsx
import AudioPlayer from '../components/AudioPlayer';

<AudioPlayer 
  cards={studyCards}
  currentCardIndex={currentIndex}
  onPlaybackComplete={() => console.log('Done!')}
/>
```

## 🎵 Voice Options

Six high-quality voices available:

1. **Alloy** (Default) - Neutral, balanced voice
2. **Echo** - Clear male voice
3. **Fable** - British accent
4. **Onyx** - Deep, authoritative
5. **Nova** - Warm female voice
6. **Shimmer** - Soft and gentle

## 📊 Database Schema

### Card Object (Updated)

```javascript
{
  id: "card_abc123",
  front: "hello",
  back: "a greeting",
  sampleSentence: "Hello, how are you?",
  imageData: "base64...",
  imageGeneratedAt: "2025-01-15T10:30:00.000Z",
  
  // NEW AUDIO FIELDS
  wordAudioUrl: "https://firebasestorage.googleapis.com/.../word.mp3",
  definitionAudioUrl: "https://firebasestorage.googleapis.com/.../definition.mp3",
  sentenceAudioUrl: "https://firebasestorage.googleapis.com/.../sentence.mp3",
  audioGeneratedAt: "2025-01-15T10:31:45.000Z",
  
  isKnown: false,
  lastReviewed: null,
  createdAt: "2025-01-15T10:30:00.000Z"
}
```

## 🔊 Audio Player Flow

```
User clicks "Play All"
    │
    ▼
Build playlist from cards
    │
    ├─→ Card 1: Word audio
    ├─→ Card 1: Definition audio
    ├─→ Card 1: Sentence audio
    ├─→ Card 2: Word audio
    └─→ ...
    │
    ▼
For each audio:
    │
    ├─→ Check cache
    ├─→ Download if needed
    ├─→ Play audio
    └─→ Show progress
    │
    ▼
On completion:
    │
    └─→ Call onPlaybackComplete()
```

## 🚀 Future Enhancements

- [ ] Voice selection in settings
- [ ] Speed control (0.5x, 1x, 1.5x, 2x)
- [ ] Individual card audio preview
- [ ] Auto-generate audio on card creation
- [ ] Download all audio for offline use
- [ ] Multiple language support
- [ ] Custom pronunciation corrections

## 🐛 Troubleshooting

### "API Key Issue" Error

**Problem**: OpenAI API key not configured

**Solution**: 
1. Get API key from https://platform.openai.com/api-keys
2. Add to environment: `EXPO_PUBLIC_OPENAI_API_KEY=your-openai-api-key`
3. Restart development server

### "Rate Limit" Error

**Problem**: Too many API requests

**Solution**: 
- Wait a few minutes
- Upgrade OpenAI account for higher limits
- Free tier: 3 requests/minute
- Paid tier: 3,500 requests/minute

### Audio Not Playing

**Problem**: Audio player shows but nothing plays

**Solution**:
1. Check if audio URLs exist in card data
2. Check Firebase Storage rules allow reading
3. Check network connection
4. Clear cache and retry

### Firebase Storage Permission Denied

**Problem**: Cannot upload audio files

**Solution**:
1. Check Firebase Storage is enabled
2. Update storage rules (see Setup section)
3. Verify user is authenticated

## 📱 Platform Support

- ✅ **iOS**: Full support (expo-av native)
- ✅ **Android**: Full support (expo-av native)
- ✅ **Web**: Full support (HTML5 Audio API)

## 🎨 UI/UX Details

### Audio Player Design

- **Color**: Dark surface (#1E293B) with green accents
- **Progress Bar**: Visual feedback during playback
- **Current Audio Display**: Shows what's playing
- **Controls**: Large, touch-friendly buttons
- **Track Counter**: Shows progress (e.g., "3 / 15")

### Study Screen Integration

- Audio player appears below progress bar
- Only shows if cards have audio
- Persists across card navigation
- Maintains state during study session

## 🔗 API References

- [OpenAI TTS API](https://platform.openai.com/docs/guides/text-to-speech)
- [Expo AV Documentation](https://docs.expo.dev/versions/latest/sdk/av/)
- [Firebase Storage](https://firebase.google.com/docs/storage)

## 📄 License

Same as the main project.

---

**Created**: January 2025  
**OpenAI TTS Model**: tts-1  
**Voice Options**: 6 (alloy, echo, fable, onyx, nova, shimmer)  
**Estimated Cost**: ~$0.15 per 100 cards

