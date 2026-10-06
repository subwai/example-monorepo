# api-vite

A twin of [`api-rspack`](../api-rspack) with the same code, built and run with Vite instead of rspack, to compare the
two. Both write the same schema to [`@example/api-graphql-schema`](../../packages/api-graphql-schema); the gateway
routes to `api-rspack`.

| Command | Serves |
| --- | --- |
| `pnpm start` (repo root) | `api-vite` on :3100 and `api-vite-subgraph-goals` on :6533, from the service catalog. |
| `pnpm dev` | The main GraphQL server (`/graphql`, `/status`), on `PORT` or :3000. |
| `pnpm dev:subgraph-goals` | The `goals` federated subgraph. |
| `pnpm build && pnpm start` | The production bundle (Vite SSR build) with plain `node`. |
| `pnpm docker:build` | The image, built from the repo root with `turbo prune`. |

## How it differs from api-rspack

- **Dev:** `labuild dev` runs the app through Vite's module runner ([`@example/vite-configs`](../../packages/vite-configs)).
  There's no bundle; modules are compiled on demand, and after an edit Vite re-runs only the changed modules and
  their importers, in the same process. `src/main.ts` closes the previous Nest app (`import.meta.hot`) before the new
  one starts. Reloads are slightly faster than api-rspack's restarts, but each one keeps a little memory (old module
  versions held by Nest's and GraphQL's registries) until the dev server restarts.
- **Build:** `labuild build` makes an SSR bundle with Vite (Rolldown) instead of rspack.
