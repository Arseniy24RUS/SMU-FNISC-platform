import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { load as loadHtml } from 'cheerio';
import { XMLParser } from 'fast-xml-parser';
import { env } from '@/lib/env';
import { normalizeSpaces } from '@/lib/utils';

export type MediaMentionStatus = 'published' | 'low_confidence' | 'rejected';

export type MediaMentionCandidate = {
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
  status?: MediaMentionStatus;
  query: string;
  memberSlug?: string;
  memberName?: string;
  forcePublish?: boolean;
};

export type MediaSeedMember = {
  slug: string;
  full_name: string;
  institute?: string;
  unit?: string;
  position?: string;
  interests?: string;
  roles_and_achievements?: string;
  fnisc_profile_url?: string;
  sources_note?: string;
};

export type MediaSeedUrl = {
  memberSlug?: string;
  url: string;
  title?: string;
  description?: string;
  sourceType?: string;
  sourceName?: string;
  forcePublish?: boolean;
  date?: string;
  publishedAt?: string;
};

export type MediaSitemapSource = {
  name: string;
  sitemapUrl: string;
  urlAllowRegex?: string;
  maxUrls?: number;
};

export type MediaSiteScanSource = {
  name: string;
  startUrls: string[];
  urlAllowRegex?: string;
  itemUrlRegex?: string;
  maxPages?: number;
  maxDepth?: number;
  maxLinksPerPage?: number;
  includeExternalLinks?: boolean;
  fetchMatchedPages?: boolean;
  maxMatchedPageFetches?: number;
  crawlUrlRegex?: string;
  pageContentUrlRegex?: string;
};

export type MediaTelegramChannel = {
  channel: string;
  maxLatestPosts?: number;
};

export type MediaSourceConfig = {
  autoPublishThreshold?: number;
  gdelt?: {
    timespan?: string;
    maxRecordsPerQuery?: number;
  };
  searchProviders?: {
    bingWebRss?: {
      enabled?: boolean;
      maxQueriesPerMember?: number;
      maxItemsPerQuery?: number;
      allowedDomains?: string[];
    };
    profileMentionIndex?: {
      enabled?: boolean;
      maxLinksPerMember?: number;
    };
    sourceNoteUrls?: {
      enabled?: boolean;
      maxUrlsPerMember?: number;
    };
  };
  seedUrls?: MediaSeedUrl[];
  sitemapSources?: MediaSitemapSource[];
  siteScanSources?: MediaSiteScanSource[];
  telegramChannels?: MediaTelegramChannel[];
  stopDomains?: string[];
};

export type MediaCollectorReport = {
  collector: string;
  status: 'ok' | 'empty' | 'http_error' | 'error' | 'parse_error' | 'blocked';
  url?: string;
  query?: string;
  records?: number;
  attempts?: number;
  httpStatus?: number;
  bytes?: number;
  elapsedMs?: number;
  warning?: string;
  cacheUsed?: boolean;
};

export type MediaMemberHarvestResult = {
  member: MediaSeedMember;
  records: MediaMentionCandidate[];
  published: MediaMentionCandidate[];
  rejected: MediaMentionCandidate[];
  reports: MediaCollectorReport[];
  raw: Record<string, unknown>;
};

export type MediaSharedHarvestResult = {
  records: MediaMentionCandidate[];
  published: MediaMentionCandidate[];
  rejected: MediaMentionCandidate[];
  reports: MediaCollectorReport[];
  raw: Record<string, unknown>;
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'text'
});

const defaultStopDomains = new Set([
  'elibrary.ru',
  'orcid.org',
  'scopus.com',
  'webofscience.com',
  'github.com',
  'researchgate.net',
  'scholar.google.com',
  'cyberleninka.ru'
]);

let lastGdeltRequestAt = 0;

export async function loadMediaSourcesConfig(path = join(process.cwd(), 'data', 'seeds', 'media-sources.json')): Promise<MediaSourceConfig> {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(await readFile(path, 'utf-8')) as MediaSourceConfig;
  } catch {
    return {};
  }
}

export function buildNameQueries(fullName: string, slug?: string): string[] {
  const parts = fullName.split(/\s+/).filter(Boolean);
  const [surname, name, patronymic] = parts;
  const initialsNoSpace = initialsFor(name, patronymic, '');
  const initialsWithSpace = initialsFor(name, patronymic, ' ');
  const latinParts = slug?.split('-').filter(Boolean) ?? [];
  const [latinSurname, latinName, latinPatronymic] = latinParts;
  const surnameVariants = surnameCaseVariants(surname);
  return unique([
    quote(fullName),
    surname && name ? quote(`${surname} ${name}`) : '',
    name && surname ? quote(`${name} ${surname}`) : '',
    ...surnameVariants.flatMap((variant) => [
      initialsNoSpace ? quote(`${variant} ${initialsNoSpace}`) : '',
      initialsWithSpace ? quote(`${variant} ${initialsWithSpace}`) : '',
      initialsNoSpace ? quote(`${initialsNoSpace} ${variant}`) : '',
      initialsWithSpace ? quote(`${initialsWithSpace} ${variant}`) : ''
    ]),
    ...surnameVariants.slice(1, 5).map((variant) => quote(variant)),
    latinName && latinSurname ? quote(capWords(`${latinName} ${latinSurname}`)) : '',
    latinSurname && latinName ? quote(capWords(`${latinSurname} ${latinName}`)) : '',
    latinName && latinPatronymic && latinSurname ? quote(capWords(`${latinName} ${latinPatronymic} ${latinSurname}`)) : ''
  ]);
}

export function buildIdentityTerms(member: Pick<MediaSeedMember, 'slug' | 'full_name'>): string[] {
  const parts = member.full_name.toLowerCase().replace(/ё/g, 'е').split(/\s+/).filter(Boolean);
  const [surname, name, patronymic] = parts;
  const initialsNoSpace = initialsFor(name, patronymic, '');
  const initialsWithSpace = initialsFor(name, patronymic, ' ');
  const firstInitial = name?.[0] ? `${name[0]}.` : '';
  const latinParts = member.slug.split('-').filter(Boolean);
  const [latinSurname, latinName, latinPatronymic] = latinParts;
  const surnameVariants = surnameCaseVariants(surname);
  return unique([
    member.full_name,
    surname,
    ...surnameVariants,
    surname && name ? `${surname} ${name}` : '',
    name && surname ? `${name} ${surname}` : '',
    surname && patronymic ? `${surname} ${name} ${patronymic}` : '',
    ...surnameVariants.flatMap((variant) => [
      initialsNoSpace ? `${variant} ${initialsNoSpace}` : '',
      initialsWithSpace ? `${variant} ${initialsWithSpace}` : '',
      initialsNoSpace ? `${initialsNoSpace} ${variant}` : '',
      initialsWithSpace ? `${initialsWithSpace} ${variant}` : '',
      firstInitial ? `${variant} ${firstInitial}` : '',
      firstInitial ? `${firstInitial} ${variant}` : ''
    ]),
    latinName && latinSurname ? `${latinName} ${latinSurname}` : '',
    latinSurname && latinName ? `${latinSurname} ${latinName}` : '',
    latinName && latinPatronymic && latinSurname ? `${latinName} ${latinPatronymic} ${latinSurname}` : ''
  ].map((x) => normalizeForSearch(x)));
}

export function buildContextTerms(member: MediaSeedMember): string[] {
  const interests = (member.interests || '').split(/[;,]/).map((x) => x.trim()).filter(Boolean).slice(0, 6);
  return unique([
    'фнисц',
    'ран',
    'социолог',
    'социология',
    'демограф',
    'демография',
    member.institute,
    member.unit,
    member.position,
    member.roles_and_achievements,
    ...interests
  ].map((x) => normalizeForSearch(x)).filter((x) => x.length >= 3));
}

export async function harvestMediaMentionsForMember(member: MediaSeedMember, config?: MediaSourceConfig): Promise<MediaMemberHarvestResult> {
  const cfg = config ?? await loadMediaSourcesConfig();
  const threshold = getThreshold(cfg);
  const reports: MediaCollectorReport[] = [];
  const raw: Record<string, unknown> = {};
  const records: MediaMentionCandidate[] = [];

  const seedResult = await fetchSeedUrlsForMember(member, cfg);
  records.push(...seedResult.records);
  reports.push(...seedResult.reports);
  raw.seed = seedResult.raw;

  const profileMentionsResult = await fetchProfileMentionIndexForMember(member, cfg);
  records.push(...profileMentionsResult.records);
  reports.push(...profileMentionsResult.reports);
  raw.profileMentions = profileMentionsResult.raw;

  const sourceNoteResult = await fetchSourceNoteUrlsForMember(member, cfg);
  records.push(...sourceNoteResult.records);
  reports.push(...sourceNoteResult.reports);
  raw.sourceNoteUrls = sourceNoteResult.raw;

  const gdeltResult = await fetchGdeltForMember(member, cfg);
  records.push(...gdeltResult.records);
  reports.push(...gdeltResult.reports);
  raw.gdelt = gdeltResult.raw;

  const bingResult = await fetchBingWebRssForMember(member, cfg);
  records.push(...bingResult.records);
  reports.push(...bingResult.reports);
  raw.bingWebRss = bingResult.raw;

  if (isGoogleNewsEnabled()) {
    const googleResult = await fetchGoogleNewsForMember(member, cfg);
    records.push(...googleResult.records);
    reports.push(...googleResult.reports);
    raw.googleNews = googleResult.raw;
  } else {
    reports.push({ collector: 'google_news_rss', status: 'empty', records: 0, warning: 'Skipped by MEDIA_ENABLE_GOOGLE_NEWS=false' });
    raw.googleNews = { skipped: true };
  }

  const deduped = dedupe(records).filter((record) => !isBlockedRecord(record, member, cfg));
  const published = deduped.filter((record) => record.forcePublish || (record.confidence >= threshold && record.status !== 'rejected'));
  const rejected = deduped.filter((record) => !published.includes(record));
  return {
    member,
    records: deduped,
    published: published.map((record) => ({ ...record, status: 'published' })),
    rejected: rejected.map((record) => ({ ...record, status: record.status === 'rejected' ? 'rejected' : 'low_confidence' })),
    reports,
    raw
  };
}

export async function harvestSharedMediaSources(members: MediaSeedMember[], config?: MediaSourceConfig): Promise<MediaSharedHarvestResult> {
  const cfg = config ?? await loadMediaSourcesConfig();
  const reports: MediaCollectorReport[] = [];
  const raw: Record<string, unknown> = {};
  const records: MediaMentionCandidate[] = [];

  const telegramResult = await fetchTelegramChannels(members, cfg);
  records.push(...telegramResult.records);
  reports.push(...telegramResult.reports);
  raw.telegram = telegramResult.raw;

  const sitemapResult = await fetchSitemaps(members, cfg);
  records.push(...sitemapResult.records);
  reports.push(...sitemapResult.reports);
  raw.sitemaps = sitemapResult.raw;

  const siteScanResult = await fetchSiteScanSources(members, cfg);
  records.push(...siteScanResult.records);
  reports.push(...siteScanResult.reports);
  raw.siteScan = siteScanResult.raw;

  const threshold = getThreshold(cfg);
  const deduped = dedupe(records);
  const published = deduped.filter((record) => record.forcePublish || record.confidence >= threshold);
  const rejected = deduped.filter((record) => !published.includes(record));
  return {
    records: deduped,
    published: published.map((record) => ({ ...record, status: 'published' })),
    rejected: rejected.map((record) => ({ ...record, status: record.status === 'rejected' ? 'rejected' : 'low_confidence' })),
    reports,
    raw
  };
}

export async function searchGoogleNewsRss(fullName: string, contextTerms: string[] = []): Promise<MediaMentionCandidate[]> {
  const slug = slugFromName(fullName);
  const member: MediaSeedMember = { slug, full_name: fullName, interests: contextTerms.join('; ') };
  const cfg = await loadMediaSourcesConfig();
  const result = await fetchGoogleNewsForMember(member, cfg);
  return result.records;
}

export function scoreMention(text: string, fullName: string, contextTerms: string[], domain: string): number {
  const member: MediaSeedMember = { slug: slugFromName(fullName), full_name: fullName, interests: contextTerms.join('; ') };
  return scoreMentionForMember(text, '', '', member, buildContextTerms(member), domain, false);
}

async function fetchProfileMentionIndexForMember(member: MediaSeedMember, cfg: MediaSourceConfig) {
  const settings = cfg.searchProviders?.profileMentionIndex;
  if (settings?.enabled === false) {
    return {
      records: [],
      reports: [{ collector: 'official_profile_mentions', status: 'empty' as const, records: 0, warning: 'Skipped by media-sources config' }],
      raw: { skipped: true }
    };
  }
  const records: MediaMentionCandidate[] = [];
  const reports: MediaCollectorReport[] = [];
  const raw: unknown[] = [];
  const contextTerms = buildContextTerms(member);
  const maxLinks = clampNumber(settings?.maxLinksPerMember ?? 80, 1, 300);

  for (const indexUrl of buildProfileMentionIndexUrls(member)) {
    const fetched = await fetchText(indexUrl, 'official_profile_mentions');
    reports.push(fetched.report);
    const links = fetched.text ? extractLinks(fetched.text, indexUrl) : [];
    const matchedLinks: unknown[] = [];
    raw.push({
      url: indexUrl,
      html: fetched.text?.slice(0, 120000) ?? null,
      report: fetched.report,
      links: links.length,
      matchedLinks
    });
    if (!fetched.text) continue;

    for (const link of links.slice(0, maxLinks)) {
      if (!isLikelyMentionUrl(link.url) || isBlockedUrlForHarvest(link.url)) continue;
      const linkText = normalizeSpaces(link.text);
      if (!linkText || isNavigationLikeText(linkText)) continue;
      const record = buildRecord(member, {
        source: 'official_profile_mentions',
        title: linkText,
        description: `Упоминание на официальном сайте: ${domainOf(indexUrl)}`,
        url: link.url,
        query: indexUrl,
        sourceName: domainOf(indexUrl),
        text: `${linkText} ${domainOf(indexUrl)}`
      }, contextTerms, cfg);
      if (record.confidence < 0.5) continue;
      records.push(record);
      matchedLinks.push({ url: link.url, text: linkText, confidence: record.confidence });
    }
    await delay(150);
  }
  return { records, reports, raw };
}

async function fetchSourceNoteUrlsForMember(member: MediaSeedMember, cfg: MediaSourceConfig) {
  const settings = cfg.searchProviders?.sourceNoteUrls;
  if (settings?.enabled === false) {
    return {
      records: [],
      reports: [{ collector: 'member_source_note_url', status: 'empty' as const, records: 0, warning: 'Skipped by media-sources config' }],
      raw: { skipped: true }
    };
  }
  const records: MediaMentionCandidate[] = [];
  const reports: MediaCollectorReport[] = [];
  const raw: unknown[] = [];
  const urls = extractPublicUrlsFromText(member.sources_note || '').filter((url) => {
    if (member.fnisc_profile_url && cleanUrl(url) === cleanUrl(member.fnisc_profile_url)) return false;
    return isLikelyMentionUrl(url) && !isBlockedUrlForHarvest(url);
  });
  const contextTerms = buildContextTerms(member);
  const maxUrls = clampNumber(settings?.maxUrlsPerMember ?? 8, 1, 30);
  for (const url of urls.slice(0, maxUrls)) {
    const record = await buildRecordFromUrl(url, member, contextTerms, 'member_source_note_url', url, cfg, {
      query: 'member_sources_note',
      sourceName: domainOf(url)
    });
    records.push(record.record);
    reports.push(record.report);
    raw.push(record.raw);
    await delay(120);
  }
  return { records, reports, raw };
}

async function fetchBingWebRssForMember(member: MediaSeedMember, cfg: MediaSourceConfig) {
  const settings = cfg.searchProviders?.bingWebRss;
  if (settings?.enabled === false || env.MEDIA_ENABLE_BING_SEARCH.toLowerCase() !== 'true') {
    return {
      records: [],
      reports: [{ collector: 'bing_web_rss', status: 'empty' as const, records: 0, warning: 'Skipped by MEDIA_ENABLE_BING_SEARCH=false or media-sources config' }],
      raw: { skipped: true }
    };
  }
  const records: MediaMentionCandidate[] = [];
  const reports: MediaCollectorReport[] = [];
  const raw: unknown[] = [];
  const contextTerms = buildContextTerms(member);
  const maxQueries = clampNumber(settings?.maxQueriesPerMember ?? env.MEDIA_BING_MAX_QUERIES_PER_MEMBER, 1, 12);
  const maxItems = clampNumber(settings?.maxItemsPerQuery ?? env.MEDIA_BING_MAX_ITEMS_PER_QUERY, 1, 25);
  const allowedDomains = new Set((settings?.allowedDomains ?? defaultSearchAllowedDomains()).map((domain) => domain.toLowerCase()));

  for (const query of buildWebSearchQueries(member).slice(0, maxQueries)) {
    const url = `https://www.bing.com/search?${new URLSearchParams({ q: query, format: 'rss', setlang: 'ru', mkt: 'ru-RU' })}`;
    const fetched = await fetchText(url, 'bing_web_rss', query, 'application/rss+xml,application/xml,text/xml,*/*');
    reports.push(fetched.report);
    const queryRaw: { query: string; url: string; text: string | null; report: MediaCollectorReport; candidates: unknown[] } = {
      query,
      url,
      text: fetched.text?.slice(0, 120000) ?? null,
      report: fetched.report,
      candidates: []
    };
    raw.push(queryRaw);
    if (!fetched.text) continue;
    try {
      const parsed = xmlParser.parse(fetched.text) as { rss?: { channel?: { item?: unknown } } };
      const items = getArray(parsed.rss?.channel?.item).slice(0, maxItems);
      for (const item of items) {
        const rssRecord = buildRecordFromRssLikeSearchItem(item, member, contextTerms, query, 'bing_web_rss', cfg);
        if (!rssRecord) continue;
        const domainAllowed = rssRecord.domain ? allowedDomains.has(rssRecord.domain) : false;
        queryRaw.candidates.push({ title: rssRecord.title, url: rssRecord.url, domain: rssRecord.domain, confidence: rssRecord.confidence, domainAllowed });
        if (!domainAllowed) continue;

        const page = await buildRecordFromUrl(rssRecord.url, member, contextTerms, 'bing_web_rss', rssRecord.title, cfg, {
          description: rssRecord.description,
          query,
          sourceName: rssRecord.sourceName || rssRecord.domain,
          publishedAt: rssRecord.publishedAt
        });
        reports.push(page.report);
        queryRaw.candidates.push({ url: rssRecord.url, fetched: page.report.status, fetchedConfidence: page.record.confidence });
        const bestRecord = page.report.status === 'ok' || page.report.cacheUsed
          ? page.record
          : rssRecord;
        if (bestRecord.confidence >= 0.5) records.push(bestRecord);
        await delay(120);
      }
    } catch (error) {
      reports.push({ collector: 'bing_web_rss', status: 'parse_error', url, query, warning: stringifyError(error) });
    }
    await delay(350);
  }
  return { records, reports, raw };
}

async function fetchGdeltForMember(member: MediaSeedMember, cfg: MediaSourceConfig) {
  const query = buildGdeltQuery(member);
  const params = new URLSearchParams({
    query,
    mode: 'artlist',
    format: 'json',
    sort: 'datedesc',
    maxrecords: String(cfg.gdelt?.maxRecordsPerQuery ?? env.GDELT_MAX_RECORDS_PER_QUERY),
    timespan: cfg.gdelt?.timespan ?? env.GDELT_TIMESPAN
  });
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?${params}`;
  await throttleGdeltRequests();
  const fetched = await fetchJson(url, 'gdelt_keyword_search', query);
  const raw = { query, url, response: fetched.value ?? null, report: fetched.report };
  const articles = getArray((fetched.value as { articles?: unknown[] } | undefined)?.articles);
  const contextTerms = buildContextTerms(member);
  const records = articles
    .map((article) => buildRecordFromGdelt(article, member, contextTerms, query, cfg))
    .filter(Boolean) as MediaMentionCandidate[];
  return {
    records,
    reports: [{ ...fetched.report, records: records.length }],
    raw
  };
}

async function fetchGoogleNewsForMember(member: MediaSeedMember, cfg: MediaSourceConfig) {
  const records: MediaMentionCandidate[] = [];
  const reports: MediaCollectorReport[] = [];
  const raw: unknown[] = [];
  const langs = unique(env.MEDIA_QUERY_LANGS.split(',').map((x) => x.trim()).filter(Boolean));
  const contextTerms = buildContextTerms(member);
  for (const query of buildNameQueries(member.full_name, member.slug).slice(0, 3)) {
    for (const lang of langs) {
      const country = lang === 'en' ? 'US' : 'RU';
      const url = `https://news.google.com/rss/search?${new URLSearchParams({ q: query, hl: lang, gl: country, ceid: `${country}:${lang}` })}`;
      const fetched = await fetchText(url, 'google_news_rss', query, 'application/rss+xml,application/xml,text/xml,*/*');
      reports.push(fetched.report);
      raw.push({ query, url, text: fetched.text?.slice(0, 120000) ?? null, report: fetched.report });
      if (!fetched.text) continue;
      try {
        const parsed = xmlParser.parse(fetched.text) as { rss?: { channel?: { item?: unknown } } };
        const items = getArray(parsed.rss?.channel?.item);
        for (const item of items.slice(0, env.MEDIA_MAX_RESULTS_PER_MEMBER)) {
          const record = buildRecordFromRss(item, member, contextTerms, query, cfg);
          if (record) records.push(record);
        }
      } catch (error) {
        reports.push({ collector: 'google_news_rss', status: 'parse_error', url, query, warning: stringifyError(error) });
      }
      await delay(250);
    }
  }
  return { records, reports, raw };
}

async function fetchSeedUrlsForMember(member: MediaSeedMember, cfg: MediaSourceConfig) {
  const records: MediaMentionCandidate[] = [];
  const reports: MediaCollectorReport[] = [];
  const raw: unknown[] = [];
  const seeds = (cfg.seedUrls ?? []).filter((seed) => !seed.memberSlug || seed.memberSlug === member.slug);
  const contextTerms = buildContextTerms(member);
  for (const seed of seeds) {
    const record = await buildRecordFromUrl(seed.url, member, contextTerms, seed.sourceType || 'known_seed', seed.title || seed.url, cfg, {
      description: seed.description,
      sourceName: seed.sourceName,
      query: 'seed_url',
      forcePublish: Boolean(seed.forcePublish),
      publishedAt: seed.date || seed.publishedAt
    });
    records.push(record.record);
    reports.push(record.report);
    raw.push(record.raw);
    await delay(150);
  }
  return { records, reports, raw };
}

async function fetchTelegramChannels(members: MediaSeedMember[], cfg: MediaSourceConfig) {
  const records: MediaMentionCandidate[] = [];
  const reports: MediaCollectorReport[] = [];
  const raw: unknown[] = [];
  for (const channel of cfg.telegramChannels ?? []) {
    const url = `https://t.me/s/${channel.channel}`;
    const fetched = await fetchText(url, 'telegram_channel_scan');
    reports.push(fetched.report);
    raw.push({ channel: channel.channel, url, html: fetched.text?.slice(0, 120000) ?? null, report: fetched.report });
    if (!fetched.text) continue;
    const $ = loadHtml(fetched.text);
    const posts = $('.tgme_widget_message').slice(0, channel.maxLatestPosts ?? 50).toArray();
    for (const post of posts) {
      const node = $(post);
      const postId = node.attr('data-post');
      const postUrl = postId ? `https://t.me/${postId}` : url;
      const body = normalizeSpaces(node.text());
      if (!body) continue;
      for (const member of members) {
        const contextTerms = buildContextTerms(member);
        const record = buildRecord(member, {
          source: 'telegram_channel_scan',
          title: body.slice(0, 120) || postUrl,
          description: body.slice(0, 420),
          url: postUrl,
          query: channel.channel,
          sourceName: channel.channel,
          text: body
        }, contextTerms, cfg);
        if (record.confidence > 0) records.push(record);
      }
    }
    await delay(250);
  }
  return { records, reports, raw };
}

async function fetchSitemaps(members: MediaSeedMember[], cfg: MediaSourceConfig) {
  const records: MediaMentionCandidate[] = [];
  const reports: MediaCollectorReport[] = [];
  const raw: unknown[] = [];
  for (const source of cfg.sitemapSources ?? []) {
    const sitemap = await fetchText(source.sitemapUrl, 'sitemap_index', undefined, 'application/xml,text/xml,*/*');
    reports.push(sitemap.report);
    const urls = sitemap.text ? parseSitemapUrls(sitemap.text, source) : [];
    raw.push({ source, urls, report: sitemap.report });
    for (const url of urls) {
      const page = await fetchText(url, 'sitemap_scan');
      reports.push(page.report);
      if (!page.text) continue;
      const meta = metaFromHtml(page.text);
      const text = textifyHtml(page.text);
      for (const member of members) {
        const contextTerms = buildContextTerms(member);
        const record = buildRecord(member, {
          source: 'sitemap_scan',
          title: meta.title || url,
          description: meta.description || text.slice(0, 420),
          url,
          query: source.name,
          sourceName: source.name,
          imageUrl: meta.image,
          text
        }, contextTerms, cfg);
        if (record.confidence > 0) records.push(record);
      }
      await delay(120);
    }
  }
  return { records, reports, raw };
}

async function fetchSiteScanSources(members: MediaSeedMember[], cfg: MediaSourceConfig) {
  const records: MediaMentionCandidate[] = [];
  const reports: MediaCollectorReport[] = [];
  const raw: unknown[] = [];
  const memberContextTerms = new Map(members.map((member) => [member.slug, buildContextTerms(member)]));
  for (const source of cfg.siteScanSources ?? []) {
    const maxPages = clampNumber(source.maxPages ?? 40, 1, 160);
    const maxDepth = clampNumber(source.maxDepth ?? 1, 0, 2);
    const maxLinksPerPage = clampNumber(source.maxLinksPerPage ?? 80, 1, 1200);
    const maxMatchedPageFetches = clampNumber(source.maxMatchedPageFetches ?? 8, 0, 30);
    const allowRx = safeRegExp(source.urlAllowRegex);
    const itemRx = safeRegExp(source.itemUrlRegex ?? source.urlAllowRegex);
    const crawlRx = safeRegExp(source.crawlUrlRegex ?? source.urlAllowRegex);
    const pageContentRx = safeRegExp(source.pageContentUrlRegex ?? source.itemUrlRegex ?? source.urlAllowRegex);
    const seen = new Set<string>();
    const fetchedMatches = new Set<string>();
    let frontier = unique(source.startUrls ?? []).map(cleanUrl);
    const sourceRaw: {
      source: MediaSiteScanSource;
      pages: unknown[];
      matchedLinks: unknown[];
      matchedPages: unknown[];
    } = { source, pages: [], matchedLinks: [], matchedPages: [] };

    for (let depth = 0; depth <= maxDepth && frontier.length && seen.size < maxPages; depth += 1) {
      const next: string[] = [];
      for (const pageUrl of frontier) {
        if (!pageUrl || seen.has(pageUrl) || seen.size >= maxPages || isStaticUrl(pageUrl)) continue;
        seen.add(pageUrl);
        const page = await fetchText(pageUrl, 'institutional_site_scan', source.name);
        reports.push(page.report);
        const links = page.text ? extractLinks(page.text, pageUrl).slice(0, maxLinksPerPage) : [];
        sourceRaw.pages.push({
          url: pageUrl,
          depth,
          status: page.report.status,
          httpStatus: page.report.httpStatus,
          bytes: page.report.bytes,
          links: links.length,
          html: page.text?.slice(0, 120000) ?? null
        });
        if (!page.text) continue;

        if (shouldScoreSiteScanPage(pageUrl, depth, source, pageContentRx)) {
          const meta = metaFromHtml(page.text);
          const pageText = textifyHtml(page.text);
          for (const member of members) {
            const contextTerms = memberContextTerms.get(member.slug) ?? buildContextTerms(member);
            const pageRecord = buildRecord(member, {
              source: 'institutional_site_scan',
              title: meta.title || pageUrl,
              description: meta.description || source.name,
              url: pageUrl,
              query: source.name,
              sourceName: source.name,
              imageUrl: meta.image,
              text: pageText
            }, contextTerms, cfg);
            if (pageRecord.confidence < 0.5) continue;
            records.push(pageRecord);
            sourceRaw.matchedPages.push({
              sourceUrl: pageUrl,
              url: pageUrl,
              memberSlug: member.slug,
              title: pageRecord.title,
              confidence: pageRecord.confidence,
              report: page.report
            });
          }
        }

        for (const link of links) {
          if (!isAllowedScanLink(link.url, pageUrl, source, allowRx, itemRx)) continue;
          const linkText = normalizeSpaces(link.text);
          if (!linkText || linkText.length < 6 || isNavigationLikeText(linkText)) continue;
          for (const member of members) {
            const contextTerms = memberContextTerms.get(member.slug) ?? buildContextTerms(member);
            const linkRecord = buildRecord(member, {
              source: 'institutional_site_scan',
              title: linkText,
              description: source.name,
              url: link.url,
              query: source.name,
              sourceName: source.name,
              text: `${linkText} ${source.name}`
            }, contextTerms, cfg);
            if (linkRecord.confidence < 0.5) continue;

            let record = linkRecord;
            if (source.fetchMatchedPages && fetchedMatches.size < maxMatchedPageFetches && !fetchedMatches.has(link.url) && !isStaticUrl(link.url)) {
              fetchedMatches.add(link.url);
              const enriched = await buildRecordFromUrl(link.url, member, contextTerms, 'institutional_site_scan', linkText, cfg, {
                query: source.name,
                sourceName: source.name
              });
              reports.push(enriched.report);
              sourceRaw.matchedPages.push({ url: link.url, memberSlug: member.slug, report: enriched.report, raw: enriched.raw });
              if (enriched.report.status === 'ok' && enriched.record.confidence >= linkRecord.confidence) {
                record = enriched.record;
              }
              await delay(120);
            }

            records.push(record);
            sourceRaw.matchedLinks.push({
              sourceUrl: pageUrl,
              url: link.url,
              text: linkText,
              memberSlug: member.slug,
              confidence: record.confidence
            });
          }
        }

        if (depth < maxDepth) {
          for (const link of links) {
            if (next.length >= maxPages) break;
            if (!isAllowedCrawlLink(link.url, pageUrl, source, crawlRx)) continue;
            if (!seen.has(link.url) && !next.includes(link.url)) next.push(link.url);
          }
        }
        await delay(120);
      }
      frontier = next;
    }
    raw.push(sourceRaw);
  }
  return { records, reports, raw };
}

function buildRecordFromGdelt(article: unknown, member: MediaSeedMember, contextTerms: string[], query: string, cfg: MediaSourceConfig) {
  if (!article || typeof article !== 'object') return null;
  const item = article as Record<string, unknown>;
  const url = cleanUrl(String(item.url || item.url_mobile || ''));
  if (!url) return null;
  return buildRecord(member, {
    source: 'gdelt_keyword_search',
    title: String(item.title || url),
    description: String(item.seendate || item.sourcecountry || ''),
    url,
    query,
    sourceName: String(item.source || item.domain || domainOf(url) || 'GDELT'),
    publishedAt: parseGdeltDate(String(item.seendate || '')),
    imageUrl: typeof item.socialimage === 'string' ? item.socialimage : undefined,
    text: `${String(item.title || '')} ${String(item.domain || '')} ${String(item.sourcecountry || '')}`
  }, contextTerms, cfg);
}

function buildRecordFromRss(item: unknown, member: MediaSeedMember, contextTerms: string[], query: string, cfg: MediaSourceConfig) {
  if (!item || typeof item !== 'object') return null;
  const raw = item as Record<string, unknown>;
  const link = unwrapGoogleNewsLink(String(raw.link || ''));
  const url = cleanUrl(link);
  if (!url) return null;
  const source = typeof raw.source === 'object' && raw.source ? String((raw.source as Record<string, unknown>).text || '') : '';
  const description = stripHtml(String(raw.description || raw.content || ''));
  return buildRecord(member, {
    source: 'google_news_rss',
    title: decodeEntities(String(raw.title || url)),
    description,
    url,
    query,
    sourceName: source || domainOf(url),
    publishedAt: parseDate(String(raw.pubDate || raw.isoDate || '')),
    text: `${String(raw.title || '')} ${description}`
  }, contextTerms, cfg);
}

function buildRecordFromRssLikeSearchItem(item: unknown, member: MediaSeedMember, contextTerms: string[], query: string, source: string, cfg: MediaSourceConfig) {
  if (!item || typeof item !== 'object') return null;
  const raw = item as Record<string, unknown>;
  const url = cleanUrl(String(raw.link || raw.guid || ''));
  if (!url || isStaticUrl(url) || isBlockedUrlForHarvest(url)) return null;
  const description = stripHtml(String(raw.description || raw.summary || ''));
  return buildRecord(member, {
    source,
    title: decodeEntities(String(raw.title || url)),
    description,
    url,
    query,
    sourceName: domainOf(url),
    publishedAt: parseDate(String(raw.pubDate || raw.isoDate || raw.date || '')),
    text: `${String(raw.title || '')} ${description} ${url}`
  }, contextTerms, cfg);
}

async function buildRecordFromUrl(url: string, member: MediaSeedMember, contextTerms: string[], source: string, fallbackTitle: string, cfg: MediaSourceConfig, options: {
  description?: string;
  query?: string;
  sourceName?: string;
  forcePublish?: boolean;
  publishedAt?: string;
}) {
  const fetched = await fetchText(url, source);
  const meta: ReturnType<typeof metaFromHtml> = fetched.text ? metaFromHtml(fetched.text) : { title: '', description: undefined, image: undefined };
  const text = fetched.text ? textifyHtml(fetched.text) : '';
  const title = options.forcePublish && fallbackTitle ? fallbackTitle : meta.title || fallbackTitle;
  const record = buildRecord(member, {
    source,
    title,
    description: options.description || (options.forcePublish ? '' : meta.description || text.slice(0, 420)),
    url,
    query: options.query || source,
    sourceName: options.sourceName || domainOf(url),
    imageUrl: meta.image,
    publishedAt: options.publishedAt,
    text,
    forcePublish: options.forcePublish
  }, contextTerms, cfg);
  if (options.forcePublish) record.confidence = 1;
  record.status = options.forcePublish ? 'published' : record.status;
  return {
    record,
    report: { ...fetched.report, records: 1 },
    raw: { url, html: fetched.text?.slice(0, 120000) ?? null, report: fetched.report }
  };
}

function buildProfileMentionIndexUrls(member: MediaSeedMember) {
  const urls: string[] = [];
  const profile = cleanUrl(member.fnisc_profile_url || '');
  const id = profile.match(/[?&]id=(\d+)/i)?.[1];
  if (id) {
    const origin = originOf(profile);
    if (origin) urls.push(`${origin}/index.php?page_id=771&pid=${id}`);
    const domain = domainOf(profile);
    if (domain === 'fnisc.ru') urls.push(`https://www.isras.ru/index.php?page_id=771&pid=${id}`);
    if (domain === 'isras.ru') urls.push(`https://www.fnisc.ru/index.php?page_id=771&pid=${id}`);
  }
  return unique(urls).filter(Boolean);
}

function buildWebSearchQueries(member: MediaSeedMember) {
  const [surname, name] = member.full_name.split(/\s+/).filter(Boolean);
  const identity = buildNameQueries(member.full_name, member.slug).slice(0, 8);
  return unique([
    ...identity,
    ...identity.slice(0, 4).map((query) => `${query} ФНИСЦ`),
    ...identity.slice(0, 4).map((query) => `${query} РАН`),
    ...identity.slice(0, 3).map((query) => `${query} новости`),
    surname && name ? `site:fnisc.ru "${surname} ${name}"` : '',
    surname && name ? `site:isras.ru "${surname} ${name}"` : '',
    surname && name ? `site:idrras.ru "${surname} ${name}"` : '',
    surname && name ? `site:socinst.ru "${surname} ${name}"` : ''
  ]);
}

function defaultSearchAllowedDomains() {
  return [
    'fnisc.ru',
    'isras.ru',
    'idrras.ru',
    'isdfnisc.ru',
    'socinst.ru',
    'demoscope.ru',
    'deminform.ru',
    'rosbalt.ru',
    'sobaka.ru',
    't.me'
  ];
}

function buildRecord(member: MediaSeedMember, input: {
  source: string;
  title: string;
  description?: string;
  url: string;
  query?: string;
  sourceName?: string;
  publishedAt?: string;
  imageUrl?: string;
  text?: string;
  forcePublish?: boolean;
}, contextTerms: string[], cfg: MediaSourceConfig): MediaMentionCandidate {
  const url = cleanUrl(input.url);
  const title = scrubPublicText(decodeEntities(normalizeSpaces(input.title || url)));
  const description = scrubPublicText(decodeEntities(stripHtml(input.description || '')));
  const domain = domainOf(url);
  const confidence = input.forcePublish ? 1 : scoreMentionForMember(input.text || `${title} ${description}`, title, url, member, contextTerms, domain, false);
  const status: MediaMentionStatus = input.forcePublish || confidence >= getThreshold(cfg) ? 'published' : 'low_confidence';
  const id = createHash('sha256').update(`${member.slug}|${url}|${title}`).digest('hex').slice(0, 16);
  return {
    id,
    source: input.source,
    title,
    description,
    url,
    domain,
    sourceName: input.sourceName || domain,
    publishedAt: parseDate(input.publishedAt),
    harvestedAt: new Date().toISOString(),
    imageUrl: input.imageUrl,
    confidence,
    status,
    query: input.query || '',
    memberSlug: member.slug,
    memberName: member.full_name,
    forcePublish: Boolean(input.forcePublish)
  };
}

function scoreMentionForMember(text: string, title: string, url: string, member: MediaSeedMember, contextTerms: string[], domain: string, forcePublish: boolean): number {
  if (forcePublish) return 1;
  const body = normalizeForSearch(`${title} ${text} ${url}`);
  const terms = buildIdentityTerms(member);
  const strongIdentityHits = terms.filter((term) => term.length >= 10 && isCompositeIdentityTerm(term) && body.includes(term)).length;
  const nameParts = member.full_name.toLowerCase().replace(/ё/g, 'е').split(/\s+/).filter(Boolean);
  const partHits = nameParts.filter((part) => body.includes(part)).length;
  const ctxHits = contextTerms.filter((term) => term && body.includes(term)).length;
  let score = 0;
  if (strongIdentityHits) score += 0.68;
  if (!strongIdentityHits && partHits >= 3) score += 0.7;
  else if (!strongIdentityHits && partHits >= 2) score += 0.52;
  if (partHits >= 3) score += 0.08;
  if (ctxHits) score += 0.14;
  if (ctxHits >= 2) score += 0.06;
  if (defaultStopDomains.has(domain)) score -= 0.35;
  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

function isCompositeIdentityTerm(term: string) {
  return term.includes(' ') || term.includes('.');
}

async function fetchText(url: string, collector: string, query?: string, accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8') {
  const started = Date.now();
  const attempts = maxAttemptsForCollector(collector);
  let lastWarning = '';
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutForCollector(collector));
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
          Accept: accept,
          'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8'
        }
      });
      const bytes = Buffer.from(await response.arrayBuffer());
      const text = decodeResponseText(bytes, response.headers.get('content-type') || '');
      clearTimeout(timeout);
      if (response.status === 429 && attempt < attempts) {
        lastWarning = text.slice(0, 240) || 'HTTP 429';
        await delay(Math.max(env.MEDIA_POLITE_DELAY_MS * 2, 11000));
        continue;
      }
      const report: MediaCollectorReport = {
        collector,
        status: response.ok ? (text ? 'ok' : 'empty') : 'http_error',
        url,
        query,
        attempts: attempt,
        httpStatus: response.status,
        bytes: bytes.byteLength,
        elapsedMs: Date.now() - started,
        warning: response.ok ? undefined : text.slice(0, 240)
      };
      if (response.ok && text) await writeFetchCache(url, text, response.headers.get('content-type') || '');
      if (!response.ok) {
        const cached = await readFetchCache(url, collector, query, started, report.warning || `HTTP ${response.status}`);
        if (cached) return cached;
      }
      return { text: response.ok ? text : undefined, report };
    } catch (error) {
      clearTimeout(timeout);
      lastWarning = stringifyError(error);
      if (attempt < attempts) await delay(700 * attempt);
    }
  }
  const cached = await readFetchCache(url, collector, query, started, lastWarning);
  if (cached) return cached;
  return {
    text: undefined,
    report: {
      collector,
      status: 'error' as const,
      url,
      query,
      attempts,
      elapsedMs: Date.now() - started,
      warning: lastWarning
    }
  };
}

function maxAttemptsForCollector(collector: string) {
  if (['official_profile_mentions', 'bing_web_rss'].includes(collector)) return 1;
  return Math.max(1, env.MEDIA_RETRY_COUNT + 1);
}

function timeoutForCollector(collector: string) {
  if (collector === 'gdelt_keyword_search') return Math.max(env.MEDIA_REQUEST_TIMEOUT_MS, env.GDELT_REQUEST_TIMEOUT_MS);
  return env.MEDIA_REQUEST_TIMEOUT_MS;
}

async function throttleGdeltRequests() {
  const delayMs = Math.max(0, env.GDELT_REQUEST_DELAY_MS);
  const waitMs = lastGdeltRequestAt + delayMs - Date.now();
  if (waitMs > 0) await delay(waitMs);
  lastGdeltRequestAt = Date.now();
}

async function fetchJson(url: string, collector: string, query?: string) {
  const fetched = await fetchText(url, collector, query, 'application/json,*/*');
  if (!fetched.text) return { value: undefined, report: fetched.report };
  try {
    return { value: JSON.parse(fetched.text) as unknown, report: fetched.report };
  } catch (error) {
    return {
      value: undefined,
      report: { ...fetched.report, status: 'parse_error' as const, warning: stringifyError(error) }
    };
  }
}

async function readFetchCache(url: string, collector: string, query: string | undefined, started: number, warning?: string) {
  const path = fetchCachePath(url);
  if (!existsSync(path)) return null;
  try {
    const cached = JSON.parse(await readFile(path, 'utf-8')) as { url?: string; text?: string; contentType?: string; cachedAt?: string };
    if (!cached.text) return null;
    return {
      text: cached.text,
      report: {
        collector,
        status: 'ok' as const,
        url,
        query,
        attempts: 0,
        httpStatus: undefined,
        bytes: Buffer.byteLength(cached.text),
        elapsedMs: Date.now() - started,
        warning: `Using cached response from ${cached.cachedAt || 'unknown time'} after fetch failure${warning ? `: ${warning}` : ''}`,
        cacheUsed: true
      }
    };
  } catch {
    return null;
  }
}

async function writeFetchCache(url: string, text: string, contentType: string) {
  if (!text || /^data:/i.test(url)) return;
  const cachePath = fetchCachePath(url);
  try {
    await mkdir(fetchCacheDir(), { recursive: true });
    await writeFile(cachePath, JSON.stringify({
      url,
      contentType,
      cachedAt: new Date().toISOString(),
      text: text.slice(0, 300000)
    }), 'utf-8');
  } catch {
    // Cache is best-effort; harvest diagnostics still contain the live fetch report.
  }
}

function fetchCacheDir() {
  return join(process.cwd(), 'data', 'local', 'cache', 'media-http');
}

function fetchCachePath(url: string) {
  const key = createHash('sha256').update(cleanUrl(url)).digest('hex');
  return join(fetchCacheDir(), `${key}.json`);
}

function buildGdeltQuery(member: MediaSeedMember) {
  const identity = buildNameQueries(member.full_name, member.slug).slice(0, 7);
  const context = buildContextTerms(member)
    .filter((term) => term.length >= 3 && term.length <= 60)
    .slice(0, 5)
    .map(formatGdeltTerm);
  const compose = () => {
    const identityBlock = identity.length > 1 ? `(${identity.join(' OR ')})` : identity[0] || quote(member.full_name);
    const contextBlock = context.length ? `(${context.join(' OR ')})` : '';
    return normalizeSpaces(`${identityBlock} ${contextBlock}`);
  };
  let query = compose();
  while (query.length > 240 && context.length > 2) {
    context.pop();
    query = compose();
  }
  while (query.length > 240 && identity.length > 3) {
    identity.pop();
    query = compose();
  }
  return query;
}

function formatGdeltTerm(term: string) {
  return /\s/.test(term) ? quote(term) : term;
}

function parseSitemapUrls(xmlText: string, source: MediaSitemapSource) {
  try {
    const parsed = xmlParser.parse(xmlText) as Record<string, unknown>;
    const urlset = parsed.urlset as { url?: unknown } | undefined;
    const sitemapindex = parsed.sitemapindex as { sitemap?: unknown } | undefined;
    const nodes = getArray(urlset?.url).length ? getArray(urlset?.url) : getArray(sitemapindex?.sitemap);
    const rx = source.urlAllowRegex ? new RegExp(source.urlAllowRegex, 'i') : null;
    const urls: string[] = [];
    for (const node of nodes) {
      const loc = typeof node === 'object' && node ? String((node as Record<string, unknown>).loc || '') : '';
      if (!loc) continue;
      if (!rx || rx.test(loc)) urls.push(loc);
      if (urls.length >= (source.maxUrls ?? 30)) break;
    }
    return urls;
  } catch {
    return [];
  }
}

type ExtractedMediaLink = {
  url: string;
  text: string;
};

function extractLinks(htmlText: string, baseUrl: string): ExtractedMediaLink[] {
  const $ = loadHtml(htmlText);
  const links: ExtractedMediaLink[] = [];
  $('a[href]').each((_index, element) => {
    const href = $(element).attr('href') || '';
    const url = toAbsoluteHttpUrl(href, baseUrl);
    if (!url || isStaticUrl(url)) return;
    const text = decodeEntities(normalizeSpaces($(element).text())).slice(0, 500);
    if (!text) return;
    if (!links.some((link) => link.url === url && link.text === text)) links.push({ url, text });
  });
  return links;
}

function extractPublicUrlsFromText(value: string): string[] {
  return unique(
    Array.from(value.matchAll(/https?:\/\/[^\s;,<>"'()]+/gi))
      .map((match) => cleanUrl(match[0].replace(/[.!?\]\u00bb]+$/g, '')))
      .filter(Boolean)
  );
}

function toAbsoluteHttpUrl(href: string, baseUrl: string) {
  const cleaned = normalizeSpaces(href);
  if (!cleaned || cleaned.startsWith('#') || /^(mailto|tel|javascript):/i.test(cleaned)) return '';
  try {
    const url = new URL(cleaned, baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    url.hash = '';
    return cleanUrl(url.toString());
  } catch {
    return '';
  }
}

function isAllowedScanLink(url: string, baseUrl: string, source: MediaSiteScanSource, allowRx: RegExp | null, itemRx: RegExp | null) {
  if (!url || isStaticUrl(url)) return false;
  if (!source.includeExternalLinks && domainOf(url) !== domainOf(baseUrl)) return false;
  const rx = itemRx ?? allowRx;
  return !rx || rx.test(url);
}

function isAllowedCrawlLink(url: string, baseUrl: string, source: MediaSiteScanSource, allowRx: RegExp | null) {
  if (!url || isStaticUrl(url)) return false;
  if (!source.includeExternalLinks && domainOf(url) !== domainOf(baseUrl)) return false;
  return !allowRx || allowRx.test(url);
}

function shouldScoreSiteScanPage(url: string, depth: number, source: MediaSiteScanSource, pageContentRx: RegExp | null) {
  if (!url || isStaticUrl(url) || isBlockedUrlForHarvest(url)) return false;
  if (depth <= 0 && (source.startUrls ?? []).map(cleanUrl).includes(cleanUrl(url))) return false;
  return !pageContentRx || pageContentRx.test(url);
}

function isLikelyMentionUrl(url: string) {
  return /(?:news|novosti|smi|press|event|seminar|conference|conferences|article|project|institute_news|fnisc_news|index\.php\?page_id=|\/\d{4,6}\/|html)/i.test(url);
}

function isBlockedUrlForHarvest(url: string) {
  const cleaned = cleanUrl(url);
  return /(?:\/(?:css|js|images?|img|assets?|fonts?|vendor)\/|[?&]printmode=|[?&]page_id=(?:44|2366|2483)\b)/i.test(cleaned);
}

function isStaticUrl(url: string) {
  return /\.(?:css|js|mjs|map|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|otf|pdf|docx?|xlsx?|pptx?|zip|rar|7z|mp3|mp4|avi|mov)(?:[?#].*)?$/i.test(url);
}

function isNavigationLikeText(text: string) {
  const normalized = normalizeForSearch(decodeEntities(text));
  return [
    'версия для печати',
    'полная версия страницы',
    'узнать больше',
    'поиск',
    'информация',
    'публикации',
    'контакты',
    'обратная связь',
    'адреса и телефоны'
  ].includes(normalized);
}

function metaFromHtml(htmlText: string) {
  const $ = loadHtml(htmlText);
  const meta = (...names: string[]) => {
    for (const name of names) {
      const value = $(`meta[property="${name}"]`).attr('content') || $(`meta[name="${name}"]`).attr('content');
      if (value) return decodeEntities(normalizeSpaces(value));
    }
    return undefined;
  };
  return {
    title: meta('og:title', 'twitter:title') || normalizeSpaces($('title').first().text()),
    description: meta('og:description', 'twitter:description', 'description'),
    image: meta('og:image', 'twitter:image')
  };
}

function textifyHtml(htmlText: string) {
  const $ = loadHtml(htmlText);
  $('script, style, noscript, nav, header, footer, aside, form, .slyder-nav, .menu, .header, .footer, .breadcrumbs').remove();
  return normalizeSpaces($('body').text() || $.text());
}

function unwrapGoogleNewsLink(link: string): string {
  try {
    const url = new URL(link);
    return url.searchParams.get('url') || url.searchParams.get('u') || link;
  } catch {
    return link;
  }
}

function isBlockedRecord(record: MediaMentionCandidate, member: MediaSeedMember, cfg: MediaSourceConfig) {
  const stopDomains = new Set([...defaultStopDomains, ...(cfg.stopDomains ?? [])]);
  if (record.domain && stopDomains.has(record.domain)) return true;
  if (member.fnisc_profile_url && cleanUrl(record.url) === cleanUrl(member.fnisc_profile_url)) return true;
  const title = normalizeForSearch(record.title);
  return title.startsWith('список публикаций') || title.includes('elibrary') || title.includes('orcid');
}

export function dedupe(records: MediaMentionCandidate[]): MediaMentionCandidate[] {
  const seen = new Set<string>();
  return records
    .sort((a, b) => Number(Boolean(b.forcePublish)) - Number(Boolean(a.forcePublish)) || b.confidence - a.confidence || String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')))
    .filter((record) => {
      const key = cleanUrl(record.url) || `${normalizeForSearch(record.title)}|${record.domain || ''}`;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function getThreshold(cfg: MediaSourceConfig) {
  return env.MEDIA_AUTO_PUBLISH_THRESHOLD || cfg.autoPublishThreshold || 0.75;
}

function isGoogleNewsEnabled() {
  return env.MEDIA_ENABLE_GOOGLE_NEWS.toLowerCase() === 'true';
}

function cleanUrl(url: string) {
  return normalizeSpaces(url).replace('utm_source=perplexity', '').replace('utm source=perplexity', '').replace(/[?&]$/, '');
}

function domainOf(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.startsWith('www.') ? host.slice(4) : host;
  } catch {
    return '';
  }
}

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

function parseDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function parseGdeltDate(value?: string) {
  if (!value) return undefined;
  if (/^\d{14}$/.test(value)) {
    const year = value.slice(0, 4);
    const month = value.slice(4, 6);
    const day = value.slice(6, 8);
    const hour = value.slice(8, 10);
    const minute = value.slice(10, 12);
    const second = value.slice(12, 14);
    return parseDate(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
  }
  return parseDate(value);
}

function stripHtml(value: string) {
  return normalizeSpaces(decodeEntities(value.replace(/<[^>]+>/g, ' ')));
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function scrubPublicText(value: string) {
  return normalizeSpaces(value
    .replace(/\b(?:телефон|phone|mobile|моб\.)\b\s*[:=]?\s*[^.!?;]{0,80}/gi, '')
    .replace(/(?:\+7|8)\s*\(?\d{3}\)?[\d\s().-]{5,}\d/g, ''));
}

function decodeResponseText(bytes: Buffer, contentType: string) {
  const declared = contentType.match(/charset=([^;]+)/i)?.[1]?.trim().toLowerCase();
  const candidates = unique([declared, 'utf-8', 'windows-1251'])
    .map((encoding) => ({ encoding, text: decodeBytes(bytes, encoding) }))
    .filter((candidate) => candidate.text !== undefined) as Array<{ encoding: string; text: string }>;
  const scored = candidates.map((candidate) => ({ ...candidate, score: decodePenalty(candidate.text) }));
  const best = scored.sort((a, b) => a.score - b.score)[0];
  const declaredCandidate = declared ? scored.find((candidate) => candidate.encoding === declared) : undefined;
  if (declaredCandidate && best && declaredCandidate.score <= best.score + 25) return declaredCandidate.text;
  return best?.text ?? bytes.toString('utf-8');
}

function decodeBytes(bytes: Buffer, encoding?: string | null) {
  try {
    return new TextDecoder(encoding || 'utf-8').decode(bytes);
  } catch {
    return undefined;
  }
}

function decodePenalty(value: string) {
  let score = 0;
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code === 0xfffd) score += 20;
    if (code >= 0x0080 && code <= 0x009f) score += 4;
  }
  for (const pattern of ['Рђ', 'Р°', 'Рµ', 'Рё', 'Рѕ', 'СЃ', 'С‚', 'СЊ', 'С‹', 'СЋ', 'СЏ', 'РЅ', 'Р»', 'Рє', 'Рј', 'Рї', 'СЂ', 'Рџ', 'Рњ', 'РЎ', 'Рќ', 'Ð', 'Ñ']) {
    score += (value.split(pattern).length - 1) * 3;
  }
  return score;
}

function normalizeForSearch(value?: unknown) {
  return normalizeSpaces(value).toLowerCase().replace(/ё/g, 'е');
}

function initialsFor(name?: string, patronymic?: string, separator = '') {
  return [name?.[0], patronymic?.[0]].filter(Boolean).map((x) => `${x}.`).join(separator);
}

function surnameCaseVariants(surname?: string) {
  const value = normalizeSpaces(surname || '');
  if (!value) return [];
  const lower = value.toLowerCase();
  const variants = [value];
  if (lower.endsWith('ова') || lower.endsWith('ева') || lower.endsWith('ина')) {
    const stem = value.slice(0, -1);
    variants.push(`${stem}ой`, `${stem}у`, `${stem}е`);
  } else if (lower.endsWith('ая')) {
    const stem = value.slice(0, -2);
    variants.push(`${stem}ой`, `${stem}ую`);
  } else if (lower.endsWith('ий') || lower.endsWith('ый') || lower.endsWith('ой')) {
    const stem = value.slice(0, -2);
    variants.push(`${stem}ого`, `${stem}ому`, `${stem}им`, `${stem}ем`);
  } else if (/[бвгджзклмнпрстфхцчшщ]$/i.test(lower)) {
    variants.push(`${value}а`, `${value}у`, `${value}ым`, `${value}е`, `${value}ом`);
  }
  return unique(variants);
}

function safeRegExp(pattern?: string) {
  if (!pattern) return null;
  try {
    return new RegExp(pattern, 'i');
  } catch {
    return null;
  }
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function quote(value: string) {
  const cleaned = normalizeSpaces(value);
  return cleaned ? `"${cleaned.replaceAll('"', '')}"` : '';
}

function capWords(value: string) {
  return value.split(/\s+/).filter(Boolean).map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`).join(' ');
}

function slugFromName(fullName: string) {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
  };
  return fullName
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function unique(values: Array<string | undefined | null | false>) {
  return Array.from(new Set(values.map((value) => normalizeSpaces(value || '')).filter(Boolean)));
}

function getArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function stringifyError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
