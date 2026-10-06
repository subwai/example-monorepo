import 'reflect-metadata';

import { startMainServer } from '#main-server';
import { startGracefulSubgraphServer } from '#subgraph-server';

switch (process.env.SERVER_TYPE) {
  // Subgraph modes go below this line. Don't remove it: `pnpm gen subgraph` inserts new modes after it.
  case 'subgraph:goals':
    await startGracefulSubgraphServer((await import('#modules/goals/subgraph/subgraph.module')).subgraph);
    break;
  default:
    await startMainServer();
}
