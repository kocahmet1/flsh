# 🔧 Fix Firebase Storage CORS Issue

⚠️ **For production deployment on Render.com, see [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md)**

## The Problem

Firebase Storage is blocking audio uploads from localhost due to CORS (Cross-Origin Resource Sharing) restrictions.

Error:
```
Access to XMLHttpRequest has been blocked by CORS policy
```

## Solution: Configure CORS for Firebase Storage

### Method 1: Using Google Cloud Console (Easiest)

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/storage/browser
   - Select your Firebase project

2. **Find your Storage Bucket**
   - Look for: `flashcard3-e9cf1.firebasestorage.app` (or similar)
   - Click on the bucket name

3. **Configure CORS**
   - Click "Permissions" tab
   - Click "Add Principal"
   - In "New principals" field, add: `allUsers`
   - Select role: "Storage Object Viewer"
   - Click "Save"

4. **Set CORS Policy**
   - Go back to bucket
   - Click the three dots menu (⋮) at the top
   - Select "Edit CORS configuration"
   - Paste this:

```json
[
  {
    "origin": ["http://localhost:8081", "http://localhost:19006", "http://localhost:3000", "*"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "maxAgeSeconds": 3600
  }
]
```

5. **Save and wait** (may take a few minutes to propagate)

### Method 2: Using Firebase CLI (Alternative)

1. **Install Google Cloud SDK** (if not installed)
   ```bash
   # Windows (PowerShell as Admin)
   (New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
   & $env:Temp\GoogleCloudSDKInstaller.exe
   ```

2. **Authenticate**
   ```bash
   gcloud auth login
   ```

3. **Set Project**
   ```bash
   gcloud config set project flashcard3-e9cf1
   ```

4. **Apply CORS Configuration**
   ```bash
   gsutil cors set cors.json gs://flashcard3-e9cf1.firebasestorage.app
   ```

### Method 3: Update Firebase Storage Rules

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com
   - Select your project

2. **Navigate to Storage**
   - Click "Storage" in left menu
   - Click "Rules" tab

3. **Update Rules**
   
   Replace with:
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       // Allow all reads
       match /{allPaths=**} {
         allow read: if true;
       }
       
       // Allow authenticated writes to audio folder
       match /audio/{deckId}/{cardId}/{audioFile} {
         allow write: if request.auth != null;
       }
       
       // Allow all other authenticated writes
       match /{allPaths=**} {
         allow write: if request.auth != null;
       }
     }
   }
   ```

4. **Publish the rules**

## Temporary Workaround: Use Realtime Database

If you need to test immediately without fixing CORS, we can store audio URLs in Realtime Database instead of Storage.

This will be slower but works without CORS configuration.

## Verify Fix

After applying CORS configuration:

1. Wait 2-3 minutes
2. Clear browser cache (Ctrl+Shift+Delete)
3. Refresh the app
4. Try "Generate Audio" again

You should see:
```
✅ word audio uploaded successfully
✅ definition audio uploaded successfully
✅ sentence audio uploaded successfully
```

## Production Deployment

For production, update CORS to include your actual domain:

```json
[
  {
    "origin": ["https://yourdomain.com", "https://www.yourdomain.com"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
```

## Still Not Working?

If CORS errors persist:

1. Check browser console for exact error
2. Verify you're logged in (check `auth.currentUser`)
3. Check Firebase Storage is enabled in console
4. Try different browser (some block third-party requests)
5. Disable browser extensions (they may interfere)

---

**Quick Test**: After fixing CORS, you should be able to upload and download files from Firebase Storage without errors.

