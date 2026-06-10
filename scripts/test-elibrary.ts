import { loadLocalEnv } from '../src/lib/loadEnv';

loadLocalEnv();

const { readFile, writeFile, mkdir } = await import('node:fs/promises');
const { join } = await import('node:path');
const { harvestElibraryAuthorDetailed } = await import('../src/lib/harvest/elibrary');

type SeedMember = { slug: string; full_name: string; identifiers?: Record<string, string> };

async function main() {
  const members = JSON.parse(await readFile(join(process.cwd(), 'data/seeds/members.public.json'), 'utf-8')) as SeedMember[];
  const authorId = process.argv[2] || process.env.ELIBRARY_TEST_AUTHOR_ID || members.find((m) => m.identifiers?.elibrary_author_id)?.identifiers?.elibrary_author_id;
  if (!authorId) throw new Error('No eLibrary AuthorID found. Pass it as pnpm elibrary:test 1012909');
  const result = await harvestElibraryAuthorDetailed(authorId);
  const outDir = join(process.cwd(), 'data/local/diagnostics/elibrary-test');
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, `${authorId}.json`), JSON.stringify({ authorId, status: result.status, warnings: result.warnings, count: result.publications.length, publications: result.publications }, null, 2), 'utf-8');
  if (result.html) await writeFile(join(outDir, `${authorId}.html`), result.html, 'utf-8');
  console.log(`eLibrary AuthorID ${authorId}: ${result.status}, ${result.publications.length} records -> ${outDir}`);
}

main();
