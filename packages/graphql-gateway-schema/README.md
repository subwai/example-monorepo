# @example/graphql-gateway-schema

`main-supergraph.yaml` lists every federated subgraph: the `api-rspack` app's main server, its subgraph modes, and
generated services. Each subgraph's schema is generated into its own schema package, which this package
depends on, so the paths resolve through `node_modules`.
