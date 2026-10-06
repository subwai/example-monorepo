import type { Service } from '#deploymentCatalog';
import type { Preset } from '#presets/types';

/** The Vite twin of api-rspack, next to it, to compare the two. */
export const preset: Preset<Service> = {
  name: 'Vite twin',
  deployments: ['api-vite', 'api-vite-subgraph-goals'],
};
