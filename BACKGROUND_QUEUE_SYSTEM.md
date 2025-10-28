# 🔄 Background Queue System for Card Processing

## Overview

This document describes the **Background Processing Queue System** that was implemented to solve API rate limiting issues when adding multiple words (especially 50+) to a deck at once.

## The Problem

When users added 50 words to a deck, the system would:
1. Generate all 50 definitions at once using Gemini API → **API quota exceeded**
2. Generate 50 image prompts sequentially using Gemini API → **Rate limiting errors**
3. Generate 50 images from Pollinations.ai → **Rate limiting issues**
4. User had to stay on the page during processing → **Poor UX**

## The Solution

A **persistent, background processing queue** that:
- ✅ Processes cards **one at a time** (definition → save → image)
- ✅ Adds **6-second delays** between each card to respect API rate limits
- ✅ **Persists in storage** (AsyncStorage) so processing continues across app sessions
- ✅ Works **in the background** - user can leave the page immediately
- ✅ Provides **real-time status updates** via a floating indicator
- ✅ Automatically **resumes on app restart** if there are pending items

---

## Architecture

### Components

1. **`src/utils/cardProcessingQueue.js`**
   - Core queue manager (singleton)
   - Handles adding items, processing, and persistence
   - Rate limiting: 6 seconds between each card

2. **`src/components/QueueStatusIndicator.jsx`**
   - Floating UI component showing processing status
   - Expandable to show detailed progress
   - Automatically appears when queue is active

3. **`src/hooks/useQueueManager.js`**
   - React hook to initialize queue on app startup
   - Called in `app/_layout.tsx`

4. **Modified Files**
   - `app/deck/[id]/add-card.tsx` - Bulk add now uses queue
   - `app/deck/[id]/index.tsx` - Shows queue status indicator
   - `app/_layout.tsx` - Initializes queue on startup

---

## How It Works

### Processing Flow

```
User adds 50 words
        ↓
Words added to persistent queue (AsyncStorage)
        ↓
User gets confirmation and can leave immediately
        ↓
Background processing starts:
        ↓
For each word:
  1. Call Gemini API to generate definition + sample sentence (2-3 sec)
  2. Wait 1 second
  3. Save card to database (local or Firebase)
  4. If sample sentence exists:
     a. Call Gemini API to generate image prompt (2-3 sec)
     b. Wait 1 second
     c. Call Pollinations.ai to generate image (3-4 sec)
     d. Save image to card
  5. Wait 6 seconds before next word
        ↓
Queue completes (or continues in next app session if closed)
```

### Rate Limiting Strategy

**Per Card:**
- Gemini definition: ~2-3 seconds
- Wait: 1 second
- Gemini image prompt: ~2-3 seconds
- Wait: 1 second
- Pollinations.ai image: ~3-4 seconds
- Wait: 6 seconds
- **Total: ~15-20 seconds per card**

**For 50 cards:**
- Total time: **~12-17 minutes**
- But user doesn't have to wait! Process runs in background.

---

## Usage

### For Users

1. **Add Multiple Words:**
   - Go to "Add Cards to Deck"
   - Enter 50 words (one per line) in the "Bulk Add with AI" section
   - Click "Process Words"
   - Get confirmation: "Added 50 words to the processing queue!"
   - **You can leave immediately** - processing continues

2. **Monitor Progress:**
   - A floating status indicator appears at the bottom of the deck screen
   - Shows: "Processing cards... 12/50"
   - Tap to expand and see details:
     - Pending: 38
     - Processing: 1
     - Completed: 11
     - Failed: 0

3. **Background Processing:**
   - Even if you close the app, the queue persists
   - When you reopen, processing resumes automatically
   - Cards appear in your deck as they're completed

### For Developers

#### Adding Words to Queue

```javascript
import queueManager from '../../../src/utils/cardProcessingQueue';

// Add words to queue
const words = ['apple', 'banana', 'cherry', /* ... 47 more ... */];
const queuedCount = await queueManager.addWordsToQueue(
  deckId,
  words,
  useCloud,
  addCardCallback
);

console.log(`Added ${queuedCount} words to queue`);
```

#### Getting Queue Status

```javascript
import queueManager from '../src/utils/cardProcessingQueue';

// Get current status
const status = queueManager.getStatus();
console.log(status);
// {
//   total: 50,
//   pending: 30,
//   processing: 1,
//   failed: 2,
//   isProcessing: true
// }

// Listen for status changes
queueManager.addListener((status) => {
  console.log('Queue updated:', status);
});
```

---

## Testing with 50 Words

### Test Scenario

Here's a sample list of 50 common English words you can use to test:

```
apple
banana
cherry
dog
elephant
flower
guitar
house
island
jungle
kitchen
lemon
mountain
notebook
ocean
piano
queen
river
sunset
teacher
umbrella
volcano
window
xylophone
yacht
zebra
ambulance
bicycle
calendar
diamond
elevator
festival
garden
hospital
internet
journey
kangaroo
library
magazine
necklace
orchestra
painting
question
rainbow
sandwich
telephone
universe
vacation
waterfall
yogurt
```

### Expected Behavior

1. **Immediate Response:**
   - User adds 50 words
   - Gets confirmation within 1-2 seconds
   - Can leave the page immediately

2. **Processing:**
   - Queue indicator appears: "Processing cards... 0/50"
   - Updates in real-time: "1/50", "2/50", etc.
   - Takes ~12-17 minutes total

3. **No Rate Limit Errors:**
   - Gemini API: No 503 or quota errors
   - Pollinations.ai: No failures due to rate limiting
   - All 50 cards created successfully

4. **Cards Appear Gradually:**
   - Cards appear in deck as they're completed
   - Each card has:
     - Front: word
     - Back: definition
     - Sample sentence
     - AI-generated image

---

## Error Handling

### If Processing Fails

- Failed items are marked in the queue
- Other items continue processing
- Queue status shows: "Failed: 3"
- Failed items can be retried manually or automatically

### If App Crashes

- Queue persists in AsyncStorage
- On app restart, queue resumes from where it left off
- No data loss

### If User Deletes Deck

- Queue items for that deck should be cancelled
- (Future enhancement: implement deck deletion cleanup)

---

## Performance Considerations

### Storage

- Queue items are stored in AsyncStorage (or could use Firebase)
- Each item: ~200 bytes
- 50 items: ~10 KB
- Completed items are removed from queue

### Battery Impact

- Minimal: Processing is async and doesn't block UI
- 6-second delays between items reduce CPU/network load
- On mobile: Consider pausing when app is backgrounded (future enhancement)

### Network Usage

- Each card: 3 API calls (2 Gemini, 1 Pollinations)
- Total for 50 cards: 150 API calls
- Spread over 12-17 minutes = ~10 calls/minute
- Well within rate limits

---

## Future Enhancements

### Potential Improvements

1. **Batch Prompts:**
   - Generate image prompts in batches of 5-10
   - Would speed up processing

2. **Adaptive Rate Limiting:**
   - Detect rate limit errors
   - Automatically increase delays if needed

3. **Priority Queue:**
   - Let users prioritize certain words
   - Process high-priority words first

4. **Background Service (Mobile):**
   - Use native background tasks on iOS/Android
   - Continue processing even when app is fully closed

5. **Progress Notifications:**
   - Push notifications: "25/50 cards complete"
   - Email digest when queue finishes

6. **Pause/Resume Controls:**
   - Let users manually pause/resume processing
   - Useful if they want to save battery

7. **Queue History:**
   - Show completed queue jobs
   - "50 words processed on Oct 23, 2025"

---

## Troubleshooting

### Queue Not Processing

**Check:**
1. Is `useQueueManager` called in `_layout.tsx`?
2. Are there pending items? `queueManager.getStatus()`
3. Check console for errors

**Solution:**
```javascript
// Force resume processing
queueManager.processQueue();
```

### Rate Limit Errors Still Occurring

**Check:**
1. Are delays long enough? (Currently 6 seconds)
2. Are there other parts of app calling APIs simultaneously?

**Solution:**
```javascript
// Increase delay in cardProcessingQueue.js
await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
```

### Cards Not Appearing

**Check:**
1. Is `addCard` callback working?
2. Check deck refresh logic
3. Verify Firebase/AsyncStorage writes

**Solution:**
- Trigger manual deck refresh: `refreshDeck()`
- Check queue status for failures

---

## API Reference

### `queueManager.addWordsToQueue(deckId, words, useCloud, addCardCallback)`

Add words to the processing queue.

**Parameters:**
- `deckId` (string) - The deck ID
- `words` (string[]) - Array of words to process
- `useCloud` (boolean) - Whether to use cloud (Firebase) storage
- `addCardCallback` (function) - Callback to add card to deck

**Returns:** `Promise<number>` - Number of words added to queue

---

### `queueManager.getStatus()`

Get current queue status.

**Returns:** `object`
```javascript
{
  total: 50,        // Total items in queue
  pending: 30,      // Items waiting to be processed
  processing: 1,    // Items currently being processed
  failed: 2,        // Items that failed
  isProcessing: true // Whether queue is actively processing
}
```

---

### `queueManager.addListener(callback)`

Subscribe to queue status updates.

**Parameters:**
- `callback` (function) - Called when queue status changes

**Example:**
```javascript
queueManager.addListener((status) => {
  console.log(`Progress: ${status.total - status.pending}/${status.total}`);
});
```

---

### `queueManager.removeListener(callback)`

Unsubscribe from queue status updates.

---

### `queueManager.clearProcessed()`

Remove completed and failed items from queue.

---

### `queueManager.cancelAll()`

Cancel all pending and processing items.

---

## Conclusion

The Background Queue System solves the API rate limiting problem while providing a much better user experience. Users can add 50+ words at once and leave immediately, while the system processes them reliably in the background.

**Key Benefits:**
- ✅ No more API quota errors
- ✅ No more rate limiting failures
- ✅ Users don't have to wait
- ✅ Processing continues across app sessions
- ✅ Real-time progress updates
- ✅ Reliable and persistent

**Trade-offs:**
- ⏱️ Takes longer (but in background)
- 💾 Uses a bit more storage
- 🔧 More complex architecture

Overall, this is a much more robust and scalable solution that will handle any number of words without issues.







