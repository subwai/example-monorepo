import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const templates = join(import.meta.dirname, '..', 'generators', 'templates');

const manifests = (readdirSync(templates, { recursive: true }) as string[])
  .filter(path => path.endsWith('package.json.hbs'))
  .sort();

const dependencies = (path: string): [string, string][] =>
  [...readFileSync(join(templates, path), 'utf8').matchAll(/^ {4}"([^"]+)": "((?:catalog|workspace):[^"]*|[\^~\d][^"]*)"/gm)].map(
    ([, name, version]) => [name as string, version as string],
  );

describe('template dependencies', () => {
  // `pnpm config get catalog` prints the default catalog from pnpm-workspace.yaml as JSON.
  const catalog = JSON.parse(execFileSync('pnpm', ['config', 'get', 'catalog'], { cwd: templates, encoding: 'utf8' })) as Record<string, string>;

  it('are found in the templates', () => {
    expect(manifests.length).toBeGreaterThan(0);
    expect(manifests.flatMap(dependencies).length).toBeGreaterThan(0);
  });

  it('use catalog: for third-party packages, and every catalog: reference exists in the catalog', () => {
    const problems = manifests.flatMap(path =>
      dependencies(path)
        .filter(([name]) => !name.startsWith('@example/'))
        .filter(([name, version]) => version !== 'catalog:' || !(name in catalog))
        .map(([name, version]) => `${path}: ${name} ${version}`),
    );
    expect(problems).toEqual([]);
  });
});
