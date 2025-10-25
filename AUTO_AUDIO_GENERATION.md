# 🎤 Automatic Audio Generation

## Overview

Audio is now **automatically generated** when you create flashcards! No need to click the "Generate Audio" button for new cards.

## How It Works

### When Creating Single Cards

1. **Add a card** with word, definition, and sample sentence
2. **Save the card**
3. **Audio generates automatically in the background** ✨
4. You can leave the page - generation continues!

### When Bulk Adding Words

1. **Bulk add multiple words**
2. Cards are created one by one
3. **Audio generates for each card automatically**
4. All happens in the background queue

### Console Logs

When audio auto-generates, you'll see:
```
🎤 Auto-generating audio for new card...
🎤 [Web] Generating audio for word...
✅ [Web] Word audio generated
🎤 [Web] Generating audio for definition...
✅ [Web] Definition audio generated
🎤 [Web] Generating audio for sentence...
✅ [Web] Sentence audio generated
✅ [Web] Audio data saved to Realtime Database
✅ Audio auto-generation complete
```

## The Green "Generate Audio" Button

### Still Available!

The green button is still there and useful for:

1. **Regenerating audio** - If you want to regenerate with different voice
2. **Batch generation** - Generate audio for old cards that don't have it
3. **Status check** - Click to see if audio exists

### Smart Behavior

When you click "Generate Audio":

- **If all cards have audio:** Shows alert ✅ **"Sounds already exist for this deck!"**
- **If some cards need audio:** Shows cost estimate and generates missing audio
- **If no cards have audio:** Generates all audio

## Benefits

✅ **No extra clicks** - Audio creates automatically
✅ **Seamless experience** - Just create cards and study!
✅ **Background processing** - Doesn't block the UI
✅ **Error handling** - If audio fails, card still saves
✅ **Cost efficient** - Only generates when needed

## How Much Does It Cost?

Auto-generation uses the same OpenAI TTS API:
- **~$0.0015 per card** (less than 0.2 cents)
- **10 cards = ~$0.015** (1.5 cents)
- **100 cards = ~$0.15** (15 cents)

Very affordable for automatic generation!

## Technical Details

### Where Auto-Generation Happens

1. **Single card creation**: `app/deck/[id]/add-card.tsx` → `handleSave()`
2. **Bulk word processing**: `src/utils/cardProcessingQueue.js` → `processItem()`
3. Both use: `src/utils/audioGenerationWeb.js` → `generateCardAudioWeb()`

### Error Handling

If audio generation fails:
- Card is still saved successfully ✅
- Error is logged to console
- Process continues normally
- User can click green button later to retry

### Rate Limiting

Audio generation includes built-in delays:
- **1 second** between each card in bulk processing
- Prevents hitting OpenAI API rate limits
- Safe for both free and paid tiers

## For Mobile Apps

When deployed as a native app (iOS/Android):
- Uses Firebase Storage instead of Realtime Database
- More efficient (stores MP3 files, not base64)
- Same automatic generation behavior
- No CORS issues!

## Customization

### Change Voice

To use a different voice, edit the voice parameter in:

**Single cards** (`add-card.tsx`):
```javascript
'alloy' // Change to: echo, fable, onyx, nova, shimmer
```

**Bulk processing** (`cardProcessingQueue.js`):
```javascript
'alloy' // Change to: echo, fable, onyx, nova, shimmer
```

### Disable Auto-Generation

If you want to disable auto-generation:

1. **Single cards**: Comment out the audio generation code in `handleSave()`
2. **Bulk processing**: Comment out the audio generation code in `processItem()`
3. Use only the green button for manual generation

## FAQ

**Q: Can I regenerate audio if I don't like the voice?**
A: Yes! Just click the green "Generate Audio" button and it will regenerate.

**Q: What if OpenAI API is down?**
A: Card saves successfully, audio generation fails silently. Try green button later.

**Q: Does this work offline?**
A: No, audio generation requires internet. But once generated, audio works offline!

**Q: Can I see generation progress?**
A: For bulk processing, yes (in console). For single cards, it's background/silent.

**Q: What if I run out of OpenAI credits?**
A: Cards save fine, audio generation fails. Add credits and click green button.

---

**Summary**: Audio now generates automatically when you create cards! The green button is still there for regeneration and batch processing of old cards. 🎉

