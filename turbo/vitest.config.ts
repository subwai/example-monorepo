import node from '@example/labuild/node/vitest.config';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      // Each test runs @turbo/gen in a fixture repo, which takes a second or two.
      { test: { ...node.test, include: ['test/**/*.unit.test.ts'], testTimeout: 60_000 } },
      { test: { ...node.test, name: 'generator', include: ['test/**/*.generator.test.ts'], testTimeout: 900_000 } },
    ],
  },
});
