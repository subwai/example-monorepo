# @example/vite-configs

The Vite counterpart of [`@example/rspack-configs`](../rspack-configs): config and dev runner for Nest apps built
with Vite. Apps use them through [`labuild`](../labuild):

```ts
// vite.config.ts
export { default } from '@example/labuild/node/vite.config';
```

- **`labuild dev`** runs [`node/dev.ts`](node/dev.ts): `src/main.ts` through Vite's module runner. There's no bundle;
  modules are compiled on demand, and after an edit Vite re-runs only the changed modules and the ones that import
  them, in the same process. The app's entry point must close its previous Nest app with `import.meta.hot` (see
  [`apps/api-vite/src/main.ts`](../../apps/api-vite/src/main.ts)). Each reload keeps a little memory, because Nest's
  and GraphQL's registries hold on to old module versions, until the dev server restarts.
- **`labuild build`** makes an SSR bundle of `src/main.ts` in `dist/main.js`. Workspace packages are bundled (compiled
  ones from their `dist`); everything else stays an import from node_modules.
- **Debugging** under `pnpm start` works like rspack apps: the selected service opens its inspector on its static
  port.
