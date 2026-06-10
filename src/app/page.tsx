import Link from 'next/link';
import { KpiCard } from '@/components/KpiCard';
import { SectionCard } from '@/components/SectionCard';
import { getCouncilKpis } from '@/lib/data/publicMembers';
import { getHarvestReportData, getMediaMentionsData, getScientometricsData } from '@/lib/data/publicData';

export default async function HomePage() {
  const [kpis, summary, media, report] = await Promise.all([getCouncilKpis(), getScientometricsData(), getMediaMentionsData(), getHarvestReportData()]);
  return (
    <>
      <section className="hero">
        <div>
          <h1>Локальная ИТ-платформа молодых учёных</h1>
          <p>Портал объединяет новости, мероприятия, публикации, медиа и персональные карьерные траектории. Цель — показать каждому молодому исследователю следующий понятный шаг: публикация, защита, звание, научная школа, академическое признание.</p>
          <div className="cta-row">
            <Link className="button" href="/publications">Проверить публикации</Link>
            <Link className="button secondary" href="/admin/harvest">Статус harvest</Link>
          </div>
        </div>
        <aside className="hero-panel">
          <h2>Последняя синхронизация</h2>
          <p>{report ? new Date(report.generated_at).toLocaleString('ru-RU') : 'Локальный harvest ещё не запускался.'}</p>
          <div className="tag-row">
            {(report?.providers ?? []).slice(0, 6).map((provider) => <span key={provider.source}>{provider.source}: {provider.label}</span>)}
            {!report ? <span>нужен первый запуск</span> : null}
          </div>
        </aside>
      </section>
      <section className="page">
        <div className="kpi-grid">
          <KpiCard label="Участников совета" value={kpis.members} hint="из публичного seed-реестра" />
          <KpiCard label="Публикаций" value={summary.total_publications} hint="каноническая база harvest" />
          <KpiCard label="СМИ" value={media.length} hint="опубликованные упоминания" />
          <KpiCard label="За 5 лет" value={summary.publications_last_5_years} hint="свежие публикации" />
        </div>
        <div className="grid">
          <SectionCard title="Новости" href="/news" eyebrow="Редакция"><p>Загрузка PDF/DOCX программы мероприятия → извлечение фактов → LLM-черновик новости в стиле ФНИСЦ → модерация → публикация.</p></SectionCard>
          <SectionCard title="Публикации" href="/publications" eyebrow="Наукометрия"><p>Единый канонический список публикаций с дедупликацией по DOI, eLibrary item id, названию и году.</p></SectionCard>
          <SectionCard title="Карьера" href="/career" eyebrow="Геймификация"><p>Линия научной карьеры: статьи ВАК, кандидатская, докторская, доцент, профессор, профессор РАН, член-корреспондент, академик.</p></SectionCard>
          <SectionCard title="СМИ" href="/media" eyebrow="Публичность"><p>Поиск упоминаний участников совета по точным вариантам ФИО, RSS, сайтам и Telegram-каналам с оценкой уверенности.</p></SectionCard>
        </div>
      </section>
    </>
  );
}
