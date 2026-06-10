import { normalizeSpaces } from '@/lib/utils';

export type PublicationSourceKey = 'elibrary' | 'scopus' | 'wos' | 'openalex' | 'orcid' | 'crossref' | 'manual';

export type NormalizedPublication = {
  canonicalKey: string;
  title: string;
  titleEn?: string;
  year?: number;
  authorsRaw?: string;
  journal?: string;
  venue?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  elibraryItemId?: string;
  scopusEid?: string;
  wosUid?: string;
  rincCitations?: number;
  scopusCitations?: number;
  wosCitations?: number;
  type?: 'article' | 'conference' | 'monograph' | 'educational_edition' | 'chapter' | 'other';
  isVak?: boolean;
  vakSpecialties?: string[];
  memberSlugs?: string[];
  authorship?: Array<{ memberSlug: string; memberName?: string; authorOrder?: number; confidence?: number }>;
  sources: PublicationSourceKey[];
  sourcePayload?: unknown;
};

export function normalizeDoi(doi?: string | null): string | undefined {
  const cleaned = normalizeSpaces(doi).toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, '').replace(/[.,;]+$/, '');
  return cleaned || undefined;
}

export function normalizeTitle(title?: string | null): string {
  return normalizeSpaces(title)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .trim();
}

export function makePublicationKey(p: Partial<NormalizedPublication>): string {
  if (p.elibraryItemId) return `elibrary:${p.elibraryItemId}`;
  const doi = normalizeDoi(p.doi);
  if (doi) return `doi:${doi}`;
  return `title-year:${normalizeTitle(p.title)}:${p.year ?? ''}`;
}

function scorePublication(p: Partial<NormalizedPublication>): number {
  const fields: Array<keyof NormalizedPublication> = ['title', 'titleEn', 'authorsRaw', 'journal', 'venue', 'volume', 'issue', 'pages', 'doi', 'url', 'elibraryItemId', 'scopusEid', 'wosUid'];
  let score = fields.reduce((acc, key) => acc + (p[key] ? 1 : 0), 0);
  score += (p.sources?.length ?? 0) * 2;
  if (p.doi) score += 2;
  if (p.elibraryItemId) score += 2;
  if (p.scopusEid) score += 2;
  if (p.wosUid) score += 2;
  return score;
}

export function mergePublicationSets(...sets: Array<Array<Partial<NormalizedPublication>> | undefined>): NormalizedPublication[] {
  const byKey = new Map<string, NormalizedPublication>();
  for (const set of sets) {
    for (const raw of set ?? []) {
      if (!raw.title && !raw.elibraryItemId && !raw.doi) continue;
      const candidate: NormalizedPublication = {
        canonicalKey: raw.canonicalKey || makePublicationKey(raw),
        title: normalizeSpaces(raw.title || raw.titleEn || 'Без названия'),
        titleEn: raw.titleEn,
        year: raw.year,
        authorsRaw: raw.authorsRaw,
        journal: raw.journal,
        venue: raw.venue,
        volume: raw.volume,
        issue: raw.issue,
        pages: raw.pages,
        doi: normalizeDoi(raw.doi),
        url: raw.url,
        elibraryItemId: raw.elibraryItemId,
        scopusEid: raw.scopusEid,
        wosUid: raw.wosUid,
        rincCitations: raw.rincCitations ?? 0,
        scopusCitations: raw.scopusCitations ?? 0,
        wosCitations: raw.wosCitations ?? 0,
        type: raw.type ?? 'article',
        isVak: Boolean(raw.isVak),
        vakSpecialties: raw.vakSpecialties ?? [],
        memberSlugs: raw.memberSlugs ?? [],
        authorship: raw.authorship ?? [],
        sources: Array.from(new Set(raw.sources ?? ['manual'])),
        sourcePayload: raw.sourcePayload
      };
      const aliases = [candidate.canonicalKey];
      if (candidate.doi) aliases.push(`doi:${candidate.doi}`);
      if (candidate.elibraryItemId) aliases.push(`elibrary:${candidate.elibraryItemId}`);
      const titleYear = `title-year:${normalizeTitle(candidate.title)}:${candidate.year ?? ''}`;
      aliases.push(titleYear);
      const existing = aliases.map((k) => byKey.get(k)).find(Boolean);
      if (!existing) {
        for (const key of aliases) byKey.set(key, candidate);
        continue;
      }
      const primary = scorePublication(candidate) > scorePublication(existing) ? candidate : existing;
      const secondary = primary === candidate ? existing : candidate;
      const merged = mergeTwo(primary, secondary);
      for (const key of aliases.concat(merged.canonicalKey)) byKey.set(key, merged);
      if (merged.doi) byKey.set(`doi:${merged.doi}`, merged);
      if (merged.elibraryItemId) byKey.set(`elibrary:${merged.elibraryItemId}`, merged);
      byKey.set(`title-year:${normalizeTitle(merged.title)}:${merged.year ?? ''}`, merged);
    }
  }
  return Array.from(new Set(byKey.values())).sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title, 'ru'));
}

function mergeTwo(a: NormalizedPublication, b: NormalizedPublication): NormalizedPublication {
  const merged = { ...a };
  for (const [key, value] of Object.entries(b) as Array<[keyof NormalizedPublication, any]>) {
    if (key === 'sources' || key === 'sourcePayload') continue;
    if ((merged[key] == null || merged[key] === '' || (Array.isArray(merged[key]) && (merged[key] as any[]).length === 0)) && value != null && value !== '') {
      (merged as any)[key] = value;
    }
  }
  merged.sources = Array.from(new Set([...(a.sources ?? []), ...(b.sources ?? [])]));
  merged.rincCitations = Math.max(a.rincCitations ?? 0, b.rincCitations ?? 0);
  merged.scopusCitations = Math.max(a.scopusCitations ?? 0, b.scopusCitations ?? 0);
  merged.wosCitations = Math.max(a.wosCitations ?? 0, b.wosCitations ?? 0);
  merged.isVak = Boolean(a.isVak || b.isVak);
  merged.vakSpecialties = Array.from(new Set([...(a.vakSpecialties ?? []), ...(b.vakSpecialties ?? [])]));
  merged.memberSlugs = Array.from(new Set([...(a.memberSlugs ?? []), ...(b.memberSlugs ?? [])]));
  const authorship = new Map<string, NonNullable<NormalizedPublication['authorship']>[number]>();
  for (const item of [...(a.authorship ?? []), ...(b.authorship ?? [])]) {
    if (!authorship.has(item.memberSlug)) authorship.set(item.memberSlug, item);
  }
  merged.authorship = Array.from(authorship.values());
  return merged;
}
