import { GoogleGenAI } from '@google/genai';

/**
 * Server-side Gemini API helper.
 * Keeps GEMINI_API_KEY confidential and strictly off client bundles.
 */
export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }
  return new GoogleGenAI({ apiKey });
}
