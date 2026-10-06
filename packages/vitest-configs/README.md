# @example/vitest-configs

Shared vitest configs, laid out like [`@example/typescript-configs`](../typescript-configs): one directory per
platform. Workspaces use them through [`labuild`](../labuild)'s matching entry points.

| Config | labuild entry point | Environment | Files |
| --- | --- | --- | --- |
| `node/vitest.config.ts` | `@example/labuild/node/vitest.config` | node | `src/**/*.unit.test.ts` |
| `browser/vitest.config.ts` | `@example/labuild/browser/vitest.config` | jsdom | `src/**/*.component.test.tsx` |

```ts
// vitest.config.ts
export { default } from '@example/labuild/node/vitest.config';
```

A workspace that needs more settings merges them in:

```ts
import base from '@example/labuild/node/vitest.config';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(base, defineConfig({ test: { testTimeout: 30_000 } }));
```

The configs are TypeScript source with no build step: Vite's config loader compiles them. Vite turns on the
`development` condition outside production builds, so tests load workspace packages from `src`. It also reads
`experimentalDecorators` and `emitDecoratorMetadata` from the workspace's tsconfig, which Nest's dependency
injection needs.
