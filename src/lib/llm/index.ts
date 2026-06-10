import sanitizeHtml from 'sanitize-html';
import { env } from '@/lib/env';
import type { PressReleasePromptInput } from './prompts/pressRelease';
import type { PressReleaseDraft } from './types';
import { generateLocalPressRelease } from './local';
import { generateWithOpenAI } from './openai';
import { generateWithGemini } from './gemini';

export async function generatePressReleaseDraft(input: PressReleasePromptInput): Promise<PressReleaseDraft> {
  let draft: PressReleaseDraft;
  try {
    if (env.LLM_PROVIDER === 'openai' && env.OPENAI_API_KEY) draft = await generateWithOpenAI(input);
    else if (env.LLM_PROVIDER === 'gemini' && env.GEMINI_API_KEY) draft = await generateWithGemini(input);
    else draft = generateLocalPressRelease(input);
  } catch {
    const fallback = generateLocalPressRelease(input);
    draft = {
      ...fallback,
      facts_to_verify: [
        'Внешний LLM-провайдер недоступен или вернул невалидный ответ; черновик сформирован локальным шаблоном.',
        ...fallback.facts_to_verify
      ]
    };
  }
  return sanitizeDraft(draft);
}

function sanitizeDraft(draft: PressReleaseDraft): PressReleaseDraft {
  return {
    ...draft,
    body_html: sanitizeHtml(draft.body_html || '', {
      allowedTags: ['p', 'strong', 'em', 'ul', 'li'],
      allowedAttributes: {}
    }),
    photo_captions: Array.isArray(draft.photo_captions) ? draft.photo_captions : [],
    facts_to_verify: Array.isArray(draft.facts_to_verify) ? draft.facts_to_verify : []
  };
}
