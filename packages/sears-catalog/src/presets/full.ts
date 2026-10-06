import { deploymentNames, type Service } from '#deploymentCatalog';
import type { Preset } from '#presets/types';

export const preset: Preset<Service> = {
  name: 'Full',
  deployments: [...deploymentNames],
};
