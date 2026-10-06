import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export interface Fixture {
  root: string;
  read: (path: string) => string;
  readJson: (path: string) => unknown;
  exists: (path: string) => boolean;
  remove: () => void;
}

/** Just enough of the repo for every generator: workspaces to wire into and the files they inject into. */
const files: Record<string, string> = {
  'package.json': '{ "name": "fixture", "private": true }\n',
  'pnpm-workspace.yaml': 'packages:\n  - apps/*\n  - packages/*\n',
  'turbo.json': '{}\n',
  '.policy.yml': 'approval_rules:\n  # Generator Injection\n',
  'apps/web/package.json': '{ "name": "web" }\n',
  'apps/api-rspack/package.json': `${JSON.stringify({ name: 'api-rspack', scripts: { dev: 'rspack build --watch', test: 'vitest run' } }, null, 2)}\n`,
  'apps/api-rspack/src/main.ts': [
    'switch (process.env.SERVER_TYPE) {',
    "  // Subgraph modes go below this line. Don't remove it: `pnpm gen subgraph` inserts new modes after it.",
    '  default:',
    '    await startMainServer();',
    '}',
    '',
  ].join('\n'),
  'apps/api-rspack/src/modules/goals/goals.module.ts': 'export class GoalsModule {}\n',
  'packages/sears-catalog/src/deploymentCatalog.ts': [
    'export const deploymentCatalog = {',
    '  // Generator Injection',
    '} as const;',
    '',
  ].join('\n'),
  'packages/consumer-lib/package.json': '{ "name": "@example/consumer-lib" }\n',
  'packages/graphql-gateway-schema/package.json': '{ "name": "@example/graphql-gateway-schema" }\n',
  'packages/graphql-gateway-schema/main-supergraph.yaml': 'subgraphs:\n  api:\n    routing_url: http://localhost:3000/graphql\n',
};

export const createFixture = (): Fixture => {
  const root = mkdtempSync(join(tmpdir(), 'generators-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  const read = (path: string): string => readFileSync(join(root, path), 'utf8');
  return {
    root,
    read,
    readJson: path => JSON.parse(read(path)),
    exists: path => existsSync(join(root, path)),
    remove: () => rmSync(root, { recursive: true, force: true }),
  };
};
