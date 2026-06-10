import { PublicationTable } from '@/components/PublicationTable';
import { getPublicMembersData, getPublicationsData, getScientometricsData } from '@/lib/data/publicData';

export default async function PublicationsPage() {
  const [pubs, members, summary] = await Promise.all([getPublicationsData(), getPublicMembersData(), getScientometricsData()]);
  return (
    <section className="page">
      <div className="page-title"><h1>Публикации</h1><p>Каноническая витрина научных работ СМУ с автоматическим сбором из eLibrary/РИНЦ, Scopus, Web of Science и открытых источников.</p></div>
      <div className="kpi-grid">
        <article className="kpi-card"><span>всего</span><strong>{summary.total_publications}</strong><small>канонических записей</small></article>
        <article className="kpi-card"><span>ВАК</span><strong>{summary.vak_publications_estimated}</strong><small>оценка для карьерной карты</small></article>
        <article className="kpi-card"><span>Scopus</span><strong>{summary.scopus_total}</strong><small>через API</small></article>
        <article className="kpi-card"><span>WoS</span><strong>{summary.wos_total}</strong><small>API / free-view / cache</small></article>
      </div>
      <PublicationTable publications={pubs} members={members} />
    </section>
  );
}
