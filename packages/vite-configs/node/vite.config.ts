import { defineConfig } from 'vite';

/**
 * A Nest app on Vite. In dev, `labuild dev` runs it through Vite's module runner (no bundle); `labuild build` makes
 * an SSR bundle in `dist/main.js`.
 *
 * Workspace packages (`@example/*`) are compiled with the app; everything else stays an import from node_modules,
 * so Nest and its peers stay single instances. Vite turns on the `development` condition in dev and `production` in
 * builds, and takes decorator settings (emitDecoratorMetadata, for Nest's dependency injection) from tsconfig.json.
 */
export default defineConfig({
  ssr: {
    noExternal: [/^@example\//],
  },
  build: {
    ssr: 'src/main.ts',
    outDir: 'dist',
    target: 'node24',
    sourcemap: true,
    minify: false,
    rollupOptions: {
      output: { entryFileNames: '[name].js' },
    },
  },
});
