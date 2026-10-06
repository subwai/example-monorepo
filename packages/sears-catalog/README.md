# @example/sears-catalog

The catalog of locally runnable services, and the presets [`pnpm start`](../interactive-bootstrapper) offers.
A port of the deployment catalog and presets in Lattice's `sears-catalog`.

- [`src/deploymentCatalog.ts`](src/deploymentCatalog.ts): one entry per process (`pkg`, `script`, `env` with
  `PORT`/`GRPC_PORT`/`SERVER_TYPE`, `required`). `pnpm gen service` and `pnpm gen subgraph` add theirs.
- [`src/presets/`](src/presets): named groups of services. Every preset also starts the required services
  (`api-rspack` and `web`), unless it sets `excludeRequired`.

After changing the catalog, run `pnpm codegen` to regenerate the Procfile. The tests reject port collisions and
ports in the reserved or ephemeral ranges.

Like the bootstrapper, this package runs directly on Node, so its `imports` map points at `.ts` files rather than
the bundler-only fallback array.
