import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createFixture, type Fixture } from './fixture.ts';
import { runGenerator } from './runGenerator.ts';

describe('subgraph generator', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = createFixture();
  });

  afterEach(() => fixture.remove());

  it('adds the subgraph to the api-rspack module, entrypoint and scripts, the gateway and the service catalog', () => {
    runGenerator(fixture.root, 'subgraph', ['goals']);

    const module = fixture.read('apps/api-rspack/src/modules/goals/subgraph/subgraph.module.ts');
    expect(module).toContain("import { GoalsModule } from '#modules/goals/goals.module';");
    const port = /port: (\d+),/.exec(module)?.[1];
    expect(port).toBeDefined();

    expect(fixture.read('apps/api-rspack/src/main.ts')).toContain(
      [
        'inserts new modes after it.',
        "  case 'subgraph:goals':",
        "    await startGracefulSubgraphServer((await import('#modules/goals/subgraph/subgraph.module')).subgraph);",
        '    break;',
        '  default:',
      ].join('\n'),
    );
    expect(fixture.readJson('apps/api-rspack/package.json')).toMatchObject({
      scripts: { 'dev:subgraph-goals': 'SERVER_TYPE=subgraph:goals pnpm dev' },
    });
    expect(fixture.read('packages/graphql-gateway-schema/main-supergraph.yaml')).toContain(
      `  api-subgraph-goals:\n    routing_url: http://localhost:${port}/graphql\n`,
    );
    expect(fixture.read('packages/sears-catalog/src/deploymentCatalog.ts')).toContain(
      [
        "  'api-rspack-subgraph-goals': {",
        "    type: 'graphql-api',",
        "    tldr: 'GraphQL API Subgraph for goals',",
        '    required: false,',
        "    icon: '🕸️',",
        '    env: {',
        `      PORT: ${port},`,
        "      SERVER_TYPE: 'subgraph:goals',",
        '    },',
        "    pkg: 'api-rspack',",
        "    script: 'dev:subgraph-goals',",
        '  },',
        '  // Generator Injection',
      ].join('\n'),
    );
  });
});
