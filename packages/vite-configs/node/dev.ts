// `labuild dev` for Vite apps: runs `src/main.ts` through Vite's module runner. Modules are transformed on demand (no
// bundle), and after a change Vite re-runs only the changed modules and the ones that import them, in this process.
// The app's entry point handles the reload with `import.meta.hot` (closing the previous Nest app first).
import { existsSync } from 'node:fs';
import { open as openInspector } from 'node:inspector';

import { createServer, createServerModuleRunner } from 'vite';

if (existsSync('.env.development')) {
  // Variables that are already set (e.g. ports from `pnpm start`) win over the file.
  process.loadEnvFile('.env.development');
}

// `pnpm start` with "Enable Debugging" picks one service by its process name, as @example/rspack-configs does.
if (
  process.env.ENABLE_NODE_DEBUGGING === 'true' &&
  process.env.LABUILD_COORDINATOR_PROC_NAME === (process.env.DEBUG_SERVICE || 'api-rspack')
) {
  openInspector(Number.parseInt(process.env.LABUILD_DEBUG_PORT ?? '', 10) || 9229, '127.0.0.1');
}

const server = await createServer({
  // There's no browser to reload: keep server-side HMR, skip the websocket.
  server: { middlewareMode: true, ws: false },
  appType: 'custom',
});
const runner = createServerModuleRunner(server.environments.ssr);
await runner.import('/src/main.ts');
