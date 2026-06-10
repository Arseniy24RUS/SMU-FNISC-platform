import { loadLocalEnv } from '../src/lib/loadEnv';

loadLocalEnv();

const { readFile, writeFile, mkdir } = await import('node:fs/promises');
const { join } = await import('node:path');
const { harvestWosByResearcherIdDetailed } = await import('../src/lib/harvest/wos');

type SeedMember = { slug: string; full_name: string; identifiers?: Record<string, string> };

async function main() {
  const members = JSON.parse(await readFile(join(process.cwd(), 'data/seeds/members.public.json'), 'utf-8')) as SeedMember[];
  const researcherId = process.argv[2] || process.env.WOS_TEST_RESEARCHER_ID || members.find((m) => m.identifiers?.wos_researcher_id)?.identifiers?.wos_researcher_id;
  if (!researcherId) throw new Error('No WoS ResearcherID found. Pass it as pnpm wos:test AAG-1530-2021');
  const result = await harvestWosByResearcherIdDetailed(researcherId);
  const outDir = join(process.cwd(), 'data/local/diagnostics/wos-test');
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, `${researcherId}.json`), JSON.stringify({ researcherId, status: result.status, attemptedUrls: result.attemptedUrls, warnings: result.warnings, count: result.publications.length, publications: result.publications }, null, 2), 'utf-8');
  console.log(`WoS ResearcherID ${researcherId}: ${result.status}, ${result.publications.length} records -> ${outDir}`);
}

main();
