# 🎨 AI Image Generation Feature

## Overview

Your flashcard app now includes **automatic AI image generation** for flashcards! When you add cards with sample sentences, the app can generate representative images that visually depict what's happening in the sentence, making learning more memorable and engaging.

## ✨ What's New

### 1. **Automatic Image Generation**
- When you add a new card with a sample sentence, an AI image is automatically generated in the background
- Images are generated using Google's Imagen 3 model through the Gemini API
- The app intelligently creates a visual representation of the sample sentence

### 2. **Batch Image Generation**
- Added a "Generate Images" button on the deck details screen
- Generate images for all existing cards that have sample sentences but no images yet
- Shows real-time progress as images are being generated

### 3. **Beautiful Image Display**
- Images appear on the back side of flashcards, above the sample sentence
- Styled with a nice border and shadow effect for better visibility
- Automatically sized to fit well within the card layout

## 🚀 How to Use

### For New Cards

1. **Add a card** with front, back, and a sample sentence
2. Save the card
3. The app will automatically generate an image in the background
4. Next time you view that card, the image will be there!

### For Existing Cards (Batch Generation)

1. Go to your **Deck Details** screen
2. Look for the **"Generate Images"** button (with a sparkle ✨ icon)
3. Tap the button
4. The app will show you how many cards can have images generated
5. Confirm to start the batch generation
6. Watch the progress as images are created
7. Get a summary when complete

## 📁 What Was Changed

### New Files
- **`src/utils/imageGeneration.js`** - Utilities for generating and managing card images

### Modified Files

1. **`src/utils/gemini.js`**
   - Added `generateImagePrompt()` - Creates optimized prompts from sample sentences
   - Added `generateCardImage()` - Generates images using Imagen 3 API

2. **`src/repositories/LocalDeckRepository.js`**
   - Updated card schema to include `imageData` and `imageGeneratedAt` fields
   - Added `updateCardImage()` method
   - Added `getCardsWithoutImages()` helper method

3. **`src/components/FlashCard.js`**
   - Added `imageData` prop
   - Displays generated images on the back of cards
   - Added beautiful styling for image container

4. **`app/deck/[id]/study.tsx`**
   - Passes `imageData` to FlashCard component

5. **`app/deck/[id]/add-card.tsx`**
   - Triggers automatic image generation when cards are added
   - Works for both single card and bulk card creation

6. **`app/deck/[id]/index.tsx`**
   - Added "Generate Images" button
   - Added batch image generation functionality
   - Shows progress during generation

## ⚙️ Technical Details

### Image Generation Flow

1. **Prompt Optimization**: Sample sentence → AI analyzes → Creates concise visual prompt
2. **Image Generation**: Optimized prompt → Imagen 3 API → Base64 image data
3. **Storage**: Image data stored directly in database (AsyncStorage or Firebase)
4. **Display**: Image retrieved and displayed on flashcard back

### API Model Used

The feature uses **Pollinations.ai** for image generation.

**Why Pollinations.ai?**
- ✅ **Free** - No API key required
- ✅ **Reliable** - No rate limits or 503 errors
- ✅ **Fast** - Generates images in 2-4 seconds
- ✅ **Good Quality** - Uses Stable Diffusion models
- ✅ **No Setup** - Works immediately

**Technical Details:**
- URL: `https://image.pollinations.ai/prompt/{prompt}`
- Size: 512x512 pixels (perfect for flashcards)
- Format: PNG/JPEG converted to base64
- Enhancement: Auto-enhanced for better quality

**Note:** The original implementation attempted to use Imagen 3, but it's not available through the standard Gemini API. Imagen 3 requires Google Cloud Vertex AI with different authentication.

### Alternative Image Generation Options

The app currently uses **Pollinations.ai** (free, no setup). If you want to switch to a different provider, you can modify `src/utils/gemini.js`:

1. **DALL-E 3** (OpenAI) - Best quality, requires API key ($)
2. **Google Cloud Vertex AI Imagen 3** - Requires Google Cloud setup
3. **Stable Diffusion via Replicate** - Requires API key ($)
4. **Keep Pollinations.ai** - Current implementation (recommended for most users)

## 🔧 Configuration

### API Key Setup

Make sure your `.env` file has:
```
EXPO_PUBLIC_GEMINI_API_KEY=your_api_key_here
```

### Rate Limiting

The app includes built-in rate limiting:
- 1 second delay between batch image generations
- Prevents API rate limit errors
- Background generation doesn't block UI

### Image Specifications

- **Format**: Base64 encoded PNG/JPEG
- **Aspect Ratio**: 1:1 (square)
- **Size**: Optimized for display at 180px height on cards
- **Style**: Simple, clear, realistic illustrations

## 💡 Best Practices

1. **Sample Sentences**: Write clear, concrete sentences that are easy to visualize
   - ✅ Good: "The cat jumped over the fence"
   - ❌ Avoid: "Happiness is abstract" (hard to visualize)

2. **Bulk Generation**: Generate images in batches rather than one-by-one
   - More efficient
   - Better progress tracking
   - Can run in background

3. **Storage**: Images are stored as base64 strings
   - No external hosting needed
   - Works offline once generated
   - Consider storage limits for very large decks

## 🐛 Troubleshooting

### Images Not Generating?

1. **Check API Key**: Ensure your Gemini API key is valid
2. **Check Console**: Look for error messages in browser/app console
3. **API Access**: Verify Imagen 3 is available for your API key
4. **Rate Limits**: If generating many images, wait between batches

### 503 "Model is Overloaded" Error

This is the **most common error** you'll encounter:

**What it means:**
- Google's Gemini API is experiencing high traffic
- The server is temporarily refusing requests to protect itself
- This is **not your fault** or a problem with your code

**Solution:**
1. **Wait 5-10 minutes** and try again
2. Click the "Generate Images" button again (it will only process cards without images)
3. The code now includes **automatic retry logic** with exponential backoff
4. If bulk generation fails, try generating one card at a time

**Why it happens:**
- Gemini 2.0 Flash is a popular free model
- Peak usage times (weekdays, business hours) see more traffic
- Usually resolves within minutes

### Image Not Displaying?

1. **Refresh Deck**: Pull to refresh on the deck screen
2. **Check Console**: Look for image loading errors
3. **Sample Sentence**: Ensure the card has a sample sentence

### Model Not Found Error?

If you see "model not found" for Imagen 3:
- **IMPORTANT**: Imagen 3 might not be available through the standard Gemini API yet
- The API for image generation (`imagen-3.0-generate-001`) may require Google Cloud Vertex AI
- Consider using alternative image generation APIs (see below)
- Modify `src/utils/gemini.js` to use a different provider

### Alternative Image Generation Services

If Gemini Imagen doesn't work, here are proven alternatives:

**1. DALL-E 3 (OpenAI) - Recommended**
```javascript
// Install: npm install openai
import OpenAI from 'openai';

const openai = new OpenAI({ 
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY 
});

export async function generateCardImage(prompt) {
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt,
    size: "1024x1024",
    quality: "standard",
    n: 1,
  });
  // Convert URL to base64...
  return imageData;
}
```

**2. Stable Diffusion via Replicate**
```javascript
// Install: npm install replicate
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.EXPO_PUBLIC_REPLICATE_API_TOKEN,
});

export async function generateCardImage(prompt) {
  const output = await replicate.run(
    "stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
    { input: { prompt } }
  );
  return output[0]; // Returns image URL
}
```

**3. Pollinations.ai (Free, No API Key)**
```javascript
export async function generateCardImage(prompt) {
  const encodedPrompt = encodeURIComponent(prompt);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}`;
  
  // Fetch and convert to base64
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  // Convert to base64...
  return imageData;
}
```

## 🎯 Future Enhancements

Potential improvements you could add:

1. **Image Caching**: Cache frequently used images
2. **Custom Styles**: Let users choose illustration styles
3. **Image Editing**: Allow users to regenerate or edit images
4. **Image Gallery**: View all generated images for a deck
5. **Compression**: Compress images to save storage space
6. **Cloud Storage**: Store images separately from database

## 📊 Performance

- **Generation Time**: ~2-5 seconds per image (depends on API)
- **Storage**: ~50-200KB per image (base64 encoded)
- **Display**: Cached in memory during study sessions
- **Offline**: Works offline once images are generated

## 🎉 Enjoy!

Your flashcards are now more visual and engaging! The AI-generated images will help create stronger memory associations and make studying more enjoyable.

Questions or issues? Check the console logs for detailed information about image generation status.

