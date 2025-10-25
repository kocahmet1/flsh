# Real-Time Media Generation Status UI

## Overview

A beautiful, animated status indicator that shows real-time progress of image and audio generation when new users sign up or when media is being generated for cards.

## Layout

### Desktop Layout (≥1024px)
The status box appears only over the right "Your Progress" column:

```
┌────────────────────────────────────────────────────────────────────┐
│                        My Vocab Sets                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │              │  │              │  │ Your Progress │            │
│  │   My Vocab   │  │    Vocab     │  │──────────────│            │
│  │     Sets     │  │   Quizzes    │  │ ┏━━━━━━━━━━┓ │            │
│  │              │  │              │  │ ┃ Status   ┃ │ ← Appears  │
│  │              │  │              │  │ ┃ Box Here ┃ │   here!    │
│  │              │  │              │  │ ┗━━━━━━━━━━┛ │            │
│  │              │  │              │  │              │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
└────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (<1024px)
The status box spans the full width:

```
┌────────────────────────────────┐
│     ┏━━━━━━━━━━━━━━━━━━━━┓    │
│     ┃   Status Box Here  ┃    │
│     ┗━━━━━━━━━━━━━━━━━━━━┛    │
│                                │
│  ┌──────────────────────────┐ │
│  │       My Vocab Sets      │ │
│  └──────────────────────────┘ │
└────────────────────────────────┘
```

## Visual Appearance

### Status Box (Collapsed)
```
┌─────────────────────────────────────────┐
│ ☁️ Generating Media...           🔄 ⌄  │
└─────────────────────────────────────────┘
```

### Status Box (Expanded - Generating)
```
┌─────────────────────────────────────────┐
│ ☁️ Generating Media...           🔄 ⌃  │
├─────────────────────────────────────────┤
│ Processing: colleague                   │
│                                         │
│ 🖼️ Images              23/75           │
│ ████████░░░░░░░░░░░░░░░░░░░░            │
│ 31%                                     │
│                                         │
│ 🔊 Audio               18/75           │
│ ██████░░░░░░░░░░░░░░░░░░░░░░            │
│ 24%                                     │
│                                         │
│ ⚡ Generating in the background.       │
│    You can continue using the app.     │
└─────────────────────────────────────────┘
```

### Status Box (Complete)
```
┌─────────────────────────────────────────┐
│ ✅ Media Generation Complete!      ⌃  │
├─────────────────────────────────────────┤
│ 🖼️ Images              75/75          │
│ ████████████████████████████████        │
│ 100%                                    │
│                                         │
│ 🔊 Audio               75/75           │
│ ████████████████████████████████        │
│ 100%                                    │
│                                         │
│ ✨ All media files have been           │
│    generated successfully!             │
│                                         │
│    [Dismiss]                           │
└─────────────────────────────────────────┘
```

## Features

### 1. **Animated Appearance**
- Slides down from the top with a fade-in effect
- Smooth animations for all state changes
- Spinning sync icon while generating

### 2. **Real-Time Progress**
- Shows current word being processed
- Separate progress bars for images and audio
- Percentage indicators for both
- Updates in real-time as generation progresses

### 3. **Collapsible Design**
- Click the header to collapse/expand
- Collapsed view shows minimal info
- Expanded view shows full details

### 4. **Visual Feedback**
- 🔄 Rotating sync icon during generation
- ✅ Green checkmark when complete
- Progress bars with color coding:
  - Blue/Purple: In progress
  - Green: Complete

### 5. **Non-Intrusive**
- Positioned at top of screen
- Doesn't block interaction with app
- Auto-dismisses after completion (3 seconds)
- Can be manually dismissed

## Component Structure

### Location
- **Component File**: `src/components/MediaGenerationStatus.jsx`
- **Used In**: `app/(tabs)/index.tsx` (main screen)

### Event System

The component listens for custom events dispatched by the media generation system:

```javascript
// Event types
'image_progress'   - Image generation progress update
'image_complete'   - All images generated
'audio_progress'   - Audio generation progress update
'audio_complete'   - All audio generated
'all_complete'     - Everything complete
```

### Data Flow

```
useDecks.js (startDefaultDeckMediaGeneration)
    ↓
emitMediaProgress()
    ↓
window.dispatchEvent('mediaGenerationProgress')
    ↓
MediaGenerationStatus (listens for events)
    ↓
Updates UI in real-time
```

## Styling

### Colors
- **Background**: Dark translucent (`rgba(30, 26, 64, 0.98)`)
- **Border**: Purple accent with glow
- **Text**: White primary, light purple secondary
- **Accent**: Bright purple (`#6C64FB`)
- **Success**: Green (`#10B981`)

### Animations
- **Fade In**: 300ms
- **Slide Down**: 300ms
- **Spinner Rotation**: 1000ms loop
- **Progress Bar**: Smooth width transitions

### Responsive Design
- **Desktop (≥1024px)**: Positioned over the right "Your Progress" column only
  - Width: 32% of screen (roughly 1/3)
  - Max width: 450px
  - Min width: 300px
  - Right-aligned
- **Mobile (<1024px)**: Spans full width with margins
  - Left and right margins: 16px
- Absolute positioning at top
- High z-index (9999) to stay on top
- Responsive to window resize

## User Experience

### When User Signs Up

1. **T+0s**: User completes signup
2. **T+3s**: Default deck created
3. **T+3s**: Status box appears with "Generating Media..."
4. **T+3-180s**: Real-time progress updates
   - Shows current word
   - Updates progress bars
   - Percentage increases
5. **T+180s**: "Media Generation Complete!"
6. **T+183s**: Status box auto-dismisses

### User Can:
- ✅ Continue using the app while generation happens
- ✅ Collapse/expand the status box
- ✅ Dismiss it manually at any time
- ✅ See exactly what's being generated

## Technical Details

### State Management
```javascript
const [visible, setVisible] = useState(false);
const [imageProgress, setImageProgress] = useState({ 
  current: 0, 
  total: 0, 
  status: 'idle' 
});
const [audioProgress, setAudioProgress] = useState({ 
  current: 0, 
  total: 0, 
  status: 'idle' 
});
const [currentWord, setCurrentWord] = useState('');
const [expanded, setExpanded] = useState(true);
```

### Animations
```javascript
const fadeAnim = new Animated.Value(0);      // Opacity
const slideAnim = new Animated.Value(-100);  // Y position
const spinAnim = new Animated.Value(0);      // Rotation
```

### Event Listener
```javascript
window.addEventListener('mediaGenerationProgress', (event) => {
  const { type, data } = event.detail;
  // Handle different event types
});
```

## Customization

### To Change Colors
Edit the `Colors` object in `src/constants/Colors.js`:
```javascript
accent: '#YOUR_COLOR',    // Main accent color
success: '#YOUR_COLOR',   // Success checkmark color
```

### To Change Position
Modify `styles.containerDesktop` and `styles.containerMobile` in `MediaGenerationStatus.jsx`:

For desktop (right column):
```javascript
containerDesktop: {
  right: 16,      // Distance from right edge
  width: '32%',   // Width as percentage
  maxWidth: 450,  // Maximum width
  minWidth: 300,  // Minimum width
}
```

For mobile (full width):
```javascript
containerMobile: {
  left: 16,       // Left margin
  right: 16,      // Right margin
}
```

To change vertical position (both):
```javascript
container: {
  top: 60,        // Change this value
  // ...
}
```

### To Change Auto-Dismiss Timer
Modify the timeout in the event handler:
```javascript
setTimeout(() => {
  hideStatus();
}, 3000);  // Change milliseconds here
```

## Benefits

### For Users
- ✅ Visual confirmation that media is being generated
- ✅ No confusion about "empty" cards
- ✅ Can track progress
- ✅ Non-blocking - can use app immediately

### For Developers
- ✅ Easy to debug generation issues
- ✅ Clear visual feedback for testing
- ✅ Reusable component for other features
- ✅ Event-driven architecture

## Future Enhancements

Possible improvements:
1. **Pause/Resume**: Allow users to pause generation
2. **Notifications**: Send browser notifications when complete
3. **Error Display**: Show which cards failed with retry button
4. **Detailed View**: Click to see full generation log
5. **Multiple Decks**: Track multiple deck generations simultaneously
6. **Sound Effects**: Add subtle sound when complete
7. **Estimated Time**: Show estimated time remaining

## Testing

To test the component:

1. Create a new user account
2. Watch for the status box to appear ~3 seconds after signup
3. Verify real-time updates
4. Test collapse/expand functionality
5. Verify auto-dismiss after completion

## Accessibility

- ✅ Touchable/clickable areas are properly sized
- ✅ Text is readable with good contrast
- ✅ Visual indicators (icons + text)
- ⚠️ Consider adding screen reader announcements for progress updates

## Browser Compatibility

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (iOS and macOS)
- ✅ Mobile browsers
- ✅ React Native Web

## Performance

- Lightweight component (~5KB)
- Minimal re-renders
- GPU-accelerated animations
- No memory leaks (proper cleanup)

