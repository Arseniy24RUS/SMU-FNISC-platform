import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
const execFileAsync = promisify(execFile);

const commands: Record<string, string[]> = {
  all: ['harvest:all:local'],
  elibrary: ['harvest:elibrary:local'],
  scopus: ['harvest:scopus:local'],
  wos: ['harvest:wos:local'],
  media: ['harvest:media:local'],
  photos: ['photos:fetch']
};

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const job = String(form.get('job') || '');
  const password = String(form.get('password') || '');
  if (env.ADMIN_LOCAL_PASSWORD && password !== env.ADMIN_LOCAL_PASSWORD) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const script = commands[job]?.[0];
  if (!script) return NextResponse.json({ error: 'Unknown job' }, { status: 400 });
  const jobId = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const jobsDir = join(process.cwd(), 'data', 'local', 'jobs');
  await mkdir(jobsDir, { recursive: true });
  const logPath = join(jobsDir, `${jobId}-${job}.log`);
  try {
    const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const result = await execFileAsync(command, ['exec', '--', 'pnpm', script], {
      cwd: process.cwd(),
      timeout: 10 * 60 * 1000,
      maxBuffer: 10 * 1024 * 1024
    });
    await writeFile(logPath, `${result.stdout}\n${result.stderr}`, 'utf-8');
    return NextResponse.json({ job, jobId, status: 'completed', logPath: relative(logPath) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await writeFile(logPath, message, 'utf-8');
    return NextResponse.json({ job, jobId, status: 'failed', logPath: relative(logPath), error: message }, { status: 500 });
  }
}

function relative(path: string) {
  return path.replace(`${process.cwd()}\\`, '').replaceAll('\\', '/');
}
