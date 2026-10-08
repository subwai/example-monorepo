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
| `labuild run [file] [args...]` | Runs a TypeScript file (default `src/index.ts`) once through Vite's module runner, for scripts, seeds and one-off server modes. Workspace packages resolve to `src`, so nothing needs a build. See [Running scripts](#running-scripts). |
| `labuild test` | `vitest run`. Extra arguments go to vitest, e.g. `labuild test --project unit`. |

```json
"scripts": {
  "build": "labuild build",
  "check": "labuild check",
  "test": "labuild test"
}
```

## Running scripts

`labuild run` runs in labuild's own process, so the script gets its signals and exit code, and `process.argv` is
`[node, file, ...args]` as if Node had run the file.

- **Environment:** `NODE_ENV` defaults to `development`. Outside production it loads `.env.$NODE_ENV` and, in
  development, a local `.env` on top (with a warning for blank values, unless `DX_IGNORE_MISCONFIGURED_ENV_VARS` is
  set). Variables that are already set win. `LABUILD_DISABLE_DOTENV=true` skips both files. `NODE_ENV=production`
  also drops the `development` condition, so compiled packages resolve to their `dist`, as in a production build.
- **Debugging:** `--debug[=[host:]port]` opens an inspector (default `127.0.0.1:9229`), and `--debug-wait` also waits
  for a debugger to attach before running anything. labuild takes these flags wherever they appear, so
  `pnpm my-script --debug` works. Under `pnpm start` with "Enable Debugging", the selected service opens its static
  port instead. `LABUILD_SLEEP_AFTER_DEBUG_ATTACHED` pauses on a `debugger` statement right after attaching.
- **Process:** the process is titled `node-labuild-run-<service or directory>`. Started with an IPC channel, it exits
  when its parent disconnects instead of lingering as an orphan.

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
