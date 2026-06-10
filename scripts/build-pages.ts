import { spawn } from 'node:child_process';
import { join } from 'node:path';

const nextBin = join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');

const child = spawn(process.execPath, [nextBin, 'build'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NEXT_PUBLIC_DEPLOY_TARGET: 'github-pages',
    NEXT_PUBLIC_SITE_URL: 'https://arseniy24rus.github.io/SMU-FNISC-platform'
  },
  stdio: 'inherit'
});

child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
