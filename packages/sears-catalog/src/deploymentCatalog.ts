import type { AppConfig } from '#presets/types';

const DEV = 'dev';

const BACKGROUND_SERVICE_PORTS = [
  5432, // postgres
  6379, // redis
];
export const DEBUG_PORTS = [
  9229, // nodejs debug
];

// ban ports that linux considers ephemeral (32000-60999)
// see https://www.kernel.org/doc/html/latest//networking/ip-sysctl.html#ip-variables
const ephemeralPortStart = 32000;
const ephemeralPortEnd = 60999;
const ephemeralPortCount = ephemeralPortEnd - ephemeralPortStart + 1;
export const ALL_PORTS_LINUX_CONSIDERS_EPHEMERAL = Array.from(
  { length: ephemeralPortCount },
  (_, i) => i + ephemeralPortStart,
);

export const PORTS_WE_SHOULDNT_USE = new Set([
  ...BACKGROUND_SERVICE_PORTS,
  ...DEBUG_PORTS,
  ...ALL_PORTS_LINUX_CONSIDERS_EPHEMERAL,
]);

/**
 * Every service `pnpm start` can run. `pnpm gen service` and `pnpm gen subgraph` add theirs above the
 * Generator Injection line. After editing, run `pnpm codegen` to regenerate the Procfile.
 */
export const deploymentCatalog = {
  'api-rspack': {
    type: 'graphql-api',
    tldr: 'GraphQL monolith',
    required: true,
    icon: '🕷️',
    env: {
      PORT: 3000,
    },
    pkg: 'api-rspack',
    script: DEV,
  },
  'api-rspack-subgraph-goals': {
    type: 'graphql-api',
    tldr: 'GraphQL API Subgraph for Goals',
    required: false,
    icon: '🕸️',
    env: {
      PORT: 6433,
      SERVER_TYPE: 'subgraph:goals',
    },
    pkg: 'api-rspack',
    script: 'dev:subgraph-goals',
  },
  'api-vite': {
    type: 'graphql-api',
    tldr: 'GraphQL monolith, built and run with Vite (twin of api-rspack)',
    required: false,
    icon: '⚡',
    env: {
      PORT: 3100,
    },
    pkg: 'api-vite',
    script: DEV,
  },
  'api-vite-subgraph-goals': {
    type: 'graphql-api',
    tldr: 'GraphQL API Subgraph for Goals, on Vite (twin of api-rspack-subgraph-goals)',
    required: false,
    icon: '⚡',
    env: {
      PORT: 6533,
      SERVER_TYPE: 'subgraph:goals',
    },
    pkg: 'api-vite',
    script: 'dev:subgraph-goals',
  },
  web: {
    type: 'frontend',
    tldr: 'React Router frontend',
    required: true,
    icon: '🖥️',
    env: {
      PORT: 5173,
    },
    pkg: 'web',
    script: DEV,
  },
  // Generator Injection
} as const satisfies Record<string, AppConfig>;

export type Service = keyof typeof deploymentCatalog;

export const isService = (value: unknown): value is Service =>
  typeof value === 'string' && Object.hasOwn(deploymentCatalog, value);

export const deploymentNames = Object.keys(deploymentCatalog).filter(isService);

export function generateOverlaysForApp(conf: AppConfig): [string, Omit<AppConfig, 'overlays'>][] {
  return Object.entries(conf.overlays || []).map(([key, value]) => {
    const overlay = {
      ...conf,
      ...value,
    };
    return [key, overlay] as const;
  });
}

const _overlayConfs: Record<string, AppConfig> = {};
Object.values(deploymentCatalog).forEach((conf: AppConfig) => {
  const overlays = generateOverlaysForApp(conf);
  overlays.forEach(([oKey, oConf]) => {
    _overlayConfs[oKey] = oConf;
  });
});
export const deploymentCatalogIncludingOverlays: Record<string, AppConfig> = {
  ..._overlayConfs,
  ...deploymentCatalog,
};
