import { loadLocalEnv } from '../src/lib/loadEnv';
import type { NormalizedPublication } from '../src/lib/harvest/normalise';

loadLocalEnv();

const { copyFile, mkdir, readFile, readdir, writeFile } = await import('node:fs/promises');
const { existsSync } = await import('node:fs');
const { join, dirname } = await import('node:path');
const { mergePublicationSets } = await import('../src/lib/harvest/normalise');
const { harvestElibraryAuthorDetailed } = await import('../src/lib/harvest/elibrary');
const { harvestScopusAuthorDetailed } = await import('../src/lib/harvest/scopus');
const { harvestWosByResearcherIdDetailed } = await import('../src/lib/harvest/wos');
const { harvestOpenAlexByOrcid } = await import('../src/lib/harvest/openalex');
const { harvestMediaMentionsForMember, harvestSharedMediaSources, loadMediaSourcesConfig } = await import('../src/lib/harvest/media');
const { harvestMemberPhotos } = await import('../src/lib/harvest/photos');
const { buildScientometricSummary } = await import('../src/lib/harvest/scientometrics');
const { decorateCareerMilestone } = await import('../src/lib/career/graph');
const { evaluateCareer } = await import('../src/lib/career/evaluate');
const { loadCareerRules } = await import('../src/lib/career/rules');
const { env } = await import('../src/lib/env');
const { db } = await import('../src/lib/db');

type SeedMember = {
  slug: string;
  full_name: string;
  email?: string;
  public_emails?: string[];
  institute?: string;
  unit?: string;
  position?: string;
  degree_status?: string;
  education_public_note?: string;
  interests?: string;
  roles_and_achievements?: string;
  public_comment?: string;
  identifiers?: Record<string, string>;
  fnisc_profile_url?: string;
  fnisc_profile_id?: string;
  photo_url?: string;
  photo_status?: string;
  photo_source_profile_url?: string;
  photo_source_url?: string;
  photo_downloaded_at?: string;
  sources_note?: string;
};

type SourceName = 'elibrary' | 'scopus' | 'wos' | 'openalex' | 'media' | 'photos';
type ProviderStatus = {
  source: SourceName;
  status: string;
  label: string;
  recordsCollected: number;
  membersAttempted: number;
  membersSucceeded: number;
  warnings: string[];
  cacheUsed?: boolean;
  rawPath?: string;
};

type PublicMediaMention = {
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

const requestedOnly = process.argv.find((arg) => arg.startsWith('--only='))?.split('=')[1] as SourceName | undefined;
const quick = process.argv.includes('--quick');
const mode = requestedOnly ? `only:${requestedOnly}` : quick ? 'quick' : 'full';
const runId = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const root = process.cwd();
const runDir = join(root, 'data', 'local', 'harvest', runId);
const latestDir = join(root, 'data', 'local', 'latest');
const publicDir = join(root, 'data', 'public');
const generatedDir = join(root, 'public', 'generated');
const sources: SourceName[] = requestedOnly ? [requestedOnly] : ['elibrary', 'scopus', 'wos', 'openalex', 'media', 'photos'];

async function main() {
  const members = JSON.parse(await readFile(join(root, 'data', 'seeds', 'members.public.json'), 'utf-8')) as SeedMember[];
  await ensureDirs([
    runDir,
    latestDir,
    publicDir,
    generatedDir,
    join(runDir, 'raw', 'elibrary'),
    join(runDir, 'raw', 'scopus'),
    join(runDir, 'raw', 'wos'),
    join(runDir, 'raw', 'media'),
    join(runDir, 'raw', 'photos'),
    join(runDir, 'normalized'),
    join(runDir, 'logs')
  ]);

  const providerStatuses: ProviderStatus[] = [];
  const allPublicationSets: NormalizedPublication[][] = [];
  const mediaMentions: PublicMediaMention[] = [];
  const priorReport = await readJson<{ providers?: ProviderStatus[] } | null>(join(publicDir, 'harvest-report.json'), null);
  if (requestedOnly) {
    allPublicationSets.push(await readJson(join(publicDir, 'publications.json'), [] as NormalizedPublication[]));
  }

  if (sources.includes('elibrary')) {
    const { sets, status } = await harvestElibrary(members);
    allPublicationSets.push(...sets);
    providerStatuses.push(status);
  } else {
    allPublicationSets.push(await readCachedPublicationSet('elibrary'));
  }

  if (sources.includes('scopus')) {
    const { sets, status } = await harvestScopus(members);
    allPublicationSets.push(...sets);
    providerStatuses.push(status);
  } else {
    allPublicationSets.push(await readCachedPublicationSet('scopus'));
  }

  if (sources.includes('wos')) {
    const { sets, status } = await harvestWos(members);
    allPublicationSets.push(...sets);
    providerStatuses.push(status);
  } else {
    allPublicationSets.push(await readCachedPublicationSet('wos'));
  }

  if (sources.includes('openalex') && !requestedOnly) {
    const { sets, status } = await harvestOpenAlex(members);
    allPublicationSets.push(...sets);
    providerStatuses.push(status);
  }

  if (sources.includes('media')) {
    const { mentions, status } = await harvestMedia(members);
    mediaMentions.push(...mentions);
    providerStatuses.push(status);
  } else {
    mediaMentions.push(...await readJson(join(publicDir, 'media-mentions.json'), [] as PublicMediaMention[]));
  }

  if (sources.includes('photos')) {
    const status = await harvestPhotos(members);
    providerStatuses.push(status);
  }

  const publications = mergePublicationSets(...allPublicationSets);
  const summary = buildScientometricSummary(publications);
  const publicMembers = sanitizeMembers(members);
  const careerMap = await buildCareerMap(publicMembers, publications);
  const mergedProviderStatuses = mergeProviderStatuses(providerStatuses, requestedOnly ? priorReport?.providers ?? [] : []);
  const report = {
    generated_at: new Date().toISOString(),
    run_id: runId,
    mode,
    paths: {
      run: relative(runDir),
      latest: relative(latestDir),
      public: relative(publicDir),
      generated: relative(generatedDir)
    },
    providers: mergedProviderStatuses,
    totals: {
      members: publicMembers.length,
      publications: publications.length,
      media_mentions: mediaMentions.length,
      warnings: mergedProviderStatuses.reduce((sum, item) => sum + item.warnings.length, 0)
    },
    warnings: mergedProviderStatuses.flatMap((item) => item.warnings.map((warning) => `${item.source}: ${warning}`))
  };

  await writeJson(join(publicDir, 'members.json'), publicMembers);
  await writeJson(join(publicDir, 'publications.json'), publications.map(stripSourcePayload));
  await writeJson(join(publicDir, 'scientometrics.json'), summary);
  await writeJson(join(publicDir, 'career-map.json'), careerMap);
  await writeJson(join(publicDir, 'media-mentions.json'), mediaMentions);
  await writeJson(join(publicDir, 'harvest-report.json'), report);
  await writeJson(join(generatedDir, 'harvest-summary.json'), {
    generated_at: report.generated_at,
    run_id: runId,
    totals: report.totals,
    providers: mergedProviderStatuses.map(({ source, status, recordsCollected, warnings, cacheUsed }) => ({ source, status, recordsCollected, warnings: warnings.length, cacheUsed: Boolean(cacheUsed) }))
  });
  await writeJson(join(runDir, 'normalized', 'publications.json'), publications.map(stripSourcePayload));
  await writeJson(join(runDir, 'normalized', 'scientometrics.json'), summary);
  await writeJson(join(runDir, 'logs', 'harvest-report.json'), report);
  await copyLatest(runDir, latestDir);

  console.log(`Harvest ${runId}: ${publications.length} publications, ${mediaMentions.length} media mentions`);
  for (const status of mergedProviderStatuses) {
    console.log(`${status.source}: ${status.status}, records=${status.recordsCollected}, warnings=${status.warnings.length}`);
  }
}

async function harvestElibrary(members: SeedMember[]) {
  const sets: NormalizedPublication[][] = [];
  const warnings: string[] = [];
  let attempted = 0;
  let succeeded = 0;
  for (const member of members) {
    const authorId = member.identifiers?.elibrary_author_id;
    if (!authorId) continue;
    attempted += 1;
    const rawDir = join(runDir, 'raw', 'elibrary', member.slug);
    await mkdir(rawDir, { recursive: true });
    const result = await harvestElibraryAuthorDetailed(authorId);
    if (result.html) await writeFile(join(rawDir, 'author-items.html'), result.html, 'utf-8');
    await writeJson(join(rawDir, 'diagnostics.json'), { authorId, url: result.url, status: result.status, warnings: result.warnings, records: result.publications.length });
    if (result.warnings.length) warnings.push(...result.warnings.map((warning) => `${member.slug}: ${warning}`));
    if (result.publications.length) succeeded += 1;
    const annotated = annotatePublications(result.publications, member);
    sets.push(annotated);
    await writeJson(join(rawDir, 'normalized.json'), annotated.map(stripSourcePayload));
    await delay(900);
  }
  const records = countRecords(sets);
  if (!records) {
    const cached = await readCachedPublicationSet('elibrary');
    if (cached.length) sets.push(cached);
  }
  await writeJson(join(runDir, 'normalized', 'elibrary.json'), sets.flat().map(stripSourcePayload));
  const cacheUsed = !records && countRecords(sets) > 0;
  const aggregateStatus = cacheUsed ? 'cache_used' : records ? succeeded === attempted ? 'received' : 'partial' : warnings.length ? 'needs_cookie_or_api_access' : 'unavailable';
  return {
    sets,
    status: providerStatus('elibrary', aggregateStatus, records || countRecords(sets), attempted, succeeded, warnings, join(runDir, 'raw', 'elibrary'), cacheUsed)
  };
}

async function harvestScopus(members: SeedMember[]) {
  const sets: NormalizedPublication[][] = [];
  const warnings: string[] = [];
  let attempted = 0;
  let succeeded = 0;
  for (const member of members) {
    const authorId = member.identifiers?.scopus_author_id;
    if (!authorId) continue;
    attempted += 1;
    const rawDir = join(runDir, 'raw', 'scopus', member.slug);
    await mkdir(rawDir, { recursive: true });
    const result = await harvestScopusAuthorDetailed(authorId);
    await writeJson(join(rawDir, 'diagnostics.json'), { authorId, status: result.status, warnings: result.warnings, records: result.publications.length });
    for (let i = 0; i < result.rawPages.length; i += 1) await writeJson(join(rawDir, `works-page-${i + 1}.json`), result.rawPages[i]);
    if (result.warnings.length) warnings.push(...result.warnings.map((warning) => `${member.slug}: ${warning}`));
    if (result.publications.length) succeeded += 1;
    const annotated = annotatePublications(result.publications, member);
    sets.push(annotated);
    await writeJson(join(rawDir, 'normalized.json'), annotated.map(stripSourcePayload));
    await delay(500);
  }
  const records = countRecords(sets);
  if (!records) {
    const cached = await readCachedPublicationSet('scopus');
    if (cached.length) sets.push(cached);
  }
  await writeJson(join(runDir, 'normalized', 'scopus.json'), sets.flat().map(stripSourcePayload));
  const cacheUsed = !records && countRecords(sets) > 0;
  return {
    sets,
    status: providerStatus('scopus', cacheUsed ? 'cache_used' : records ? succeeded === attempted ? 'received' : 'partial' : 'needs_api_key_or_manual_cache', records || countRecords(sets), attempted, succeeded, warnings, join(runDir, 'raw', 'scopus'), cacheUsed)
  };
}

async function harvestWos(members: SeedMember[]) {
  const sets: NormalizedPublication[][] = [];
  const warnings: string[] = [];
  let attempted = 0;
  let succeeded = 0;
  for (const member of members) {
    const researcherId = member.identifiers?.wos_researcher_id;
    if (!researcherId) continue;
    attempted += 1;
    const rawDir = join(runDir, 'raw', 'wos', member.slug);
    await mkdir(rawDir, { recursive: true });
    const result = await harvestWosByResearcherIdDetailed(researcherId);
    await writeJson(join(rawDir, 'diagnostics.json'), { researcherId, status: result.status, attemptedUrls: result.attemptedUrls, warnings: result.warnings, records: result.publications.length });
    for (let i = 0; i < result.raw.length; i += 1) await writeJson(join(rawDir, `raw-${i + 1}.json`), result.raw[i]);
    if (result.warnings.length) warnings.push(...result.warnings.map((warning) => `${member.slug}: ${warning}`));
    if (result.publications.length) succeeded += 1;
    const annotated = annotatePublications(result.publications, member);
    sets.push(annotated);
    await writeJson(join(rawDir, 'normalized.json'), annotated.map(stripSourcePayload));
    await delay(700);
  }
  const records = countRecords(sets);
  if (!records) {
    const cached = await readCachedPublicationSet('wos');
    if (cached.length) sets.push(cached);
  }
  await writeJson(join(runDir, 'normalized', 'wos.json'), sets.flat().map(stripSourcePayload));
  const cacheUsed = !records && countRecords(sets) > 0;
  return {
    sets,
    status: providerStatus('wos', cacheUsed ? 'cache_used' : records ? succeeded === attempted ? 'received' : 'partial' : 'needs_api_key_or_manual_cache', records || countRecords(sets), attempted, succeeded, warnings, join(runDir, 'raw', 'wos'), cacheUsed)
  };
}

async function harvestOpenAlex(members: SeedMember[]) {
  const sets: NormalizedPublication[][] = [];
  const warnings: string[] = [];
  let attempted = 0;
  let succeeded = 0;
  for (const member of members) {
    const orcid = member.identifiers?.orcid;
    if (!orcid) continue;
    attempted += 1;
    try {
      const publications = annotatePublications(await harvestOpenAlexByOrcid(orcid), member);
      if (publications.length) succeeded += 1;
      sets.push(publications);
      await delay(350);
    } catch (error) {
      warnings.push(`${member.slug}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { sets, status: providerStatus('openalex', countRecords(sets) ? 'received' : 'partial', countRecords(sets), attempted, succeeded, warnings, join(runDir, 'raw', 'openalex')) };
}

async function harvestMedia(members: SeedMember[]) {
  const mentions: PublicMediaMention[] = [];
  const warnings: string[] = [];
  let attempted = 0;
  let succeeded = 0;
  const mediaConfig = await loadMediaSourcesConfig();
  for (const member of members) {
    attempted += 1;
    const rawDir = join(runDir, 'raw', 'media', member.slug);
    await mkdir(rawDir, { recursive: true });
    try {
      const result = await harvestMediaMentionsForMember(member, mediaConfig);
      const publicFound = result.published.map(toPublicMediaMention);
      if (publicFound.length) succeeded += 1;
      mentions.push(...publicFound);
      await writeJson(join(rawDir, 'diagnostics.json'), {
        memberSlug: member.slug,
        memberName: member.full_name,
        records: result.records.length,
        published: result.published.length,
        rejected: result.rejected.length,
        reports: result.reports
      });
      await writeJson(join(rawDir, 'gdelt-keyword-search.json'), result.raw.gdelt ?? null);
      await writeJson(join(rawDir, 'profile-mentions.json'), result.raw.profileMentions ?? null);
      await writeJson(join(rawDir, 'source-note-urls.json'), result.raw.sourceNoteUrls ?? null);
      await writeJson(join(rawDir, 'bing-web-rss.json'), result.raw.bingWebRss ?? null);
      await writeJson(join(rawDir, 'google-news.json'), result.raw.googleNews ?? null);
      await writeJson(join(rawDir, 'seed-urls.json'), result.raw.seed ?? null);
      await writeJson(join(rawDir, 'all-candidates.json'), result.records);
      await writeJson(join(rawDir, 'rejected-or-low-confidence.json'), result.rejected);
      warnings.push(...mediaWarnings(member.slug, result.reports));
    } catch (error) {
      warnings.push(`${member.slug}: ${error instanceof Error ? error.message : String(error)}`);
    }
    await delay(env.MEDIA_POLITE_DELAY_MS);
  }
  const sharedRawDir = join(runDir, 'raw', 'media', '_shared');
  await mkdir(sharedRawDir, { recursive: true });
  try {
    const shared = await harvestSharedMediaSources(members, mediaConfig);
    mentions.push(...shared.published.map(toPublicMediaMention));
    await writeJson(join(sharedRawDir, 'diagnostics.json'), {
      records: shared.records.length,
      published: shared.published.length,
      rejected: shared.rejected.length,
      reports: shared.reports
    });
    await writeJson(join(sharedRawDir, 'telegram.json'), shared.raw.telegram ?? null);
    await writeJson(join(sharedRawDir, 'sitemaps.json'), shared.raw.sitemaps ?? null);
    await writeJson(join(sharedRawDir, 'site-scan.json'), shared.raw.siteScan ?? null);
    await writeJson(join(sharedRawDir, 'all-candidates.json'), shared.records);
    await writeJson(join(sharedRawDir, 'rejected-or-low-confidence.json'), shared.rejected);
    warnings.push(...mediaWarnings('_shared', shared.reports));
  } catch (error) {
    warnings.push(`_shared: ${error instanceof Error ? error.message : String(error)}`);
  }
  const published = dedupeMedia(mentions);
  succeeded = new Set(published.map((mention) => mention.memberSlug).filter(Boolean)).size;
  await persistMediaMentions(published);
  return { mentions: published, status: providerStatus('media', published.length ? 'received' : 'partial', published.length, attempted, succeeded, warnings, join(runDir, 'raw', 'media')) };
}

function toPublicMediaMention(item: {
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
  memberSlug?: string;
  memberName?: string;
  query?: string;
}): PublicMediaMention {
  return {
    id: item.id,
    source: item.source,
    title: item.title,
    description: removePrivateContactHints(item.description),
    url: item.url,
    domain: item.domain,
    sourceName: item.sourceName,
    publishedAt: item.publishedAt,
    harvestedAt: item.harvestedAt,
    imageUrl: item.imageUrl,
    confidence: item.confidence,
    status: 'published',
    memberSlug: item.memberSlug,
    memberName: item.memberName,
    query: item.query
  };
}

function mediaWarnings(prefix: string, reports: Array<{ collector?: string; status?: string; url?: string; query?: string; httpStatus?: number; warning?: string }>) {
  return reports
    .filter((report) => report.status && !['ok', 'empty'].includes(report.status))
    .map((report) => `${prefix}: ${report.collector ?? 'media'} ${report.status}${report.httpStatus ? ` ${report.httpStatus}` : ''}${report.query ? ` (${report.query})` : ''}${report.warning ? `: ${report.warning}` : ''}`);
}

async function persistMediaMentions(records: PublicMediaMention[]) {
  const dbMembers = await db.member.findMany({ select: { id: true, slug: true } });
  const memberIds = new Map(dbMembers.map((member) => [member.slug, member.id]));
  const urls = records.map((record) => record.url).filter(Boolean);
  if (urls.length) {
    await db.mediaMention.deleteMany({ where: { url: { notIn: urls } } });
  }
  for (const record of records) {
    if (!record.url) continue;
    const memberId = record.memberSlug ? memberIds.get(record.memberSlug) : undefined;
    await db.mediaMention.upsert({
      where: { url: record.url },
      create: {
        memberId,
        title: record.title,
        description: removePrivateContactHints(record.description),
        url: record.url,
        domain: record.domain,
        sourceName: record.sourceName,
        publishedAt: toNullableDate(record.publishedAt),
        harvestedAt: toNullableDate(record.harvestedAt) ?? new Date(),
        confidence: record.confidence,
        status: record.status,
        imageUrl: record.imageUrl,
        query: record.query
      },
      update: {
        memberId,
        title: record.title,
        description: removePrivateContactHints(record.description),
        domain: record.domain,
        sourceName: record.sourceName,
        publishedAt: toNullableDate(record.publishedAt),
        harvestedAt: toNullableDate(record.harvestedAt) ?? new Date(),
        confidence: record.confidence,
        status: record.status,
        imageUrl: record.imageUrl,
        query: record.query
      }
    });
  }
}

function toNullableDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function harvestPhotos(members: SeedMember[]): Promise<ProviderStatus> {
  const photoRunDir = join(runDir, 'raw', 'photos');
  const manifest = await harvestMemberPhotos(members, {
    root,
    runDir: photoRunDir,
    seedPath: join(root, 'data', 'seeds', 'members.public.json'),
    publicMembersPath: join(publicDir, 'members.json'),
    manifestPath: join(root, 'data', 'seeds', 'member-photo-manifest.json'),
    publicManifestPath: join(publicDir, 'member-photo-manifest.json'),
    writePublicMembers: false
  });
  const records = Array.isArray(manifest.records) ? manifest.records : [];
  const downloaded = records.filter((record) => record.status === 'downloaded').length;
  const warnings = records
    .filter((record) => record.status !== 'downloaded')
    .map((record) => `${record.slug}: ${record.error || record.status}`);
  const status = downloaded === records.length ? 'received' : downloaded > 0 ? 'partial' : 'unavailable';
  return providerStatus('photos', status, downloaded, records.length, downloaded, warnings, photoRunDir);
}

async function buildCareerMap(members: ReturnType<typeof sanitizeMembers>, publications: NormalizedPublication[]) {
  const rules = await loadCareerRules();
  return members.map((member) => {
    const memberPublications = publications.filter((publication) => publication.memberSlugs?.includes(member.slug));
    const evaluation = evaluateCareer({
      publications: memberPublications,
      teachingPeriods: [],
      academicDegree: member.degree_status,
      academicTitle: member.degree_status,
      profileKey: 'social_humanitarian',
      overrides: [{ milestoneKey: 'master_or_specialist', status: 'COMPLETED' }]
    }, rules);
    const current = [...evaluation.milestones].reverse().find((milestone) => milestone.status === 'COMPLETED') ?? evaluation.milestones[0];
    const next = evaluation.milestones.find((milestone) => milestone.status === 'READY' || milestone.status === 'IN_PROGRESS' || milestone.status === 'NEEDS_VERIFICATION') ?? evaluation.milestones[0];
    return {
      memberSlug: member.slug,
      memberName: member.full_name,
      institute: member.institute,
      currentStatus: current?.label ?? 'Профиль создан',
      nextStep: next?.label ?? 'Проверить профиль',
      missing: next?.nextActions ?? [],
      confidence: memberPublications.length ? 0.74 : 0.42,
      milestones: evaluation.milestones.map((milestone) => decorateCareerMilestone({
        key: milestone.key,
        label: milestone.label,
        layer: milestone.layer,
        track: milestone.track,
        parallel_track: milestone.parallel_track,
        join_gate: milestone.join_gate,
        order: milestone.order,
        description: milestone.description,
        legal_basis: milestone.legal_basis,
        evidence_required: milestone.evidence_required,
        manual_verification: milestone.manual_verification,
        status: milestone.status,
        progress: milestone.progress,
        progressItems: milestone.progressItems,
        nextActions: milestone.nextActions
      }))
    };
  });
}

function annotatePublications(publications: NormalizedPublication[], member: SeedMember): NormalizedPublication[] {
  return publications.map((publication) => ({
    ...publication,
    memberSlugs: Array.from(new Set([...(publication.memberSlugs ?? []), member.slug])),
    authorship: mergeAuthorship(publication.authorship, { memberSlug: member.slug, memberName: member.full_name, confidence: 0.9 })
  }));
}

function mergeAuthorship(existing: NormalizedPublication['authorship'], item: NonNullable<NormalizedPublication['authorship']>[number]) {
  const bySlug = new Map((existing ?? []).map((entry) => [entry.memberSlug, entry]));
  bySlug.set(item.memberSlug, bySlug.get(item.memberSlug) ?? item);
  return Array.from(bySlug.values());
}

function sanitizeMembers(members: SeedMember[]) {
  return members.map(({ seed_source: _seedSource, ...member }: SeedMember & { seed_source?: string }) => ({
    ...member,
    public_comment: removePrivateContactHints(member.public_comment)
  }));
}

function removePrivateContactHints(value?: string) {
  if (!value) return value;
  return value.replace(/(?:\s|^)[^.!?]*(телефон|тел\.|phone|mobile|моб\.)[^.!?]*[.!?]?/gi, '').trim();
}

function stripSourcePayload(publication: NormalizedPublication): NormalizedPublication {
  const { sourcePayload: _sourcePayload, ...safe } = publication;
  return safe;
}

function providerStatus(source: SourceName, status: string, recordsCollected: number, membersAttempted: number, membersSucceeded: number, warnings: string[], rawPath: string, cacheUsed = false): ProviderStatus {
  return {
    source,
    status,
    label: statusLabel(status),
    recordsCollected,
    membersAttempted,
    membersSucceeded,
    warnings,
    cacheUsed,
    rawPath: relative(rawPath)
  };
}

function mergeProviderStatuses(current: ProviderStatus[], previous: ProviderStatus[]) {
  const bySource = new Map<SourceName, ProviderStatus>();
  for (const item of previous) bySource.set(item.source, { ...item, label: statusLabel(item.status) });
  for (const item of current) bySource.set(item.source, item);
  return Array.from(bySource.values());
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    received: 'получено',
    partial: 'частично получено',
    unavailable: 'источник недоступен',
    needs_cookie_or_api_access: 'нужен cookie/API-доступ',
    needs_api_key_or_manual_cache: 'нужен API-доступ или ручной cache',
    cache_used: 'использован cache'
  };
  return labels[status] ?? status;
}

async function readCachedPublicationSet(source: SourceName): Promise<NormalizedPublication[]> {
  const cacheFile = join(latestDir, 'normalized', `${source}.json`);
  return readJson(cacheFile, [] as NormalizedPublication[]);
}

function countRecords(sets: NormalizedPublication[][]) {
  return sets.reduce((sum, set) => sum + set.length, 0);
}

function dedupeMedia(records: PublicMediaMention[]) {
  const seen = new Set<string>();
  return records.filter((record) => {
    if (seen.has(record.url)) return false;
    seen.add(record.url);
    return true;
  });
}

async function copyLatest(fromDir: string, toDir: string) {
  await mkdir(toDir, { recursive: true });
  await copyTree(join(fromDir, 'normalized'), join(toDir, 'normalized'));
  await copyTree(join(fromDir, 'logs'), join(toDir, 'logs'));
}

async function copyTree(fromDir: string, toDir: string) {
  if (!existsSync(fromDir)) return;
  await mkdir(toDir, { recursive: true });
  for (const entry of await readdir(fromDir, { withFileTypes: true })) {
    const source = join(fromDir, entry.name);
    const target = join(toDir, entry.name);
    if (entry.isDirectory()) await copyTree(source, target);
    else await copyFile(source, target);
  }
}

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    if (!existsSync(path)) return fallback;
    return JSON.parse(await readFile(path, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

async function ensureDirs(paths: string[]) {
  await Promise.all(paths.map((path) => mkdir(path, { recursive: true })));
}

function relative(path: string) {
  return path.replace(`${root}\\`, '').replaceAll('\\', '/');
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch(async (error) => {
  const message = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);
  await mkdir(join(runDir, 'logs'), { recursive: true }).catch(() => undefined);
  await writeFile(join(runDir, 'logs', 'fatal-error.log'), message, 'utf-8').catch(() => undefined);
  console.error(message);
  process.exitCode = 1;
}).finally(async () => {
  await db.$disconnect();
});
