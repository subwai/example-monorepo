import type { Service } from '#deploymentCatalog';
import type { Preset } from '#presets/types';

export const preset: Preset<Service> = {
  name: 'Balanced',
  deployments: ['api-rspack-subgraph-goals'],
};
