# web

A React Router app on Vite. The home route server-renders goals loaded from api-rspack's GraphQL endpoint
(`API_URL`, default `http://localhost:3000/graphql`) inside [`@example/design-system`](../../packages/design-system)
components.

| Command | Does |
| --- | --- |
| `pnpm dev` | Vite dev server with HMR, including edits to workspace packages. |
| `pnpm build && pnpm start` | Production build served by `react-router-serve`. |
| `pnpm docker:build` | The image, built from the repo root with `turbo prune`. |
