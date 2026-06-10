import { env } from '@/lib/env';
import type { NormalizedPublication } from './normalise';

export type ElibraryHarvestResult = {
  status: 'received' | 'partial' | 'unavailable' | 'needs_cookie_or_api_access';
  html: string | null;
  publications: NormalizedPublication[];
  warnings: string[];
  url: string;
};

export function elibraryAuthorItemsUrl(authorId: string): string {
  return `https://www.elibrary.ru/author_items.asp?authorid=${encodeURIComponent(authorId)}`;
}

export async function fetchElibraryHtml(url: string, timeoutMs = 25_000): Promise<{ html: string | null; status: number; warning?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': env.ELIBRARY_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru,en;q=0.9',
        ...(env.ELIBRARY_COOKIE ? { Cookie: env.ELIBRARY_COOKIE } : {})
      },
      cache: 'no-store',
      signal: controller.signal
    });
    if (!res.ok) return { html: null, status: res.status, warning: `HTTP ${res.status}` };
    const bytes = Buffer.from(await res.arrayBuffer());
    const html = decodeHtml(bytes, res.headers.get('content-type'));
    if (/captcha|page_captcha|подозр|suspicious|ip_blocked|Введите код|blockedip|доступ .* ограничен|незарегистрированных пользователей|укажите имя пользователя и пароль/i.test(html)) {
      return { html, status: res.status, warning: 'eLibrary returned captcha or anti-bot page' };
    }
    return { html, status: res.status };
  } catch (error) {
    return { html: null, status: 0, warning: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

export function parseElibraryListHtml(html: string): NormalizedPublication[] {
  // Лёгкий fallback-парсер. Для production лучше перенести полноразмерные Python-парсеры из personal-website.
  const rows = html.split(/<tr/i).filter((row) => /author_items|item\.asp\?id=/i.test(row));
  return rows.map((row) => {
    const id = row.match(/item\.asp\?id=(\d+)/i)?.[1];
    const title = stripHtml(row.match(/<a[^>]+item\.asp\?id=\d+[^>]*>(.*?)<\/a>/is)?.[1] ?? 'Без названия');
    const year = Number(row.match(/\b(20\d{2}|19\d{2})\b/)?.[1]);
    return {
      canonicalKey: id ? `elibrary:${id}` : `title-year:${title}:${year || ''}`,
      title,
      year: Number.isFinite(year) ? year : undefined,
      elibraryItemId: id,
      url: id ? `https://www.elibrary.ru/item.asp?id=${id}` : undefined,
      sources: ['elibrary'],
      sourcePayload: { html_excerpt: row.slice(0, 1500) }
    } satisfies NormalizedPublication;
  }).filter((p) => p.title !== 'Без названия' || p.elibraryItemId);
}

export async function harvestElibraryAuthor(authorId: string): Promise<NormalizedPublication[]> {
  const html = (await fetchElibraryHtml(elibraryAuthorItemsUrl(authorId))).html;
  return html ? parseElibraryListHtml(html) : [];
}

export async function harvestElibraryAuthorDetailed(authorId: string): Promise<ElibraryHarvestResult> {
  const url = elibraryAuthorItemsUrl(authorId);
  const warnings: string[] = [];
  const result = await fetchElibraryHtml(url);
  if (result.warning) warnings.push(result.warning);
  const blocked = Boolean(result.warning?.includes('captcha') || result.warning?.includes('anti-bot'));
  const publications = result.html && !blocked ? parseElibraryListHtml(result.html) : [];
  let status: ElibraryHarvestResult['status'] = 'received';
  if (!result.html) status = 'unavailable';
  else if (blocked) status = env.ELIBRARY_COOKIE ? 'partial' : 'needs_cookie_or_api_access';
  else if (!publications.length) status = 'partial';
  return { status, html: result.html, publications, warnings, url };
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function decodeHtml(bytes: Buffer, contentType: string | null): string {
  const head = bytes.toString('latin1', 0, Math.min(bytes.length, 4096));
  const charset = contentType?.match(/charset=([^;]+)/i)?.[1]?.trim()
    || head.match(/charset\s*=\s*["']?([a-z0-9_-]+)/i)?.[1]
    || 'windows-1251';
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    try {
      return new TextDecoder('windows-1251').decode(bytes);
    } catch {
      return bytes.toString('utf-8');
    }
  }
}
