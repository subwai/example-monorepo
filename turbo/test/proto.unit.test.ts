import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createFixture, type Fixture } from './fixture.ts';
import { runGenerator } from './runGenerator.ts';

describe('proto generator', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = createFixture();
  });

  afterEach(() => fixture.remove());

  it('creates a proto package whose export key matches the snake-case proto file, and builds it', () => {
    const output = runGenerator(fixture.root, 'proto', ['phantom-lancer', 'apps/api-rspack']);

    expect(fixture.readJson('packages/phantom-lancer-proto/package.json')).toMatchObject({
      name: '@example/phantom-lancer-proto',
      exports: {
        './phantom_lancer.proto': './proto/phantom_lancer.proto',
        './*': { development: './src/*.ts', default: './dist/*.js' },
      },
      scripts: { build: 'labuild build', codegen: 'labuild codegen' },
    });
    const proto = fixture.read('packages/phantom-lancer-proto/proto/phantom_lancer.proto');
    expect(proto).toContain('package phantom_lancer;');
    expect(proto).toContain('service PhantomLancerService {');
    expect(fixture.read('packages/phantom-lancer-proto/.gitignore')).toContain('/src');
    expect(output).toContain(
      'pnpm -F api-rspack add @example/phantom-lancer-proto@workspace:* @nestjs/microservices@catalog: rxjs@catalog:; pnpm install --no-frozen-lockfile; pnpm -F @example/phantom-lancer-proto build',
    );
  });
});
