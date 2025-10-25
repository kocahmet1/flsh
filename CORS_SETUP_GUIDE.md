# 🚀 Step-by-Step Guide: Firebase Storage CORS Configuration

## Overview
This guide will help you configure CORS for your Firebase Storage bucket to allow audio file uploads/downloads from your app.

**Your Project**: `flashcard3-e9cf1`  
**Storage Bucket**: `flashcard3-e9cf1.firebasestorage.app`

---

## Prerequisites
- Google Cloud SDK (we'll install this)
- Access to your Firebase project
- Administrator access to your computer (for Windows installation)

---

## Step 1: Install Google Cloud SDK

### For Windows (PowerShell):

1. **Open PowerShell as Administrator**
   - Press `Win + X`
   - Select "Windows PowerShell (Admin)"

2. **Download and Run the Installer**
   ```powershell
   (New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
   & $env:Temp\GoogleCloudSDKInstaller.exe
   ```

3. **Follow the Installation Wizard**
   - Accept the default installation location
   - Check "Run gcloud init after installation"
   - Click "Install"

4. **Restart PowerShell/Terminal**
   - Close and reopen your terminal to refresh PATH

**Alternative**: Download manually from https://cloud.google.com/sdk/docs/install

---

## Step 2: Authenticate with Google Cloud

1. **Open a new PowerShell/Terminal window**

2. **Run the authentication command**:
   ```bash
   gcloud auth login
   ```

3. **This will**:
   - Open your default web browser
   - Ask you to sign in with your Google account
   - Request permission to access Google Cloud
   - Click "Allow" to grant access

4. **Verify authentication**:
   ```bash
   gcloud auth list
   ```
   You should see your email address with an asterisk (*) indicating it's active.

---

## Step 3: Set Your Firebase Project

1. **Configure the project**:
   ```bash
   gcloud config set project flashcard3-e9cf1
   ```

2. **Verify the project is set**:
   ```bash
   gcloud config get-value project
   ```
   Should output: `flashcard3-e9cf1`

3. **List available projects** (optional - to verify you have access):
   ```bash
   gcloud projects list
   ```

---

## Step 4: Apply CORS Configuration

1. **Navigate to your project directory**:
   ```bash
   cd C:\Users\Test1\Desktop\flsh
   ```

2. **Verify cors.json exists**:
   ```bash
   cat cors.json
   ```
   You should see:
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

3. **Apply the CORS configuration**:
   ```bash
   gsutil cors set cors.json gs://flashcard3-e9cf1.firebasestorage.app
   ```

4. **Expected output**:
   ```
   Setting CORS on gs://flashcard3-e9cf1.firebasestorage.app/...
   ```

---

## Step 5: Verify CORS Configuration

1. **Check the current CORS settings**:
   ```bash
   gsutil cors get gs://flashcard3-e9cf1.firebasestorage.app
   ```

2. **Expected output**:
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

---

## Step 6: Test the Configuration

1. **Wait 2-3 minutes** for changes to propagate

2. **Clear your browser cache**:
   - Chrome/Edge: `Ctrl + Shift + Delete`
   - Select "Cached images and files"
   - Click "Clear data"

3. **Restart your Expo dev server**:
   ```bash
   # Stop the current server (Ctrl+C)
   # Start it again
   npm start
   ```

4. **Test audio generation** in your app:
   - Go to a flashcard deck
   - Try generating audio
   - Check browser console for errors

---

## Troubleshooting

### Error: "gsutil: command not found"

**Solution**: The Google Cloud SDK didn't install correctly or isn't in your PATH.

1. Close all terminal windows
2. Reopen PowerShell
3. Try again. If still not working, manually add to PATH:
   ```powershell
   $env:PATH += ";C:\Users\Test1\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin"
   ```

### Error: "AccessDeniedException: 403"

**Solution**: You don't have permission to modify the bucket.

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to "Project settings" → "Users and permissions"
4. Make sure you're listed as an Owner or Editor

### Error: "BucketNotFoundException"

**Solution**: Check your bucket name is correct:
```bash
gsutil ls
```
This will list all your buckets.

### CORS Still Not Working After Setup

1. **Verify CORS is actually set**:
   ```bash
   gsutil cors get gs://flashcard3-e9cf1.firebasestorage.app
   ```

2. **Check Storage Rules** in [Firebase Console](https://console.firebase.google.com):
   - Go to Storage → Rules
   - Ensure reads are allowed:
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

3. **Try browser without extensions**:
   - Open an incognito/private window
   - Test your app there

---

## Production Considerations

For production deployment, update `cors.json` to only allow your specific domains:

```json
[
  {
    "origin": ["https://yourdomain.com", "https://www.yourdomain.com"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Content-Length", "Accept-Ranges", "Content-Range"]
  }
]
```

Then reapply:
```bash
gsutil cors set cors.json gs://flashcard3-e9cf1.firebasestorage.app
```

---

## Quick Command Reference

```bash
# Authenticate
gcloud auth login

# Set project
gcloud config set project flashcard3-e9cf1

# Apply CORS
gsutil cors set cors.json gs://flashcard3-e9cf1.firebasestorage.app

# Verify CORS
gsutil cors get gs://flashcard3-e9cf1.firebasestorage.app

# List buckets
gsutil ls

# Check current project
gcloud config get-value project
```

---

## Success Checklist

- [ ] Google Cloud SDK installed
- [ ] Authenticated with `gcloud auth login`
- [ ] Project set to `flashcard3-e9cf1`
- [ ] CORS configuration applied
- [ ] CORS configuration verified
- [ ] Browser cache cleared
- [ ] Dev server restarted
- [ ] Audio generation tested successfully

---

## Next Steps

After completing this setup:

1. Your app should be able to upload/download audio files from Firebase Storage
2. No more CORS errors in the browser console
3. Audio generation feature should work seamlessly

If you still encounter issues, check the [FIREBASE_CORS_FIX.md](./FIREBASE_CORS_FIX.md) for alternative methods.

---

**Need Help?** Check the browser console for specific error messages and refer to the Troubleshooting section above.

