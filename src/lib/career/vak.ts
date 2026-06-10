import { normalizeTitle } from '@/lib/harvest/normalise';

export type VakSpecialty = { code: string; name: string; keywords: string[] };

export function matchVakSpecialties(publicationTitle: string, abstractOrKeywords: string, specialties: VakSpecialty[]): string[] {
  const haystack = normalizeTitle(`${publicationTitle} ${abstractOrKeywords}`);
  return specialties
    .filter((s) => s.keywords.some((kw) => haystack.includes(normalizeTitle(kw))))
    .map((s) => s.code);
}
