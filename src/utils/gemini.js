import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API with your API key
const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY);

export async function generateDefinitions(words) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `For each of the following words, provide a clear and concise definition. 
    Return the result in CSV format with two columns: word,definition
    Do not include headers, just the data rows.
    Words: ${words.join(', ')}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Parse CSV response into array of [word, definition] pairs
    return response
      .trim()
      .split('\n')
      .map(line => {
        const [word, definition] = line.split(',').map(s => s.trim());
        return [word, definition];
      });
  } catch (error) {
    console.error('Error generating definitions:', error);
    throw error;
  }
}
