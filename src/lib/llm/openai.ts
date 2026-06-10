import OpenAI from 'openai';
import { env } from '@/lib/env';
import { buildPressReleasePrompt, pressReleaseJsonSchema, type PressReleasePromptInput } from './prompts/pressRelease';
import type { PressReleaseDraft } from './types';

export async function generateWithOpenAI(input: PressReleasePromptInput): Promise<PressReleaseDraft> {
  if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: env.OPENAI_MODEL,
    input: buildPressReleasePrompt(input),
    text: {
      format: {
        type: 'json_schema',
        name: 'press_release_draft',
        schema: pressReleaseJsonSchema,
        strict: true
      }
    }
  });
  const parsed = JSON.parse(response.output_text || '{}') as PressReleaseDraft;
  return { ...parsed, provider: 'openai', model: env.OPENAI_MODEL };
}
