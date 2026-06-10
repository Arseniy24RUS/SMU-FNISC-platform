export type ExtractedIdentifiers = {
  elibrary_author_id?: string;
  spin?: string;
  orcid?: string;
  wos_researcher_id?: string;
  scopus_author_id?: string;
};

export function extractScientometricIdentifiers(textOrHtml: string): ExtractedIdentifiers {
  const text = textOrHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  return {
    elibrary_author_id: match(text, /(?:РИНЦ\s*)?(?:Author\s*ID|AuthorID)\s*[:№]?\s*(\d{4,})/i),
    spin: match(text, /SPIN\s*[:№]?\s*([0-9]{3,5}-[0-9]{3,5})/i),
    orcid: match(text, /\bORCID\s*[:№]?\s*(\d{4}-\d{4}-\d{4}-[0-9X]{4})/i),
    wos_researcher_id: match(text, /(?:WoS\s*)?(?:Researcher\s*ID|ResearcherID|WoS)\s*[:№]?\s*([A-Z]{1,4}-\d{3,5}-\d{4})/i)?.toUpperCase(),
    scopus_author_id: match(text, /Scopus\s*(?:Author\s*)?ID\s*[:№]?\s*(\d{6,})/i)
  };
}

export async function fetchFniscProfileIdentifiers(profileUrl: string): Promise<ExtractedIdentifiers> {
  const res = await fetch(profileUrl, { headers: { 'User-Agent': 'smu-fnisc-platform/0.1' }, cache: 'no-store' });
  if (!res.ok) return {};
  return extractScientometricIdentifiers(await res.text());
}

function match(text: string, rx: RegExp): string | undefined {
  return text.match(rx)?.[1];
}
