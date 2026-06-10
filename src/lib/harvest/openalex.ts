import { env } from '@/lib/env';
import type { NormalizedPublication } from './normalise';

export async function harvestOpenAlexByOrcid(orcid: string): Promise<NormalizedPublication[]> {
  const mailto = env.OPENALEX_MAILTO ? `&mailto=${encodeURIComponent(env.OPENALEX_MAILTO)}` : '';
  const url = `https://api.openalex.org/works?filter=authorships.author.orcid:${encodeURIComponent(`https://orcid.org/${orcid}`)}&per-page=100${mailto}`;
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'smu-fnisc-platform/0.1' }, cache: 'no-store' });
  if (!res.ok) return [];
  const payload = await res.json();
  return (payload.results ?? []).map((work: any) => ({
    canonicalKey: work.doi ? `doi:${String(work.doi).replace(/^https:\/\/doi\.org\//, '').toLowerCase()}` : `openalex:${work.id}`,
    title: work.title || work.display_name || 'Без названия',
    year: work.publication_year,
    doi: work.doi,
    journal: work.primary_location?.source?.display_name,
    url: work.primary_location?.landing_page_url || work.id,
    sources: ['openalex'],
    sourcePayload: work
  } satisfies NormalizedPublication));
}
