import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, push, set, update, remove, get, query, orderByChild, equalTo } from 'firebase/database';
import { db, auth } from '../firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeckRepository, isCloudEnabled } from '../repositories';
import { AUTO_FORK_ENABLED, DEFAULT_DECK_SEEDING_ENABLED } from '../constants/FeatureFlags';
import { useAuth } from '../context/AuthContext';
import {
  buildDeckWriteUpdates,
  createDeck as createDeckAction,
  deleteDeck as deleteDeckAction,
  forgetDeckSummary,
  syncDecksInBackground,
} from '../utils/cloudDecks';
import { decksFromSummaries } from '../utils/deckSummaries';
import { withStoredMedia } from '../utils/cardMediaStore';

// Auto-fork flags change rarely (admin action), so check them once per
// session instead of on every visit to the deck list.
const autoForkCheckedFor = new Set();

// Pre-generated media will be loaded asynchronously to avoid blocking
let defaultDeckMediaCache = null;
let defaultDeckMediaPromise = null;

/**
 * Load pre-generated media asynchronously (non-blocking)
 */
async function loadDefaultDeckMedia() {
  // Return cached data if already loaded
  if (defaultDeckMediaCache) {
    return defaultDeckMediaCache;
  }
  
  // Return existing promise if already loading
  if (defaultDeckMediaPromise) {
    return defaultDeckMediaPromise;
  }
  
  // Start loading
  defaultDeckMediaPromise = (async () => {
    try {
      console.log('[useDecks] Loading pre-generated media asynchronously...');
      // Dynamic import to avoid blocking the main thread
      const mediaModule = await import('../data/default-deck-media.json');
      defaultDeckMediaCache = mediaModule.default || mediaModule;
      console.log('[useDecks] Pre-generated media loaded:', defaultDeckMediaCache?.cards ? Object.keys(defaultDeckMediaCache.cards).length : 0, 'cards');
      return defaultDeckMediaCache;
    } catch (error) {
      console.warn('[useDecks] No pre-generated media found, will generate on-demand');
      return null;
    } finally {
      defaultDeckMediaPromise = null;
    }
  })();
  
  return defaultDeckMediaPromise;
}

export function useDecks() {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // Add a refresh key to force re-fetching
  const [seedingInProgress, setSeedingInProgress] = useState(false); // Guard against concurrent seeding
  const cloud = isCloudEnabled();
  const repo = getDeckRepository();
  const { user } = useAuth();

  // --- Default deck seeding helpers ---
  const DEFAULT_SEED_FLAG = 'defaults_seeded_v3'; // v3: Turkish definitions

  const defaultDeckSpecs = [
    {
      name: 'Sat Vocab Starter Set',
      cards: [
        { front: 'colleague', back: 'birlikte çalışılan kişi, özellikle mesleki anlamda iş arkadaşı', sampleSentence: 'She discussed the project with her colleagues at the meeting.' },
        { front: 'compatible', back: 'uyumlu, çatışmadan bir arada var olabilen veya meydana gelebilen', sampleSentence: 'Their personalities were highly compatible, making them great partners.' },
        { front: 'accommodate', back: 'konaklama veya yeterli yer sağlamak; uyum sağlamak veya ayarlamak', sampleSentence: 'The hotel can accommodate up to 200 guests.' },
        { front: 'amiable', back: 'dostane ve hoş bir tavra sahip olan, cana yakın', sampleSentence: 'Her amiable personality made her popular among her peers.' },
        { front: 'congenial', back: 'ortak ilgi veya benzerlik nedeniyle hoş olan, uyumlu', sampleSentence: 'The team worked in a congenial atmosphere of mutual respect.' },
        { front: 'aloof', back: 'dostça olmayan veya yakın davranmayan; mesafeli, soğuk', sampleSentence: 'He remained aloof from the group, preferring to work alone.' },
        { front: 'nonchalant', back: 'rahat ve sakin hisseden veya görünen, ilgisiz', sampleSentence: 'Despite the pressure, she maintained a nonchalant attitude.' },
        { front: 'apathetic', back: 'ilgi veya coşku göstermeyen, umursamaz, kayıtsız', sampleSentence: 'The students seemed apathetic about the upcoming election.' },
        { front: 'indifferent', back: 'özel bir ilgisi veya sempatisi olmayan; kayıtsız, ilgisiz', sampleSentence: 'He was indifferent to the criticism and continued his work.' },
        { front: 'sentimental', back: 'aşırı hassas, romantik veya nostaljik duygulara sahip, duygusal', sampleSentence: 'She kept the old letters for sentimental reasons.' },
        { front: 'hysterical', back: 'kontrolsüz aşırı duygudan kaynaklanan veya etkilenen, histerik', sampleSentence: 'The crowd became hysterical when the band appeared on stage.' },
        { front: 'benevolent', back: 'iyi niyetli ve nazik, hayırsever', sampleSentence: 'The benevolent donor contributed millions to charity.' },
        { front: 'compassionate', back: 'başkalarına sempati ve ilgi gösteren veya hisseden, merhametli', sampleSentence: 'The nurse was compassionate toward all her patients.' },
        { front: 'empathy', back: 'başkasının duygularını anlama ve paylaşma yeteneği, empati', sampleSentence: 'Her empathy for the homeless led her to volunteer at the shelter.' },
        { front: 'charismatic', back: 'bağlılık uyandıran zorlayıcı bir çekiciliğe sahip, karizmatik', sampleSentence: 'The charismatic leader inspired confidence in his followers.' },
        { front: 'engaging', back: 'çekici ve cazip; ilgiyi çeken, ilgi çekici', sampleSentence: 'His engaging smile made him easy to talk to.' },
        { front: 'gracious', back: 'kibar, nazik ve hoş, zarif', sampleSentence: 'She was a gracious host, making everyone feel welcome.' },
        { front: 'courteous', back: 'kibar, saygılı veya düşünceli tavırlı, nazik', sampleSentence: 'He was always courteous to his elders.' },
        { front: 'cordial', back: 'sıcak ve dostane, samimi', sampleSentence: 'They maintained a cordial relationship despite their differences.' },
        { front: 'tact', back: 'insanları rahatsız etmeden zor durumlarla başa çıkma becerisi, incelik', sampleSentence: 'She handled the delicate matter with great tact.' },
        { front: 'emulate', back: 'genellikle taklit ederek eşleştirmek veya geçmek, öykünmek', sampleSentence: 'Young athletes often emulate their sports heroes.' },
        { front: 'flatter', back: 'genellikle samimiyetsizce aşırı övmek, dalkavukluk etmek', sampleSentence: 'He tried to flatter his boss to get a promotion.' },
        { front: 'fidelity', back: 'bir kişiye, davaya veya inanca sadakat, bağlılık', sampleSentence: 'She showed unwavering fidelity to her principles.' },
        { front: 'steadfast', back: 'kararlı veya görevle ilgili olarak sağlam ve değişmez, sebatkar', sampleSentence: 'Despite opposition, he remained steadfast in his convictions.' },
        { front: 'fickle', back: 'özellikle sadakat veya sevgilerde sık sık değişen, kararsız', sampleSentence: 'The weather in spring can be quite fickle.' },
        { front: 'headstrong', back: 'kendi başına buyruk ve inatçı, dik kafalı', sampleSentence: 'The headstrong child refused to listen to advice.' },
        { front: 'obstinate', back: 'inatla fikir veya hareket tarzını değiştirmeyi reddeden, inatçı', sampleSentence: 'His obstinate refusal to compromise led to conflict.' },
        { front: 'exasperate', back: 'yoğun şekilde sinirlendirmek; çileden çıkarmak', sampleSentence: 'The constant delays began to exasperate the passengers.' },
        { front: 'infuriate', back: 'son derece öfkelendirmek, çileden çıkarmak', sampleSentence: 'The unfair decision infuriated the team members.' },
        { front: 'indignant', back: 'algılanan haksız muameleye öfke hisseden veya gösteren, öfkeli', sampleSentence: 'She was indignant at the false accusations.' },
        { front: 'mock', back: 'alaycı veya küçümseyici bir şekilde alay etmek veya gülmek', sampleSentence: 'It is cruel to mock someone for their appearance.' },
        { front: 'malicious', back: 'zarar verme niyetinde olan; kindar, kötü niyetli', sampleSentence: 'The malicious rumors damaged her reputation.' },
        { front: 'exploit', back: 'kendi çıkarları için bencilce kullanmak, sömürmek', sampleSentence: 'The company was accused of exploiting its workers.' },
        { front: 'belittle', back: 'birini veya bir şeyi önemsiz göstermek, küçümsemek', sampleSentence: 'Don\'t belittle his achievements; he worked hard for them.' },
        { front: 'jeer', back: 'kaba ve alaycı sözler söylemek, alay etmek', sampleSentence: 'The crowd began to jeer when the speaker made a mistake.' },
        { front: 'snub', back: 'küçümseyerek reddetmek, görmezden gelmek veya ret etmek', sampleSentence: 'She felt snubbed when they didn\'t invite her to the party.' },
        { front: 'condescend', back: 'üstünlük duyguları göstermek; tepeden bakmak, küçümsemek', sampleSentence: 'He would condescend to explain things as if we were children.' },
        { front: 'disdain', back: 'birinin veya bir şeyin saygıya layık olmadığı hissi, küçümseme', sampleSentence: 'She looked at the offer with disdain and refused it.' },
        { front: 'hypocrite', back: 'belirttiği inançların aksine davranan kişi, ikiyüzlü', sampleSentence: 'He was a hypocrite who preached honesty but lied constantly.' },
        { front: 'admonish', back: 'sıkı bir şekilde uyarmak veya azarlamak, ihtar etmek', sampleSentence: 'The teacher admonished the students for being late.' },
        { front: 'reprimand', back: 'resmi olarak azarlamak, paylamak', sampleSentence: 'The employee was reprimanded for violating company policy.' },
        { front: 'vivacious', back: 'çekici şekilde canlı ve hareketli, neşeli', sampleSentence: 'Her vivacious personality brightened every room she entered.' },
        { front: 'animated', back: 'hayat veya heyecan dolu; canlı, hareketli', sampleSentence: 'They had an animated discussion about the movie.' },
        { front: 'extrovert', back: 'dışa dönük, sosyal olarak kendinden emin kişi', sampleSentence: 'As an extrovert, she loved meeting new people at parties.' },
        { front: 'introvert', back: 'utangaç, içine kapanık kişi, içe dönük', sampleSentence: 'The introvert preferred reading alone to attending social events.' },
        { front: 'reserved', back: 'duygu veya görüşlerini açığa çıkarmakta yavaş olan, çekingen', sampleSentence: 'He was reserved by nature and didn\'t share much about himself.' },
        { front: 'timid', back: 'cesaret veya güven eksikliği gösteren; kolayca korkutulan, ürkek', sampleSentence: 'The timid child hid behind her mother when strangers approached.' },
        { front: 'meek', back: 'sessiz, nazik ve kolayca etkilenen; uysal, yumuşak başlı', sampleSentence: 'Despite his meek demeanor, he possessed great inner strength.' },
        { front: 'docile', back: 'kontrol veya talimatı kabul etmeye hazır; uysal, itaatkâr', sampleSentence: 'The docile horse was perfect for beginner riders.' },
        { front: 'subdued', back: 'sessiz ve oldukça düşünceli veya depresif, sakin, bastırılmış', sampleSentence: 'After the bad news, everyone was in a subdued mood.' },
      ],
    },
  ];

  const ensureLocalDefaultsSeeded = async () => {
    try {
      const seeded = await AsyncStorage.getItem(DEFAULT_SEED_FLAG);
      if (seeded === 'true') return;

      const current = await repo.getAllDecks();
      if ((current?.length || 0) > 0) {
        await AsyncStorage.setItem(DEFAULT_SEED_FLAG, 'true');
        return;
      }

      // Create default decks and seed sample cards
      for (const spec of defaultDeckSpecs) {
        const newDeck = await repo.createDeck(spec.name);
        if (newDeck?.id && Array.isArray(spec.cards)) {
          for (const card of spec.cards) {
            await repo.addCard(newDeck.id, card);
          }
        }
      }

      await AsyncStorage.setItem(DEFAULT_SEED_FLAG, 'true');
    } catch (e) {
      // Non-fatal; continue without defaults
      console.warn('ensureLocalDefaultsSeeded error:', e?.message || e);
    }
  };

  const ensureCloudDefaultsSeeded = async () => {
    if (!auth.currentUser) return;
    
    // Guard against concurrent seeding operations
    if (seedingInProgress) {
      console.log('[ensureCloudDefaultsSeeded] Seeding already in progress, skipping');
      return;
    }
    
    try {
      const prefsRef = ref(db, `users/${auth.currentUser.uid}/preferences`);
      const prefsSnap = await get(prefsRef);
      const prefs = prefsSnap.exists() ? prefsSnap.val() : {};
      if (prefs.seededDefaultsV3 === true) {
        console.log('[ensureCloudDefaultsSeeded] Already seeded, skipping');
        return;
      }

      // Check if user has any decks already
      const userDecksRef = ref(db, `users/${auth.currentUser.uid}/decks`);
      const decksSnap = await get(userDecksRef);
      const hasDecks = decksSnap.exists() && Object.keys(decksSnap.val() || {}).length > 0;
      if (hasDecks) {
        console.log('[ensureCloudDefaultsSeeded] User already has decks, marking as seeded');
        await update(prefsRef, { seededDefaultsV3: true });
        return;
      }

      // Mark seeding as in progress
      setSeedingInProgress(true);
      console.log('[ensureCloudDefaultsSeeded] Starting to seed default decks with Turkish definitions');
      
      // Set the flag FIRST (optimistically) to prevent race conditions
      await update(prefsRef, { seededDefaultsV3: true });

      // Track created deck IDs for auto-generating media
      const createdDeckIds = [];

      // Seed default decks with sample cards
      for (const spec of defaultDeckSpecs) {
        const newDeckRef = push(userDecksRef);
        const newDeckId = newDeckRef.key;
        createdDeckIds.push(newDeckId);
        
        const cardsObj = {};
        
        // Create cards WITHOUT media first (instant, non-blocking)
        if (Array.isArray(spec.cards)) {
          spec.cards.forEach((card, idx) => {
            const cardId = `card_${idx}`;
            
            // Base card data only - no media yet
            const cardData = {
              id: cardId,
              front: card.front,
              back: card.back,
              sampleSentence: card.sampleSentence || '',
              isKnown: false,
              lastReviewed: null,
              createdAt: new Date().toISOString(),
            };
            
            cardsObj[cardId] = cardData;
          });
        }

        const newDeck = {
          id: newDeckId,
          name: spec.name,
          createdAt: new Date().toISOString(),
          creatorId: auth.currentUser.uid,
          creatorName: auth.currentUser.displayName || auth.currentUser.email || 'User',
          isShared: false,
          cards: cardsObj,
        };

        // Deck plus its summary, so the deck list shows it right away.
        await update(
          ref(db, `users/${auth.currentUser.uid}`),
          buildDeckWriteUpdates(newDeckId, newDeck)
        );
        console.log(`[ensureCloudDefaultsSeeded] ✅ Created deck instantly: ${spec.name} (${spec.cards.length} cards)`);
      }

      console.log('[ensureCloudDefaultsSeeded] ✅ Seeding completed successfully - decks created instantly!');
      
      // Load and apply pre-generated media in the background (non-blocking)
      // This happens asynchronously so the user sees their deck immediately
      loadAndApplyDefaultMedia(createdDeckIds);
      
    } catch (e) {
      console.error('[ensureCloudDefaultsSeeded] Error:', e?.message || e);
      // If there was an error, reset the flag so seeding can be retried
      try {
        const prefsRef = ref(db, `users/${auth.currentUser.uid}/preferences`);
        await update(prefsRef, { seededDefaultsV3: false });
      } catch (resetError) {
        console.error('[ensureCloudDefaultsSeeded] Failed to reset seeding flag:', resetError);
      }
    } finally {
      setSeedingInProgress(false);
    }
  };

  /**
   * Load pre-generated media asynchronously and apply to decks
   * This runs in the background after decks are created instantly
   */
  const loadAndApplyDefaultMedia = async (deckIds) => {
    if (!deckIds || deckIds.length === 0) return;
    
    console.log('[loadAndApplyDefaultMedia] 🚀 Loading media in background (non-blocking)...');
    
    // Run asynchronously without blocking the UI
    setTimeout(async () => {
      try {
        // Load media asynchronously (this is where the 12.4 MB file is loaded)
        const mediaData = await loadDefaultDeckMedia();
        
        if (!mediaData || !mediaData.cards || Object.keys(mediaData.cards).length === 0) {
          console.log('[loadAndApplyDefaultMedia] No pre-generated media found, will generate on-demand');
          startDefaultDeckMediaGeneration(deckIds);
          return;
        }
        
        console.log('[loadAndApplyDefaultMedia] ✅ Media loaded! Applying to cards...');
        
        // Apply media to each deck progressively
        for (const deckId of deckIds) {
          try {
            // Get the deck's cards
            const userCardsRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}/cards`);
            const snapshot = await get(userCardsRef);
            
            if (!snapshot.exists()) continue;
            
            const cards = snapshot.val();
            let updatedCount = 0;
            
            // Update each card with its pre-generated media
            for (const [cardId, card] of Object.entries(cards)) {
              if (!card.front) continue;
              
              const media = mediaData.cards[card.front];
              if (!media) continue;
              
              const updates = {};
              
              // Add image data if available
              if (media.imageData) {
                updates[`${cardId}/imageData`] = media.imageData;
                updates[`${cardId}/imageGeneratedAt`] = mediaData.generatedAt || new Date().toISOString();
              }
              
              // Add audio URLs/data if available
              if (media.audio) {
                if (media.audio.word) updates[`${cardId}/wordAudioUrl`] = media.audio.word;
                if (media.audio.definition) updates[`${cardId}/definitionAudioUrl`] = media.audio.definition;
                if (media.audio.sentence) updates[`${cardId}/sentenceAudioUrl`] = media.audio.sentence;
                if (media.audio.word || media.audio.definition || media.audio.sentence) {
                  updates[`${cardId}/audioGeneratedAt`] = mediaData.generatedAt || new Date().toISOString();
                }
              }
              
              // Apply updates if any
              if (Object.keys(updates).length > 0) {
                await update(userCardsRef, updates);
                updatedCount++;
              }
            }
            
            console.log(`[loadAndApplyDefaultMedia] ✅ Applied media to ${updatedCount} cards in deck ${deckId}`);
          } catch (error) {
            console.error(`[loadAndApplyDefaultMedia] Error applying media to deck ${deckId}:`, error);
          }
        }
        
        console.log('[loadAndApplyDefaultMedia] ✅ All done! Pre-generated media applied successfully');
      } catch (error) {
        console.error('[loadAndApplyDefaultMedia] Error loading media:', error);
        // Fallback to on-demand generation
        console.log('[loadAndApplyDefaultMedia] Falling back to on-demand generation');
        startDefaultDeckMediaGeneration(deckIds);
      }
    }, 1000); // Small delay to ensure deck creation UI is rendered first
  };

  /**
   * Emit a media generation progress event to the UI
   */
  const emitMediaProgress = (type, data) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mediaGenerationProgress', {
        detail: { type, data }
      }));
    }
  };

  /**
   * Start automatic generation of images and audio for default deck cards
   * This runs in the background and doesn't block the user experience
   */
  const startDefaultDeckMediaGeneration = async (deckIds) => {
    if (!deckIds || deckIds.length === 0) return;
    
    console.log(`[startDefaultDeckMediaGeneration] Starting background media generation for ${deckIds.length} deck(s)`);
    
    // Run asynchronously without blocking
    setTimeout(async () => {
      try {
        // Import the utilities
        const { generateImagesForDeck } = await import('../utils/imageGeneration');
        const { generateAudioForDeck } = await import('../utils/deckAudioGeneration');
        
        for (const deckId of deckIds) {
          console.log(`[startDefaultDeckMediaGeneration] Processing deck: ${deckId}`);
          
          try {
            // Get all cards in the deck
            const userCardsRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}/cards`);
            const snapshot = await get(userCardsRef);
            
            if (snapshot.exists()) {
              const cards = Object.entries(snapshot.val()).map(([id, card]) => ({ ...card, id }));
              console.log(`[startDefaultDeckMediaGeneration] Found ${cards.length} cards in deck ${deckId}`);
              
              // Generate images for all cards (background process)
              console.log(`[startDefaultDeckMediaGeneration] Starting image generation for deck ${deckId}...`);
              generateImagesForDeck(deckId, true, (current, total, word) => {
                console.log(`[Image Progress] ${current}/${total} - ${word}`);
                // Emit progress event to UI
                emitMediaProgress('image_progress', { current, total, word });
              }).then(result => {
                console.log(`[startDefaultDeckMediaGeneration] Image generation complete for deck ${deckId}:`, result);
                emitMediaProgress('image_complete', { deckId, result });
              }).catch(error => {
                console.error(`[startDefaultDeckMediaGeneration] Image generation failed for deck ${deckId}:`, error);
              });
              
              // Wait a bit before starting audio generation to stagger the load
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Generate audio for all cards (background process)
              console.log(`[startDefaultDeckMediaGeneration] Starting audio generation for deck ${deckId}...`);
              generateAudioForDeck(deckId, cards, 'alloy', (current, total, card) => {
                console.log(`[Audio Progress] ${current}/${total} - ${card.front}`);
                // Emit progress event to UI
                emitMediaProgress('audio_progress', { current, total, word: card.front });
              }).then(result => {
                console.log(`[startDefaultDeckMediaGeneration] Audio generation complete for deck ${deckId}:`, result);
                emitMediaProgress('audio_complete', { deckId, result });
                // All generation complete
                emitMediaProgress('all_complete', { deckId });
              }).catch(error => {
                console.error(`[startDefaultDeckMediaGeneration] Audio generation failed for deck ${deckId}:`, error);
              });
            }
          } catch (deckError) {
            console.error(`[startDefaultDeckMediaGeneration] Error processing deck ${deckId}:`, deckError);
          }
        }
        
        console.log('[startDefaultDeckMediaGeneration] Background media generation initiated for all decks');
      } catch (error) {
        console.error('[startDefaultDeckMediaGeneration] Failed to start media generation:', error);
      }
    }, 3000); // Wait 3 seconds after deck creation before starting
  };

  // Function to force refresh the decks data
  const refreshDecks = useCallback(() => {
    console.log("Forcing refresh of decks data");
    setRefreshKey(prevKey => prevKey + 1);
  }, []);

  // Function to check and auto-fork decks
  const checkAndAutoForkDecks = useCallback(async () => {
    if (!auth.currentUser) return;

    try {
      // Only fetch the shared decks that are actually flagged, instead of the
      // entire sharedDecks tree (which contains every card + media of every
      // shared deck and used to download on every app launch).
      const sharedDecksRef = ref(db, 'sharedDecks');
      const [forkSnapshot, removedSnapshot] = await Promise.all([
        get(query(sharedDecksRef, orderByChild('autoForkForAll'), equalTo(true))),
        get(query(sharedDecksRef, orderByChild('removedFromAutoFork'), equalTo(true))),
      ]);

      const flaggedForFork = [];
      const flaggedForRemoval = [];
      if (forkSnapshot.exists()) {
        forkSnapshot.forEach((deckSnapshot) => {
          flaggedForFork.push({ id: deckSnapshot.key, ...deckSnapshot.val() });
        });
      }
      if (removedSnapshot.exists()) {
        removedSnapshot.forEach((deckSnapshot) => {
          flaggedForRemoval.push({ id: deckSnapshot.key, ...deckSnapshot.val() });
        });
      }

      // Common case: nothing is flagged, nothing to do, no heavy reads at all.
      if (!flaggedForFork.length && !flaggedForRemoval.length) {
        return;
      }

      // Get user's preferences to check for deleted/already-processed decks
      const userPrefsRef = ref(db, `users/${auth.currentUser.uid}/preferences`);
      const userPrefsSnapshot = await get(userPrefsRef);
      const userPrefs = userPrefsSnapshot.exists() ? userPrefsSnapshot.val() : {};
      const deletedAutoForkedDecks = userPrefs.deletedAutoForkedDecks || [];
      const processedAutoForkDecks = userPrefs.processedAutoForkDecks || {};

      // Decide what still needs work; anything already processed on this
      // account is skipped so we don't re-download the user's decks each launch.
      const forkCandidates = flaggedForFork.filter(
        (deckData) =>
          deckData.removedFromAutoFork !== true &&
          !deletedAutoForkedDecks.includes(deckData.id) &&
          processedAutoForkDecks[deckData.id] !== true
      );
      const removalCandidates = flaggedForRemoval.filter(
        (deckData) => processedAutoForkDecks[`removed_${deckData.id}`] !== true
      );

      if (!forkCandidates.length && !removalCandidates.length) {
        return;
      }

      // Something actually needs doing — load the user's decks once.
      const userDecksRef = ref(db, `users/${auth.currentUser.uid}/decks`);
      const userDecksSnapshot = await get(userDecksRef);
      const userDecks = userDecksSnapshot.exists() ? userDecksSnapshot.val() : {};

      const decksToFork = [];
      const decksToRemove = [];

      removalCandidates.forEach((deckData) => {
        // Find any existing copies of this deck in user's collection to remove
        Object.entries(userDecks).forEach(([userDeckId, userDeckData]) => {
          if (
            userDeckData.autoForked === true &&
            userDeckData.forkedFrom &&
            userDeckData.forkedFrom.id === deckData.id
          ) {
            decksToRemove.push(userDeckId);
          }
        });

        if (!deletedAutoForkedDecks.includes(deckData.id)) {
          deletedAutoForkedDecks.push(deckData.id);
        }
        processedAutoForkDecks[`removed_${deckData.id}`] = true;
      });

      forkCandidates.forEach((deckData) => {
        // Check if user already has this deck or a forked version
        let alreadyHasDeck = false;

        Object.values(userDecks).forEach((userDeck) => {
          if (
            userDeck.id === deckData.id ||
            (userDeck.forkedFrom && userDeck.forkedFrom.id === deckData.id)
          ) {
            alreadyHasDeck = true;
          }
        });

        if (!alreadyHasDeck) {
          decksToFork.push(deckData);
        }
        processedAutoForkDecks[deckData.id] = true;
      });

      // Handle decks that need to be removed (with their summary and media)
      const removePromises = decksToRemove.map(deckId => {
        console.log(`Removing auto-forked deck ${deckId} that was marked for removal`);
        forgetDeckSummary(auth.currentUser.uid, deckId);
        return update(ref(db, `users/${auth.currentUser.uid}`), {
          [`decks/${deckId}`]: null,
          [`deckSummaries/${deckId}`]: null,
          [`cardMedia/${deckId}`]: null,
        });
      });

      // Handle decks that need to be auto-forked
      const forkPromises = decksToFork.map((deckToFork) => {
        return forkDeck(deckToFork, true); // Second param indicates this is an auto-fork
      });

      // Remember what was handled so future launches can skip the heavy work
      await update(userPrefsRef, { deletedAutoForkedDecks, processedAutoForkDecks });

      // Execute all operations
      if (removePromises.length > 0 || forkPromises.length > 0) {
        await Promise.all([...removePromises, ...forkPromises]);

        // Refresh decks after changes
        setRefreshKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error checking for auto-fork decks:', error);
    }
  }, [user?.uid]);

  useEffect(() => {
    console.log(`useDecks hook - refreshKey: ${refreshKey} - cloud: ${cloud}`);

    // Offline-first branch (no auth required)
    if (!cloud) {
      let cancelled = false;
      const load = async () => {
        try {
          setLoading(true);
          if (DEFAULT_DECK_SEEDING_ENABLED) {
            await ensureLocalDefaultsSeeded();
          }
          const data = await repo.getAllDecks();
          if (!cancelled) {
            setDecks(data);
            setError(null);
          }
        } catch (e) {
          console.error('Error loading local decks:', e);
          if (!cancelled) {
            setDecks([]);
            setError('Error loading decks');
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      load();
      return () => {
        cancelled = true;
      };
    }

    // Cloud branch (Firebase)
    console.log(`useDecks hook - auth.currentUser:`, auth.currentUser ? auth.currentUser.uid : "No user");

    if (!auth.currentUser) {
      console.log("useDecks: No current user, returning empty decks");
      setDecks([]);
      setLoading(false);
      return;
    }

    const uid = auth.currentUser.uid;

    // Check for auto-fork decks (guarded by feature flag), once per session
    if (AUTO_FORK_ENABLED && !autoForkCheckedFor.has(uid)) {
      autoForkCheckedFor.add(uid);
      checkAndAutoForkDecks();
    }

    let unsubscribe;
    let cancelled = false;

    (async () => {
      try {
        if (DEFAULT_DECK_SEEDING_ENABLED) {
          await ensureCloudDefaultsSeeded();
        }
        if (cancelled) return;

        // The deck list only needs each deck's name and card counts, which
        // live in the small deckSummaries node. The decks themselves (every
        // card, plus pictures and audio in older decks) are never downloaded
        // here: that download used to hold up every write behind it on the
        // shared connection, which is what made creating a deck take minutes.
        const summariesRef = ref(db, `users/${uid}/deckSummaries`);
        let firstSnapshot = true;

        unsubscribe = onValue(
          summariesRef,
          (snapshot) => {
            if (cancelled) return;
            const data = snapshot.val();
            const summaryDecks = decksFromSummaries(data);
            console.log(`[useDecks] Deck list from summaries: ${summaryDecks.length} decks`);
            setDecks(summaryDecks);
            setError(null);

            if (firstSnapshot) {
              firstSnapshot = false;
              // Fills in summaries for decks that have none (older decks),
              // drops summaries of deleted decks, and moves old inline media
              // out of the cards. Runs over REST, so it never blocks the app.
              const sync = syncDecksInBackground(uid, data || {});
              if (summaryDecks.length) {
                setLoading(false);
              } else {
                sync.then(() => {
                  if (!cancelled) setLoading(false);
                });
              }
            } else if (summaryDecks.length) {
              setLoading(false);
            }
          },
          (error) => {
            console.error('Error loading decks:', error);
            setError('Error loading decks');
            setDecks([]);
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('Error setting up decks listener:', error);
        setError('Error loading decks');
        setDecks([]);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [cloud, user?.uid, refreshKey]); // Re-run when mode/user/refreshKey changes

  const createDeck = async (name, isShared = false) => {
    try {
      const deck = await createDeckAction(name, { isShared });
      if (!cloud) {
        // Refresh local state
        setDecks(await repo.getAllDecks());
      }
      return deck;
    } catch (error) {
      console.error('Error creating deck:', error);
      throw error;
    }
  };

  // Backward-compatible helper used by some screens
  const addDeck = async (name) => {
    const deck = await createDeck(name);
    return deck?.id;
  };

  const deleteDeck = async (deckId) => {
    try {
      const ok = await deleteDeckAction(deckId);
      if (!cloud) {
        setDecks(await repo.getAllDecks());
      }
      return ok;
    } catch (error) {
      console.error('Error deleting deck:', error);
      throw error;
    }
  };

  const shareDeck = async (deckId, isShared = undefined) => {
    if (!cloud) {
      // Not supported in local mode
      return false;
    }

    if (!auth.currentUser) {
      console.error("Cannot share deck: No authenticated user");
      throw new Error('You must be logged in to share a deck');
    }

    try {
      // First, get the deck data
      const userDeckRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}`);

      // Create a new listener just for this operation
      return new Promise((resolve, reject) => {
        onValue(userDeckRef, async (snapshot) => {
          try {
            const deckData = snapshot.val();
            if (!deckData) {
              throw new Error('Deck not found');
            }

            // If isShared is not provided, toggle the current value or default to true
            const currentIsShared = deckData.isShared || false;
            const newIsShared = isShared !== undefined ? isShared : !currentIsShared;

            // Update the isShared flag in user's deck
            const userDeckShareRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}/isShared`);
            await set(userDeckShareRef, newIsShared);

            if (newIsShared) {
              // Public copies carry pictures/audio inline: other users cannot
              // read this account's media node.
              const mediaSource = await withStoredMedia(auth.currentUser.uid, {
                ...deckData,
                id: deckId, // the media node is keyed by the database key
              });
              const publicData = { ...mediaSource, id: deckData.id || deckId };

              // If sharing, copy to public decks
              const publicDeckRef = ref(db, `decks/${deckId}`);
              await set(publicDeckRef, {
                ...publicData,
                isShared: true,
                owner: auth.currentUser.uid,
                ownerEmail: auth.currentUser.email,
              });

              // Copy to sharedDecks for gallery (available to all users)
              const sharedDeckRef = ref(db, `sharedDecks/${deckId}`);
              const { ownerEmail: _omitOwnerEmail, ...safeDeck } = publicData || {};
              const isAdmin = auth.currentUser.email === 'ahmetkoc1@gmail.com';
              await set(sharedDeckRef, {
                ...safeDeck,
                owner: auth.currentUser.uid,
                creatorName: isAdmin ? 'Admin' : (auth.currentUser.displayName || auth.currentUser.email || 'User'),
                isShared: true,
                autoForkForAll: deckData.autoForkForAll || false
              });

              console.log("Deck shared successfully:", deckId);
            } else {
              // If unsharing, remove from public decks
              const publicDeckRef = ref(db, `decks/${deckId}`);
              await remove(publicDeckRef);

              // Remove from sharedDecks
              const sharedDeckRef = ref(db, `sharedDecks/${deckId}`);
              await remove(sharedDeckRef);

              console.log("Deck unshared successfully:", deckId);
            }

            resolve(true);
          } catch (error) {
            console.error('Error in share deck operation:', error);
            reject(error);
          }
        }, { onlyOnce: true });
      });
    } catch (error) {
      console.error('Error sharing deck:', error);
      throw error;
    }
  };

  // Add this function for handling auto-forking
  const forkDeck = async (sourceDeck, isAutoForked = false) => {
    if (!cloud) {
      // Not supported in local mode
      return null;
    }

    if (!auth.currentUser) return null;

    try {
      // Check if this is a deck that was marked for removal
      if (isAutoForked && sourceDeck.removedFromAutoFork === true) {
        console.log(`Skipping auto-fork for deck ${sourceDeck.id} as it was marked for removal`);
        return null;
      }

      // Check user preferences to see if this deck was explicitly deleted
      const userPrefsRef = ref(db, `users/${auth.currentUser.uid}/preferences`);
      const userPrefsSnapshot = await get(userPrefsRef);
      const userPrefs = userPrefsSnapshot.exists() ? userPrefsSnapshot.val() : {};
      const deletedAutoForkedDecks = userPrefs.deletedAutoForkedDecks || [];

      // Skip if user has explicitly deleted this deck
      if (isAutoForked && deletedAutoForkedDecks.includes(sourceDeck.id)) {
        console.log(`Skipping auto-fork for deck ${sourceDeck.id} as user has explicitly deleted it`);
        return null;
      }

      // Create a new deck reference
      const newDeckRef = push(ref(db, `users/${auth.currentUser.uid}/decks`));
      const newDeckId = newDeckRef.key;

      // Prepare the new deck object
      const newDeck = {
        ...sourceDeck,
        id: newDeckId,
        name: sourceDeck.name || 'Deck',
        creatorId: auth.currentUser.uid,
        creatorName: auth.currentUser.displayName || auth.currentUser.email || 'User',
        isShared: false,
        forkedFrom: {
          id: sourceDeck.id || '',
          name: sourceDeck.name || 'Unknown Deck',
          creatorName: sourceDeck.creatorName || 'Unknown Creator'
        },
        autoForked: isAutoForked
      };

      // Handle cards properly whether they're an array or object
      if (sourceDeck.cards) {
        newDeck.cards = {};
        // Handle both array and object formats
        if (Array.isArray(sourceDeck.cards)) {
          sourceDeck.cards.forEach((card, index) => {
            newDeck.cards[`card_${index}`] = card;
          });
        } else {
          newDeck.cards = { ...sourceDeck.cards };
        }
      }

      // Save the new forked deck: cards without their media, the media in the
      // media node, and the deck summary for the deck list.
      await update(
        ref(db, `users/${auth.currentUser.uid}`),
        buildDeckWriteUpdates(newDeckId, newDeck)
      );
      console.log(`Deck forked successfully. New ID: ${newDeckId}`);

      // Return the new deck ID
      return newDeckId;
    } catch (error) {
      console.error("Error forking deck:", error);
      return null;
    }
  };

  return { decks, loading, error, createDeck, addDeck, deleteDeck, shareDeck, refreshDecks };
}
