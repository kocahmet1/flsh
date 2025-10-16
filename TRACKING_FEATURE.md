# 📊 Tracking Feature Implementation

## Overview

Your flashcard app now features a **comprehensive tracking system** that monitors your learning progress across all activities. The home page has been reorganized into **3 columns** (desktop view): **Sets**, **Quizzes**, and **Tracking**.

---

## ✨ What's Tracked

### 1. **Words Mastered** 📚
- Total number of vocabulary words marked as "known" across ALL decks
- **Real-time calculation** from your actual deck data
- Updates immediately when you mark/unmark cards as known
- Works even if you exit study sessions early
- Always accurate - reflects current state of all your decks

### 2. **Study Sessions** 🎓
- Counts every time you study a deck
- Tracks which decks you've studied and how many times
- Records time spent studying (in minutes)
- Auto-tracked when you enter and exit study mode

### 3. **Quiz Statistics** 🎯
- **Total Quizzes Taken**: Count of completed quizzes
- **Questions Solved**: Total quiz questions answered
- **Quiz Accuracy**: Percentage of correct answers across all quizzes
- Recent quiz history (last 20 attempts with scores)

### 4. **Study Streaks** 🔥
- **Current Streak**: Consecutive days you've studied
- **Longest Streak**: Your personal best streak
- Automatically calculated based on study dates
- Encourages daily learning habits

### 5. **Deck-Specific Stats** 📖
- Per-deck study count
- Per-deck quiz attempts
- Time spent on each deck
- Last studied timestamp

---

## 🎨 User Interface

### Desktop View (≥1024px width)
The home page is divided into **3 equal columns**:

#### Column 1: My Vocab Sets
- Your flashcard decks with progress bars
- Study and manage your sets
- Create new sets or import from gallery

#### Column 2: Vocab Quizzes
- AI-powered SAT-style quizzes for each set
- Quick access to start quizzes
- Requires 4+ words per set

#### Column 3: Your Progress (NEW!)
- **Words Mastered** - Total vocabulary learned
- **Study Sessions** - Number of study sessions completed
- **Quizzes Taken** - Total quiz attempts
- **Questions Solved** - Total quiz questions answered
- **Quiz Accuracy** - Overall percentage correct
- **Day Streak** - Consecutive days of studying

#### Special Visual Indicators:
- 🔥 Fire icon for streaks ≥3 days
- ✅ Green checkmark for high accuracy (≥70%)
- 🎓 Motivational messages for achievements

### Mobile View
- Stacked layout (sets only on main screen)
- Stats accessible via pull-to-refresh or settings

---

## 🏗️ Technical Implementation

### New Files Created:

1. **`src/utils/trackingStats.js`** (320 lines)
   - Core statistics logic
   - Functions for recording study sessions, words learned, quiz attempts
   - Streak calculation algorithm
   - Motivational message generator

2. **`src/repositories/trackingRepository.js`** (235 lines)
   - Data persistence layer
   - Supports both **Firebase** (cloud) and **AsyncStorage** (local)
   - Smart sync and merge logic for multi-device support
   - Automatic fallback to local storage

3. **`src/hooks/useTracking.js`** (155 lines)
   - React hook for easy stats access
   - Auto-loads stats on mount
   - Provides convenient methods: `recordStudySession()`, `recordQuizAttempt()`, etc.
   - Handles all async operations

4. **`src/components/TrackingCard.jsx`** (248 lines)
   - Beautiful stats display component
   - 6-stat grid layout with icons
   - Color-coded achievements
   - Motivational messages
   - Loading and empty states

5. **`src/utils/deckStatsCalculator.js`** (73 lines)
   - Real-time calculation utilities
   - `calculateTotalWordsMastered()` - counts known cards across all decks
   - `calculateDeckProgress()` - gets progress for single deck
   - `calculateOverallProgress()` - gets overall learning progress

### Modified Files:

1. **`app/(tabs)/index.tsx`**
   - Added 3-column desktop layout
   - Integrated `useTracking` hook
   - Added `TrackingCard` component
   - Passes deck data to TrackingCard for real-time calculation
   - Updated responsive breakpoint to 1024px

2. **`app/deck/[id]/study.tsx`**
   - Tracks study session duration
   - Counts cards studied
   - Auto-saves stats on session end (even when exiting early)
   - Removed incremental word tracking (now calculated in real-time)

3. **`app/quiz/[deckId].tsx`**
   - Tracks quiz start/end time
   - Records quiz scores
   - Calculates and saves accuracy
   - Updates stats immediately after completion

4. **`src/components/TrackingCard.jsx`**
   - Updated to accept `decks` prop
   - Calculates total words mastered from actual deck data
   - No longer relies on incremental tracking for word count

---

## 📈 Statistics Tracked Behind the Scenes

### Overall Stats:
```javascript
{
  // Note: totalWordsLearned is calculated in real-time from deck data, not stored
  totalStudySessions: 0,
  totalQuizzesTaken: 0,
  totalQuizQuestionsSolved: 0,
  totalQuizQuestionsCorrect: 0,
  totalStudyTimeMinutes: 0,
  currentStreak: 0,
  longestStreak: 0,
  firstStudyDate: null,
  lastStudyDate: null,
}
```

### Per-Deck Stats:
```javascript
deckStats: {
  [deckId]: {
    deckName: "Vocabulary Set 1",
    studyCount: 5,
    quizzesTaken: 3,
    timeSpentMinutes: 45,
    lastStudied: "2025-01-15T10:30:00Z"
  }
}
```

### Recent Quizzes:
```javascript
recentQuizzes: [
  {
    deckId: "abc123",
    deckName: "SAT Words",
    date: "2025-01-15T10:00:00Z",
    questionsTotal: 10,
    questionsCorrect: 8,
    percentage: 80
  }
]
```

---

## 💾 Data Storage

### Firebase (Cloud)
- Path: `users/{userId}/stats`
- Syncs across devices when logged in
- Persistent across app reinstalls

### AsyncStorage (Local)
- Key: `user_tracking_stats`
- Works offline
- Fallback when not logged in

### Smart Sync
- Local stats are merged with cloud stats
- Higher values are preserved
- Unique entries are combined
- No data loss on sync

---

## 🚀 Features & Benefits

### For Users:
1. **Visual Progress** - See your learning journey at a glance
2. **Motivation** - Streaks and achievements encourage consistency
3. **Accountability** - Track how much you've studied
4. **Goal Setting** - Use stats to set and reach learning goals
5. **Performance Insights** - Quiz accuracy shows areas for improvement

### For Developers:
1. **Modular Design** - Easy to extend with new stats
2. **Type-Safe** - Clear function signatures
3. **Offline-First** - Works without internet
4. **Cloud Sync** - Seamless multi-device support
5. **Zero Impact** - Tracking runs in background without UI lag

---

## 🎯 Suggested Future Enhancements

Based on your tracking foundation, here are some powerful additions you could make:

### 1. **Time-Based Analytics** ⏰
- Best study times (morning vs. evening performance)
- Study time heatmap (like GitHub contributions)
- Average session duration

### 2. **Detailed Progress Charts** 📊
- Weekly/monthly progress graphs
- Words learned over time
- Quiz performance trends

### 3. **Achievements & Badges** 🏆
- "Scholar" - 100 words learned
- "Consistent Learner" - 30-day streak
- "Quiz Master" - 90% accuracy on 10+ quizzes
- "Speed Demon" - Complete 50 cards in one session

### 4. **Leaderboards** 👥 (Optional)
- Compare stats with friends
- Global rankings (opt-in)
- Weekly challenges

### 5. **Smart Insights** 🧠
- "You learn best on Tuesdays!"
- "Your accuracy improves after 3+ reviews"
- "Suggested review: Deck X (not studied in 7 days)"

### 6. **Export Stats** 📤
- CSV export for personal tracking
- Share achievements on social media
- Print progress reports

### 7. **Study Goals** 🎯
- Set daily/weekly goals
- Progress notifications
- Goal completion celebrations

---

## 🔍 How It Works

### Words Mastered (Real-Time Calculation):
```
1. TrackingCard receives current deck data as prop
2. calculateTotalWordsMastered() scans all decks
3. Counts cards where isKnown === true
4. Returns total across all decks
5. Updates instantly when deck data changes

Benefits:
✅ Always accurate - no sync issues
✅ Works even if you exit study early
✅ Handles manual edits in deck editor
✅ No risk of count drift over time
```

### Study Session Tracking:
```
1. User opens study screen → Timer starts
2. User swipes through cards → Cards counted
3. User marks cards as "known" → Words learned tracked
4. User exits/completes study → Session recorded with:
   - Deck ID & name
   - Cards studied count
   - Duration in minutes
   - Words newly learned
```

### Quiz Tracking:
```
1. Quiz loads → Timer starts
2. User answers questions → Answers stored
3. User completes quiz → Score calculated
4. Quiz recorded with:
   - Deck ID & name
   - Total questions
   - Correct answers
   - Duration in minutes
   - Accuracy percentage
```

### Streak Calculation:
```
1. Study dates stored as ISO strings (YYYY-MM-DD)
2. On each study session, today's date added to array
3. Streak calculated by checking consecutive days:
   - Today → Yesterday → Day before → ...
   - Breaks on first missing day
4. Longest streak tracked separately
```

---

## 📱 Mobile Compatibility

While the 3-column layout is desktop-optimized, tracking works seamlessly on mobile:
- Stats are recorded on all platforms
- Mobile users can view stats in a future "Stats" tab or modal
- Pull-to-refresh updates stats in real-time
- All data syncs when switching devices

---

## 🛠️ Usage Examples

### In Your Components:
```javascript
import { useTracking } from '../../src/hooks/useTracking';

function MyComponent() {
  const { 
    stats, 
    recordStudySession, 
    recordQuizAttempt,
    getStudySummary 
  } = useTracking();
  
  // Get summary
  const summary = getStudySummary();
  console.log(summary.totalWordsLearned); // 42
  
  // Record study
  await recordStudySession('deck123', 'SAT Words', 10, 5.5);
  
  // Record quiz
  await recordQuizAttempt('deck123', 'SAT Words', 10, 8, 2.5);
}
```

---

## 🎉 Summary

You now have a **professional-grade tracking system** that:
- ✅ Monitors all learning activities
- ✅ Displays beautiful statistics
- ✅ Encourages consistent study habits
- ✅ Works offline and syncs to cloud
- ✅ Requires zero user configuration
- ✅ Integrates seamlessly with existing features

**Start studying to see your stats grow!** 🚀

---

## 📝 Notes

- Minimum study time: 5 seconds (prevents accidental recordings)
- Streak resets if you miss a day
- Quiz accuracy rounds to nearest whole percent
- Stats persist across app updates
- Cloud sync happens automatically when logged in

