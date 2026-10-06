# @example/nest-health

`HealthModule.forService(name)` adds `GET /status` to a Nest app.

```ts
import { HealthModule } from '@example/nest-health';

@Module({ imports: [HealthModule.forService('api-rspack')] })
export class AppModule {}
```

A **compiled** package. It ships `dist`, built by `pnpm build`; turbo builds it before anything that depends on
it. TypeScript, vitest and the dev servers read its `src` through the `development` condition, so none of them
need a build first.

Nest and its peers are `peerDependencies`: the app provides the single instance every module shares.
