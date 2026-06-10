import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '@/lib/env';
import { buildPressReleasePrompt, type PressReleasePromptInput } from './prompts/pressRelease';
import type { PressReleaseDraft } from './types';

export async function generateWithGemini(input: PressReleasePromptInput): Promise<PressReleaseDraft> {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL });
  const result = await model.generateContent(`${buildPressReleasePrompt(input)}\n\nВерни только валидный JSON без markdown.`);
  const text = result.response.text().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const parsed = JSON.parse(text) as PressReleaseDraft;
  return { ...parsed, provider: 'gemini', model: env.GEMINI_MODEL };
}
