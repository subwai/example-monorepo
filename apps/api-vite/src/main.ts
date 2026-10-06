import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';

import { startMainServer } from '#main-server';
import { startGracefulSubgraphServer } from '#subgraph-server';

// In dev, Vite's module runner re-runs this module after a change to anything it imports (`import.meta.hot`). The
// previous app has to release its port first.
await import.meta.hot?.data.closePromise;

let app: INestApplication;
switch (process.env.SERVER_TYPE) {
  // Subgraph modes go below this line. Don't remove it: `pnpm gen subgraph` inserts new modes after it.
  case 'subgraph:goals':
    app = await startGracefulSubgraphServer((await import('#modules/goals/subgraph/subgraph.module')).subgraph);
    break;
  default:
    app = await startMainServer();
}

import.meta.hot?.accept();
import.meta.hot?.dispose(data => {
  data.closePromise = app.close();
});
