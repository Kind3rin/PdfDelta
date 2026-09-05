import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const command = args[0] === 'install' ? args.shift() : 'test';
const cli = fileURLToPath(import.meta.resolve('@playwright/test/cli'));
const child = spawn(process.execPath, [cli, command, ...args], {
  cwd: fileURLToPath(new URL('.', import.meta.url)),
  stdio: 'inherit',
  env: {
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || fileURLToPath(new URL('./dist/playwright-browsers', import.meta.url)),
  },
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
