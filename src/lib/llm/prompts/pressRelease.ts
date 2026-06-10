export type PressReleasePromptInput = {
  eventTitle?: string;
  eventMeta?: string;
  programText: string;
  editorialNote?: string;
  photoFileNames?: string[];
};

export const pressReleaseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'slug', 'lead', 'body_html', 'seo_description', 'photo_captions', 'facts_to_verify'],
  properties: {
    title: { type: 'string' },
    slug: { type: 'string' },
    lead: { type: 'string' },
    body_html: { type: 'string' },
    seo_description: { type: 'string' },
    photo_captions: { type: 'array', items: { type: 'string' } },
    facts_to_verify: { type: 'array', items: { type: 'string' } }
  }
} as const;

export function buildPressReleasePrompt(input: PressReleasePromptInput): string {
  return `
Ты — научный редактор портала Совета молодых учёных ФНИСЦ РАН. Нужно подготовить информационную новость/пресс-релиз о прошедшем научном мероприятии по программе, которую прислал пользователь.

Стиль: официальный, академичный, информативный, без рекламной риторики. Писать по-русски. Не выдумывать факты. Если в программе нет сведений о докладчике, должности, месте, дате или итогах — не придумывай, а добавь пункт в facts_to_verify.

Ориентир структуры:
1. Заголовок: место/площадка/название события/ключевая тема.
2. Первый абзац: дата, город/площадка, точное название события, связь с конференцией или программой.
3. Модератор и ключевые темы обсуждения.
4. Основные доклады: ФИО, статус, тема, 1–2 предложения о содержании.
5. Дискуссия и участники обсуждения, если они указаны.
6. Итоговый абзац: что участники отметили и какие направления дальнейшей работы важны.
7. Фото не генерировать; если переданы имена файлов, предложить нейтральные подписи.

Верни строго JSON по схеме: title, slug, lead, body_html, seo_description, photo_captions, facts_to_verify.
HTML должен содержать только <p>, <strong>, <em>, <ul>, <li>. Без <h1>, script, style.

Название мероприятия от пользователя: ${input.eventTitle || 'не указано'}
Дата/место/контекст от пользователя: ${input.eventMeta || 'не указано'}
Редакционные уточнения: ${input.editorialNote || 'нет'}
Файлы фото: ${(input.photoFileNames || []).join(', ') || 'нет'}

Текст программы:
${input.programText.slice(0, 60000)}
`;
}
