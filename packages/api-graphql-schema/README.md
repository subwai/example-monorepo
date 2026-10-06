# @example/api-graphql-schema

GraphQL schemas written by `apps/api-rspack` and its twin `apps/api-vite` (the same code, so the same schemas) while
`pnpm dev` runs: `main.graphql` for the main server and one file per
subgraph mode. Commit them; the gateway's supergraph config reads them through this package.
