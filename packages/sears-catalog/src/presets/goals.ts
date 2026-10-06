import type { Service } from '#deploymentCatalog';
import type { Preset } from '#presets/types';

export const preset: Preset<Service> = {
  name: 'Goals',
  deployments: ['api-rspack-subgraph-goals'],
};
