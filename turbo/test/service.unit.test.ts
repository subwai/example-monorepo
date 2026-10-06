import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createFixture, type Fixture } from './fixture.ts';
import { runGenerator } from './runGenerator.ts';

describe('service generator', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = createFixture();
  });

  afterEach(() => fixture.remove());

  it('creates a GraphQL and gRPC service with its domain, schema and proto packages', () => {
    const output = runGenerator(fixture.root, 'service', ['phantom-lancer', 'example-org/platform', 'GraphQL,gRPC']);

    expect(fixture.readJson('apps/phantom-lancer/package.json')).toMatchObject({
      name: 'phantom-lancer',
      imports: { '#*': ['./src/*', './src/*.ts', './src/*.tsx', './src/*/index.ts', './src/*/index.tsx'] },
      scripts: {
        build: 'labuild build',
        dev: 'labuild dev',
        'dev:graphql': 'SERVER_MODE=GRAPHQL pnpm dev',
        'dev:grpc': 'SERVER_MODE=GRPC pnpm dev',
      },
      dependencies: {
        '@example/phantom-lancer-domain': 'workspace:*',
        '@example/phantom-lancer-proto': 'workspace:*',
      },
      devDependencies: { '@example/phantom-lancer-graphql-schema': 'workspace:*' },
    });
    expect(fixture.read('apps/phantom-lancer/Dockerfile')).toContain('turbo prune phantom-lancer --docker');
    expect(fixture.read('apps/phantom-lancer/src/server-mode.ts')).toContain("['GRAPHQL', 'GRPC'] as const");
    expect(fixture.read('apps/phantom-lancer/src/main.ts')).toContain("if (mode === 'GRPC')");
    expect(fixture.exists('apps/phantom-lancer/src/graphql/graphql.module.ts')).toBe(true);
    expect(fixture.read('apps/phantom-lancer/src/grpc/grpc.controller.ts')).toContain(
      "from '@example/phantom-lancer-proto/phantom_lancer'",
    );

    expect(fixture.readJson('packages/phantom-lancer-domain/package.json')).toMatchObject({
      name: '@example/phantom-lancer-domain',
    });
    expect(fixture.read('packages/phantom-lancer-domain/src/phantom-lancer-domain.module.ts')).toContain(
      'export class PhantomLancerDomainModule {}',
    );
    expect(fixture.exists('packages/phantom-lancer-graphql-schema/schemas/__generated__/schema.graphql')).toBe(true);
    expect(fixture.exists('packages/phantom-lancer-proto/proto/phantom_lancer.proto')).toBe(true);

    expect(fixture.read('packages/graphql-gateway-schema/main-supergraph.yaml')).toMatch(
      /  phantom-lancer:\n    routing_url: http:\/\/localhost:\d+\/graphql\n/,
    );
    const policy = fixture.read('.policy.yml');
    for (const path of ['apps/phantom-lancer', 'packages/phantom-lancer-domain', 'packages/phantom-lancer-graphql-schema', 'packages/phantom-lancer-proto']) {
      expect(policy).toContain(`- '^${path}/.*'`);
    }
    expect(policy).toContain("- 'example-org/platform'");
    expect(policy).not.toContain('REPLACE-ME');
    const catalog = fixture.read('packages/sears-catalog/src/deploymentCatalog.ts');
    const graphqlPort = /'phantom-lancer-graphql': \{[^}]*PORT: (\d+),\s*SERVER_MODE: 'GRAPHQL',/.exec(catalog)?.[1];
    expect(graphqlPort).toBeDefined();
    expect(catalog).toMatch(
      /'phantom-lancer-grpc': \{\n    type: 'grpc-api',[^}]*PORT: \d+,\n      GRPC_PORT: \d+,\n      SERVER_MODE: 'GRPC',\n    \},\n    pkg: 'phantom-lancer',\n    script: 'dev',/,
    );
    expect(fixture.read('apps/phantom-lancer/.env.development')).toContain(`PORT=${graphqlPort}\n`);
    expect(output).toContain('skipped: pnpm -F @example/interactive-bootstrapper codegen');
    expect(output).toContain(
      'pnpm -F @example/graphql-gateway-schema add @example/phantom-lancer-graphql-schema@workspace:*; pnpm install --no-frozen-lockfile; pnpm -F @example/phantom-lancer-proto build',
    );
  });

  it('creates a GraphQL-only service without gRPC code and pins its dev server mode', () => {
    runGenerator(fixture.root, 'service', ['phantom-lancer', '', 'GraphQL']);

    const manifest = fixture.readJson('apps/phantom-lancer/package.json');
    expect(manifest).toMatchObject({
      scripts: { dev: 'SERVER_MODE=GRAPHQL labuild dev' },
    });
    expect(manifest).not.toHaveProperty(['dependencies', '@example/phantom-lancer-proto']);
    expect(fixture.exists('packages/phantom-lancer-proto')).toBe(false);
    expect(fixture.exists('apps/phantom-lancer/src/grpc')).toBe(false);
    expect(fixture.read('apps/phantom-lancer/src/main.ts')).not.toContain('GRPC');
    expect(fixture.read('apps/phantom-lancer/src/app.module.ts')).not.toContain('GrpcModule');
    expect(fixture.read('.policy.yml')).toContain('REPLACE-ME');
    // A single-mode service is one process, named after the service.
    const catalog = fixture.read('packages/sears-catalog/src/deploymentCatalog.ts');
    expect(catalog).toContain("  'phantom-lancer': {\n    type: 'graphql-api',");
    expect(catalog).not.toContain('phantom-lancer-grpc');
  });

  it('writes nothing when one of its packages already exists', () => {
    runGenerator(fixture.root, 'proto', ['phantom-lancer', '']);

    expect(() => runGenerator(fixture.root, 'service', ['phantom-lancer', '', 'GraphQL,gRPC'])).toThrow(
      /packages\/phantom-lancer-proto already exists/,
    );
    expect(fixture.exists('apps/phantom-lancer')).toBe(false);
    expect(fixture.exists('packages/phantom-lancer-domain')).toBe(false);
  });

  it('rejects unknown modes', () => {
    expect(() => runGenerator(fixture.root, 'service', ['phantom-lancer', '', 'REST'])).toThrow(/did not recognize .*REST/);
  });
});
