import type { Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

/** What each `src/modules/<module>/subgraph/subgraph.module.ts` exports. */
export interface Subgraph {
  name: string;
  port: number;
  module: Type;
}

/** Runs one module's federated subgraph on its own port. Selected with `SERVER_TYPE=subgraph:<module>`. */
export async function startGracefulSubgraphServer(subgraph: Subgraph): Promise<void> {
  const app = await NestFactory.create(subgraph.module);
  app.enableShutdownHooks();
  // `pnpm start` sets PORT from the service catalog; `subgraph.port` is the default for running the mode directly.
  const port = Number(process.env.PORT ?? subgraph.port);
  await app.listen(port);
  console.log(`api-rspack subgraph ${subgraph.name} listening on http://localhost:${port}/graphql`);
}
