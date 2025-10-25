import { useEffect } from 'react';
import queueManager from '../utils/cardProcessingQueue';

/**
 * Hook to initialize and manage the background processing queue
 * Call this in your root component (_layout.tsx) to ensure the queue
 * starts processing when the app loads
 */
export function useQueueManager() {
  useEffect(() => {
    console.log('🔄 Initializing background processing queue...');
    
    // The queue manager will automatically load saved queue and resume processing
    // We just need to trigger it on mount
    queueManager.loadQueue();
    
    return () => {
      // Cleanup if needed
      console.log('🛑 Queue manager cleanup');
    };
  }, []);
}

export default useQueueManager;





