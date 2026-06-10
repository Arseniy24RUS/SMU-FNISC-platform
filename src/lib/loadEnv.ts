import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function unquote(value: string) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function loadLocalEnv(cwd = process.cwd()) {
  for (const file of ['.env.local', '.env']) {
    const path = join(cwd, file);
    if (!existsSync(path)) continue;
    const raw = readFileSync(path, 'utf-8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = unquote(trimmed.slice(eq + 1));
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}
