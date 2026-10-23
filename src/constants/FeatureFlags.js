// Feature flags for runtime behavior
// Cloud account build: decks are stored under each authenticated Firebase user.
export const CLOUD_SYNC_ENABLED = true;
// Control whether first-run users receive the built-in vocabulary starter deck.
export const DEFAULT_DECK_SEEDING_ENABLED = false;
// Control whether shared decks with autoForkForAll are auto-added for users
export const AUTO_FORK_ENABLED = true;

// Move pictures/audio that older versions stored inside the cards into
// users/{uid}/cardMedia (once per account, in the background). One-way:
// app builds older than this change no longer find media that was moved.
export const MOVE_STORED_MEDIA_ENABLED = true;

// Simple label to show near AI features
export const AI_FEATURES_NOTE = 'Requires internet and OpenAI API access';

// Convenience alias
export const OFFLINE_MODE = !CLOUD_SYNC_ENABLED;
