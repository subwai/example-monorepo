import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from '#app.module';

export async function startMainServer(): Promise<INestApplication> {
  // In dev the app is replaced in-process on every change: close keep-alive connections so the next one can bind.
  const app = await NestFactory.create(AppModule, { forceCloseConnections: import.meta.hot !== undefined });
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`api-vite listening on http://localhost:${port}/graphql`);
  return app;
}
