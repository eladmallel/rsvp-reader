/**
 * E2E test runner with automatic free port detection.
 *
 * This script finds an available port before running Playwright tests,
 * enabling multiple agents to run tests simultaneously across different
 * git worktrees without port conflicts.
 */

import detectPort from 'detect-port';
import { spawn } from 'child_process';

const BASE_PORT = 3100;

async function main() {
  const port = await detectPort(BASE_PORT);
  console.log(`[run-e2e] Using port ${port}`);

  const args = process.argv.slice(2);
  const child = spawn('npx', ['playwright', 'test', ...args], {
    stdio: 'inherit',
    env: { ...process.env, TEST_PORT: String(port) },
  });

  child.on('exit', (code) => process.exit(code ?? 1));
}

main();
