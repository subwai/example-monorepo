# api

A Nest app bundled by rspack through [`labuild`](../../packages/labuild). It's the monorepo's
monolith: one codebase that runs as several server types.

| Command | Serves |
| --- | --- |
| `pnpm start` (repo root) | Any mix of api's server types, through overmind, with ports from the service catalog. |
| `pnpm dev` | The main GraphQL server on `:3000` (`/graphql`, `/status`). |
| `pnpm dev:subgraph-goals` | The `goals` federated subgraph on its own port. |
| `pnpm build && pnpm start` | The production bundle with plain `node`. |
| `pnpm docker:build` | The image, built from the repo root with `turbo prune`. |

`SERVER_TYPE` picks the server; `src/main.ts` holds the switch. Add a subgraph for another module with
`pnpm gen subgraph`.

In development each server writes its schema to [`@example/api-graphql-schema`](../../packages/api-graphql-schema),
which the gateway's supergraph config reads.
