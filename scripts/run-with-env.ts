import { spawn } from 'node:child_process';
import { loadLocalEnv } from '../src/lib/loadEnv';

loadLocalEnv();

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('Usage: tsx scripts/run-with-env.ts <command> [...args]');
  process.exit(1);
}

const child = spawn(command, args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
