import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CareerRules } from './evaluate';

export async function loadCareerRules(): Promise<CareerRules> {
  const raw = await readFile(join(process.cwd(), 'data/rules/career-rules.json'), 'utf-8');
  return JSON.parse(raw) as CareerRules;
}
