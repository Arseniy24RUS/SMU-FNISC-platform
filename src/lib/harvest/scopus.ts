import { env } from '@/lib/env';
import type { NormalizedPublication } from './normalise';

export type ScopusWork = {
  eid?: string;
  title?: string;
  creator?: string;
  journal_or_source?: string;
  cover_date?: string;
  year?: string;
  doi?: string;
  cited_by_count?: number;
  url?: string;
  raw?: unknown;
};

export type ScopusHarvestResult = {
  status: 'received' | 'partial' | 'unavailable' | 'needs_api_key_or_manual_cache';
  publications: NormalizedPublication[];
  rawPages: unknown[];
  warnings: string[];
  authorId: string;
};

function normalizeEntry(entry: any): NormalizedPublication {
  const year = Number(String(entry['prism:coverDate'] ?? '').slice(0, 4)) || undefined;
  return {
    canonicalKey: entry.eid ? `scopus:${entry.eid}` : `title-year:${entry['dc:title']}:${year ?? ''}`,
    title: entry['dc:title'],
    authorsRaw: entry['dc:creator'],
    journal: entry['prism:publicationName'],
    year,
    doi: entry['prism:doi'],
    scopusEid: entry.eid,
    scopusCitations: Number(entry['citedby-count'] ?? 0),
    sources: ['scopus'],
    sourcePayload: entry
  };
}

export async function harvestScopusAuthor(authorId: string): Promise<NormalizedPublication[]> {
  return (await harvestScopusAuthorDetailed(authorId)).publications;
}

export async function harvestScopusAuthorDetailed(authorId: string): Promise<ScopusHarvestResult> {
  if (!env.SCOPUS_API_KEY) {
    return {
      status: 'needs_api_key_or_manual_cache',
      publications: [],
      rawPages: [],
      warnings: ['SCOPUS_API_KEY is not configured'],
      authorId
    };
  }
  const fields = [
    'dc:title',
    'dc:creator',
    'prism:publicationName',
    'prism:coverDate',
    'prism:doi',
    'citedby-count',
    'eid',
    'dc:identifier',
    'subtypeDescription',
    'prism:aggregationType',
    'openaccess'
  ].join(',');
  const count = 25;
  const max = Math.max(1, env.SCOPUS_MAX_RESULTS_PER_AUTHOR || 200);
  const allEntries: any[] = [];
  const rawPages: unknown[] = [];
  const warnings: string[] = [];
  for (let start = 0; start < max; start += count) {
    const params = new URLSearchParams({
      query: `AU-ID(${authorId})`,
      count: String(Math.min(count, max - start)),
      start: String(start),
      view: 'STANDARD',
      field: fields
    });
    const res = await fetch(`https://api.elsevier.com/content/search/scopus?${params}`, {
      headers: {
        Accept: 'application/json',
        'X-ELS-APIKey': env.SCOPUS_API_KEY,
        ...(env.SCOPUS_INST_TOKEN ? { 'X-ELS-Insttoken': env.SCOPUS_INST_TOKEN } : {}),
        'User-Agent': 'smu-fnisc-platform/0.1'
      },
      cache: 'no-store'
    });
    if (!res.ok) {
      const message = `Scopus API error ${res.status}: ${await res.text()}`;
      warnings.push(message);
      return {
        status: allEntries.length ? 'partial' : 'unavailable',
        publications: allEntries.map(normalizeEntry),
        rawPages,
        warnings,
        authorId
      };
    }
    const payload = await res.json();
    rawPages.push(payload);
    const search = payload?.['search-results'] ?? {};
    const entries = search.entry ?? [];
    const batch = Array.isArray(entries) ? entries : [entries];
    const useful = batch.filter(Boolean);
    allEntries.push(...useful);
    const total = Number(search['opensearch:totalResults'] ?? useful.length);
    if (!useful.length || allEntries.length >= total) break;
  }
  return {
    status: allEntries.length ? 'received' : 'partial',
    publications: allEntries.map(normalizeEntry),
    rawPages,
    warnings,
    authorId
  };
}
