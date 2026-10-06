import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';

// Vite enables the `development` condition in dev and `production` in builds. Workspace packages need no
// extra configuration: JIT packages always resolve to `src`, compiled ones to `src` in dev and `dist` in builds.
export default defineConfig({
  plugins: [reactRouter()],
});
