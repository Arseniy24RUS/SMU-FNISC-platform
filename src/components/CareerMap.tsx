import type { CareerEvaluation } from '@/lib/career/evaluate';

const statusLabels: Record<string, string> = {
  COMPLETED: 'пройдено',
  READY: 'можно оформлять',
  IN_PROGRESS: 'в работе',
  NEEDS_VERIFICATION: 'проверить',
  LOCKED: 'пока закрыто'
};

export function CareerMap({ evaluation }: { evaluation: CareerEvaluation }) {
  return (
    <div className="career-map">
      {evaluation.milestones.map((m) => (
        <article key={m.key} className={`milestone status-${m.status.toLowerCase()}`}>
          <span className="milestone-track">{m.track}</span>
          <h3>{m.label}</h3>
          <p>{m.description}</p>
          <strong>{statusLabels[m.status]}</strong>
          {m.progress ? (
            <div className="progress-block">
              <div className="progress-line"><span style={{ width: `${Math.min(100, m.progress.percent)}%` }} /></div>
              <small>{m.progress.current} / {m.progress.target} · {m.progress.label}</small>
            </div>
          ) : null}
          {m.nextActions.length ? (
            <ul className="next-actions">
              {m.nextActions.map((a) => <li key={a}>{a}</li>)}
            </ul>
          ) : null}
        </article>
      ))}
    </div>
  );
}
