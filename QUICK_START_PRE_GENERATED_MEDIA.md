# Quick Start: Pre-Generated Media System

## 🚀 5-Minute Setup

### Step 1: Generate Media (One Time)

```bash
# Run the generation script
npm run generate-media

# Or directly:
node scripts/generate-default-deck-media.js
```

**Expected output:**
```
🚀 Starting media generation for default deck...
📝 Processing 75 cards

[1/75] Processing: "colleague"
  🎨 Generating image...
  🎤 Generating audio (word)...
  🎤 Generating audio (definition)...
  🎤 Generating audio (sentence)...
  ✅ Success! (1/75)

... (continues for all 75 cards)

📊 Generation Complete!
✅ Success: 75/75
❌ Failed: 0/75

💾 Results saved to: src/data/default-deck-media.json
🎉 Done! You can now use this data for all new users.
```

**Time:** ~3-4 minutes
**Cost:** ~$0.64 (one time only!)

### Step 2: Verify Generation

```bash
# Check the file was created
ls -lh src/data/default-deck-media.json

# Should show ~2-5MB file
```

### Step 3: Commit to Repository

```bash
git add src/data/default-deck-media.json
git commit -m "Add pre-generated media for default deck"
git push
```

### Step 4: Test with New User

1. Create a new user account
2. Sign in
3. Check console logs:
   ```
   [ensureCloudDefaultsSeeded] Created deck: Sat Vocab Starter Set (75/75 cards with pre-generated media)
   ```
4. Open a card - image and audio should be there instantly!

## ✅ Done!

All future users will get instant media. No more waiting!

## 🔄 When to Regenerate

Regenerate media when you:
- ✅ Add new cards to default deck
- ✅ Change existing card content
- ✅ Update image/audio generation logic
- ✅ Want higher quality media

To regenerate:
```bash
npm run generate-media
```

## 📊 Verify It's Working

### Console Logs to Look For:

**On App Start:**
```
[useDecks] Pre-generated media loaded: 75 cards
```

**On User Signup:**
```
[ensureCloudDefaultsSeeded] Starting to seed default decks with Turkish definitions
[ensureCloudDefaultsSeeded] Created deck: Sat Vocab Starter Set (75/75 cards with pre-generated media)
[ensureCloudDefaultsSeeded] Using pre-generated media, skipping background generation
```

### What You Should See:

✅ No "Generating Media..." status box on signup
✅ Cards have images immediately
✅ Audio plays immediately
✅ Instant user experience

## 🆘 Troubleshooting

### Problem: "No pre-generated media found"

**Solution:**
```bash
npm run generate-media
```

### Problem: Some cards missing media

**Check the JSON file:**
```bash
cat src/data/default-deck-media.json | grep '"colleague"'
```

**Regenerate if needed:**
```bash
npm run generate-media
```

### Problem: Script fails to run

**Check dependencies:**
```bash
# Make sure you have the required modules
npm install
```

**Check API keys:**
- OpenAI API key in `.env`
- Gemini API key in `.env`

## 💡 Pro Tips

1. **Backup your media file** before regenerating
2. **Test in a new user account** after generation
3. **Monitor file size** - should be 2-5MB
4. **Check console logs** to verify it's being used
5. **Commit the media file** to version control

## 📈 Benefits You'll See

| Metric | Before | After |
|--------|--------|-------|
| User signup time | 3-4 min | < 1 sec |
| Cost per user | $0.64 | $0.00 |
| Reliability | Variable | 100% |
| API calls per user | 300 | 0 |

## 🎉 Success!

You've just saved yourself tons of money and given your users an instant experience!

For more details, see: `PRE_GENERATED_MEDIA_SYSTEM.md`

