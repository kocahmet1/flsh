# Customizing Default Decks

This guide explains how to customize which deck(s) appear for new users when they first sign up.

## Location

The default deck configuration is in: **`src/hooks/useDecks.js`**

Look for the `defaultDeckSpecs` array (around line 21).

## Configuration Structure

```javascript
const defaultDeckSpecs = [
  {
    name: 'Your Deck Name',
    cards: [
      { 
        front: 'Word or Question', 
        back: 'Definition or Answer', 
        sampleSentence: 'Example usage (optional)' 
      },
      // Add more cards...
    ],
  },
  // Add more decks if needed...
];
```

## Examples

### Example 1: Single Language Learning Deck

```javascript
const defaultDeckSpecs = [
  {
    name: 'Spanish Basic Vocabulary',
    cards: [
      { front: 'hola', back: 'hello', sampleSentence: 'Hola, ¿cómo estás?' },
      { front: 'gracias', back: 'thank you', sampleSentence: 'Gracias por tu ayuda.' },
      { front: 'agua', back: 'water', sampleSentence: 'Necesito un vaso de agua.' },
      { front: 'comida', back: 'food', sampleSentence: 'La comida está deliciosa.' },
      { front: 'libro', back: 'book', sampleSentence: 'Estoy leyendo un libro.' },
    ],
  },
];
```

### Example 2: Multiple Decks

```javascript
const defaultDeckSpecs = [
  {
    name: 'Math Formulas',
    cards: [
      { front: 'Area of Circle', back: 'πr²', sampleSentence: 'For a circle with radius 5, area = π × 5² = 25π' },
      { front: 'Pythagorean Theorem', back: 'a² + b² = c²', sampleSentence: 'For a right triangle with legs 3 and 4, hypotenuse = 5' },
      { front: 'Quadratic Formula', back: 'x = (-b ± √(b²-4ac)) / 2a', sampleSentence: 'Solves equations of form ax² + bx + c = 0' },
    ],
  },
  {
    name: 'Science Facts',
    cards: [
      { front: 'Speed of Light', back: '299,792,458 m/s', sampleSentence: 'Light takes 8 minutes to reach Earth from the Sun' },
      { front: 'Water Formula', back: 'H₂O', sampleSentence: 'Two hydrogen atoms bonded to one oxygen atom' },
    ],
  },
];
```

### Example 3: Trivia or General Knowledge

```javascript
const defaultDeckSpecs = [
  {
    name: 'World Capitals',
    cards: [
      { front: 'France', back: 'Paris', sampleSentence: 'Paris is known as the City of Light' },
      { front: 'Japan', back: 'Tokyo', sampleSentence: 'Tokyo is the most populous metropolitan area in the world' },
      { front: 'Brazil', back: 'Brasília', sampleSentence: 'Brasília was purpose-built as the capital in 1960' },
    ],
  },
];
```

## Important: Version Flag

**Every time you change the default decks, increment the version number!**

Find this line (around line 19):
```javascript
const DEFAULT_SEED_FLAG = 'defaults_seeded_v2';
```

Change it to:
```javascript
const DEFAULT_SEED_FLAG = 'defaults_seeded_v3';
```

### Why?
- The version flag ensures new decks are added for **all users** (not just new signups)
- Without changing the version, existing users won't get the updated decks
- Each user will only get the decks seeded once per version

### Version Flag Reference

Also update the cloud version check (around line 75):
```javascript
if (prefs.seededDefaultsV2 === true) {  // Change to match version
```

And in all other places where it appears (lines 86, 95, 137).

**Pro Tip**: Use Find & Replace to change all instances at once:
1. Find: `seededDefaultsV2`
2. Replace: `seededDefaultsV3`
3. Also update `DEFAULT_SEED_FLAG = 'defaults_seeded_v3'`

## Card Properties

### Required Properties
- `front`: The question/word (string)
- `back`: The answer/definition (string)

### Optional Properties
- `sampleSentence`: An example usage or context (string)

## Best Practices

1. **Keep it Manageable**: Start with 5-10 cards per deck
2. **Clear and Concise**: Keep front/back text short and clear
3. **Useful Examples**: Use sample sentences that add context
4. **Multiple Decks**: Consider providing 2-3 decks covering different topics
5. **Version Tracking**: Always increment the version when changing decks

## Testing Your Changes

After modifying the default decks:

1. **For New Users**:
   - Clear browser storage (or use incognito mode)
   - Create a new account
   - Verify the new deck(s) appear

2. **For Existing Users** (if version changed):
   - Log in with an existing account
   - The new deck(s) should be added alongside existing ones
   - Check browser console for seeding logs

3. **Console Logs**:
   Look for these messages:
   ```
   [ensureCloudDefaultsSeeded] Starting to seed default decks
   [ensureCloudDefaultsSeeded] Created deck: [Your Deck Name]
   [ensureCloudDefaultsSeeded] Seeding completed successfully
   ```

## Current Configuration

As of the latest update, the default deck is set to:
- **Name**: Spanish Basic Vocabulary
- **Version**: v2
- **Cards**: 5 Spanish vocabulary words

## Troubleshooting

### Deck not showing up for new users?
- Check that the version flag was incremented
- Check browser console for error messages
- Verify the deck structure matches the format above

### Existing users not getting new decks?
- Make sure you changed the version flag (e.g., v1 → v2)
- Check that all references to the version were updated
- Users need to log out and log back in to trigger the check

### Duplicates appearing?
- The duplicate cleanup system will handle this automatically
- It runs once per user on login

