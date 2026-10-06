# Goals subgraph

A federated GraphQL subgraph for the api-rspack app's `goals` module. It runs from the same codebase as its own
server mode on port 6433:

```sh
pnpm -F api-rspack dev:subgraph-goals
```

In development its schema is written to `@example/api-graphql-schema/schemas/__generated__/goals.graphql`,
which the gateway's `main-supergraph.yaml` reads.
