import { loadLocalEnv } from '../src/lib/loadEnv';

loadLocalEnv();

const { readFile, writeFile, mkdir } = await import('node:fs/promises');
const { join } = await import('node:path');
const { mergePublicationSets } = await import('../src/lib/harvest/normalise');
const { harvestElibraryAuthor } = await import('../src/lib/harvest/elibrary');
const { harvestScopusAuthor } = await import('../src/lib/harvest/scopus');
const { harvestWosByResearcherId } = await import('../src/lib/harvest/wos');
const { harvestOpenAlexByOrcid } = await import('../src/lib/harvest/openalex');
const { buildScientometricSummary } = await import('../src/lib/harvest/scientometrics');

type SeedMember = { slug: string; full_name: string; identifiers?: Record<string,string> };

async function main() {
  const members = JSON.parse(await readFile(join(process.cwd(), 'data/seeds/members.public.json'), 'utf-8')) as SeedMember[];
  await mkdir(join(process.cwd(), 'data/generated/publications'), { recursive: true });
  for (const m of members) {
    const ids = m.identifiers ?? {};
    const [elib, scopus, wos, openalex] = await Promise.all([
      ids.elibrary_author_id ? harvestElibraryAuthor(ids.elibrary_author_id).catch(() => []) : [],
      ids.scopus_author_id ? harvestScopusAuthor(ids.scopus_author_id).catch((error) => {
        console.error(`${m.full_name}: Scopus error`, error);
        return [];
      }) : [],
      ids.wos_researcher_id ? harvestWosByResearcherId(ids.wos_researcher_id).catch(() => []) : [],
      ids.orcid ? harvestOpenAlexByOrcid(ids.orcid).catch(() => []) : []
    ]);
    const publications = mergePublicationSets(elib, scopus, wos, openalex);
    await writeFile(join(process.cwd(), 'data/generated/publications', `${m.slug}.json`), JSON.stringify({ member: m, summary: buildScientometricSummary(publications), publications }, null, 2), 'utf-8');
    console.log(`${m.full_name}: ${publications.length} publications`);
  }
}

main();
