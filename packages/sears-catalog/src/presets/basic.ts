import type { Service } from '#deploymentCatalog';
import type { Preset } from '#presets/types';

export const preset: Preset<Service> = {
  name: 'Basic',
  deployments: [], // Only required deployments
};
