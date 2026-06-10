import type { Metadata } from 'next';
import { getMediaMentionsData } from '@/lib/data/publicData';

export const metadata: Metadata = {
  title: 'СМИ — СМУ ФНИСЦ РАН',
  description: 'Автоматический мониторинг новостных и публичных источников с упоминаниями членов Совета молодых учёных ФНИСЦ РАН.'
};

const FNISC_AFFILIATES = ['fnisc.ru', 'isras.ru', 'idrras.ru', 'isdfnisc.ru', 'socinst.ru', 'isir.sfedu.ru'];

function isFniscSource(url: string, domain?: string): boolean {
  const normalizedDomain = (value?: string) => value?.toLowerCase().trim().replace(/^www\./, '');
  const normalizedDomainFromUrl = (sourceUrl: string) => {
    try {
      return normalizedDomain(new URL(sourceUrl).hostname);
    } catch {
      return undefined;
    }
  };
  const normalized = normalizedDomain(domain) || normalizedDomainFromUrl(url);
  if (!normalized) return false;
  return FNISC_AFFILIATES.some((item) => normalized === item || normalized.endsWith(`.${item}`));
}

export default async function MediaPage() {
  const mentions = await getMediaMentionsData();
  const visibleMentions = mentions.filter(
    (m) => m.title !== 'Упоминание Ивченковой М. С. на сайте Института социологии ФНИСЦ РАН' && m.id !== '4bd9b1a75035df43',
  );
  return (
    <section className="page">
      <div className="page-title"><h1>СМИ</h1><p>Мониторинг должен искать упоминания всех членов СМУ по вариантам ФИО и контекстным словам, отсекая научные базы, профили и низкоуверенные совпадения.</p></div>
      {visibleMentions.length ? <div className="grid">
        {visibleMentions.map((m) => (
          <article
            className={`news-card media-card ${isFniscSource(m.url, m.domain) ? 'media-card--fnisc' : 'media-card--external'}`}
            key={m.id || m.url}
          >
            <h2>
              <a className="text-link" href={m.url} target="_blank" rel="noreferrer">
                {m.title}
              </a>
            </h2>
            {m.description ? <p>{m.description}</p> : null}
            {m.memberName ? <p className="muted">{m.memberName}</p> : null}
            {m.publishedAt ? <p className="muted">{formatDate(m.publishedAt)}</p> : null}
          </article>
        ))}
      </div> : <div className="empty-state">Опубликованных СМИ-упоминаний пока нет. После `pnpm harvest:media:local` здесь появятся найденные материалы или этот честный empty state останется.</div>}
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' }).format(date);
}

