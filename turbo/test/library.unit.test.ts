import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createFixture, type Fixture } from './fixture.ts';
import { runGenerator } from './runGenerator.ts';

describe('library generator', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = createFixture();
  });

  afterEach(() => fixture.remove());

  it('creates a compiled backend package that ships dist and is wired into its consumers', () => {
    const output = runGenerator(fixture.root, 'library', ['phantom-lancer', 'apps/web,packages/consumer-lib', 'backend', 'compiled']);

    expect(fixture.readJson('packages/phantom-lancer/package.json')).toMatchObject({
      name: '@example/phantom-lancer',
      imports: { '#*': { development: ['./src/*', './src/*.ts', './src/*.tsx'], default: './dist/*.js' } },
      exports: { '.': { development: './src/index.ts', default: './dist/index.js' } },
      scripts: { build: 'labuild build', check: 'labuild check', test: 'labuild test' },
    });
    expect(fixture.read('packages/phantom-lancer/tsconfig.json')).toContain('@example/labuild/node/tsconfig.json');
    expect(fixture.exists('packages/phantom-lancer/tsconfig.build.json')).toBe(true);
    expect(fixture.read('packages/phantom-lancer/src/index.ts')).toBe("export * from '#greeting';\n");
    expect(fixture.exists('packages/phantom-lancer/src/greeting.unit.test.ts')).toBe(true);
    expect(fixture.read('.policy.yml')).toContain("- '^packages/phantom-lancer/.*'");
    expect(output).toContain(
      'pnpm -F web -F @example/consumer-lib add @example/phantom-lancer@workspace:*; pnpm install --no-frozen-lockfile',
    );
  });

  it('creates a JIT frontend package that exports its source and tests components in jsdom', () => {
    runGenerator(fixture.root, 'library', ['phantom-lancer', '', 'frontend', 'jit']);

    const manifest = fixture.readJson('packages/phantom-lancer/package.json');
    expect(manifest).toMatchObject({
      imports: { '#*': ['./src/*', './src/*.ts', './src/*.tsx', './src/*/index.ts', './src/*/index.tsx'] },
      exports: { '.': './src/index.ts' },
      peerDependencies: { react: 'catalog:' },
    });
    expect(manifest).not.toHaveProperty('scripts.build');
    expect(fixture.exists('packages/phantom-lancer/tsconfig.build.json')).toBe(false);
    expect(fixture.read('packages/phantom-lancer/tsconfig.json')).toContain('@example/labuild/browser/tsconfig.json');
    expect(fixture.read('packages/phantom-lancer/src/index.ts')).toBe("export * from '#Greeting';\n");
    expect(fixture.read('packages/phantom-lancer/vitest.config.ts')).toContain('@example/labuild/browser/vitest.config');
  });

  it('refuses to overwrite an existing package', () => {
    runGenerator(fixture.root, 'library', ['phantom-lancer', '', 'backend', 'compiled']);

    expect(() => runGenerator(fixture.root, 'library', ['phantom-lancer', '', 'backend', 'jit'])).toThrow(
      /packages\/phantom-lancer already exists/,
    );
  });
});
