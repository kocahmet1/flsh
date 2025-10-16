# AI-Powered Quiz System Implementation

## 🎯 Overview

Your vocab app now features an **AI-powered adaptive quiz system** that generates high-quality, SAT-style vocabulary questions using Google's Gemini AI. The system intelligently caches questions and regenerates them when your vocabulary sets change significantly.

## ✨ Key Features

### 1. **Smart Question Generation**
- **50 AI-generated questions** per vocabulary set
- **SAT-style format**: Complete sentences with contextual blanks
- **Diverse topics**: Science, history, literature, everyday situations
- **Quality distractors**: Wrong answers are plausible vocabulary words from the same set
- **Varied difficulty**: Mix of easier and harder questions
- **Balanced answer distribution**: Correct answers evenly distributed across A, B, C, D
  - For 50 questions: ~12-13 of each (A/B/C/D)
  - Automatic verification and rebalancing
  - Prevents answer pattern bias

### 2. **Intelligent Caching Strategy**
- ✅ Questions generated **on first quiz attempt** (lazy loading)
- ✅ Cached in **database** (Firebase/AsyncStorage)
- ✅ **Instant loading** for subsequent quizzes (no API calls)
- ✅ **Automatic regeneration** when deck changes significantly:
  - 20%+ change in vocabulary word count
  - 3+ words added/removed (or 20% of total)

### 3. **User Experience**
- **10 random questions** selected from the pool of 50 for each quiz
- **Loading indicators** during AI generation
- **Error handling** with helpful messages
- **Retry functionality** if generation fails
- **Review mode** with explanations after quiz completion

## 📁 Files Added/Modified

### New Files:
1. **`src/utils/aiQuizGenerator.js`** - AI question generation logic
2. **`src/hooks/useQuizQuestions.js`** - Question caching and management
3. **`app/quiz/[deckId].tsx`** - Updated quiz screen

### Modified Files:
1. **`app/(tabs)/index.tsx`** - Added quiz column with AI indicator
2. **`src/utils/quizGenerator.js`** - Original (kept for reference, not used)

## 🔧 How It Works

### Answer Distribution System

To ensure fair quizzes with no predictable patterns:

1. **AI Prompt**: Explicitly instructs Gemini to distribute correct answers evenly across A, B, C, D
2. **Verification**: After generation, system checks distribution counts
3. **Auto-Rebalancing**: If distribution is skewed (e.g., too many A's), automatically shuffles choices to balance
4. **Logging**: Console logs distribution for debugging: `{A: 12, B: 13, C: 13, D: 12}`

**Example**:
```
Before rebalancing: A: 25, B: 10, C: 8, D: 7  ❌ Unbalanced!
After rebalancing:  A: 13, B: 12, C: 13, D: 12 ✅ Balanced!
```

### Question Generation Flow

```
User clicks "Take Quiz" 
    ↓
Check if questions exist in cache
    ↓
No → Generate 50 questions with AI (one-time)
    ↓
Store in database with metadata
    ↓
Select 10 random questions
    ↓
Present quiz to user
```

### Regeneration Logic

```
User takes quiz
    ↓
Check deck metadata vs cached metadata
    ↓
Has deck changed significantly?
    ↓
Yes → Regenerate questions
No → Use cached questions
    ↓
Select 10 new random questions
```

## 🎨 UI/UX Features

### Desktop View (≥768px)
- **Two-column layout**:
  - Left: Vocabulary sets
  - Right: Quiz buttons with AI indicator 💡
- **"AI-powered SAT-style questions"** subtitle
- Disabled state for sets with <4 words

### Mobile View (<768px)
- Quizzes hidden (cleaner mobile experience)
- Access quizzes by navigating directly to quiz screen (future enhancement)

### Quiz Screen
- **Progress tracking**: "Question X of 10"
- **Multiple choice** with clear selection states
- **Results screen** with:
  - Score and percentage
  - Pass/fail indicator (70% threshold)
  - Detailed review of all questions
  - Correct answers with AI explanations
  - Your incorrect answers highlighted
  - "Try Again" and "Back to Sets" buttons

## 📊 Database Structure

### Firebase:
```
users/
  {userId}/
    decks/
      {deckId}/
        quizQuestions/
          questions: [...]
          metadata:
            deckId: string
            deckName: string
            generatedAt: timestamp
            questionCount: number
            cardCount: number
            vocabularyWords: string[]
            version: "1.0"
```

### Local Storage (AsyncStorage):
```
Key: "quiz_questions_{deckId}"
Value: {
  questions: [...],
  metadata: {...}
}
```

## 🔌 API Usage

### Gemini AI Integration
- **Model**: `gemini-2.0-flash`
- **API Key**: `process.env.EXPO_PUBLIC_GEMINI_API_KEY`
- **Cost**: ~50 questions = 1 API call per set (first time only)
- **Estimated tokens**: ~2000-3000 per generation

### When API is Called:
1. ✅ First quiz attempt for a set
2. ✅ After significant deck changes (auto-detected)
3. ❌ NOT on every quiz (uses cache)
4. ❌ NOT on app startup (lazy loading)

## 🚀 Performance Optimizations

1. **Lazy Loading**: Generate questions only when needed
2. **Smart Caching**: Reuse questions across multiple quiz attempts
3. **Batch Generation**: 50 questions in one API call (efficient)
4. **Change Detection**: Only regenerate when necessary
5. **Random Selection**: Fresh quiz experience from cached pool
6. **Answer Distribution**: One-time rebalancing during generation (no runtime cost)

## 🛠️ Configuration

### Adjustable Parameters:

In `src/utils/aiQuizGenerator.js`:
```javascript
// Number of questions to generate per deck
generateAIQuizQuestions(cards, 50) // Change 50 to desired count
```

In `src/hooks/useQuizQuestions.js`:
```javascript
// Number of questions per quiz
getQuizQuestions(10) // Change 10 to desired count
```

In `src/utils/aiQuizGenerator.js`:
```javascript
// Regeneration threshold (20% change)
if (changePercentage >= 0.2) // Change 0.2 to desired percentage
```

## 🐛 Error Handling

### Scenarios Covered:
1. **AI generation fails**: Shows error message with retry option
2. **Insufficient words**: "Need at least 4 vocabulary words" message
3. **Network errors**: Graceful error display with retry
4. **Invalid responses**: JSON parsing error handling
5. **No questions available**: User-friendly error message

## 📱 Testing Checklist

- [x] Generate questions for new deck (first time)
- [x] Take quiz with cached questions (second time)
- [x] Add/remove 20%+ words and verify regeneration
- [x] Test with <4 words (disabled state)
- [x] Test loading indicators
- [x] Test error scenarios
- [x] Test on desktop (two-column layout)
- [x] Test on mobile (quizzes hidden)
- [x] Test results screen
- [x] Test retry functionality

## 🔮 Future Enhancements

1. **Manual regeneration button** for users who want fresh questions
2. **Difficulty selection** (easy/medium/hard)
3. **Question history** to avoid repeating recent questions
4. **Performance tracking** over time
5. **Spaced repetition** integration
6. **Timed quizzes** option
7. **Multiplayer/competitive mode**

## 📝 Notes

- Questions are **deck-specific** (not shared between decks)
- Each quiz **randomly selects 10 from 50** for variety
- AI generates **contextual sentences** that require understanding word meaning
- **Explanations** help users learn from mistakes
- System is **cost-efficient** with minimal API usage
- **Answer distribution is verified and balanced** automatically:
  - Target: 25% of questions for each position (A, B, C, D)
  - Tolerance: ±25% variance allowed
  - Auto-corrects if AI generates biased distribution
  - No user action required

## 🎓 Usage Tips for Users

1. **First quiz may take 10-15 seconds** (AI generation)
2. **Subsequent quizzes are instant** (cached)
3. **Add new words freely** - questions auto-regenerate when needed
4. **Each attempt has different questions** (random selection)
5. **Review explanations** to understand correct answers

---

**Implementation Complete!** 🎉

The AI quiz system is now fully functional and ready for testing. The smart caching ensures minimal API usage while providing a fresh, high-quality quiz experience every time.

