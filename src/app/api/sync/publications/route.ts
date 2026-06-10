import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { mergePublicationSets } from '@/lib/harvest/normalise';
import { harvestElibraryAuthor } from '@/lib/harvest/elibrary';
import { harvestScopusAuthor } from '@/lib/harvest/scopus';
import { harvestWosByResearcherId } from '@/lib/harvest/wos';
import { harvestOpenAlexByOrcid } from '@/lib/harvest/openalex';
import { buildScientometricSummary } from '@/lib/harvest/scientometrics';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || req.nextUrl.searchParams.get('token');
  if (env.CRON_SECRET && token !== env.CRON_SECRET) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const identifiers = body.identifiers || {};
  const [elib, scopus, wos, openalex] = await Promise.all([
    identifiers.elibrary_author_id ? harvestElibraryAuthor(String(identifiers.elibrary_author_id)).catch(() => []) : [],
    identifiers.scopus_author_id ? harvestScopusAuthor(String(identifiers.scopus_author_id)).catch(() => []) : [],
    identifiers.wos_researcher_id ? harvestWosByResearcherId(String(identifiers.wos_researcher_id)).catch(() => []) : [],
    identifiers.orcid ? harvestOpenAlexByOrcid(String(identifiers.orcid)).catch(() => []) : []
  ]);
  const publications = mergePublicationSets(elib, scopus, wos, openalex);
  return NextResponse.json({ publications, summary: buildScientometricSummary(publications) });
}
