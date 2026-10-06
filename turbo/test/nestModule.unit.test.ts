import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createFixture, type Fixture } from './fixture.ts';
import { runGenerator } from './runGenerator.ts';

describe('nest-module generator', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = createFixture();
  });

  afterEach(() => fixture.remove());

  it('creates a compiled package exporting a Nest module with a valid class name, wired into its consumers with its peers', () => {
    const output = runGenerator(fixture.root, 'nest-module', ['phantom-lancer', 'apps/web']);

    expect(fixture.readJson('packages/phantom-lancer/package.json')).toMatchObject({
      name: '@example/phantom-lancer',
      exports: { '.': { development: './src/index.ts', default: './dist/index.js' } },
      peerDependencies: { '@nestjs/common': 'catalog:', '@nestjs/core': 'catalog:' },
    });
    expect(fixture.read('packages/phantom-lancer/src/index.ts')).toBe("export * from '#phantom-lancer.module';\n");
    expect(fixture.read('packages/phantom-lancer/src/phantom-lancer.module.ts')).toContain(
      'export class PhantomLancerModule {}',
    );
    expect(fixture.exists('packages/phantom-lancer/src/phantom-lancer.module.unit.test.ts')).toBe(true);
    expect(output).toContain(
      'pnpm -F web add @example/phantom-lancer@workspace:* @nestjs/common@catalog: @nestjs/core@catalog: reflect-metadata@catalog: rxjs@catalog:;',
    );
  });
});
