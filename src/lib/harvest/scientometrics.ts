import type { NormalizedPublication } from './normalise';

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

export function buildScientometricSummary(publications: NormalizedPublication[]): ScientometricSummary {
  const currentYear = new Date().getFullYear();
  const publicationsByYear: Record<string, number> = {};
  const publicationsBySource: Record<string, number> = {};
  for (const publication of publications) {
    if (publication.year) publicationsByYear[String(publication.year)] = (publicationsByYear[String(publication.year)] ?? 0) + 1;
    for (const source of publication.sources) publicationsBySource[source] = (publicationsBySource[source] ?? 0) + 1;
  }
  return {
    generatedAt: new Date().toISOString(),
    total_publications: publications.length,
    publications_by_year: Object.fromEntries(Object.entries(publicationsByYear).sort(([a], [b]) => Number(b) - Number(a))),
    publications_by_source: publicationsBySource,
    rinc_total: publications.filter((p) => p.sources.includes('elibrary')).length,
    scopus_total: publications.filter((p) => p.sources.includes('scopus')).length,
    wos_total: publications.filter((p) => p.sources.includes('wos')).length,
    citations_rinc: publications.reduce((s, p) => s + (p.rincCitations ?? 0), 0),
    citations_scopus: publications.reduce((s, p) => s + (p.scopusCitations ?? 0), 0),
    citations_wos: publications.reduce((s, p) => s + (p.wosCitations ?? 0), 0),
    h_index_rinc: hIndex(publications.map((p) => p.rincCitations ?? 0)),
    h_index_scopus: hIndex(publications.map((p) => p.scopusCitations ?? 0)),
    h_index_wos: hIndex(publications.map((p) => p.wosCitations ?? 0)),
    vak_publications_estimated: publications.filter((p) => p.isVak).length,
    publications_last_5_years: publications.filter((p) => p.year && p.year >= currentYear - 4).length
  };
}

function hIndex(citations: number[]): number {
  return citations
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a)
    .reduce((h, citationsCount, index) => (citationsCount >= index + 1 ? index + 1 : h), 0);
}
