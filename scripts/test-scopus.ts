import { loadLocalEnv } from '../src/lib/loadEnv';

loadLocalEnv();

const { readFile, writeFile, mkdir } = await import('node:fs/promises');
const { join } = await import('node:path');
const { harvestScopusAuthorDetailed } = await import('../src/lib/harvest/scopus');

type SeedMember = { slug: string; full_name: string; identifiers?: Record<string, string> };

async function main() {
  const members = JSON.parse(await readFile(join(process.cwd(), 'data/seeds/members.public.json'), 'utf-8')) as SeedMember[];
  const authorId = process.argv[2] || process.env.SCOPUS_TEST_AUTHOR_ID || members.find((m) => m.identifiers?.scopus_author_id)?.identifiers?.scopus_author_id;
  if (!process.env.SCOPUS_API_KEY) throw new Error('SCOPUS_API_KEY is empty in .env.local/.env');
  if (!authorId) throw new Error('No Scopus Author ID found. Pass it as pnpm scopus:test 57220956828');
  const result = await harvestScopusAuthorDetailed(authorId);
  await mkdir(join(process.cwd(), 'data/local/diagnostics/scopus-test'), { recursive: true });
  const out = join(process.cwd(), 'data/local/diagnostics/scopus-test', `${authorId}.json`);
  await writeFile(out, JSON.stringify({ authorId, status: result.status, warnings: result.warnings, count: result.publications.length, publications: result.publications }, null, 2), 'utf-8');
  console.log(`Scopus Author ID ${authorId}: ${result.status}, ${result.publications.length} records -> ${out}`);
}

main();
