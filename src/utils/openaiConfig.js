import AsyncStorage from '@react-native-async-storage/async-storage';
import OpenAI from 'openai';

export const OPENAI_TEXT_MODEL_NAME = 'gpt-4o-mini';
export const OPENAI_API_KEY_STORAGE_KEY = 'flashcards_custom_openai_api_key';

const bundledOpenAIApiKey = (
  process.env.EXPO_PUBLIC_OPENAI_API_KEY || ''
).trim();

function createOpenAIError(message, code, cause) {
  const error = new Error(message);
  error.code = code;
  if (cause) {
    error.cause = cause;
  }
  return error;
}

export async function getStoredOpenAIApiKey() {
  const storedKey = await AsyncStorage.getItem(OPENAI_API_KEY_STORAGE_KEY);
  return (storedKey || '').trim();
}

export async function getOpenAIApiKey() {
  const storedKey = await getStoredOpenAIApiKey();
  if (storedKey) {
    return storedKey;
  }

  return bundledOpenAIApiKey;
}

export async function getOpenAIApiKeySource() {
  const storedKey = await getStoredOpenAIApiKey();
  if (storedKey) {
    return 'custom';
  }

  return bundledOpenAIApiKey ? 'bundled' : 'missing';
}

export async function saveCustomOpenAIApiKey(apiKey) {
  const trimmedKey = (apiKey || '').trim();
  if (!trimmedKey) {
    throw createOpenAIError('No OpenAI API key provided.', 'missing_api_key');
  }

  await AsyncStorage.setItem(OPENAI_API_KEY_STORAGE_KEY, trimmedKey);
  return trimmedKey;
}

export async function clearCustomOpenAIApiKey() {
  await AsyncStorage.removeItem(OPENAI_API_KEY_STORAGE_KEY);
}

export async function createOpenAIClient() {
  const apiKey = await getOpenAIApiKey();
  if (!apiKey) {
    throw createOpenAIError(
      'No OpenAI API key is configured. Add one in Settings to use AI tools.',
      'missing_api_key'
    );
  }

  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
}

export function normalizeOpenAIError(error) {
  if (
    error?.code === 'quota_exceeded' ||
    error?.code === 'missing_api_key' ||
    error?.code === 'invalid_api_key' ||
    error?.code === 'network_error' ||
    error?.code === 'openai_error'
  ) {
    return error;
  }

  const rawMessage = String(error?.message || error || '').trim();
  const lowerMessage = rawMessage.toLowerCase();
  const status = error?.status;
  const providerCode = error?.code || error?.error?.code;

  if (
    status === 429 ||
    providerCode === 'insufficient_quota' ||
    providerCode === 'rate_limit_exceeded' ||
    lowerMessage.includes('429') ||
    lowerMessage.includes('insufficient_quota') ||
    lowerMessage.includes('quota') ||
    lowerMessage.includes('rate limit')
  ) {
    return createOpenAIError(rawMessage || 'OpenAI quota exceeded.', 'quota_exceeded', error);
  }

  if (
    status === 401 ||
    providerCode === 'invalid_api_key' ||
    lowerMessage.includes('invalid api key') ||
    lowerMessage.includes('incorrect api key') ||
    lowerMessage.includes('unauthorized')
  ) {
    return createOpenAIError(rawMessage || 'OpenAI API key is invalid.', 'invalid_api_key', error);
  }

  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('timeout')
  ) {
    return createOpenAIError(rawMessage || 'Could not reach OpenAI.', 'network_error', error);
  }

  return createOpenAIError(rawMessage || 'OpenAI request failed.', 'openai_error', error);
}

export function getAiErrorMessage(error, context = 'This AI feature') {
  const normalized = normalizeOpenAIError(error);

  switch (normalized.code) {
    case 'quota_exceeded':
      return 'The current OpenAI API key has no quota left. Add a funded OpenAI key in Settings and try again.';
    case 'missing_api_key':
      return 'No OpenAI API key is configured. Add one in Settings to use AI tools in the APK.';
    case 'invalid_api_key':
      return 'The configured OpenAI API key was rejected. Update it in Settings and try again.';
    case 'network_error':
      return `${context} needs internet access and could not reach OpenAI. Check your connection and try again.`;
    default: {
      const shortMessage = normalized.message.split('\n')[0].trim();
      return shortMessage
        ? `${context} could not be completed. ${shortMessage}`
        : `${context} could not be completed.`;
    }
  }
}
