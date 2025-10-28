import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

// Initialize the Gemini API with your API key
const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY);

// Initialize OpenAI API for image generation (conditionally, only if API key is provided)
// Note: Currently using Pollinations.ai for image generation (free, no API key needed)
const openai = process.env.EXPO_PUBLIC_OPENAI_API_KEY 
  ? new OpenAI({
      apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true // Required for Expo/React Native
    })
  : null;

export async function generateDefinitions(words) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `For each of the following words, provide a clear and concise definition in TURKISH and a simple example sentence in ENGLISH using the word.
    Return the result in CSV format with three columns: word,definition,sample_sentence
    Do not include headers, just the data rows.
    IMPORTANT: The definition MUST be in Turkish. The sample sentence MUST be in English.
    Sample sentences should be natural examples that clearly demonstrate the meaning of the word.
    Words: ${words.join(', ')}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Parse CSV response into array of [word, definition, sampleSentence] tuples
    return response
      .trim()
      .split('\n')
      .map(line => {
        // Split by comma but handle cases where the sentence itself might contain commas
        const firstCommaIndex = line.indexOf(',');
        if (firstCommaIndex === -1) return [line.trim(), "", ""];
        
        const word = line.substring(0, firstCommaIndex).trim();
        const restOfLine = line.substring(firstCommaIndex + 1);
        
        const secondCommaIndex = restOfLine.indexOf(',');
        if (secondCommaIndex === -1) return [word, restOfLine.trim(), ""];
        
        const definition = restOfLine.substring(0, secondCommaIndex).trim();
        const sampleSentence = restOfLine.substring(secondCommaIndex + 1).trim();
        
        return [word, definition, sampleSentence];
      });
  } catch (error) {
    console.error('Error generating definitions:', error);
    throw error;
  }
}

/**
 * Extract underlined text from an image using Gemini Vision
 * @param {string} base64Image - Base64 encoded image data
 * @returns {Promise<string>} - The extracted underlined word(s) from the image
 */
export async function extractTextFromImage(base64Image) {
  try {
    // Use the same model that we use for definitions for consistency
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Create a FileObject with the image data
    const imageObj = {
      inlineData: {
        data: base64Image,
        mimeType: "image/jpeg", // Adjust based on actual image format
      },
    };
    
    const prompt = `Analyze this image and extract ONLY the underlined words or phrases.
    Focus exclusively on text that has a line beneath it (underlined text).
    If multiple words are underlined separately, return them as a comma-separated list.
    If no text is underlined, respond with "No underlined text found".
    Return only the underlined text, with no additional commentary.`;
    
    // Generate content with the image and prompt
    const result = await model.generateContent([prompt, imageObj]);
    const response = result.response.text().trim();
    
    console.log('Extracted underlined text from image:', response);
    
    if (response === "No underlined text found") {
      return null;
    }
    
    return response;
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw error;
  }
}

/**
 * Generate an optimized image prompt from a sample sentence
 * @param {string} sampleSentence - The sample sentence to create a prompt from
 * @param {number} retryCount - Current retry attempt (default 0)
 * @returns {Promise<string>} - An optimized image generation prompt
 */
export async function generateImagePrompt(sampleSentence, retryCount = 0) {
  const MAX_RETRIES = 3;
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `You are an expert at creating concise, vivid image generation prompts.
    
Given this sentence: "${sampleSentence}"

Create a SHORT, clear image generation prompt (max 15 words) that captures the key visual scene or concept.
Focus on: concrete objects, actions, setting, and mood.
Avoid: text, words, letters, abstract concepts that can't be visualized.
Style: Simple, clear, realistic illustration style.

Return ONLY the image prompt, nothing else.`;
    
    const result = await model.generateContent(prompt);
    const imagePrompt = result.response.text().trim();
    
    console.log('Generated image prompt:', imagePrompt);
    return imagePrompt;
  } catch (error) {
    console.error('Error generating image prompt:', error);
    
    // Check if it's a 503 overload error and retry
    if (error.message?.includes('503') || error.message?.includes('overloaded')) {
      if (retryCount < MAX_RETRIES) {
        const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.log(`⏳ API overloaded. Retrying in ${waitTime/1000}s... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return generateImagePrompt(sampleSentence, retryCount + 1);
      }
    }
    
    throw error;
  }
}

/**
 * Generate an image for a flashcard using Pollinations.ai
 * Note: Pollinations.ai works from browsers (no CORS issues), is free, and reliable
 * OpenAI DALL-E 3 requires a backend server due to CORS restrictions
 * @param {string} sampleSentence - The sample sentence to generate an image for
 * @returns {Promise<string>} - Base64 encoded image data
 */
export async function generateCardImage(sampleSentence) {
  try {
    if (!sampleSentence || sampleSentence.trim() === '') {
      console.warn('No sample sentence provided for image generation');
      return null;
    }

    // First, generate an optimized prompt
    const imagePrompt = await generateImagePrompt(sampleSentence);
    
    console.log('🎨 Generating image with Pollinations.ai for prompt:', imagePrompt);
    
    // Use Pollinations.ai - free, no API key needed, works from browsers
    const encodedPrompt = encodeURIComponent(imagePrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&enhance=true`;
    
    console.log('⏳ Fetching image from Pollinations.ai...');
    
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    // Convert to base64
    // Handle Node.js (no FileReader) vs Browser (has FileReader)
    let base64;
    if (typeof window === 'undefined') {
      // Node.js environment
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      base64 = buffer.toString('base64');
    } else {
      // Browser environment
      const blob = await response.blob();
      base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          // Extract base64 data (remove data:image/png;base64, prefix)
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    
    console.log('✅ Image generated successfully with Pollinations.ai');
    return base64;
  } catch (error) {
    console.error('❌ Error generating card image:', error);
    return null; // Return null on error, flashcards still work without images
  }
}

/**
 * Alternative: Generate image using Pollinations.ai (Free, no API key)
 * Uncomment and use this if you want a free alternative to DALL-E 3
 */
/*
export async function generateCardImageWithPollinations(sampleSentence) {
  try {
    if (!sampleSentence || sampleSentence.trim() === '') {
      return null;
    }

    const imagePrompt = await generateImagePrompt(sampleSentence);
    const encodedPrompt = encodeURIComponent(imagePrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&enhance=true`;
    
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    const blob = await response.blob();
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    
    return base64;
  } catch (error) {
    console.error('Error with Pollinations.ai:', error);
    return null;
  }
}
*/