import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API with your API key
const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY);

export async function generateDefinitions(words) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `For each of the following words, provide a clear and concise definition and a simple example sentence using the word.
    Return the result in CSV format with three columns: word,definition,sample_sentence
    Do not include headers, just the data rows.
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
