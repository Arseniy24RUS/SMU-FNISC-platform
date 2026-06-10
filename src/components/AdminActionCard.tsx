import Link from 'next/link';
import { IS_GITHUB_PAGES } from '@/lib/deploy';

export function AdminActionCard({ title, description, action }: { title: string; description: string; action: string }) {
  const isRoute = action.startsWith('/');
  const isServerAction = action.startsWith('POST /api');
  return (
    <article className="admin-action-card">
      <h3>{title}</h3>
      <p>{description}</p>
      {IS_GITHUB_PAGES && isServerAction ? <span className="readonly-badge">локально</span> : null}
      {isRoute ? <Link className="button secondary" href={action}>Открыть</Link> : <code>{action}</code>}
    </article>
  );
}
