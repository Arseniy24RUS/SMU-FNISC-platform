import { getHarvestReportData } from '@/lib/data/publicData';
import { IS_GITHUB_PAGES } from '@/lib/deploy';

const jobs = [
  ['all', 'Run all local harvest'],
  ['elibrary', 'Run eLibrary'],
  ['scopus', 'Run Scopus'],
  ['wos', 'Run WoS'],
  ['media', 'Run media'],
  ['photos', 'Fetch member photos']
] as const;

function localCommand(job: (typeof jobs)[number][0]) {
  if (job === 'all') return 'pnpm harvest:all:local';
  if (job === 'photos') return 'pnpm photos:fetch';
  return `pnpm harvest:${job}:local`;
}

export default async function AdminHarvestPage() {
  const report = await getHarvestReportData();
  return (
    <section className="page">
      <div className="page-title">
        <h1>Harvest</h1>
        <p>Локальный запуск сборщиков, статусы источников, raw-снимки и путь к результатам.</p>
      </div>
      <div className="status-grid">
        {(report?.providers ?? []).map((provider) => (
          <article className={`status-panel status-${provider.status}`} key={provider.source}>
            <strong>{provider.source}: {provider.label}</strong>
            <small>records: {provider.recordsCollected}; members: {provider.membersSucceeded}/{provider.membersAttempted}</small>
            <small>{provider.rawPath}</small>
            {provider.warnings.length ? <p className="muted">{provider.warnings.slice(0, 2).join(' · ')}</p> : null}
          </article>
        ))}
        {!report ? <div className="empty-state">Harvest ещё не запускался. Используйте кнопку полного запуска или `pnpm harvest:all:local`.</div> : null}
      </div>
      <div className="grid">
        {jobs.map(([job, title]) => (
          <article className="admin-action-card" key={job}>
            <h2>{title}</h2>
            <p>Результаты сохраняются в `data/local/jobs`, `data/local/harvest`, `data/public` и `public/generated`.</p>
            {IS_GITHUB_PAGES ? (
              <div className="readonly-panel">
                <span className="readonly-badge">локально</span>
                <code>{localCommand(job)}</code>
              </div>
            ) : (
              <form action="/api/admin/harvest" method="post">
                <input type="hidden" name="job" value={job} />
                <input type="text" name="username" value="local-admin" autoComplete="username" readOnly hidden />
                <label>Локальный пароль администратора<input name="password" type="password" autoComplete="current-password" /></label>
                <button className="button" type="submit">Запустить</button>
              </form>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
