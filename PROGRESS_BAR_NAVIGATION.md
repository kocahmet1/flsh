# Interactive Progress Bar Navigation

## Overview
Added the ability to jump to any card in the deck by clicking/tapping on the progress bar during study sessions.

## Implementation Details

### 1. Enhanced ProgressBar Component (`src/components/ProgressBar.js`)
- Added optional `onPress` prop that accepts a callback function
- Implemented touch/click handlers for both native and web platforms
- Calculates the clicked position as a percentage (0-100) of the bar width
- Web: Uses `onClick` with `getBoundingClientRect()` for accurate positioning
- Native: Uses `TouchableWithoutFeedback` with `locationX` from touch event
- Progress bar shows cursor pointer on web when interactive

### 2. Updated StudyScreen (`app/deck/[id]/study.tsx`)
- Added `handleProgressBarPress` function that:
  - Converts clicked percentage to corresponding card index
  - Clamps values to valid range (0 to studyCards.length - 1)
  - Updates `currentIndex` to jump to the selected card
  - Resets card flip state for smooth transition
  - Logs the navigation for debugging
- Connected the handler to ProgressBar via `onPress` prop

## How It Works

1. **User Interaction**: User clicks/taps anywhere on the progress bar
2. **Position Calculation**: System calculates the clicked position as a percentage
3. **Index Mapping**: Percentage is converted to a card index:
   - 0% → Card 1
   - 50% → Middle card
   - 100% → Last card
4. **Navigation**: Current card index updates, showing the selected card immediately

## Example Usage

In a deck with 50 cards:
- Click at the start (0-2%) → Jump to card 1
- Click at 20% → Jump to card 10
- Click at 50% → Jump to card 25
- Click at 90% → Jump to card 45
- Click at the end (98-100%) → Jump to card 50

## Features
- ✅ Works on both mobile (touch) and web (click)
- ✅ Precise positioning calculation
- ✅ Visual feedback (cursor pointer on web)
- ✅ Smooth card transitions
- ✅ No impact on existing progress bar functionality
- ✅ Backwards compatible (progress bars without `onPress` work as before)

## Technical Notes
- Uses platform-specific event handling for optimal accuracy
- Touch events on native use `locationX` for relative positioning
- Web events use `getBoundingClientRect()` for absolute positioning
- Card flip state is reset when jumping to prevent confusion
- Progress calculation remains unchanged

