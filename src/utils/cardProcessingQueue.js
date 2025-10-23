import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, get, update, push, onValue } from 'firebase/database';
import { db, auth } from '../firebase/config';
import { generateDefinitions, generateImagePrompt } from './gemini';
import { generateCardImage } from './gemini';

const QUEUE_STORAGE_KEY = '@card_processing_queue';
const QUEUE_STATUS_KEY = '@queue_status';

/**
 * Queue item structure:
 * {
 *   id: string,
 *   type: 'bulk_words' | 'single_word',
 *   deckId: string,
 *   word: string,
 *   status: 'pending' | 'processing' | 'completed' | 'failed',
 *   createdAt: timestamp,
 *   processedAt: timestamp | null,
 *   error: string | null,
 *   useCloud: boolean
 * }
 */

class CardProcessingQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.listeners = [];
    this.loadQueue();
  }

  /**
   * Load queue from storage
   */
  async loadQueue() {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`📋 Loaded ${this.queue.length} items from queue`);
        // Resume processing if there are pending items
        this.processQueue();
      }
    } catch (error) {
      console.error('Error loading queue:', error);
    }
  }

  /**
   * Save queue to storage
   */
  async saveQueue() {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
      this.notifyListeners();
    } catch (error) {
      console.error('Error saving queue:', error);
    }
  }

  /**
   * Add words to the queue for processing
   * @param {string} deckId - The deck ID
   * @param {string[]} words - Array of words to process
   * @param {boolean} useCloud - Whether to use cloud storage
   * @param {function} addCardCallback - Callback function to add card to deck
   */
  async addWordsToQueue(deckId, words, useCloud, addCardCallback) {
    const timestamp = Date.now();
    
    const newItems = words.map((word, index) => ({
      id: `${deckId}_${timestamp}_${index}`,
      type: 'bulk_words',
      deckId,
      word,
      status: 'pending',
      createdAt: timestamp,
      processedAt: null,
      error: null,
      useCloud,
      addCardCallback
    }));

    this.queue.push(...newItems);
    await this.saveQueue();
    
    console.log(`✅ Added ${words.length} words to processing queue`);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return newItems.length;
  }

  /**
   * Process the queue sequentially with rate limiting
   */
  async processQueue() {
    if (this.isProcessing) {
      console.log('⏸️ Queue is already being processed');
      return;
    }

    if (this.queue.length === 0) {
      console.log('✅ Queue is empty');
      return;
    }

    this.isProcessing = true;
    console.log(`🔄 Starting to process ${this.queue.length} items in queue`);

    while (this.queue.length > 0) {
      const item = this.queue.find(i => i.status === 'pending');
      
      if (!item) {
        // No more pending items
        break;
      }

      // Mark as processing
      item.status = 'processing';
      await this.saveQueue();

      try {
        await this.processItem(item);
        
        // Mark as completed
        item.status = 'completed';
        item.processedAt = Date.now();
        
        // Remove completed items from queue to save storage
        this.queue = this.queue.filter(i => i.id !== item.id);
        
        console.log(`✅ Completed processing: ${item.word}`);
      } catch (error) {
        console.error(`❌ Failed to process: ${item.word}`, error);
        
        // Mark as failed
        item.status = 'failed';
        item.error = error.message;
        item.processedAt = Date.now();
      }

      await this.saveQueue();

      // Rate limiting: wait between items
      // Gemini: ~2 seconds, Pollinations: ~3 seconds
      // Total delay: 5-6 seconds per card to be safe
      console.log('⏳ Waiting 6 seconds before next item (rate limiting)...');
      await new Promise(resolve => setTimeout(resolve, 6000));
    }

    this.isProcessing = false;
    console.log('✅ Queue processing complete');
    
    await this.saveQueue();
  }

  /**
   * Process a single queue item
   * @param {object} item - Queue item to process
   */
  async processItem(item) {
    console.log(`🔄 Processing word: ${item.word}`);

    // Step 1: Generate definition and sample sentence (Gemini API)
    console.log(`  📝 Generating definition for: ${item.word}`);
    const wordDefinitions = await generateDefinitions([item.word]);
    
    if (!wordDefinitions || wordDefinitions.length === 0) {
      throw new Error('Failed to generate definition');
    }

    const [word, definition, sampleSentence] = wordDefinitions[0];
    
    // Small delay after Gemini call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Add card to deck
    console.log(`  💾 Saving card to deck: ${word}`);
    const cardId = await this.addCardToDeck(
      item.deckId,
      word,
      definition,
      sampleSentence,
      item.useCloud
    );

    if (!cardId) {
      throw new Error('Failed to save card');
    }

    // Step 3: Generate image if sample sentence exists
    if (sampleSentence && sampleSentence.trim()) {
      console.log(`  🎨 Generating image for: ${word}`);
      
      try {
        // Generate image prompt (Gemini API)
        const imagePrompt = await generateImagePrompt(sampleSentence);
        
        // Small delay after Gemini call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Generate image (Pollinations.ai)
        const imageData = await generateCardImage(sampleSentence);
        
        if (imageData) {
          // Save image to card
          await this.saveImageToCard(item.deckId, cardId, imageData, item.useCloud);
          console.log(`  ✅ Image saved for: ${word}`);
        } else {
          console.log(`  ⚠️ No image generated for: ${word}`);
        }
      } catch (imageError) {
        // Don't fail the whole process if image generation fails
        console.warn(`  ⚠️ Image generation failed for ${word}:`, imageError.message);
      }
    }

    console.log(`✨ Successfully processed: ${word}`);
  }

  /**
   * Add a card to the deck
   */
  async addCardToDeck(deckId, front, back, sampleSentence, useCloud) {
    if (!useCloud) {
      // Local storage
      const LocalDeckRepository = (await import('../repositories/LocalDeckRepository')).default;
      const repo = new LocalDeckRepository();
      return await repo.addCard(deckId, { front, back, sampleSentence });
    } else {
      // Cloud storage (Firebase)
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const cardsRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}/cards`);
      const newCardRef = push(cardsRef);
      const cardId = newCardRef.key;

      const cardData = {
        id: cardId,
        front,
        back,
        sampleSentence: sampleSentence || '',
        isKnown: false,
        lastReviewed: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await update(newCardRef, cardData);
      
      // Update deck's card count
      const deckRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}`);
      const deckSnapshot = await get(deckRef);
      if (deckSnapshot.exists()) {
        const deckData = deckSnapshot.val();
        await update(deckRef, {
          updatedAt: new Date().toISOString(),
          cardCount: (deckData.cardCount || 0) + 1,
        });
      }
      
      return cardId;
    }
  }

  /**
   * Save image to card
   */
  async saveImageToCard(deckId, cardId, imageData, useCloud) {
    if (!useCloud) {
      // Local storage
      const LocalDeckRepository = (await import('../repositories/LocalDeckRepository')).default;
      const repo = new LocalDeckRepository();
      await repo.updateCardImage(deckId, cardId, imageData);
    } else {
      // Cloud storage
      if (!auth.currentUser) return;

      const userCardRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}/cards/${cardId}`);
      
      // Get existing card data
      const cardSnapshot = await get(userCardRef);
      if (!cardSnapshot.exists()) {
        throw new Error('Card not found');
      }

      const cardData = cardSnapshot.val();
      
      await update(userCardRef, {
        ...cardData,
        imageData,
        imageGeneratedAt: new Date().toISOString(),
      });

      // Also update public deck if shared
      const deckRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}`);
      const deckSnapshot = await get(deckRef);
      if (deckSnapshot.exists() && deckSnapshot.val().isShared) {
        const publicCardRef = ref(db, `decks/${deckId}/cards/${cardId}`);
        await update(publicCardRef, {
          imageData,
          imageGeneratedAt: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Get queue status
   */
  getStatus() {
    const pending = this.queue.filter(i => i.status === 'pending').length;
    const processing = this.queue.filter(i => i.status === 'processing').length;
    const failed = this.queue.filter(i => i.status === 'failed').length;

    return {
      total: this.queue.length,
      pending,
      processing,
      failed,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Add listener for queue changes
   */
  addListener(callback) {
    this.listeners.push(callback);
    // Immediately call with current status
    callback(this.getStatus());
  }

  /**
   * Remove listener
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  /**
   * Notify all listeners
   */
  notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in queue listener:', error);
      }
    });
  }

  /**
   * Clear completed and failed items
   */
  async clearProcessed() {
    const before = this.queue.length;
    this.queue = this.queue.filter(i => i.status === 'pending' || i.status === 'processing');
    await this.saveQueue();
    console.log(`🗑️ Cleared ${before - this.queue.length} processed items from queue`);
  }

  /**
   * Cancel all pending items
   */
  async cancelAll() {
    this.queue = [];
    this.isProcessing = false;
    await this.saveQueue();
    console.log('🚫 Cancelled all queue items');
  }
}

// Singleton instance
const queueManager = new CardProcessingQueue();

export default queueManager;

