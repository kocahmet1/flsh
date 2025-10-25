# ✅ Pre-Deployment Checklist for Render.com

Use this checklist before deploying to Render to ensure everything is ready.

---

## 🔴 CRITICAL (Must Do Before Deploy)

### 1. Configure Firebase Storage CORS
- [ ] Install Google Cloud SDK
- [ ] Run: `gcloud auth login`
- [ ] Run: `gcloud config set project YOUR_PROJECT_ID`
- [ ] Run: `gsutil cors set cors.json gs://YOUR_BUCKET_NAME.firebasestorage.app`
- [ ] Verify: `gsutil cors get gs://YOUR_BUCKET_NAME.firebasestorage.app`
- [ ] Wait 2-3 minutes for propagation

**Replace:**
- `YOUR_PROJECT_ID` with your Firebase project ID
- `YOUR_BUCKET_NAME` with your storage bucket name (from Firebase Console)

---

## 🟡 IMPORTANT (Set Up in Render)

### 2. Environment Variables in Render
Go to Render Dashboard → Your Service → Environment → Add:

- [ ] `EXPO_PUBLIC_FIREBASE_API_KEY`
- [ ] `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `EXPO_PUBLIC_FIREBASE_DATABASE_URL`
- [ ] `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `EXPO_PUBLIC_FIREBASE_APP_ID`
- [ ] `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID`
- [ ] `EXPO_PUBLIC_OPENAI_API_KEY`
- [ ] `EXPO_PUBLIC_GEMINI_API_KEY`

**⚠️ NEVER commit your .env file with real credentials!**

---

## 🟢 RECOMMENDED (Test Before Deploy)

### 3. Local Testing
- [ ] CORS configured and waited 2-3 minutes
- [ ] Cleared browser cache (Ctrl+Shift+Delete)
- [ ] Ran `npm start` locally
- [ ] Added a test card with audio generation
- [ ] Verified audio uploads to Firebase Storage (check console)
- [ ] Verified audio files appear in Firebase Storage console
- [ ] Tested audio playback in browser
- [ ] No CORS errors in browser console

---

## 📝 Git Commit

### 4. Commit Your Changes
```bash
git add .
git commit -m "Fix audio storage for production deployment"
git push origin main
```

**Files changed:**
- ✅ `cors.json` - Updated with wildcard CORS
- ✅ `src/utils/audioGeneration.js` - Made web-compatible
- ✅ `src/utils/cardProcessingQueue.js` - Uses Firebase Storage
- ✅ `app/deck/[id]/index.tsx` - Unified audio generation
- ✅ `app/deck/[id]/add-card.tsx` - Uses proper audio gen
- ❌ `src/utils/audioGenerationWeb.js` - Deleted (deprecated)

---

## 🚀 Deploy on Render

### 5. Trigger Deployment
- [ ] Push to GitHub (done in step 4)
- [ ] Render auto-deploys from GitHub
- [ ] OR manually trigger from Render dashboard

### 6. Build Settings (if creating new service)
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npx serve dist -s`
- **Node Version:** 20.11.0

---

## ✅ Post-Deployment Verification

### 7. Test on Production
- [ ] Open deployed Render URL
- [ ] Create/open a test deck
- [ ] Add a card with audio generation
- [ ] Check browser console - no CORS errors
- [ ] Verify audio plays
- [ ] Check Firebase Storage console for uploaded files
- [ ] Test bulk add (5-10 cards) with queue system
- [ ] Verify queue processes cards in background

---

## 🐛 Troubleshooting Quick Reference

### If you see CORS errors:
1. Verify CORS is applied: `gsutil cors get gs://your-bucket`
2. Wait 5-10 minutes for propagation
3. Clear browser cache
4. Hard refresh (Ctrl+Shift+R)

### If audio doesn't generate:
1. Check Render logs for errors
2. Verify environment variables are set
3. Check OpenAI API key is valid and has credits
4. Test locally first to isolate the issue

### If Firebase Storage shows no files:
1. Check Firebase Storage Rules (allow reads and authenticated writes)
2. Verify storage bucket name in environment variables
3. Check browser console for upload errors

---

## 📊 Success Criteria

You're ready to go live when:
- ✅ No CORS errors in production browser console
- ✅ Audio files upload to Firebase Storage
- ✅ Audio playback works in browser
- ✅ Background queue processes multiple cards
- ✅ All environment variables are set in Render
- ✅ Firebase Storage Rules allow reads/writes

---

## 📚 Full Documentation

For detailed information, see:
- **[AUDIO_STORAGE_FIX_SUMMARY.md](./AUDIO_STORAGE_FIX_SUMMARY.md)** - What changed and why
- **[RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md)** - Complete deployment guide
- **[FIREBASE_CORS_FIX.md](./FIREBASE_CORS_FIX.md)** - CORS troubleshooting

---

**Last Updated:** October 25, 2025
**Status:** Ready for Deployment ✅

