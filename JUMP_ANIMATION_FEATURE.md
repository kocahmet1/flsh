# Jump Animation Feature

## Overview
Added dynamic card-flicking animations when navigating through the deck by clicking on the progress bar. Cards now animate in the appropriate direction based on whether you're jumping forward or backward.

## Features

### 1. **Directional Animations**
- **Jump Forward**: Cards fly/flick to the left with a rotation effect
- **Jump Backward**: Cards fly/flick to the right with a rotation effect
- The animation direction intuitively matches the direction of navigation

### 2. **Multi-Card Effect**
- When jumping multiple cards (2+ cards), additional shadow cards are shown
- Creates a "deck of cards being thrown" effect
- Up to 2-3 cards visible during the animation for larger jumps
- Shadow cards have reduced opacity and scale to create depth

### 3. **Smooth Transitions**
- **Exit Animation** (300ms): Current card flies out with rotation and fade
  - Cards rotate as they fly (creating a realistic flick effect)
  - Opacity fades from 100% to 0%
  - Movement distance: 1.5x screen width

- **Entrance Animation** (200ms): New card slides in from the opposite side
  - Starts slightly offset (0.3x screen width)
  - Uses spring animation for natural feel
  - Fades in smoothly

### 4. **Smart Detection**
- Automatically detects jump direction (forward vs backward)
- Calculates distance jumped (number of cards skipped)
- Prevents animation when clicking on the same card
- Logs navigation details for debugging

## Implementation Details

### Animation Values
- `jumpAnimValue`: Controls horizontal translation (-1.5x to +1.5x screen width)
- `jumpOpacity`: Controls fade in/out (0 to 1)
- `jumpAnimation.count`: Number of cards being jumped (affects shadow cards)
- `jumpAnimation.direction`: 'forward' or 'backward'

### Timing
```
Total Animation Duration: ~550ms
├─ Exit phase: 150ms
│  ├─ Card flies out: 300ms
│  └─ Index changes: @150ms
└─ Entrance phase: 400ms
   ├─ Card slides in: 200ms (spring)
   └─ Animation cleanup: @400ms
```

### Visual Effects
1. **Rotation**: Cards rotate as they move (translateX / 20 degrees)
2. **Scale**: Shadow cards are scaled down (97%, 94%)
3. **Opacity**: Shadow cards have reduced opacity (60%, 40%)
4. **Depth**: Shadow cards offset vertically (-8px, -16px) for 3D effect

## User Experience

### Before
- Clicking progress bar instantly jumped to new card
- No visual feedback about direction or distance
- Could be disorienting for large jumps

### After
- Clear visual indication of navigation direction
- Smooth, satisfying animation
- Multiple cards visible for larger jumps (reinforces distance)
- Natural feel with spring animations
- Professional polish

## Technical Notes

### Performance
- Uses `react-native-reanimated` for 60fps native animations
- Animations run on native thread (not JavaScript)
- Conditional rendering of shadow cards (only when needed)
- Animation state cleared after completion to prevent memory leaks

### Compatibility
- Works on iOS, Android, and Web
- Uses `withTiming` for consistent cross-platform behavior
- Spring animations for natural feel on entrance
- Respects screen width for responsive animation distances

## Code Structure

### Key Components
1. **Animation State**: `jumpAnimation` object tracks active state, direction, and count
2. **Shared Values**: `jumpAnimValue` and `jumpOpacity` for reanimated
3. **Handler**: `handleProgressBarPress` orchestrates the animation sequence
4. **Styles**: `jumpAnimatedStyle` applies transformation and opacity
5. **Shadow Cards**: Conditionally rendered based on jump distance

### Animation Sequence
```javascript
1. User clicks progress bar
2. Calculate direction and distance
3. Reset animation values
4. Trigger exit animation (cards fly out)
5. Wait 150ms
6. Update card index
7. Reset position for entrance
8. Trigger entrance animation (card slides in)
9. Wait 400ms
10. Clear animation state
```

## Future Enhancements
- [ ] Add haptic feedback on mobile
- [ ] Show card count indicator during jump (e.g., "+5 cards")
- [ ] Customize animation speed based on distance
- [ ] Add sound effects (optional)
- [ ] Trail effect for very large jumps (10+ cards)

