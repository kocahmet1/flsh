# 🚀 Render.com Deployment Guide - Audio & Storage Setup

## Overview

This guide explains how to deploy your flashcard app to Render.com with proper audio generation and Firebase Storage configuration.

## ✅ What's Been Fixed

Your app now uses **Firebase Storage** for all audio files (both web and mobile), which is the correct production-ready approach. The previous workaround that stored base64 audio in the Realtime Database has been removed.

### Changes Made:

1. ✅ **Unified Audio Generation** - `audioGeneration.js` now works on all platforms
2. ✅ **Firebase Storage for Audio** - All audio files are uploaded to Firebase Storage
3. ✅ **Updated CORS Configuration** - Wildcard origins allow any domain
4. ✅ **Queue System Updated** - Background processing uses proper storage
5. ✅ **Deprecated Old Workaround** - `audioGenerationWeb.js` has been removed

---

## 🔧 Required Setup Steps

### Step 1: Configure Firebase Storage CORS

Your Firebase Storage needs to allow requests from your Render.com domain.

#### Option A: Using Google Cloud Console (Recommended)

1. **Install Google Cloud SDK** (if not already installed)
   
   **Windows (PowerShell as Admin):**
   ```powershell
   (New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
   & $env:Temp\GoogleCloudSDKInstaller.exe
   ```

2. **Authenticate with Google Cloud:**
   ```bash
   gcloud auth login
   ```

3. **Set your Firebase project:**
   ```bash
   gcloud config set project flashcard3-e9cf1
   ```
   
   Replace `flashcard3-e9cf1` with your actual Firebase project ID.

4. **Apply CORS configuration:**
   ```bash
   gsutil cors set cors.json gs://flashcard3-e9cf1.firebasestorage.app
   ```
   
   Replace the storage bucket name with your actual bucket name (find it in Firebase Console > Storage).

5. **Verify CORS was applied:**
   ```bash
   gsutil cors get gs://flashcard3-e9cf1.firebasestorage.app
   ```

#### Option B: Using Firebase Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/storage/browser)
2. Select your Firebase project
3. Find your storage bucket (e.g., `flashcard3-e9cf1.firebasestorage.app`)
4. Click the three dots menu (⋮) at the top
5. Select "Edit CORS configuration"
6. Paste the contents of your `cors.json` file:
   ```json
   [
     {
       "origin": ["*"],
       "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
       "maxAgeSeconds": 3600,
       "responseHeader": ["Content-Type", "Content-Length", "Accept-Ranges", "Content-Range"]
     }
   ]
   ```
7. Save and wait 2-3 minutes for propagation

---

### Step 2: Update Firebase Storage Rules

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Storage** → **Rules**
4. Update your rules to:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow all reads for public access to audio files
    match /{allPaths=**} {
      allow read: if true;
    }
    
    // Allow authenticated writes to audio folder
    match /audio/{deckId}/{cardId}/{audioFile} {
      allow write: if request.auth != null;
    }
    
    // Allow authenticated writes to other folders
    match /{allPaths=**} {
      allow write: if request.auth != null;
    }
  }
}
```

5. **Publish** the rules

---

### Step 3: Set Environment Variables on Render

When you deploy to Render.com, make sure to set these environment variables:

1. Go to your Render dashboard
2. Select your web service
3. Go to **Environment** tab
4. Add these variables:

```
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

⚠️ **Important:** Never commit `.env` files with actual credentials to GitHub!

---

### Step 4: Deploy to Render

#### Create a `render.yaml` file (if you don't have one):

```yaml
services:
  - type: web
    name: flashcard-app
    env: node
    buildCommand: npm install && npm run build
    startCommand: npx serve dist -s
    envVars:
      - key: NODE_VERSION
        value: 20.11.0
```

#### Deploy Process:

1. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Fix audio storage for production deployment"
   git push origin main
   ```

2. **Connect to Render:**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click **New +** → **Web Service**
   - Connect your GitHub repository
   - Render will auto-detect the `render.yaml` configuration

3. **Configure Build Settings:**
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npx serve dist -s`
   - **Node Version:** 20.11.0

4. **Deploy:**
   - Click **Create Web Service**
   - Render will build and deploy your app
   - Wait for the deployment to complete (~5-10 minutes)

---

## 🧪 Testing After Deployment

### 1. Test Audio Generation

1. Open your deployed app on Render
2. Create a new deck or open an existing one
3. Add a new card
4. Check browser console - you should see:
   ```
   🎤 Generating audio for: "your_word"...
   ✅ Audio generated successfully
   📤 Uploading word audio to Firebase Storage...
   ✅ word audio uploaded successfully
   ```

5. Play the audio to verify it works

### 2. Test Background Queue

1. Add multiple words (50+) using "Bulk Add with AI"
2. The queue indicator should appear at the bottom
3. Cards should be processed in the background
4. Audio should be generated for each card automatically

### 3. Check Firebase Storage

1. Go to Firebase Console → Storage
2. Navigate to `audio/` folder
3. You should see folders for each deck
4. Inside each deck folder, you'll see card folders with:
   - `word.mp3`
   - `definition.mp3`
   - `sentence.mp3`

---

## 🐛 Troubleshooting

### Issue: "CORS policy" errors in browser console

**Solution:**
1. Verify CORS is applied to Firebase Storage:
   ```bash
   gsutil cors get gs://your-bucket-name.firebasestorage.app
   ```
2. Wait 5-10 minutes for CORS changes to propagate
3. Clear browser cache (Ctrl+Shift+Delete)
4. Hard refresh the page (Ctrl+Shift+R)

### Issue: "Firebase Storage is not initialized"

**Solution:**
1. Check that all Firebase environment variables are set in Render
2. Verify `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` is correct
3. Redeploy after adding/updating environment variables

### Issue: "OpenAI API key not configured"

**Solution:**
1. Make sure `EXPO_PUBLIC_OPENAI_API_KEY` is set in Render environment variables
2. Verify the API key is valid and has credits
3. Check [OpenAI Usage](https://platform.openai.com/usage) to ensure you're not rate-limited

### Issue: Audio not playing in browser

**Solution:**
1. Check browser console for errors
2. Verify Firebase Storage Rules allow public reads
3. Test the audio URL directly in browser
4. Check that audio files are actually uploaded to Firebase Storage

### Issue: "Rate limit exceeded" errors

**Solution:**
The queue system handles rate limiting automatically:
- 6 seconds delay between each card
- For 50 cards: ~12-17 minutes total processing time
- If you still hit rate limits, increase the delay in `cardProcessingQueue.js`:
  ```javascript
  // Line 153
  await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
  ```

---

## 💰 Cost Considerations

### OpenAI TTS Pricing:
- **Model:** tts-1
- **Cost:** $15 per 1 million characters
- **Example:** 50 cards with 100 characters each = 5,000 characters = $0.08

### Firebase Storage Pricing:
- **Storage:** $0.026 per GB/month
- **Downloads:** $0.12 per GB
- **Example:** 1,000 audio files (3MB each) = 3GB storage = $0.08/month

### Gemini API (for definitions/images):
- **Free tier:** 15 requests per minute
- **Paid tier:** 1,000 requests per minute
- You're likely fine on the free tier for moderate usage

---

## 🔒 Security Best Practices

### 1. Environment Variables
- ✅ **DO:** Store API keys in Render environment variables
- ❌ **DON'T:** Commit `.env` files with real credentials

### 2. Firebase Storage Rules
- ✅ **DO:** Allow public reads for audio files (they're not sensitive)
- ✅ **DO:** Require authentication for writes
- ❌ **DON'T:** Allow anonymous writes

### 3. API Keys
- ✅ **DO:** Rotate API keys periodically
- ✅ **DO:** Monitor usage on OpenAI/Gemini dashboards
- ❌ **DON'T:** Share API keys in public repos

---

## 📊 Monitoring

### Check Application Health:

1. **Render Logs:**
   - Go to Render Dashboard → Your Service → Logs
   - Look for errors or warnings

2. **Firebase Console:**
   - Monitor Storage usage
   - Check Realtime Database reads/writes
   - Review Authentication activity

3. **OpenAI Dashboard:**
   - Monitor API usage: https://platform.openai.com/usage
   - Check for rate limit errors
   - Track costs

---

## 🎉 Success Checklist

Before going live, verify:

- ✅ CORS is configured on Firebase Storage
- ✅ Firebase Storage Rules allow public reads, authenticated writes
- ✅ All environment variables are set in Render
- ✅ App builds and deploys successfully
- ✅ Audio generation works (test with 1-2 cards)
- ✅ Background queue processes cards correctly (test with 5-10 cards)
- ✅ Audio files appear in Firebase Storage console
- ✅ Audio playback works in browser
- ✅ No CORS errors in browser console

---

## 📚 Additional Resources

- [Firebase Storage Documentation](https://firebase.google.com/docs/storage)
- [OpenAI TTS API Documentation](https://platform.openai.com/docs/guides/text-to-speech)
- [Render.com Documentation](https://render.com/docs)
- [CORS Troubleshooting Guide](https://firebase.google.com/docs/storage/web/download-files#cors_configuration)

---

## 🆘 Need Help?

If you encounter issues:

1. Check browser console for errors
2. Review Render deployment logs
3. Verify Firebase console shows storage uploads
4. Test with a single card first before bulk operations
5. Ensure all environment variables are set correctly

---

**Last Updated:** October 25, 2025
**Status:** Production Ready ✅

