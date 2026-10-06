import { join } from 'node:path';

import { readList, readString } from '../shared/answers.ts';
import { type CatalogEntry, catalogEntries, regenerateProcfile } from '../shared/catalog.ts';
import { addTemplate, addTemplates, append, assertAbsent, sortDependencies } from '../shared/files.ts';
import { installAction } from '../shared/install.ts';
import { policyEntry } from '../shared/policy.ts';
import { namePrompt } from '../shared/prompts.ts';
import { unusedPort } from '../shared/ports.ts';
import { packageName, type Repo } from '../shared/repo.ts';
import type { Variant } from '../shared/variant.ts';
import { nestModuleActions, nestModuleClass } from './nestModule.ts';
import { protoActions } from './proto.ts';

const MODES = ['GraphQL', 'gRPC'] as const;

export const GATEWAY = '@example/graphql-gateway-schema';
export const SUPERGRAPH = 'packages/graphql-gateway-schema/main-supergraph.yaml';

const supergraphEntry = `  {{ name }}:
    routing_url: http://localhost:{{ port }}/graphql
    schema:
      file: ./node_modules/@example/{{ name }}-graphql-schema/schemas/__generated__/schema.graphql
`;

interface Processes {
  name: string;
  usesGraphQL: boolean;
  usesGrpc: boolean;
  port: number;
  grpcPort: number;
}

/**
 * One `pnpm start` process per server mode, named like Lattice's (`<name>-graphql`, `<name>-grpc`); a single-mode
 * service is just `<name>`.
 */
const processes = ({ name, usesGraphQL, usesGrpc, port, grpcPort }: Processes): CatalogEntry[] => {
  const graphql: CatalogEntry = {
    name: usesGrpc ? `${name}-graphql` : name,
    type: 'graphql-api',
    tldr: `GraphQL API for ${name}`,
    icon: '🕸️',
    env: { PORT: port, SERVER_MODE: 'GRAPHQL' },
    pkg: name,
    script: 'dev',
  };
  const grpc: CatalogEntry = {
    name: usesGraphQL ? `${name}-grpc` : name,
    type: 'grpc-api',
    tldr: `gRPC API for ${name}`,
    icon: '📡',
    env: { PORT: port + 1, GRPC_PORT: grpcPort, SERVER_MODE: 'GRPC' },
    pkg: name,
    script: 'dev',
  };
  return [...(usesGraphQL ? [graphql] : []), ...(usesGrpc ? [grpc] : [])];
};

/**
 * A Nest app bundled with rspack, plus the packages around it:
 * - `<name>-domain`, a compiled Nest module for the service's business logic (always);
 * - `<name>-graphql-schema`, registered with the gateway (GraphQL mode);
 * - `<name>-proto`, the gRPC API (gRPC mode).
 */
export const service = ({ root }: Repo): Variant => ({
  kind: 'service',
  description: 'A Nest app (rspack) with its domain, GraphQL schema and proto packages',
  prompts: [
    namePrompt(root, 'service', name => `apps/${name}`),
    {
      type: 'input',
      name: 'githubTeam',
      message: 'Which GitHub team owns it? (e.g. example-org/platform; leave empty to fill in later)',
    },
    {
      type: 'checkbox',
      name: 'modes',
      message: 'Which modes would you like to enable?',
      choices: [...MODES],
      validate: (modes: string[]) => modes.length > 0 || 'Pick at least one mode',
    },
  ],
  actions: answers => {
    const name = readString(answers, 'name');
    const githubTeam = readString(answers, 'githubTeam');
    const modes = readList(answers, 'modes');
    const usesGraphQL = modes.includes('GraphQL');
    const usesGrpc = modes.includes('gRPC');
    const serverModes = [...(usesGraphQL ? ['GRAPHQL'] : []), ...(usesGrpc ? ['GRPC'] : [])];
    const app = `apps/${name}`;
    // GraphQL mode serves on `port`; gRPC mode serves gRPC on `grpcPort` and its health endpoint on `port + 1`.
    const port = unusedPort(root, 4000, [1, 1000]);
    const data = {
      name,
      usesGraphQL,
      usesGrpc,
      singleMode: serverModes.length === 1 ? serverModes[0] : undefined,
      serverModes: serverModes.map(mode => `'${mode}'`).join(', '),
      domainModule: nestModuleClass(`${name}-domain`),
      port,
      grpcPort: port + 1000,
    };
    const workspaces = [
      app,
      `packages/${name}-domain`,
      ...(usesGraphQL ? [`packages/${name}-graphql-schema`] : []),
      ...(usesGrpc ? [`packages/${name}-proto`] : []),
    ];
    return [
      // Check every destination before writing anything, so a clash can't leave half a service behind.
      ...workspaces.map(workspace => assertAbsent(root, workspace)),
      ...nestModuleActions(root, `${name}-domain`),
      ...(usesGraphQL
        ? [
            addTemplates('graphql-schema', join(root, 'packages', `${name}-graphql-schema`), { schemaName: name }),
            append(root, SUPERGRAPH, supergraphEntry, data),
          ]
        : []),
      ...(usesGrpc ? protoActions(root, name) : []),
      addTemplates('service/files', join(root, app), data),
      addTemplate('service/Dockerfile.hbs', join(root, app, 'Dockerfile'), data),
      ...(usesGraphQL ? [addTemplates('service/graphql', join(root, app), data)] : []),
      ...(usesGrpc ? [addTemplates('service/grpc', join(root, app), data)] : []),
      sortDependencies(root, app),
      policyEntry(root, { name, paths: workspaces, ...(githubTeam === '' ? {} : { team: githubTeam }) }),
      ...catalogEntries(root, processes({ name, usesGraphQL, usesGrpc, port, grpcPort: port + 1000 })),
      installAction(root, {
        dependencies: usesGraphQL
          ? [
              {
                consumer: GATEWAY,
                dependency: packageName(`${name}-graphql-schema`),
                workspace: `packages/${name}-graphql-schema`,
              },
            ]
          : [],
        builds: usesGrpc ? [packageName(`${name}-proto`)] : [],
      }),
      regenerateProcfile(root),
    ];
  },
});
