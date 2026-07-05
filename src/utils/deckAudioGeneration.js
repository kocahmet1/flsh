import { generateCardAudio } from './audioGeneration';
import { getDeckRepository } from '../repositories';
import { isCloudEnabled } from '../repositories';
import { ref, update } from 'firebase/database';
import { db, auth } from '../firebase/config';

/**
 * Generate audio for a single card and update the database
 * @param {string} deckId - Deck ID
 * @param {string} cardId - Card ID
 * @param {Object} cardData - Card data with front, back, and sampleSentence
 * @param {string} voice - Voice to use (default: 'alloy')
 * @returns {Promise<boolean>} - Success status
 */
export async function generateAndSaveAudioForCard(deckId, cardId, cardData, voice = 'alloy') {
  try {
    console.log(`🎤 Generating audio for card: ${cardId}`);
    
    // Generate audio files
    const audioUrls = await generateCardAudio(deckId, cardId, cardData, voice);
    
    // Check if at least one audio type was generated (either URL or base64 data)
    const hasAnyAudio = audioUrls.wordAudioUrl || audioUrls.definitionAudioUrl || audioUrls.sentenceAudioUrl ||
                       audioUrls.wordAudioData || audioUrls.definitionAudioData || audioUrls.sentenceAudioData;
    if (!hasAnyAudio) {
      console.warn(`⚠️ No audio was uploaded or saved for card: ${cardId}`);
      return false;
    }
    
    // Update the card in the database
    const cloud = isCloudEnabled();
    
    if (!cloud) {
      // Local storage
      const repo = getDeckRepository();
      await repo.updateCardAudio(deckId, cardId, audioUrls);
    } else {
      // Cloud storage (Firebase)
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }
      
      const cardRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}/cards/${cardId}`);
      await update(cardRef, {
        ...audioUrls,
        audioGeneratedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    
    console.log(`✅ Audio generated and saved for card: ${cardId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to generate audio for card ${cardId}:`, error);
    return false;
  }
}

/**
 * Generate audio for all cards in a deck that don't have audio
 * @param {string} deckId - Deck ID
 * @param {Array} cards - Array of cards to generate audio for
 * @param {string} voice - Voice to use
 * @param {Function} onProgress - Progress callback (current, total, currentCard)
 * @returns {Promise<Object>} - Result object with success/failure counts
 */
export async function generateAudioForDeck(deckId, cards, voice = 'alloy', onProgress = null) {
  const results = {
    total: cards.length,
    successful: 0,
    failed: 0,
    errors: [],
  };

  console.log(`🎤 Starting batch audio generation for ${cards.length} cards...`);

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    
    if (onProgress) {
      onProgress(i + 1, cards.length, card);
    }

    try {
      const success = await generateAndSaveAudioForCard(deckId, card.id, card, voice);
      
      if (success) {
        results.successful++;
      } else {
        results.failed++;
        results.errors.push(`Failed to generate audio for: ${card.front}`);
      }
    } catch (error) {
      results.failed++;
      results.errors.push(`Error with ${card.front}: ${error.message}`);
    }

    // Add delay to avoid rate limiting (OpenAI has rate limits)
    // For free tier: 3 RPM (requests per minute), for paid: 3,500 RPM
    // Using 1 second delay = ~20 cards per minute = 60 API calls per minute (safe for paid tier)
    if (i < cards.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`✅ Batch audio generation complete. Success: ${results.successful}, Failed: ${results.failed}`);
  return results;
}

/**
 * Check if a card needs audio generation
 * @param {Object} card - Card object
 * @returns {boolean} - True if card needs audio
 */
export function cardNeedsAudio(card) {
  // A card needs audio if it has content but no audio URLs or data
  const hasContent = card.front || card.back || card.sampleSentence;
  const hasAudio = card.wordAudioUrl || card.definitionAudioUrl || card.sentenceAudioUrl ||
                   card.wordAudioData || card.definitionAudioData || card.sentenceAudioData;
  
  return hasContent && !hasAudio;
}

/**
 * Count cards in a deck that need audio generation
 * @param {Array} cards - Array of cards
 * @returns {number} - Number of cards needing audio
 */
export function countCardsNeedingAudio(cards) {
  return cards.filter(cardNeedsAudio).length;
}

/**
 * Get estimated cost for generating audio for cards
 * @param {Array} cards - Array of cards
 * @returns {Object} - Cost estimation object
 */
export function estimateAudioGenerationCost(cards) {
  let totalCharacters = 0;
  let audioCount = 0;

  cards.forEach(card => {
    if (cardNeedsAudio(card)) {
      if (card.front) {
        totalCharacters += card.front.length;
        audioCount++;
      }
      if (card.back) {
        totalCharacters += card.back.length;
        audioCount++;
      }
      if (card.sampleSentence) {
        totalCharacters += card.sampleSentence.length;
        audioCount++;
      }
    }
  });

  // OpenAI TTS-1 costs $15 per 1 million characters
  const costPerCharacter = 15 / 1000000;
  const estimatedCost = totalCharacters * costPerCharacter;

  return {
    totalCharacters,
    audioCount,
    estimatedCost: estimatedCost.toFixed(4),
    estimatedCostCents: Math.ceil(estimatedCost * 100),
  };
}

