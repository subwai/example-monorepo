import { defineConfig } from 'vitest/config';

// Vite turns on the `development` condition outside production builds, so tests load workspace packages from
// `src` and never need a `dist`.

/** React component tests rendered into jsdom: `src/**\/*.component.test.tsx`. */
export default defineConfig({
  test: {
    name: 'component',
    environment: 'jsdom',
    include: ['src/**/*.component.test.tsx'],
  },
});
