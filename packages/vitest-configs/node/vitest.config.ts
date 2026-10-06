import { defineConfig } from 'vitest/config';

// Vite turns on the `development` condition outside production builds, so tests load workspace packages from
// `src` and never need a `dist`. Vite also reads `experimentalDecorators` and `emitDecoratorMetadata` from the
// package's tsconfig, which Nest's dependency injection needs.

/** Node tests: `src/**\/*.unit.test.ts`. */
export default defineConfig({
  test: {
    name: 'unit',
    environment: 'node',
    include: ['src/**/*.unit.test.ts'],
  },
});
