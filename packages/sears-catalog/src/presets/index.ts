import { deploymentCatalog, deploymentNames, type Service } from '#deploymentCatalog';
import { preset as balancedPresetRaw } from '#presets/balanced';
import { preset as basicPresetRaw } from '#presets/basic';
import { preset as fullPresetRaw } from '#presets/full';
import { preset as goalsPreset } from '#presets/goals';
import { preset as viteTwinPreset } from '#presets/vite';
import type { AppConfig, Preset } from '#presets/types';

export const getDeploymentConfig = (deployment: Service): AppConfig | undefined => deploymentCatalog[deployment];

export const isRequired = (deployment: Service): boolean => !!getDeploymentConfig(deployment)?.required;

export const isOptional = (deployment: Service): boolean => !isRequired(deployment);

export const requiredDeployments = deploymentNames.filter(deployment => isRequired(deployment));

export const basicPreset: Preset<Service> = basicPresetRaw;

// Top-level menu presets — requiredDeployments baked in manually (these are NOT in the
// `presets` array, so the auto-prepend map at the bottom of this file doesn't apply to them).
export const minimumPreset: Preset<Service> = {
  name: 'Basic',
  deployments: [...requiredDeployments],
};

export const balancedPreset: Preset<Service> = {
  ...balancedPresetRaw,
  deployments: [...requiredDeployments, ...balancedPresetRaw.deployments],
};

export const fullPreset: Preset<Service> = {
  ...fullPresetRaw,
  deployments: [...requiredDeployments, ...fullPresetRaw.deployments],
};

export const presets: Preset<Service>[] = [
  // Put basic preset first
  {
    ...basicPreset,
    deployments: [...requiredDeployments, ...basicPreset.deployments],
  },
].concat(
  [goalsPreset, viteTwinPreset]
    .map(preset => ({
      ...preset,
      deployments: [...(preset.excludeRequired ? [] : requiredDeployments), ...preset.deployments],
    }))
    .sort((a, b) => a.name.localeCompare(b.name)),
);
