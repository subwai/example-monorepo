# @example/rspack-configs

The shared rspack config for Nest apps, laid out like [`@example/typescript-configs`](../typescript-configs) and
[`@example/vitest-configs`](../vitest-configs). Apps use it through [`labuild`](../labuild):

```ts
// rspack.config.ts
export { default } from '@example/labuild/node/rspack.config';
```

`labuild build` and `labuild dev` run rspack with it when a workspace has an `rspack.config.ts`.

- **Bundles** the app and the workspace packages it imports (`@example/*`) into `dist/main.js` (ESM).
  Everything else stays an import from the app's `node_modules`, so Nest and its peers stay single instances.
- **Development mode** (`labuild dev`) adds the `development` condition and compiles workspace packages from `src`.
  After every rebuild it restarts the app in a fresh process, with `.env.development` loaded. Each dev process
  writes to `dist/dev/<SERVER_TYPE or SERVER_MODE>`, so several server modes can run side by side.
- **Fast restarts:** the next process always waits in standby with the app's dependencies (the bundle's externals)
  already loaded, so a restart only costs running the new bundle and Nest's bootstrap. Each restart is still a
  fresh process, so nothing leaks between versions, which in-process HMR can't promise: it keeps Nest's and
  GraphQL's module state across reloads. The standby is an idle process per app; `LABUILD_STANDBY=false` turns it
  off (`pnpm start` has a launch option for it). App processes exit when the dev server does.
- **Production mode** (`labuild build`) resolves compiled packages to their `dist`.
- **Debugging:** when `pnpm start` runs with "Enable Debugging", the selected service starts with `--inspect` on
  its static `LABUILD_DEBUG_PORT`.

An app with a different entry point uses `nestApp` instead of the default:

```ts
import { nestApp } from '@example/labuild/node/rspack.config';

export default nestApp({ entry: './src/server.ts' });
```
