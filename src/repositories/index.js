import LocalDeckRepository from './LocalDeckRepository';
import { CLOUD_SYNC_ENABLED } from '../constants/FeatureFlags';
import { auth } from '../firebase/config';

let repoInstance = null;

export function getDeckRepository() {
  if (!repoInstance) {
    // For now, only local repository is available. This is where we would
    // switch to a CloudDeckRepository if CLOUD_SYNC_ENABLED is true later.
    repoInstance = new LocalDeckRepository();
  }
  return repoInstance;
}

export function isCloudEnabled() {
  // Enable cloud features if explicitly toggled or if a user is logged in
  try {
    return !!CLOUD_SYNC_ENABLED || !!(auth && auth.currentUser);
  } catch {
    return !!CLOUD_SYNC_ENABLED;
  }
}
