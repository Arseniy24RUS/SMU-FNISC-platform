import { loadLocalEnv } from '../src/lib/loadEnv';

loadLocalEnv();

const { readFile, writeFile, mkdir } = await import('node:fs/promises');
const { join } = await import('node:path');
const { searchGoogleNewsRss } = await import('../src/lib/harvest/media');

type SeedMember = { slug: string; full_name: string; interests?: string };

async function main() {
  const members = JSON.parse(await readFile(join(process.cwd(), 'data/seeds/members.public.json'), 'utf-8')) as SeedMember[];
  await mkdir(join(process.cwd(), 'data/generated/media'), { recursive: true });
  for (const m of members) {
    const context = ['фнисц', 'ран', 'социолог', 'демограф', ...(m.interests || '').split(/[;,]/).map((x) => x.trim()).filter(Boolean).slice(0, 5)];
    const mentions = await searchGoogleNewsRss(m.full_name, context).catch(() => []);
    await writeFile(join(process.cwd(), 'data/generated/media', `${m.slug}.json`), JSON.stringify({ member: m, mentions }, null, 2), 'utf-8');
    console.log(`${m.full_name}: ${mentions.length} mentions`);
  }
}

main();
