import { join } from 'node:path';

import { readString } from '../shared/answers.ts';
import { catalogEntries, regenerateProcfile } from '../shared/catalog.ts';
import { addScript, addTemplates, append, inject } from '../shared/files.ts';
import { API_APP, type Repo } from '../shared/repo.ts';
import type { Variant } from '../shared/variant.ts';
import { SUPERGRAPH } from './service.ts';

const caseTemplate = `  case 'subgraph:{{ module }}':
    await startGracefulSubgraphServer((await import('#modules/{{ module }}/subgraph/subgraph.module')).subgraph);
    break;
`;

const supergraphEntry = `  api-subgraph-{{ module }}:
    routing_url: http://localhost:{{ port }}/graphql
    schema:
      file: ./node_modules/@example/api-graphql-schema/schemas/__generated__/{{ module }}.graphql
`;

/**
 * A federated subgraph for one module of the api-rspack app. It runs from the same codebase as a separate server
 * mode (`SERVER_TYPE=subgraph:<module>`) on its own port, and registers with the gateway.
 */
export const subgraph = ({ root, apiModulesWithoutSubgraph }: Repo): Variant => ({
  kind: 'subgraph',
  description: 'A federated subgraph for a module of the api-rspack app',
  prompts: [
    {
      type: 'list',
      name: 'module',
      message: 'Which api-rspack module should the subgraph serve?',
      choices: apiModulesWithoutSubgraph,
    },
  ],
  actions: answers => {
    const module = readString(answers, 'module');
    const data = { module, port: 6000 + Math.floor(Math.random() * 1000) };
    return [
      addTemplates('subgraph', join(root, API_APP, 'src/modules', module, 'subgraph'), data),
      inject(root, {
        path: `${API_APP}/src/main.ts`,
        marker: 'Subgraph modes go below this line',
        position: 'after',
        template: caseTemplate,
        data,
      }),
      addScript(root, API_APP, `dev:subgraph-${module}`, `SERVER_TYPE=subgraph:${module} pnpm dev`),
      append(root, SUPERGRAPH, supergraphEntry, data),
      ...catalogEntries(root, [
        {
          name: `api-rspack-subgraph-${module}`,
          type: 'graphql-api',
          tldr: `GraphQL API Subgraph for ${module}`,
          icon: '🕸️',
          env: { PORT: data.port, SERVER_TYPE: `subgraph:${module}` },
          pkg: 'api-rspack',
          script: `dev:subgraph-${module}`,
        },
      ]),
      regenerateProcfile(root),
    ];
  },
});
