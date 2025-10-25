# 🚀 Quick Start: CORS Setup

## Option 1: Automated Script (Easiest) ✨

### For Windows:
```powershell
# Open PowerShell in project directory
cd C:\Users\Test1\Desktop\flsh

# Run the setup script
.\setup-cors.ps1
```

### For Mac/Linux:
```bash
# Open Terminal in project directory
cd ~/path/to/flsh

# Make script executable
chmod +x setup-cors.sh

# Run the setup script
./setup-cors.sh
```

The script will:
- ✅ Check if Google Cloud SDK is installed
- ✅ Authenticate you with Google Cloud
- ✅ Set your Firebase project
- ✅ Apply CORS configuration
- ✅ Verify everything worked

---

## Option 2: Manual Commands

If the script doesn't work or you prefer manual setup:

```bash
# 1. Authenticate
gcloud auth login

# 2. Set project
gcloud config set project flashcard3-e9cf1

# 3. Apply CORS
gsutil cors set cors.json gs://flashcard3-e9cf1.firebasestorage.app

# 4. Verify
gsutil cors get gs://flashcard3-e9cf1.firebasestorage.app
```

---

## Before You Start

### Install Google Cloud SDK (First Time Only)

**Windows:**
1. Download: https://cloud.google.com/sdk/docs/install
2. Run installer
3. Restart PowerShell

**Mac (Homebrew):**
```bash
brew install --cask google-cloud-sdk
```

**Linux:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

---

## After Setup

1. ⏱️ **Wait 2-3 minutes** (for changes to propagate)
2. 🧹 **Clear browser cache**: `Ctrl + Shift + Delete`
3. 🔄 **Restart dev server**: `Ctrl + C` then `npm start`
4. ✅ **Test**: Try generating audio in your app

---

## Troubleshooting

### "gcloud: command not found"
- Restart your terminal
- Check installation completed successfully

### "AccessDeniedException: 403"
- Make sure you're signed in with the right Google account
- Check you have owner/editor permissions in Firebase Console

### Still getting CORS errors?
- Check Firebase Storage Rules (see CORS_SETUP_GUIDE.md)
- Try incognito/private browser window
- Verify CORS is set: `gsutil cors get gs://flashcard3-e9cf1.firebasestorage.app`

---

## Full Documentation

📖 **Detailed Guide**: [CORS_SETUP_GUIDE.md](./CORS_SETUP_GUIDE.md)  
🔧 **Alternative Methods**: [FIREBASE_CORS_FIX.md](./FIREBASE_CORS_FIX.md)

---

## Success Indicators

You'll know it worked when:
- ✅ No CORS errors in browser console
- ✅ Audio files upload successfully
- ✅ Can see "✅ word audio uploaded successfully" messages
- ✅ Audio playback works in your app

---

**Questions?** Check the troubleshooting section in CORS_SETUP_GUIDE.md

