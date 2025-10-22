# 🏗️ Image Generation Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER CREATES CARD                             │
│  (with front, back, and sample sentence)                            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Card Saved to Database                            │
│            LocalDeckRepository / Firebase                            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              AUTOMATIC IMAGE GENERATION TRIGGERED                    │
│         (runs in background, doesn't block UI)                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: Generate Optimized Prompt                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ gemini.js: generateImagePrompt()                            │   │
│  │                                                             │   │
│  │ Input:  "She was a reserved woman who kept                │   │
│  │          her thoughts to herself."                         │   │
│  │                                                             │   │
│  │ Gemini 2.0 Flash analyzes and creates prompt:             │   │
│  │                                                             │   │
│  │ Output: "Quiet woman sitting alone, thoughtful            │   │
│  │          expression, realistic illustration"               │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: Generate Image                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ gemini.js: generateCardImage()                             │   │
│  │                                                             │   │
│  │ Pollinations.ai API (Free, No Key Required)               │   │
│  │ - Size: 512x512                                            │   │
│  │ - Enhancement: Auto-enhanced                               │   │
│  │ - Format: PNG/JPEG                                         │   │
│  │ - Output: Base64 encoded image                             │   │
│  │                                                             │   │
│  │ Returns: "iVBORw0KGgoAAAANSUhEUgAA..."                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: Save Image to Database                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ imageGeneration.js: generateImageForCard()                 │   │
│  │                                                             │   │
│  │ Updates card record with:                                  │   │
│  │   - imageData: <base64 string>                             │   │
│  │   - imageGeneratedAt: <timestamp>                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CARD DISPLAY IN STUDY MODE                        │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  FRONT OF CARD                                              │  │
│  │  ┌────────────────────────────────────────────────────┐     │  │
│  │  │                                                     │     │  │
│  │  │                  "reserved"                        │     │  │
│  │  │                                                     │     │  │
│  │  │                (tap to flip)                       │     │  │
│  │  └────────────────────────────────────────────────────┘     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  BACK OF CARD                                               │  │
│  │  ┌────────────────────────────────────────────────────┐     │  │
│  │  │  "Slow to reveal emotion or opinions."            │     │  │
│  │  │                                                     │     │  │
│  │  │  ┌────────────────────────────────────────────┐   │     │  │
│  │  │  │                                            │   │     │  │
│  │  │  │     [🎨 GENERATED IMAGE DISPLAYED HERE]   │   │     │  │
│  │  │  │                                            │   │     │  │
│  │  │  └────────────────────────────────────────────┘   │     │  │
│  │  │                                                     │     │  │
│  │  │  Sample: "She was a reserved woman who kept    │     │  │
│  │  │           her thoughts to herself."             │     │  │
│  │  └────────────────────────────────────────────────────┘     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Interaction Map

```
app/deck/[id]/add-card.tsx
    │
    ├─→ useDeck.addCard() ───→ LocalDeckRepository.addCard()
    │                                      │
    │                                      ▼
    │                          Card saved to AsyncStorage/Firebase
    │
    └─→ generateImageForCard() ───→ gemini.js: generateCardImage()
                                             │
                                             ├─→ generateImagePrompt()
                                             │        │
                                             │        └─→ Gemini 2.0 Flash API
                                             │
                                             └─→ Pollinations.ai API (Free)
                                                      │
                                                      ▼
                                    Returns base64 image string
                                                      │
                                                      ▼
                           LocalDeckRepository.updateCardImage()
                                                      │
                                                      ▼
                                    Image data saved to database
```

## Batch Generation Flow

```
Deck Details Screen (deck/[id]/index.tsx)
    │
    ▼
User clicks "Generate Images" button
    │
    ▼
handleGenerateImages()
    │
    ├─→ Counts cards without images
    │
    ├─→ Shows confirmation dialog
    │
    └─→ generateImagesForDeck()
            │
            ├─→ Fetches all cards from database
            │
            ├─→ Filters cards needing images
            │       (has sampleSentence, no imageData)
            │
            └─→ For each card:
                    │
                    ├─→ generateImageForCard()
                    │       │
                    │       ├─→ Generate prompt
                    │       ├─→ Generate image
                    │       └─→ Save to database
                    │
                    ├─→ Update progress UI
                    │
                    └─→ 1 second delay (rate limiting)
                            │
                            ▼
                    Shows completion summary
                            │
                            ▼
                    Refreshes deck data
```

## Data Structure

### Card Object (Before Enhancement)
```javascript
{
  id: "card_abc123",
  front: "reserved",
  back: "Slow to reveal emotion or opinions.",
  sampleSentence: "She was a reserved woman...",
  isKnown: false,
  lastReviewed: null,
  createdAt: "2025-10-22T10:30:00.000Z"
}
```

### Card Object (After Enhancement)
```javascript
{
  id: "card_abc123",
  front: "reserved",
  back: "Slow to reveal emotion or opinions.",
  sampleSentence: "She was a reserved woman...",
  imageData: "iVBORw0KGgoAAAANSUhEUgAA...",  // ← NEW!
  imageGeneratedAt: "2025-10-22T10:31:45.000Z", // ← NEW!
  isKnown: false,
  lastReviewed: null,
  createdAt: "2025-10-22T10:30:00.000Z"
}
```

## API Endpoints Used

### 1. Gemini 2.0 Flash (Prompt Generation)
```
Model: gemini-2.0-flash
Purpose: Analyze sample sentence and create optimized image prompt
Input: Sample sentence (text)
Output: Optimized image generation prompt (text)
```

### 2. Pollinations.ai (Image Generation)
```
Service: Pollinations.ai (Free, no API key)
Purpose: Generate image from prompt
Input: Image prompt (text)
Output: Base64 encoded image (string)
URL: https://image.pollinations.ai/prompt/{encodedPrompt}
Parameters:
  - width: 512
  - height: 512
  - nologo: true
  - enhance: true
```

## File Dependencies

```
src/utils/gemini.js
  └─→ Uses: @google/generative-ai package
      └─→ API Key: process.env.EXPO_PUBLIC_GEMINI_API_KEY

src/utils/imageGeneration.js
  ├─→ Imports: gemini.js
  ├─→ Imports: LocalDeckRepository
  └─→ Imports: Firebase (for cloud mode)

src/repositories/LocalDeckRepository.js
  └─→ Uses: @react-native-async-storage/async-storage

src/components/FlashCard.js
  └─→ Displays imageData as base64 image

app/deck/[id]/add-card.tsx
  ├─→ Uses: imageGeneration.js
  └─→ Uses: useDeck hook

app/deck/[id]/index.tsx
  ├─→ Uses: imageGeneration.js
  └─→ Uses: useDeck hook

app/deck/[id]/study.tsx
  └─→ Passes imageData to FlashCard component
```

## Performance Considerations

- **Async Generation**: Images generate in background, don't block UI
- **Rate Limiting**: 1 second delay between batch generations
- **Storage**: Base64 encoding increases size ~33% vs binary
- **Caching**: Images stored in database, no re-generation needed
- **Offline**: Once generated, images work offline

## Error Handling

```
Try to generate image
    │
    ├─→ Success ──→ Save to database ──→ Display on card
    │
    └─→ Failure
          │
          ├─→ Log error to console
          ├─→ Card still works without image
          └─→ User can retry later with "Generate Images" button
```

All failures are graceful - cards always work, even without images!

