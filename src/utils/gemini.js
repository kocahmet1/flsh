import { createOpenAIClient, OPENAI_TEXT_MODEL_NAME } from './openaiConfig';

// Legacy filename kept for import compatibility. Text and vision requests now use OpenAI.

function createJsonTextFormat(name, schema, description) {
  return {
    format: {
      type: 'json_schema',
      name,
      strict: true,
      description,
      schema,
    },
  };
}

function parseStructuredResponse(response, fallbackMessage) {
  const output = (response?.output_text || '').trim();
  if (!output) {
    throw new Error(fallbackMessage);
  }

  return JSON.parse(output);
}

export async function generateDefinitions(words) {
  try {
    const client = await createOpenAIClient();
    const schema = {
      type: 'object',
      additionalProperties: false,
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['word', 'definition', 'sampleSentence'],
            properties: {
              word: { type: 'string' },
              definition: { type: 'string' },
              sampleSentence: { type: 'string' },
            },
          },
        },
      },
    };

    const response = await client.responses.create({
      model: OPENAI_TEXT_MODEL_NAME,
      instructions:
        'You create flashcard content. For each word, return a concise Turkish definition and a natural English example sentence.',
      input: `Words: ${words.join(', ')}`,
      text: createJsonTextFormat(
        'flashcard_definitions',
        schema,
        'Structured flashcard definitions and English example sentences.'
      ),
    });

    const parsed = parseStructuredResponse(
      response,
      'OpenAI returned an empty definition response.'
    );

    return (parsed.items || []).map((item) => [
      String(item.word || '').trim(),
      String(item.definition || '').trim(),
      String(item.sampleSentence || '').trim(),
    ]);
  } catch (error) {
    console.error('Error generating definitions:', error);
    throw error;
  }
}

/**
 * Extract underlined text from an image using OpenAI vision.
 * @param {string} base64Image - Base64 encoded image data
 * @returns {Promise<string>} - The extracted underlined word(s) from the image
 */
export async function extractTextFromImage(base64Image) {
  try {
    const client = await createOpenAIClient();
    const schema = {
      type: 'object',
      additionalProperties: false,
      required: ['hasUnderlinedText', 'underlinedItems'],
      properties: {
        hasUnderlinedText: { type: 'boolean' },
        underlinedItems: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    };

    const response = await client.responses.create({
      model: OPENAI_TEXT_MODEL_NAME,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text:
                'Analyze this image and extract only the underlined words or short phrases. Ignore all non-underlined text. If no underlined text exists, return an empty list.',
            },
            {
              type: 'input_image',
              image_url: `data:image/jpeg;base64,${base64Image}`,
              detail: 'high',
            },
          ],
        },
      ],
      text: createJsonTextFormat(
        'underlined_text_extraction',
        schema,
        'Underlined words extracted from a flashcard import image.'
      ),
    });

    const parsed = parseStructuredResponse(
      response,
      'OpenAI returned an empty OCR response.'
    );
    const items = (parsed.underlinedItems || [])
      .map((item) => String(item || '').trim())
      .filter(Boolean);

    console.log('Extracted underlined text from image:', items);

    if (!parsed.hasUnderlinedText || !items.length) {
      return null;
    }

    return items.join(', ');
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw error;
  }
}

/**
 * Generate an optimized image prompt from a sample sentence.
 * @param {string} sampleSentence - The sample sentence to create a prompt from
 * @param {number} retryCount - Current retry attempt (default 0)
 * @returns {Promise<string>} - An optimized image generation prompt
 */
export async function generateImagePrompt(sampleSentence, retryCount = 0) {
  const MAX_RETRIES = 3;

  try {
    const client = await createOpenAIClient();
    const schema = {
      type: 'object',
      additionalProperties: false,
      required: ['prompt'],
      properties: {
        prompt: { type: 'string' },
      },
    };

    const response = await client.responses.create({
      model: OPENAI_TEXT_MODEL_NAME,
      instructions:
        'You create short visual prompts for flashcard illustrations. Keep the prompt under 15 words and focus on concrete objects, actions, setting, and mood.',
      input: `Sentence: ${sampleSentence}`,
      text: createJsonTextFormat(
        'image_prompt',
        schema,
        'A short illustration prompt derived from a sentence.'
      ),
    });

    const parsed = parseStructuredResponse(
      response,
      'OpenAI returned an empty image prompt response.'
    );
    const imagePrompt = String(parsed.prompt || '').trim();

    console.log('Generated image prompt:', imagePrompt);
    return imagePrompt;
  } catch (error) {
    console.error('Error generating image prompt:', error);

    if (error.message?.includes('503') || error.message?.includes('overloaded')) {
      if (retryCount < MAX_RETRIES) {
        const waitTime = Math.pow(2, retryCount) * 1000;
        console.log(`Retrying image prompt generation in ${waitTime / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return generateImagePrompt(sampleSentence, retryCount + 1);
      }
    }

    throw error;
  }
}

/**
 * Generate an image for a flashcard using Pollinations.ai.
 * Note: Pollinations.ai works from browsers, is free, and remains the renderer here.
 * OpenAI is used to create the prompt only.
 * @param {string} sampleSentence - The sample sentence to generate an image for
 * @returns {Promise<string>} - Base64 encoded image data
 */
export async function generateCardImage(sampleSentence) {
  try {
    if (!sampleSentence || sampleSentence.trim() === '') {
      console.warn('No sample sentence provided for image generation');
      return null;
    }

    const imagePrompt = await generateImagePrompt(sampleSentence);

    console.log('Generating image with Pollinations.ai for prompt:', imagePrompt);

    const encodedPrompt = encodeURIComponent(imagePrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&enhance=true`;

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    let base64;
    if (typeof window === 'undefined') {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      base64 = buffer.toString('base64');
    } else {
      const blob = await response.blob();
      base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    console.log('Image generated successfully with Pollinations.ai');
    return base64;
  } catch (error) {
    console.error('Error generating card image:', error);
    return null;
  }
}
