import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { monoRepoRoot } from '#utils';

export const generateDefaultOvermindConfig = () => {
  const envPath = resolve(monoRepoRoot, '.overmind.env');
  const foundEnvFile = existsSync(envPath);

  if (!foundEnvFile) {
    const sourceConfig = './overmindDefault.example.env';
    console.log(`Missing existing overmind config, writing a default one from ${sourceConfig}`);
    // Read ./overmindDefault.example.env and write it to .overmind.env
    const defaultConfig = readFileSync(resolve(import.meta.dirname, sourceConfig));
    // Write the contents of defaultConfig to .overmind.env
    writeFileSync(envPath, defaultConfig);
    console.log('Wrote default overmind config');
  }
};

/**
 * Overmind refuses to start while `.overmind.sock` exists, and a run that didn't shut down cleanly can leave it behind.
 * Removes the socket when nothing answers on it; stops if overmind really is running.
 */
export const clearStaleOvermindSocket = () => {
  const socketPath = resolve(monoRepoRoot, '.overmind.sock');
  if (!existsSync(socketPath)) {
    return;
  }
  const { status } = spawnSync('overmind', ['ps'], { cwd: monoRepoRoot, stdio: 'ignore' });
  if (status === 0) {
    console.error(
      'Overmind is already running for this checkout. Use `overmind connect <service>` to see it, or `overmind quit` to stop it.',
    );
    process.exit(1);
  }
  console.log('Removing a stale .overmind.sock left by a previous run');
  rmSync(socketPath, { force: true });
};
