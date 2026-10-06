# Example monorepo

A small pnpm + Turborepo monorepo that mirrors the Lattice monorepo's setup: shared configs, generators for new
workspaces in `turbo/`, and one module-resolution model in which TypeScript, tests and dev servers never need a
`dist`.

## Requirements

- Node 24
- overmind and tmux (`brew install overmind tmux`), for `pnpm start`
- pnpm 12.9.1, installed globally (`npm install --global pnpm@12.9.1`). pnpm 12 is a native binary, and pnpm 11
  can't switch itself to it from the `packageManager` field.

```sh
pnpm install
pnpm start          # pick services to run (api-rspack on :3000, web on :5173, …)
pnpm check          # tsc everywhere
pnpm test           # vitest everywhere
pnpm build          # production builds
pnpm gen            # create a package, service or api-rspack subgraph
```

## Layout

| Workspace | What it is |
| --- | --- |
| [`apps/api-rspack`](apps/api-rspack) | Nest app bundled by rspack (the monolith). GraphQL server plus federated subgraph modes. |
| [`apps/api-vite`](apps/api-vite) | The same app built and run with Vite instead of rspack, to compare the two. |
| [`apps/web`](apps/web) | React Router app on Vite. Server-renders goals from api-rspack. |
| [`packages/design-system`](packages/design-system) | React components. **JIT**. |
| [`packages/nest-health`](packages/nest-health) | Nest module serving `GET /status`. **Compiled**. |
| [`packages/labuild`](packages/labuild) | The build tool: `labuild check/build/dev/test/codegen`, plus the shared tsconfig, vitest and rspack configs. |
| [`packages/typescript-configs`](packages/typescript-configs) | The compiler options behind labuild's tsconfigs. |
| [`packages/vitest-configs`](packages/vitest-configs) | The vitest configs behind labuild's `vitest.config` entry points. |
| [`packages/vite-configs`](packages/vite-configs) | The Vite config and dev runner behind labuild's `vite.config` entry point (Nest apps). |
| [`packages/rspack-configs`](packages/rspack-configs) | The rspack config behind labuild's `rspack.config` entry point (Nest apps). |
| [`packages/graphql-gateway-schema`](packages/graphql-gateway-schema) | Supergraph config that services and subgraphs register in. |
| [`packages/api-graphql-schema`](packages/api-graphql-schema) | GraphQL schemas the api apps write in development. |
| [`packages/interactive-bootstrapper`](packages/interactive-bootstrapper) | `pnpm start`: picks services, runs prerequisites, runs them with overmind. |
| [`packages/sears-catalog`](packages/sears-catalog) | The catalog of runnable services and the presets `pnpm start` offers. |
| [`turbo`](turbo) | `@example/generators`: `pnpm gen`. |

## How packages resolve

Every workspace's scripts go through [`labuild`](packages/labuild) (`labuild check`, `labuild build`,
`labuild test`, `labuild dev` for Nest apps), and its configs extend labuild's: `@example/labuild/node/tsconfig.json`,
`@example/labuild/node/vitest.config`, `@example/labuild/node/rspack.config`. A workspace depends on `@example/labuild` instead of
TypeScript, vitest and rspack.

Every workspace imports its own modules through its `package.json` `imports` map (`#app.module`,
`#components/GoalList`), never through relative paths. There are three shapes.

**Apps and JIT packages** point `imports` (and a JIT package's `exports`) straight at source. Only bundlers,
vitest and TypeScript read them, and each one falls back through the array, so specifiers need no extension
and `.tsx` and `index` files resolve:

```json
"imports": {
  "#*": ["./src/*", "./src/*.ts", "./src/*.tsx", "./src/*/index.ts", "./src/*/index.tsx"]
},
"exports": { ".": "./src/index.ts" }
```

**Compiled packages** ship `dist`, so plain Node can run them. Their maps add Node's `development` condition,
which points at source:

```json
"imports": {
  "#*": { "development": ["./src/*", "./src/*.ts", "./src/*.tsx"], "default": "./dist/*.js" }
},
"exports": {
  ".": { "development": "./src/index.ts", "default": "./dist/index.js" }
}
```

Everything that runs during development turns `development` on, using only documented settings, so nothing
reads a `dist` until production:

| | Conditions | App / JIT package | Compiled package |
| --- | --- | --- | --- |
| TypeScript (`labuild check`, editors) | `customConditions: ["development"]` in the shared tsconfigs | `src` | `src` |
| vitest | Vite turns on `development` outside production builds | `src` | `src` |
| `pnpm start`: `labuild dev` (rspack, api-rspack) and Vite (web) | rspack's `conditionNames` in development mode; Vite by default | `src` | `src`, rebuilt and restarted on edit |
| Production build | no `development` | `src`, bundled | `dist` (turbo runs `^build` first), bundled |
| Production runtime | plain `node` | already bundled | already bundled, or `dist` for any unbundled Node consumer |

Rules that follow from this:

- **Apps bundle workspace packages and import everything else from their own `node_modules`.** So an app has
  to depend on every peer of the packages it uses: Nest for `nest-health`, React for `design-system`. The
  generators add those peers when they wire a package into its consumers.
- **In compiled packages, import files, not directories.** `dist` only has `#some` as `dist/some.js`.
- **Node never runs TypeScript here.** A JIT package can only be used by something that compiles it.

## Dependencies

- Third-party versions live in the `catalog` in [`pnpm-workspace.yaml`](pnpm-workspace.yaml); packages
  reference them with `"catalog:"`. A generator test fails if a template pins a catalogued package.
- `allowBuilds` lists the install scripts pnpm may run. None are needed.
- Nest packages declare Nest as a peer, so every app shares one instance.

## Docker

`apps/api-rspack` and `apps/web` build images from the repo root with `turbo prune --docker`: install from the
pruned manifests, build with turbo, then `pnpm deploy --prod` the app. Workspace packages are bundled, so the
image only carries third-party production dependencies.

```sh
pnpm -F api-rspack docker:build
docker run -p 3000:3000 api-rspack
```

## Creating workspaces

Use the generators rather than copying a package; see [`turbo/README.md`](turbo/README.md).

```sh
pnpm gen                                                   # interactive
pnpm gen library --args my-lib apps/web frontend jit       # scripted
```
