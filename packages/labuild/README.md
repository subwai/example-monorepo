# @example/labuild

The workspace's build tool. Every workspace's scripts call it, and its configs extend labuild's, so a workspace
depends on `@example/labuild` instead of on TypeScript, vitest, rspack and buf separately.

## Commands

Run from a workspace directory, as pnpm scripts do.

| Command | Does |
| --- | --- |
| `labuild check` | `tsc` with the workspace's `tsconfig.json`. Needs no build: workspace packages resolve to `src`. |
| `labuild build` | Nest apps: a production bundle in `dist/main.js`, with rspack (`rspack.config.ts`) or Vite (`vite.config.ts`). Packages: `labuild codegen`, then `tsc` from `src` to `dist` with `tsconfig.build.json`. |
| `labuild codegen` | `buf generate` with ts-proto, for packages with a `buf.gen.yaml`. |
| `labuild dev` | Nest apps on rspack: bundles in watch mode and restarts the app after every rebuild, with a warm standby. Nest apps on Vite: runs the app through Vite's module runner and re-runs changed modules in the same process. |
| `labuild test` | `vitest run`. Extra arguments go to vitest, e.g. `labuild test --project unit`. |

```json
"scripts": {
  "build": "labuild build",
  "check": "labuild check",
  "test": "labuild test"
}
```

## Configs

A workspace's config files extend or re-export labuild's, which sit in one directory per platform and are named
like the workspace file that uses them:

| Workspace file | Node | Browser |
| --- | --- | --- |
| `tsconfig.json` | `@example/labuild/node/tsconfig.json` | `@example/labuild/browser/tsconfig.json` |
| `tsconfig.build.json` (compiled packages) | `@example/labuild/node/tsconfig.build.json` | `@example/labuild/browser/tsconfig.build.json` |
| `vitest.config.ts` | `@example/labuild/node/vitest.config` | `@example/labuild/browser/vitest.config` |
| `rspack.config.ts` (Nest apps on rspack) | `@example/labuild/node/rspack.config` | |
| `vite.config.ts` (Nest apps on Vite) | `@example/labuild/node/vite.config` | |

```json
// tsconfig.json
{ "extends": "@example/labuild/node/tsconfig.json" }
```

```json
// tsconfig.build.json
{ "extends": ["./tsconfig.json", "@example/labuild/node/tsconfig.build.json"] }
```

```ts
// vitest.config.ts
export { default } from '@example/labuild/node/vitest.config';
```

```ts
// rspack.config.ts
export { default } from '@example/labuild/node/rspack.config';
```

labuild's files only point onward, to the same paths in [`@example/typescript-configs`](../typescript-configs),
[`@example/vitest-configs`](../vitest-configs), [`@example/rspack-configs`](../rspack-configs) and
[`@example/vite-configs`](../vite-configs), where the settings live.
