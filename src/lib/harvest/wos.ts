import { env } from '@/lib/env';
import type { NormalizedPublication } from './normalise';

export type WosHarvestResult = {
  status: 'received' | 'partial' | 'unavailable' | 'needs_api_key_or_manual_cache';
  publications: NormalizedPublication[];
  raw: unknown[];
  warnings: string[];
  researcherId: string;
  attemptedUrls: string[];
};

export async function harvestWosByResearcherId(researcherId: string): Promise<NormalizedPublication[]> {
  return (await harvestWosByResearcherIdDetailed(researcherId)).publications;
}

export async function harvestWosByResearcherIdDetailed(researcherId: string): Promise<WosHarvestResult> {
  const apiKey = env.WOS_API_KEY || env.CLARIVATE_WOS_API_KEY;
  if (!apiKey) return harvestWosFreeView(researcherId);
  const query = `AI=(${researcherId})`;
  const params = new URLSearchParams({ databaseId: 'WOS', usrQuery: query, count: '100', firstRecord: '1' });
  const res = await fetch(`https://api.clarivate.com/apis/wos-starter/v1/documents?${params}`, {
    headers: {
      'X-ApiKey': apiKey,
      Accept: 'application/json',
      'User-Agent': 'smu-fnisc-platform/0.1'
    },
    cache: 'no-store'
  });
  if (!res.ok) {
    return {
      status: 'unavailable',
      publications: [],
      raw: [{ status: res.status, body: await res.text() }],
      warnings: [`Web of Science API error ${res.status}`],
      researcherId,
      attemptedUrls: [res.url]
    };
  }
  const payload = await res.json();
  const hits = payload?.hits ?? payload?.Data?.Records?.records?.REC ?? [];
  const publications = (Array.isArray(hits) ? hits : [hits]).map((rec: any) => {
    const title = rec.title?.[0] ?? rec.static_data?.summary?.titles?.title?.find?.((t: any) => t.type === 'item')?.content ?? rec.title ?? 'Без названия';
    const year = Number(rec.source?.publishYear ?? rec.static_data?.summary?.pub_info?.pubyear);
    return {
      canonicalKey: rec.uid ? `wos:${rec.uid}` : `title-year:${title}:${year || ''}`,
      title,
      titleEn: title,
      year: Number.isFinite(year) ? year : undefined,
      doi: rec.identifiers?.doi ?? rec.dynamic_data?.cluster_related?.identifiers?.identifier?.find?.((i: any) => i.type === 'doi')?.value,
      wosUid: rec.uid,
      journal: rec.source?.sourceTitle,
      wosCitations: Number(rec.citations?.[0]?.count ?? rec.dynamic_data?.citation_related?.tc_list?.silo_tc?.local_count ?? 0),
      sources: ['wos'],
      sourcePayload: rec
    } satisfies NormalizedPublication;
  });
  return {
    status: publications.length ? 'received' : 'partial',
    publications,
    raw: [payload],
    warnings: publications.length ? [] : ['Web of Science returned no records for this ResearcherID'],
    researcherId,
    attemptedUrls: [res.url]
  };
}

async function harvestWosFreeView(researcherId: string): Promise<WosHarvestResult> {
  const attemptedUrls = [
    `https://www.webofscience.com/wos/author/record/${encodeURIComponent(researcherId)}`,
    `https://www.webofscience.com/wos/author/rid/${encodeURIComponent(researcherId)}`
  ];
  const raw: unknown[] = [];
  const warnings: string[] = [];
  for (const url of attemptedUrls) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ru,en;q=0.9',
          'User-Agent': 'Mozilla/5.0 smu-fnisc-platform-wos-freeview/0.1'
        },
        redirect: 'follow',
        cache: 'no-store',
        signal: controller.signal
      });
      const html = await res.text();
      raw.push({ url: res.url, status: res.status, html });
      if (!res.ok) warnings.push(`WoS free-view HTTP ${res.status} for ${url}`);
      const publications = parseWosFreeViewHtml(html, researcherId);
      if (publications.length) {
        return { status: 'received', publications, raw, warnings, researcherId, attemptedUrls };
      }
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : String(error));
    } finally {
      clearTimeout(timeout);
    }
  }
  warnings.push('WoS free-view did not expose parseable records; use API key or local manual cache if available.');
  return { status: 'needs_api_key_or_manual_cache', publications: [], raw, warnings, researcherId, attemptedUrls };
}

function parseWosFreeViewHtml(html: string, researcherId: string): NormalizedPublication[] {
  const records: NormalizedPublication[] = [];
  const titleMatches = [...html.matchAll(/<title[^>]*>(.*?)<\/title>/gis)];
  for (const match of titleMatches) {
    const title = stripHtml(match[1]);
    if (!title || /web of science|clarivate/i.test(title)) continue;
    records.push({
      canonicalKey: `wos-freeview:${researcherId}:${records.length + 1}`,
      title,
      titleEn: title,
      sources: ['wos'],
      sourcePayload: { researcherId, source: 'free-view-title' }
    });
  }
  return records;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}
