import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { cache } from 'react';
import type { NormalizedPublication, PublicationSourceKey } from '@/lib/harvest/normalise';
import type { PublicMember } from './publicMembers';

export type ProviderStatusCode =
  | 'received'
  | 'partial'
  | 'unavailable'
  | 'needs_cookie_or_api_access'
  | 'needs_api_key_or_manual_cache'
  | 'cache_used'
  | 'not_configured'
  | 'skipped';

export type ProviderStatus = {
  source: PublicationSourceKey | 'media' | 'photos' | 'openalex';
  status: ProviderStatusCode;
  label: string;
  recordsCollected: number;
  membersAttempted: number;
  membersSucceeded: number;
  warnings: string[];
  cacheUsed?: boolean;
  rawPath?: string;
};

export type ScientometricSummary = {
  generatedAt: string;
  total_publications: number;
  publications_by_year: Record<string, number>;
  publications_by_source: Record<string, number>;
  rinc_total: number;
  scopus_total: number;
  wos_total: number;
  citations_rinc: number;
  citations_scopus: number;
  citations_wos: number;
  h_index_rinc: number;
  h_index_scopus: number;
  h_index_wos: number;
  vak_publications_estimated: number;
  publications_last_5_years: number;
};

export type MediaMentionPublic = {
  id?: string;
  source?: string;
  title: string;
  description?: string;
  url: string;
  domain?: string;
  sourceName?: string;
  publishedAt?: string;
  harvestedAt?: string;
  imageUrl?: string;
  confidence: number;
  status: 'published' | 'low_confidence' | 'rejected';
  memberSlug?: string;
  memberName?: string;
  query?: string;
};

export type SupportCategory =
  | 'Жилищная поддержка'
  | 'Гранты на исследования'
  | 'Премии и признание'
  | 'Инновационные проекты'
  | 'Внутриорганизационная поддержка';

export type SupportLinkType = 'Официальный сайт' | 'НПА / положение' | 'Подача заявки' | 'Контакты';

export type LinkItem = {
  title: string;
  url: string;
  type: SupportLinkType;
};

export type SupportMeasure = {
  id: string;
  category: SupportCategory;
  title: string;
  status2026: string;
  amount: string;
  deadline: string;
  who: string;
  exactCriteria: string[];
  legalDescription: string[];
  documents: string[];
  whereToApply: string[];
  links: LinkItem[];
};

export type CareerMapMember = {
  memberSlug: string;
  memberName: string;
  institute?: string;
  currentStatus: string;
  nextStep: string;
  missing: string[];
  confidence: number;
  milestones: Array<{
    key: string;
    label: string;
    layer?: string;
    track: string;
    parallel_track?: string;
    join_gate?: boolean;
    order?: number;
    description?: string;
    legal_basis?: string[];
    evidence_required?: string[];
    manual_verification?: boolean;
    status: string;
    progress?: { current: number; target: number; percent: number; label: string };
    progressItems?: Array<{ key: string; label: string; current: number | null; target: number; percent: number; status: string }>;
    graph_node?: boolean;
    graph_track?: 'base' | 'doctor' | 'docent' | 'professor' | 'academy';
    graph_order?: number;
    graph_label?: string;
    details_group?: string;
    nextActions: string[];
  }>;
};

export type HarvestReport = {
  generated_at: string;
  run_id: string;
  mode: string;
  paths: Record<string, string>;
  providers: ProviderStatus[];
  totals: {
    members: number;
    publications: number;
    media_mentions: number;
    warnings: number;
  };
  warnings: string[];
};

const publicDir = join(process.cwd(), 'data', 'public');

async function readJsonFile<T>(path: string, fallback: T): Promise<T> {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(await readFile(path, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

export const getPublicMembersData = cache(async (): Promise<PublicMember[]> => {
  const seedMembers = await readJsonFile(join(process.cwd(), 'data', 'seeds', 'members.public.json'), [] as PublicMember[]);
  return readJsonFile(join(publicDir, 'members.json'), seedMembers);
});

export const getPublicationsData = cache(async (): Promise<NormalizedPublication[]> => {
  return readJsonFile(join(publicDir, 'publications.json'), [] as NormalizedPublication[]);
});

export const getScientometricsData = cache(async (): Promise<ScientometricSummary> => {
  return readJsonFile(join(publicDir, 'scientometrics.json'), {
    generatedAt: new Date(0).toISOString(),
    total_publications: 0,
    publications_by_year: {},
    publications_by_source: {},
    rinc_total: 0,
    scopus_total: 0,
    wos_total: 0,
    citations_rinc: 0,
    citations_scopus: 0,
    citations_wos: 0,
    h_index_rinc: 0,
    h_index_scopus: 0,
    h_index_wos: 0,
    vak_publications_estimated: 0,
    publications_last_5_years: 0
  });
});

export const getMediaMentionsData = cache(async (): Promise<MediaMentionPublic[]> => {
  return readJsonFile(join(publicDir, 'media-mentions.json'), [] as MediaMentionPublic[]);
});

export const getSupportMeasuresData = cache(async (): Promise<SupportMeasure[]> => {
  return readJsonFile(join(publicDir, 'support-measures.json'), [] as SupportMeasure[]);
});

export const getCareerMapData = cache(async (): Promise<CareerMapMember[]> => {
  return readJsonFile(join(publicDir, 'career-map.json'), [] as CareerMapMember[]);
});

export const getHarvestReportData = cache(async (): Promise<HarvestReport | null> => {
  return readJsonFile<HarvestReport | null>(join(publicDir, 'harvest-report.json'), null);
});
