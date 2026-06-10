import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';

const DEFAULT_USER_AGENT = 'Mozilla/5.0 smu-fnisc-platform-photo-fetcher/0.3';
const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_RETRIES = 2;

export type PhotoSeedMember = {
  slug: string;
  full_name: string;
  fnisc_profile_url?: string;
  photo_url?: string;
  photo_status?: string;
  photo_source_profile_url?: string;
  photo_source_url?: string;
  photo_downloaded_at?: string;
};

export type PhotoCandidate = {
  url: string;
  score: number;
  context: string;
  source: string;
  width?: number;
  height?: number;
  rejected?: string;
};

export type PhotoManifestRecord = {
  slug: string;
  full_name: string;
  profile_url: string;
  status: 'downloaded' | 'not_found' | 'error' | 'placeholder';
  photo_url?: string;
  source_url?: string;
  candidates?: Array<Pick<PhotoCandidate, 'url' | 'score' | 'source' | 'rejected'>>;
  error?: string;
};

export type PhotoHarvestOptions = {
  root?: string;
  runDir?: string;
  seedPath?: string;
  publicMembersPath?: string;
  manifestPath?: string;
  publicManifestPath?: string;
  userAgent?: string;
  timeoutMs?: number;
  retries?: number;
  writeSeed?: boolean;
  writePublicMembers?: boolean;
};

export type PhotoHarvestResult = {
  generated_at: string;
  records: PhotoManifestRecord[];
};

export function detectCharset(contentType: string | null, bytes: Buffer): string {
  const headerCharset = contentType?.match(/charset=([^;]+)/i)?.[1]?.trim();
  if (headerCharset) return headerCharset.toLowerCase();
  const head = bytes.toString('latin1', 0, Math.min(bytes.length, 4096));
  const metaCharset = head.match(/charset\s*=\s*["']?([a-z0-9_-]+)/i)?.[1];
  return (metaCharset || 'utf-8').toLowerCase();
}

export function decodeHtml(bytes: Buffer, contentType: string | null): string {
  const charset = detectCharset(contentType, bytes);
  try {
    return new TextDecoder(charset as never).decode(bytes);
  } catch {
    try {
      return new TextDecoder('windows-1251' as never).decode(bytes);
    } catch {
      return bytes.toString('utf-8');
    }
  }
}

export function extractImageCandidates(html: string, profileUrl: string, fullName: string): PhotoCandidate[] {
  const candidates: PhotoCandidate[] = [];

  for (const match of html.matchAll(/<img\b[^>]*>/gims)) {
    const tag = match[0];
    const attrs = parseAttributes(tag);
    const index = match.index ?? 0;
    const context = buildContext(html, index, tag.length);
    const sourceContext = `${tag} ${context}`;

    for (const attrName of ['src', 'data-src', 'data-original', 'data-lazy-src', 'data-image', 'data-img', 'data-large']) {
      pushCandidate(candidates, attrs[attrName], profileUrl, fullName, sourceContext, `img:${attrName}`, attrs);
    }
    for (const attrName of ['srcset', 'data-srcset']) {
      for (const src of parseSrcset(attrs[attrName])) {
        pushCandidate(candidates, src, profileUrl, fullName, sourceContext, `img:${attrName}`, attrs);
      }
    }
  }

  for (const match of html.matchAll(/<a\b[^>]*?\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/gims)) {
    const raw = match[1] || match[2] || match[3];
    const index = match.index ?? 0;
    const context = buildContext(html, index, match[0].length);
    pushCandidate(candidates, raw, profileUrl, fullName, `${match[0]} ${context}`, 'a:href');
  }

  for (const match of html.matchAll(/url\((?:"([^"]+)"|'([^']+)'|([^)]+))\)/gims)) {
    const raw = (match[1] || match[2] || match[3] || '').trim();
    const index = match.index ?? 0;
    const context = buildContext(html, index, match[0].length);
    pushCandidate(candidates, raw, profileUrl, fullName, context, 'css:url');
  }

  const byUrl = new Map<string, PhotoCandidate>();
  for (const candidate of candidates) {
    const existing = byUrl.get(candidate.url);
    if (!existing || candidate.score > existing.score) byUrl.set(candidate.url, candidate);
  }
  return Array.from(byUrl.values()).sort((a, b) => b.score - a.score);
}

export async function harvestMemberPhotos(members: PhotoSeedMember[], options: PhotoHarvestOptions = {}): Promise<PhotoHarvestResult> {
  const root = options.root ?? process.cwd();
  const userAgent = options.userAgent ?? process.env.FNISC_PHOTO_USER_AGENT ?? DEFAULT_USER_AGENT;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const seedPath = options.seedPath ?? join(root, 'data', 'seeds', 'members.public.json');
  const publicMembersPath = options.publicMembersPath ?? join(root, 'data', 'public', 'members.json');
  const manifestPath = options.manifestPath ?? join(root, 'data', 'seeds', 'member-photo-manifest.json');
  const publicManifestPath = options.publicManifestPath ?? join(root, 'data', 'public', 'member-photo-manifest.json');
  const runDir = options.runDir ?? join(root, 'data', 'local', 'photo-harvest', new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z'));

  await mkdir(join(root, 'public', 'members', 'photos'), { recursive: true });
  await mkdir(dirname(manifestPath), { recursive: true });
  await mkdir(dirname(publicManifestPath), { recursive: true });
  await mkdir(runDir, { recursive: true });

  const records: PhotoManifestRecord[] = [];
  for (const member of members) {
    const record = await downloadProfilePhoto(member, { root, runDir, userAgent, timeoutMs, retries });
    records.push(record);
  }

  const manifest = { generated_at: new Date().toISOString(), records };
  if (options.writeSeed !== false) await writeJson(seedPath, members);
  if (options.writePublicMembers !== false) await updatePublicMembers(publicMembersPath, members);
  await writeJson(manifestPath, manifest);
  await writeJson(publicManifestPath, manifest);
  await writeJson(join(runDir, 'manifest.json'), manifest);
  return manifest;
}

async function downloadProfilePhoto(
  member: PhotoSeedMember,
  options: Required<Pick<PhotoHarvestOptions, 'root' | 'runDir' | 'userAgent' | 'timeoutMs' | 'retries'>>
): Promise<PhotoManifestRecord> {
  const profileUrl = member.fnisc_profile_url || member.photo_source_profile_url || '';
  const rawDir = join(options.runDir, member.slug);
  await mkdir(rawDir, { recursive: true });

  const base: PhotoManifestRecord = {
    slug: member.slug,
    full_name: member.full_name,
    profile_url: profileUrl,
    status: 'not_found'
  };

  if (!profileUrl || !/^https?:\/\//i.test(profileUrl)) {
    await writeJson(join(rawDir, 'diagnostics.json'), { ...base, error: 'No profile URL' });
    return { ...base, status: 'not_found', error: 'No profile URL' };
  }

  try {
    const page = await fetchBytes(profileUrl, { userAgent: options.userAgent, timeoutMs: options.timeoutMs, retries: options.retries });
    const html = decodeHtml(page.bytes, page.contentType);
    await writeFile(join(rawDir, 'profile.html'), html, 'utf-8');

    const candidates = extractImageCandidates(html, profileUrl, member.full_name);
    await writeJson(join(rawDir, 'candidates.json'), candidates);

    for (const candidate of candidates.filter((item) => !item.rejected && item.score >= 10).slice(0, 8)) {
      try {
        const image = await fetchBytes(candidate.url, {
          userAgent: options.userAgent,
          timeoutMs: options.timeoutMs,
          retries: options.retries,
          referer: profileUrl
        });
        const validation = validateImage(candidate.url, image.contentType, image.bytes);
        if (!validation.ok) {
          candidate.rejected = validation.reason;
          continue;
        }

        const ext = extensionFrom(candidate.url, image.contentType);
        const rel = `/members/photos/${member.slug}${ext}`;
        const out = join(options.root, 'public', 'members', 'photos', `${member.slug}${ext}`);
        await writeFile(out, image.bytes);

        member.photo_url = rel;
        member.photo_status = 'downloaded';
        member.photo_source_profile_url = profileUrl;
        member.photo_source_url = candidate.url;
        member.photo_downloaded_at = new Date().toISOString();

        const record: PhotoManifestRecord = {
          ...base,
          status: 'downloaded',
          photo_url: rel,
          source_url: candidate.url,
          candidates: candidates.slice(0, 8).map(publicCandidate)
        };
        await writeJson(join(rawDir, 'diagnostics.json'), record);
        return record;
      } catch (error) {
        candidate.rejected = error instanceof Error ? error.message : String(error);
      }
    }

    member.photo_status = member.photo_status === 'downloaded' ? 'downloaded' : 'not_found';
    const record: PhotoManifestRecord = {
      ...base,
      status: member.photo_status === 'downloaded' ? 'downloaded' : 'not_found',
      photo_url: member.photo_status === 'downloaded' ? member.photo_url : undefined,
      source_url: member.photo_status === 'downloaded' ? member.photo_source_url : undefined,
      candidates: candidates.slice(0, 8).map(publicCandidate),
      error: `No suitable portrait among ${candidates.length} candidates`
    };
    await writeJson(join(rawDir, 'diagnostics.json'), record);
    return record;
  } catch (error) {
    member.photo_status = member.photo_status === 'downloaded' ? 'downloaded' : 'error';
    const record: PhotoManifestRecord = {
      ...base,
      status: member.photo_status === 'downloaded' ? 'downloaded' : 'error',
      photo_url: member.photo_status === 'downloaded' ? member.photo_url : undefined,
      source_url: member.photo_status === 'downloaded' ? member.photo_source_url : undefined,
      error: error instanceof Error ? error.message : String(error)
    };
    await writeJson(join(rawDir, 'diagnostics.json'), record);
    return record;
  }
}

async function fetchBytes(
  url: string,
  options: { userAgent: string; timeoutMs: number; retries: number; referer?: string }
): Promise<{ bytes: Buffer; contentType: string | null }> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': options.userAgent,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8',
          ...(options.referer ? { Referer: options.referer } : {})
        },
        redirect: 'follow',
        signal: controller.signal
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return { bytes: Buffer.from(await res.arrayBuffer()), contentType: res.headers.get('content-type') };
    } catch (error) {
      lastError = error;
      if (attempt < options.retries) await delay(350 * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function parseAttributes(tag: string) {
  const attrs: Record<string, string> = {};
  for (const match of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

function parseSrcset(srcset?: string) {
  if (!srcset) return [];
  return srcset.split(',').map((part) => part.trim().split(/\s+/)[0]).filter(Boolean);
}

function pushCandidate(
  candidates: PhotoCandidate[],
  rawValue: string | undefined,
  profileUrl: string,
  fullName: string,
  context: string,
  source: string,
  attrs: Record<string, string> = {}
) {
  if (!rawValue) return;
  const url = absoluteUrl(rawValue, profileUrl);
  if (!url) return;
  if ((source.startsWith('a:') || source.startsWith('css:')) && !looksImageCandidate(url)) return;
  const width = parseNumber(attrs.width);
  const height = parseNumber(attrs.height);
  const scored = scoreImage(url, context, fullName, width, height);
  candidates.push({
    url,
    score: scored.score,
    context: stripTags(context).slice(0, 360),
    source,
    width,
    height,
    rejected: scored.rejected
  });
}

function scoreImage(url: string, context: string, fullName: string, width?: number, height?: number) {
  const hay = `${url} ${context}`.toLowerCase().replace(/ё/g, 'е');
  const urlHay = url.toLowerCase();
  const fullNameNormalized = fullName.toLowerCase().replace(/ё/g, 'е');
  let score = 0;
  let rejected: string | undefined;

  if (!looksImageCandidate(url)) score -= 8;
  if (/\.(gif|svg)(?:[?#].*)?$/i.test(urlHay)) rejected = 'unsupported image type';
  if (/(none\.jpg|logo|icon|ico|rss|print|printer|spacer|blank|banner|counter|metrika|search|arrow|arr_|pdf\.gif|publ\.jpg|book_logo|elibrary_logos|soc_top|map22|vk22|global22|cln32|lupa2|cover_issue|ytimg)/i.test(urlHay)) {
    rejected = 'non-portrait asset';
  }

  if (/dreamedit\/foto/i.test(url)) score += 26;
  if (/(pers|person|profile|photo|foto|avatar|face|staff|sotr|user)/i.test(hay)) score += 14;
  if (/(портрет|фото|сотрудник|персонал|персона)/i.test(hay)) score += 8;
  if (context.toLowerCase().replace(/ё/g, 'е').includes(fullNameNormalized)) score += 60;
  score += Math.min(24, nameHits(context, fullName) * 8);
  if (width && height) {
    if (width >= 80 && height >= 80) score += 8;
    if (height >= width) score += 4;
    if (width < 50 || height < 50) rejected = 'too small';
  }

  return { score, rejected };
}

function validateImage(url: string, contentType: string | null, bytes: Buffer) {
  if (!contentType?.startsWith('image/')) return { ok: false, reason: `Not an image: ${contentType || 'unknown content type'}` };
  if (/svg|gif/i.test(contentType)) return { ok: false, reason: `Unsupported image content type: ${contentType}` };
  if (/none\.jpg|logo|icon|counter|printer|publ\.jpg|pdf\.gif|book_logo|elibrary_logos/i.test(url)) return { ok: false, reason: 'Rejected non-portrait URL' };
  if (bytes.length < 2048) return { ok: false, reason: 'Image is too small' };
  const dimensions = detectImageDimensions(bytes);
  if (dimensions && (dimensions.width < 70 || dimensions.height < 70)) return { ok: false, reason: `Image dimensions are too small: ${dimensions.width}x${dimensions.height}` };
  return { ok: true };
}

function detectImageDimensions(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length > 24 && bytes.readUInt32BE(0) === 0x89504e47) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1];
      const length = bytes.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
  }
  return null;
}

function absoluteUrl(src: string, baseUrl: string): string | null {
  const cleaned = src.trim().replace(/^['"]|['"]$/g, '');
  if (!cleaned || cleaned.startsWith('data:') || cleaned.startsWith('javascript:')) return null;
  try {
    const url = new URL(cleaned.replace(/&amp;/g, '&'), baseUrl);
    if (!/^https?:$/i.test(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function looksImageCandidate(url: string) {
  return /\.(jpe?g|png|webp)(?:[?#].*)?$/i.test(new URL(url).pathname) || /dreamedit\/foto/i.test(url);
}

function extensionFrom(url: string, contentType: string | null) {
  const pathExt = extname(new URL(url).pathname).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp'].includes(pathExt)) return pathExt === '.jpeg' ? '.jpg' : pathExt;
  if (contentType?.includes('png')) return '.png';
  if (contentType?.includes('webp')) return '.webp';
  return '.jpg';
}

async function updatePublicMembers(path: string, members: PhotoSeedMember[]) {
  if (!existsSync(path)) return;
  const publicMembers = JSON.parse(await readFile(path, 'utf-8')) as PhotoSeedMember[];
  const bySlug = new Map(members.map((member) => [member.slug, member]));
  for (const member of publicMembers) {
    const updated = bySlug.get(member.slug);
    if (!updated) continue;
    member.photo_url = updated.photo_url;
    member.photo_status = updated.photo_status;
    member.photo_source_profile_url = updated.photo_source_profile_url;
    member.photo_source_url = updated.photo_source_url;
    member.photo_downloaded_at = updated.photo_downloaded_at;
  }
  await writeJson(path, publicMembers);
}

function publicCandidate(candidate: PhotoCandidate) {
  return {
    url: candidate.url,
    score: candidate.score,
    source: candidate.source,
    rejected: candidate.rejected
  };
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildContext(html: string, index: number, length: number) {
  return html.slice(Math.max(0, index - 900), Math.min(html.length, index + length + 900));
}

function nameHits(context: string, fullName: string) {
  const normalized = context.toLowerCase().replace(/ё/g, 'е');
  const parts = fullName.toLowerCase().replace(/ё/g, 'е').split(/\s+/).filter((x) => x.length > 2);
  return parts.filter((part) => normalized.includes(part)).length;
}

function parseNumber(value?: string) {
  const match = value?.match(/\d+/);
  return match ? Number(match[0]) : undefined;
}

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
