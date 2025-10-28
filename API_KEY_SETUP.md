# API Key Setup for Media Generation

## The Problem

You're seeing this error:
```
API key not valid. Please pass a valid API key.
```

This means the script can't find or access your Gemini API key.

## Quick Fix

### Step 1: Check Your .env File

Open your `.env` file in the project root and verify you have:

```env
GEMINI_API_KEY=your_actual_gemini_key_here
OPENAI_API_KEY=your_actual_openai_key_here
```

**Important:** 
- No quotes around the values
- No spaces around the `=`
- Actual keys, not placeholders

### Step 2: Verify Your Gemini API Key

1. **Go to:** https://aistudio.google.com/apikey
2. **Sign in** with your Google account
3. **Create or copy** your API key
4. **Paste it** in your `.env` file:
   ```
   GEMINI_API_KEY=AIzaSyC...your_actual_key_here
   ```

### Step 3: Verify Your OpenAI API Key

1. **Go to:** https://platform.openai.com/api-keys
2. **Sign in** to your OpenAI account
3. **Create or copy** your API key
4. **Paste it** in your `.env` file:
   ```
   OPENAI_API_KEY=sk-...your_actual_key_here
   ```

### Step 4: Save and Retry

1. **Save** your `.env` file
2. **Run the script again:**
   ```bash
   npm run generate-media
   ```

## Example .env File

Your `.env` file should look like this:

```env
# Gemini API (for image generation)
GEMINI_API_KEY=AIzaSyC_actual_key_goes_here

# OpenAI API (for audio generation)
OPENAI_API_KEY=sk-proj-actual_key_goes_here

# Other environment variables
FIREBASE_API_KEY=...
# etc
```

## Verification

When you run the script now, you should see:

```
🚀 Starting media generation for default deck...
📝 Processing 75 cards

✅ API keys validated
   Gemini: AIzaSyC_ac...
   OpenAI: sk-proj-ab...

[1/75] Processing: "colleague"
  🎨 Generating image...
  🎤 Generating audio (word)...
  ...
```

## Troubleshooting

### Problem: "FileReader is not defined"

**What it means:** The script was trying to use a browser API in Node.js

**Solution:** This is now fixed! The code automatically detects if it's running in Node.js and uses the correct method.

If you still see this error, make sure you're using the latest version of the files.

### Problem: "Cannot find module 'config'"

**What it means:** The script can't import Firebase config

**Solution:** This is now fixed! The script has its own simplified audio generation that doesn't need Firebase.

### Problem: "GEMINI_API_KEY not found"

**Solution:**
1. Make sure `.env` file exists in project root (same folder as `package.json`)
2. Make sure the line says `GEMINI_API_KEY=` (not `GOOGLE_API_KEY` or similar)
3. Make sure there's no space before or after the `=`

### Problem: "API key not valid"

**Solutions:**
1. **Key might be expired** - Generate a new one at https://aistudio.google.com/apikey
2. **Key might be wrong** - Copy it again carefully (no extra spaces)
3. **Key might not have permissions** - Make sure "Generative Language API" is enabled

### Problem: "Missing required dependencies"

**Solution:**
```bash
npm install
```

This will install all required packages (openai, @google/generative-ai, dotenv).

### Problem: Still not working

**Check:**
```bash
# On Windows PowerShell:
Get-Content .env

# On Windows CMD:
type .env

# On Mac/Linux:
cat .env
```

Verify you see your actual API keys (not placeholders).

## Getting API Keys

### Gemini API Key (Free)

1. Go to: https://aistudio.google.com/apikey
2. Click "Get API Key" or "Create API Key"
3. Click "Create API key in new project"
4. Copy the key
5. Paste in `.env` file

**Cost:** FREE (has generous free tier)

### OpenAI API Key (Paid)

1. Go to: https://platform.openai.com/api-keys
2. Click "+ Create new secret key"
3. Give it a name (e.g., "Flashcard App")
4. Copy the key (you won't see it again!)
5. Paste in `.env` file
6. **Add credits:** https://platform.openai.com/settings/organization/billing

**Cost:** ~$0.015 per 1,000 characters
- For 75 cards ≈ **$0.50-$0.64** (one time)

## Security Notes

⚠️ **Never commit your .env file to git!**

Your `.gitignore` should have:
```
.env
.env.*
```

This protects your API keys from being exposed.

## Need Help?

If you're still having issues:

1. **Check the error message** - it usually tells you what's wrong
2. **Verify .env location** - must be in project root
3. **Check for typos** - especially in key names
4. **Try regenerating keys** - sometimes keys get corrupted

## Alternative: Skip Media Generation

If you can't get the API keys working right now, you can still use the app:

1. **Skip the generation script** - users will get on-demand generation
2. **Come back later** - generate media when keys are working
3. **Use partial media** - if some cards generated, they'll be used

The app has a fallback system, so it will work either way!

