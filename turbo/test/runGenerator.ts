import { spawnSync } from 'node:child_process';
import { cpSync } from 'node:fs';
import { join } from 'node:path';

const turbo = join(import.meta.dirname, '..');

/**
 * Runs `gen run <generator> --args …` against a fixture repo, without installing, and returns its output.
 *
 * @turbo/gen bundles config.ts into a file next to it and deletes that file afterwards, so parallel runs from
 * one generators directory race on it. Each run gets its own copy inside the fixture.
 */
export const runGenerator = (root: string, generator: string, args: string[]): string => {
  const generators = join(root, '.generators');
  cpSync(join(turbo, 'generators'), generators, { recursive: true });
  const result = spawnSync(
    join(turbo, 'node_modules/.bin/gen'),
    ['run', generator, '--config', join(generators, 'config.ts'), '--root', root, '--args', ...args],
    {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, GENERATOR_REPO_ROOT: root, GENERATOR_SKIP_INSTALL: '1', NO_COLOR: '1' },
    },
  );
  const output = `${result.stdout}${result.stderr}`;
  // gen exits 0 even when the config fails to load, so require Plop's success line too.
  if (result.status !== 0 || !output.includes('>>> Success!')) {
    throw new Error(`gen run ${generator} failed with exit code ${result.status}:\n${output}`);
  }
  return output;
};
