import LocalDeckRepository from './LocalDeckRepository';
import { CLOUD_SYNC_ENABLED } from '../constants/FeatureFlags';

let repoInstance = null;

export function getDeckRepository() {
  if (!repoInstance) {
    repoInstance = new LocalDeckRepository();
  }
  return repoInstance;
}

export function isCloudEnabled() {
  return CLOUD_SYNC_ENABLED;
}
