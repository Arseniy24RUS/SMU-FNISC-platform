import { execFile, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { loadLocalEnv } from '../src/lib/loadEnv';

loadLocalEnv();

const execFileAsync = promisify(execFile);
const prismaCommand = process.execPath;
const prismaArgs = [join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js')];
const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
const cliDatabaseUrl = toCliSqliteUrl(databaseUrl);
const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');

async function main() {
  const fromArgs = existsSync(resolveSqlitePath(databaseUrl)) ? ['--from-url', cliDatabaseUrl] : ['--from-empty'];
  const diff = await execFileAsync(prismaCommand, [...prismaArgs, 'migrate', 'diff', ...fromArgs, '--to-schema-datamodel', schemaPath, '--script'], {
    cwd: process.cwd(),
    env: process.env,
    maxBuffer: 20 * 1024 * 1024
  });
  const sql = diff.stdout.trim();
  if (!sql || sql.includes('This is an empty migration')) {
    console.log('Prisma local migrate: database is already in sync.');
    return;
  }
  const tmpSql = join(process.cwd(), 'data', 'local', 'last-prisma-migrate.sql');
  await writeFile(tmpSql, `${sql}\n`, 'utf-8').catch(() => undefined);
  await runWithInput(prismaCommand, [...prismaArgs, 'db', 'execute', '--stdin', '--url', cliDatabaseUrl], `${sql}\n`);
  console.log('Prisma local migrate: SQL diff applied.');
}

function resolveSqlitePath(url: string) {
  const match = url.match(/^file:(.+)$/);
  if (!match) return join(process.cwd(), 'dev.db');
  return join(process.cwd(), 'prisma', match[1]);
}

function toCliSqliteUrl(url: string) {
  const match = url.match(/^file:(.+)$/);
  if (!match) return url;
  const rawPath = match[1].replace(/\\/g, '/');
  if (rawPath.startsWith('/')) return url;
  return `file:./prisma/${rawPath.replace(/^\.\//, '')}`;
}

function runWithInput(command: string, args: string[], input: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd: process.cwd(), env: process.env, stdio: ['pipe', 'inherit', 'inherit'] });
    child.stdin.end(input);
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
