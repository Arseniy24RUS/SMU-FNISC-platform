import { loadLocalEnv } from '../src/lib/loadEnv';
import { harvestMemberPhotos, type PhotoSeedMember } from '../src/lib/harvest/photos';

loadLocalEnv();

const { readFile } = await import('node:fs/promises');
const { join } = await import('node:path');

const root = process.cwd();
const runId = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const seedPath = join(root, 'data', 'seeds', 'members.public.json');
const members = JSON.parse(await readFile(seedPath, 'utf-8')) as PhotoSeedMember[];

const result = await harvestMemberPhotos(members, {
  root,
  seedPath,
  runDir: join(root, 'data', 'local', 'photo-harvest', runId)
});

for (const record of result.records) {
  console.log(`${record.full_name}: ${record.status}${record.photo_url ? ` -> ${record.photo_url}` : ''}`);
  if (record.error) console.log(`  ${record.error}`);
}
