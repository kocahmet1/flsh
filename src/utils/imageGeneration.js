import { generateCardImage } from './gemini';
import LocalDeckRepository from '../repositories/LocalDeckRepository';
import { ref, get, update } from 'firebase/database';
import { db, auth } from '../firebase/config';

const repo = new LocalDeckRepository();

/**
 * Generate an image for a single card
 * @param {string} deckId - The deck ID
 * @param {string} cardId - The card ID
 * @param {string} sampleSentence - The sample sentence to generate an image for
 * @param {boolean} cloud - Whether using cloud storage
 * @returns {Promise<boolean>} - Success status
 */
export async function generateImageForCard(deckId, cardId, sampleSentence, cloud = false) {
  if (!sampleSentence || sampleSentence.trim() === '') {
    console.log('No sample sentence, skipping image generation');
    return false;
  }

  try {
    console.log(`Generating image for card ${cardId}...`);
    const imageData = await generateCardImage(sampleSentence);
    
    if (!imageData) {
      console.warn('No image generated');
      return false;
    }

    // Save to database
    if (!cloud) {
      await repo.updateCardImage(deckId, cardId, imageData);
    } else {
      if (!auth.currentUser) return false;
      
      const userCardRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}/cards/${cardId}`);
      console.log(`[ImageGen] Saving image to path: users/${auth.currentUser.uid}/decks/${deckId}/cards/${cardId}`);
      
      // Get existing card data first
      const cardSnapshot = await get(userCardRef);
      if (!cardSnapshot.exists()) {
        console.warn(`[ImageGen] Card not found at user path, cannot save image`);
        return false;
      }
      
      const cardData = cardSnapshot.val();
      console.log(`[ImageGen] Existing card data keys:`, Object.keys(cardData));
      console.log(`[ImageGen] Image data length:`, imageData.length);
      
      await update(userCardRef, {
        ...cardData,
        imageData,
        imageGeneratedAt: new Date().toISOString(),
      });
      
      console.log(`[ImageGen] Image saved successfully to user's card`);

      // Also update public deck if shared
      const deckRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}`);
      const deckSnapshot = await get(deckRef);
      if (deckSnapshot.exists() && deckSnapshot.val().isShared) {
        const publicCardRef = ref(db, `decks/${deckId}/cards/${cardId}`);
        await update(publicCardRef, {
          imageData,
          imageGeneratedAt: new Date().toISOString(),
        });
        console.log(`[ImageGen] Image also saved to public deck`);
      }
    }

    console.log(`✅ Image generated and saved for card ${cardId}`);
    
    // Trigger a small event to notify that image was updated
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cardImageUpdated', {
        detail: { deckId, cardId }
      }));
    }
    
    return true;
  } catch (error) {
    console.error(`Error generating image for card ${cardId}:`, error);
    return false;
  }
}

/**
 * Generate images for all cards in a deck that don't have images yet
 * @param {string} deckId - The deck ID
 * @param {boolean} cloud - Whether using cloud storage
 * @param {function} onProgress - Callback for progress updates (current, total)
 * @returns {Promise<{success: number, failed: number, skipped: number}>}
 */
export async function generateImagesForDeck(deckId, cloud = false, onProgress = null) {
  let cards = [];
  
  try {
    if (!cloud) {
      const deck = await repo.getDeck(deckId);
      if (!deck || !deck.cards) {
        return { success: 0, failed: 0, skipped: 0 };
      }
      cards = Object.values(deck.cards);
    } else {
      if (!auth.currentUser) {
        return { success: 0, failed: 0, skipped: 0 };
      }
      
      const userCardsRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}/cards`);
      const snapshot = await get(userCardsRef);
      if (snapshot.exists()) {
        cards = Object.entries(snapshot.val()).map(([id, card]) => ({ ...card, id }));
      }
    }

    // Filter cards that need images
    const cardsNeedingImages = cards.filter(card => 
      card.sampleSentence && !card.imageData
    );

    console.log(`Found ${cardsNeedingImages.length} cards needing images out of ${cards.length} total cards`);

    if (cardsNeedingImages.length === 0) {
      return { success: 0, failed: 0, skipped: cards.length };
    }

    let success = 0;
    let failed = 0;

    // Generate images one by one with progress updates
    for (let i = 0; i < cardsNeedingImages.length; i++) {
      const card = cardsNeedingImages[i];
      
      if (onProgress) {
        onProgress(i + 1, cardsNeedingImages.length, card.front);
      }

      const result = await generateImageForCard(
        deckId,
        card.id,
        card.sampleSentence,
        cloud
      );

      if (result) {
        success++;
      } else {
        failed++;
      }

      // Small delay to avoid rate limiting
      if (i < cardsNeedingImages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const skipped = cards.length - cardsNeedingImages.length;
    console.log(`✅ Image generation complete: ${success} success, ${failed} failed, ${skipped} skipped`);

    return { success, failed, skipped };
  } catch (error) {
    console.error('Error generating images for deck:', error);
    throw error;
  }
}

/**
 * Check if a card needs an image generated
 * @param {object} card - The card object
 * @returns {boolean}
 */
export function cardNeedsImage(card) {
  return !!(card && card.sampleSentence && !card.imageData);
}

