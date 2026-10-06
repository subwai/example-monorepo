import { NestFactory } from '@nestjs/core';

import { AppModule } from '#app.module';

export async function startMainServer(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`api-rspack listening on http://localhost:${port}/graphql`);
}
