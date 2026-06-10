import { slugifyRu, normalizeSpaces } from '@/lib/utils';
import type { PressReleasePromptInput } from './prompts/pressRelease';
import type { PressReleaseDraft } from './types';

export function generateLocalPressRelease(input: PressReleasePromptInput): PressReleaseDraft {
  const text = normalizeSpaces(input.programText);
  const title = input.eventTitle || guessTitle(text) || 'В ФНИСЦ РАН состоялось научное мероприятие';
  const lead = `${input.eventMeta || 'В ФНИСЦ РАН'} состоялось научное мероприятие, посвящённое актуальным вопросам социальных исследований и развитию междисциплинарного научного взаимодействия.`;
  const body = [
    `<p>${escapeHtml(lead)}</p>`,
    `<p>В центре обсуждения были представлены доклады и сообщения участников мероприятия. Система сформировала этот черновик в локальном режиме без внешней LLM, поэтому редактору необходимо уточнить ФИО докладчиков, должности, темы выступлений и итоговые формулировки.</p>`,
    `<p>По итогам мероприятия участники отметили значимость дальнейшего развития научного сотрудничества, обмена исследовательскими результатами и вовлечения молодых учёных в экспертную и проектную деятельность.</p>`
  ].join('\n');
  return {
    title,
    slug: slugifyRu(title),
    lead,
    body_html: body,
    body_markdown: stripHtml(body),
    date: input.eventMeta,
    location: input.eventMeta,
    participants: [],
    seo_title: title,
    seo_description: lead.slice(0, 220),
    photo_captions: (input.photoFileNames ?? []).map((name) => `Фото к материалу: ${name}`),
    facts_to_verify: ['Локальный режим: проверить дату, площадку, ФИО участников, должности, темы докладов и итоговые формулировки.'],
    confidence: 0.45,
    provider: 'local',
    model: 'template-fallback'
  };
}

function guessTitle(text: string): string | null {
  const firstSentence = text.split(/[.!?]/)[0]?.trim();
  return firstSentence && firstSentence.length < 140 ? firstSentence : null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] || ch));
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
