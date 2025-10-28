/**
 * One-time script to generate all images and audio for the default deck
 * Run this once, and the media will be stored for all future users
 * 
 * Usage: node scripts/generate-default-deck-media.js
 */

// Load environment variables from .env file
require('dotenv').config();

const fs = require('fs');
const path = require('path');

// Import Firebase and other dependencies
// Note: This script should be run in a Node environment with Firebase configured

const defaultCards = [
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
];

/**
 * Check if required dependencies are installed
 */
function checkDependencies() {
  try {
    require('openai');
    require('@google/generative-ai');
    require('dotenv');
    return true;
  } catch (error) {
    console.error('❌ ERROR: Missing required dependencies');
    console.error('Please run: npm install');
    return false;
  }
}

/**
 * Validate API keys before starting
 */
function validateAPIKeys() {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  
  if (!geminiKey) {
    console.error('❌ ERROR: GEMINI_API_KEY not found in .env file');
    console.error('Please add your Gemini API key to .env:');
    console.error('GEMINI_API_KEY=your_key_here\n');
    return false;
  }
  
  if (!openaiKey) {
    console.error('❌ ERROR: OPENAI_API_KEY not found in .env file');
    console.error('Please add your OpenAI API key to .env:');
    console.error('OPENAI_API_KEY=your_key_here\n');
    return false;
  }
  
  console.log('✅ API keys validated');
  console.log(`   Gemini: ${geminiKey.substring(0, 10)}...`);
  console.log(`   OpenAI: ${openaiKey.substring(0, 10)}...\n`);
  
  return true;
}

/**
 * Main function to generate all media
 */
async function generateAllMedia() {
  console.log('🚀 Starting media generation for default deck...');
  console.log(`📝 Processing ${defaultCards.length} cards\n`);
  
  // Check dependencies first
  if (!checkDependencies()) {
    console.error('\n💥 Cannot proceed without required dependencies');
    process.exit(1);
  }
  
  // Validate API keys
  if (!validateAPIKeys()) {
    console.error('\n💥 Cannot proceed without valid API keys');
    process.exit(1);
  }

  const results = {
    version: 'v3',
    generatedAt: new Date().toISOString(),
    cards: {}
  };

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < defaultCards.length; i++) {
    const card = defaultCards[i];
    const cardNum = i + 1;
    
    console.log(`\n[${cardNum}/${defaultCards.length}] Processing: "${card.front}"`);
    
    try {
      // Generate image
      console.log('  🎨 Generating image...');
      const imageData = await generateImage(card.sampleSentence);
      
      // Wait a bit to avoid rate limits
      await sleep(1000);
      
      // Generate audio files
      console.log('  🎤 Generating audio (word)...');
      const wordAudio = await generateAudio(card.front, 'word');
      await sleep(500);
      
      console.log('  🎤 Generating audio (definition)...');
      const defAudio = await generateAudio(card.back, 'definition');
      await sleep(500);
      
      console.log('  🎤 Generating audio (sentence)...');
      const sentAudio = await generateAudio(card.sampleSentence, 'sentence');
      await sleep(1000);
      
      // Store results
      results.cards[card.front] = {
        imageData: imageData,
        audio: {
          word: wordAudio,
          definition: defAudio,
          sentence: sentAudio
        }
      };
      
      successCount++;
      console.log(`  ✅ Success! (${successCount}/${defaultCards.length})`);
      
      // Save progress after every 5 cards
      if (cardNum % 5 === 0) {
        saveProgress(results);
        console.log(`  💾 Progress saved (${cardNum}/${defaultCards.length})`);
      }
      
    } catch (error) {
      failCount++;
      console.error(`  ❌ Error: ${error.message}`);
      
      // Store placeholder for failed cards
      results.cards[card.front] = {
        error: error.message,
        imageData: null,
        audio: {
          word: null,
          definition: null,
          sentence: null
        }
      };
    }
  }

  // Save final results
  console.log('\n📊 Generation Complete!');
  console.log(`✅ Success: ${successCount}/${defaultCards.length}`);
  console.log(`❌ Failed: ${failCount}/${defaultCards.length}`);
  
  saveFinalResults(results);
  console.log('\n💾 Results saved to: src/data/default-deck-media.json');
  console.log('🎉 Done! You can now use this data for all new users.');
}

/**
 * Generate image using Pollinations.ai
 */
async function generateImage(sampleSentence) {
  // This would use your existing generateCardImage function
  // For now, returning a placeholder
  const { generateCardImage } = require('../src/utils/gemini');
  return await generateCardImage(sampleSentence);
}

/**
 * Generate audio using OpenAI TTS (Node.js compatible)
 */
async function generateAudio(text, type) {
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Generate speech
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: text,
    });

    // Convert to base64
    const buffer = Buffer.from(await mp3Response.arrayBuffer());
    const base64Audio = buffer.toString('base64');
    
    // Return as data URL (can be used directly in audio players)
    return `data:audio/mp3;base64,${base64Audio}`;
  } catch (error) {
    console.error(`Error generating audio: ${error.message}`);
    return null;
  }
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Save progress to file
 */
function saveProgress(results) {
  const dataDir = path.join(__dirname, '..', 'src', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const filePath = path.join(dataDir, 'default-deck-media-progress.json');
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
}

/**
 * Save final results
 */
function saveFinalResults(results) {
  const dataDir = path.join(__dirname, '..', 'src', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const filePath = path.join(dataDir, 'default-deck-media.json');
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
  
  // Also save a backup
  const backupPath = path.join(dataDir, `default-deck-media-backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(results, null, 2));
}

// Run the script
if (require.main === module) {
  generateAllMedia()
    .then(() => {
      console.log('\n✨ All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { generateAllMedia };

