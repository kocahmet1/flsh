// Feature flags for runtime behavior
// Offline-first default: no cloud sync unless explicitly enabled later
export const CLOUD_SYNC_ENABLED = false;
// Control whether shared decks with autoForkForAll are auto-added for users
export const AUTO_FORK_ENABLED = false;

// Simple label to show near AI features
export const AI_FEATURES_NOTE = 'Requires internet and OpenAI API access';

// Convenience alias
export const OFFLINE_MODE = !CLOUD_SYNC_ENABLED;
