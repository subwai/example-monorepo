import { writeSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';

import {
  balancedPreset,
  basicPreset,
  deploymentNames,
  fullPreset,
  getDeploymentConfig,
  isOptional,
  isRequired,
  minimumPreset,
  type Preset,
  presets,
  requiredDeployments,
  type Service,
} from '@example/sears-catalog';
import { FileSystemCache } from 'file-system-cache';
import inquirer from 'inquirer';
import type { ArgumentsCamelCase, CommandModule } from 'yargs';

import { colors, iconWithSpace, randomColor } from '#colors';
import { cachedPreReqs, type PreReq, promptPreReqs, runPreReqs } from '#launchOptions';
import { generateDefaultOvermindConfig } from '#overmind';
import { deploymentsToPathFilters } from '#pathFilters';
import { convertPromptSelectionsToOvermindProcesses, runServices } from '#runServices';

const { prompt, Separator } = inquirer;

// file-system-cache defaults its basePath to './.cache', which is relative to the cwd. That means
// every worktree/clone gets its own copy of your selections. Anchor it to the user's cache
// directory instead so `pnpm start` remembers your choices no matter which checkout you run it from.
const xdgCacheHome = process.env.XDG_CACHE_HOME;
const userCacheDir = xdgCacheHome && isAbsolute(xdgCacheHome) ? xdgCacheHome : join(homedir(), '.cache');

const cache = new FileSystemCache({
  basePath: join(userCacheDir, 'example-monorepo'),
  ns: 'interactive-startup-v1',
});

type TopLevelMode = 'minimum' | 'balanced' | 'full' | 'custom';

/** Arguments for the dev command */
export interface DevArgs {
  autoRun?: boolean;
  preset?: string[];
  manualRun?: boolean;
  mode?: TopLevelMode;
  /**
   * Write selected deployment names as a JSON array, then return before launch
   * options, prerequisites, port cleanup, or Overmind startup.
   * The caller opens and passes this file descriptor (an inherited stream handle,
   * not a filename). Use a dedicated fd such as 3 to keep JSON separate from prompts.
   */
  selectionFd?: number;
}

type ValidChoice = Service | Preset<Service>;
type ValidChoices = ValidChoice[];

interface InquirerCheckboxChoice {
  name: string;
  value: ValidChoice;
  checked: boolean;
}

const describe = `
The interactive start command allows you to selectively start a number of services, as well as run any pre-requisite commands (install node_modules, generate code) beforehand.

When run without flags, a top-level menu is shown with four choices:
  Minimum   — required services only (fastest startup)
  Balanced  — required + common services (recommended)
  Full      — every runnable service in the catalog
  Custom    — pick individual services / detailed presets

Flag priority (highest to lowest):
  1. CI / --manual-run   → always uses the basic required-services path
  2. --preset <name>     → named preset, skips both menus
  3. --mode <choice>     → top-level mode shortcut, skips the top-level menu
  4. --auto-run          → reruns your last cached mode or service picks
  5. Interactive prompt  → shows the top-level menu; Custom falls through to the full picker

If you run 'pnpm start --auto-run' it will simply start with the choices you made last time.

Once 'pnpm start' is running, underneath the hood it is using Overmind, which means that in another terminal you can open a tmux panel into any of the processes.

A common workflow might be to:

1. pnpm start
2. overmind connect <any service name, e.g. api-rspack>
  - to see just the logs of api-rspack, and jump around to other logs as needed
3. overmind restart
  - restarts all services
  - 'overmind stop api-rspack' will stop just api-rspack
`;

export const dev: CommandModule<unknown, DevArgs> = {
  command: 'dev',
  describe,
  builder: yargs =>
    yargs
      .option('auto-run', {
        alias: 'a',
        type: 'boolean',
        describe: 'Run with your previously selected preferences',
      })
      .option('preset', {
        alias: 'p',
        type: 'string',
        array: true,
        choices: presets.map(preset => preset.name),
        describe: 'Choose a preset',
      })
      .option('manual-run', {
        alias: 'm',
        type: 'boolean',
        describe: 'Skip prompts and run with manual selections',
      })
      .option('mode', {
        choices: ['minimum', 'balanced', 'full', 'custom'] as const,
        describe: 'Top-level startup mode (skips the menu)',
      })
      .option('selection-fd', {
        type: 'number',
        describe: 'Write the selected deployment names as JSON to this file descriptor, then exit',
      }) as never,
  handler: async (argv: ArgumentsCamelCase<DevArgs>) => {
    if (argv.selectionFd !== undefined && (!Number.isInteger(argv.selectionFd) || argv.selectionFd < 1)) {
      throw new Error('--selection-fd must be a positive integer');
    }
    if (argv.selectionFd === undefined) generateDefaultOvermindConfig();
    let cachedDeployments: ValidChoices = rehydratePresets(getDeploymentsPresetsCache());
    let preReqsChoices: PreReq[] = cachedPreReqs(cache);
    let autoRun: boolean = argv.autoRun ?? false;
    let deploymentPromptAnswers: Service[] | null = null;

    const presetChoices = presets.filter(preset => argv.preset?.includes(preset.name));
    let skipModePrompt = false;
    let showPreReqsPrompt = false;

    if (process.env.CI || argv.manualRun) {
      console.log('Running manually, skipping prompts and assuming autorun');

      cachedDeployments = [
        {
          ...basicPreset,
          // Only use required deployments if there are no presets chosen
          deployments: [...(!presetChoices.length ? requiredDeployments : []), ...basicPreset.deployments],
        },
      ];
      autoRun = true;
      preReqsChoices = [];
      skipModePrompt = true;
    }

    if (presetChoices.length) {
      const presetNames = presetChoices.map(p => p.name);
      console.log(`Running with presets: ${presetNames.join(', ')}`);
      cachedDeployments = presetChoices.flatMap(p => p.deployments);
    } else if (!skipModePrompt) {
      // Top-level mode dispatch: --mode flag, cached mode from --auto-run, or interactive prompt
      const inferredMode: TopLevelMode | undefined = argv.mode ?? (autoRun ? getCachedMode() : undefined);
      const wasInteractive = inferredMode === undefined;
      const interactiveMode: TopLevelMode = inferredMode ?? (await promptTopLevelMode(getCachedMode() ?? 'balanced'));

      if (interactiveMode !== 'custom') {
        const chosenPreset = modeToPreset(interactiveMode);
        cachedDeployments = [chosenPreset];
        autoRun = true;
        // When the user picked a mode interactively, still show the Service Configuration screen.
        // Skip it only when the mode came from a CLI flag or --auto-run cache (headless invocation).
        showPreReqsPrompt = wasInteractive;
      }
    }

    if (!autoRun || cachedDeployments.length === 0) {
      deploymentPromptAnswers = convertPromptSelectionsToOvermindProcesses(await promptDeployments(cachedDeployments));
      if (argv.selectionFd === undefined) preReqsChoices = await promptPreReqs(cache);
    } else if (showPreReqsPrompt && argv.selectionFd === undefined) {
      preReqsChoices = await promptPreReqs(cache);
    }
    const overmindFriendlyDeployments =
      deploymentPromptAnswers ?? convertPromptSelectionsToOvermindProcesses(cachedDeployments);

    if (argv.selectionFd !== undefined) {
      writeSync(argv.selectionFd, JSON.stringify(overmindFriendlyDeployments) + '\n');
      return;
    }

    const filtersForPrereqs = deploymentsToPathFilters(overmindFriendlyDeployments);

    const preReqResults = await runPreReqs(preReqsChoices, filtersForPrereqs);
    if (preReqResults.some(result => result[0] !== 0)) {
      console.error('❌ Prerequisites failed ☝️');
      process.exit(1);
    }

    await runServices(overmindFriendlyDeployments, preReqsChoices);
  },
};

const shouldBeChecked = (cached: ValidChoices | undefined, choice: ValidChoice): boolean => {
  if (typeof cached === 'undefined') return false;
  if (typeof choice === 'string') {
    // An item should only show up as checked if it's in the cache AND if a preset doesn't already include it
    // So that when you pick a preset, we don't also highlight the individual deployments, causing confusion
    // Deployments should only be highlighted if they're not already in a preset
    return (
      cached.includes(choice) &&
      !cached.some(preset => typeof preset !== 'string' && preset.deployments.includes(choice))
    );
  } else {
    // A preset should always show up as checked
    return cached.some(cacheItem => typeof cacheItem !== 'string' && cacheItem.name === choice.name);
  }
};

// Grab from the cache in a type-safe, pessimistic way
const getDeploymentsPresetsCache = (): ValidChoices => {
  const cacheContents = cache.getSync('deployments') as unknown;
  if (typeof cacheContents === 'undefined') return [];
  if (!Array.isArray(cacheContents)) return [];
  if (cacheContents.length === 0) return [];
  if (cacheContents.some(item => typeof item !== 'string' && typeof item !== 'object')) {
    return [];
  }
  return cacheContents as ValidChoices;
};

const rehydratePresets = (cachedSelections: ValidChoices): ValidChoices => {
  return cachedSelections.map(selection => {
    if (typeof selection === 'string') {
      // Service selections don't need rehydration
      return selection;
    } else {
      // This is a Preset - look up current version to get updated deployments
      const currentPreset = presets.find(preset => preset.name === selection.name);
      // Preset no longer exists, keep the cached version as fallback
      return currentPreset ?? selection;
    }
  });
};

const checkedFirstThenAlphabetical = (a: InquirerCheckboxChoice, b: InquirerCheckboxChoice): number => {
  // Sort checked items first; Then sort alphabetically
  if (a.checked && !b.checked) return -1;
  if (!a.checked && b.checked) return 1;
  if (typeof a.value === 'string' && typeof b.value === 'string') {
    return a.value.localeCompare(b.value);
  } else {
    return a.name.localeCompare(b.name);
  }
};

const modeChoices: { value: TopLevelMode; label: string; description: string }[] = [
  { value: 'minimum', label: 'Minimum', description: 'Required services only (fastest)' },
  { value: 'balanced', label: 'Balanced', description: 'Minimum + common services (recommended)' },
  { value: 'full', label: 'Full', description: 'Every service' },
  { value: 'custom', label: 'Custom', description: 'Pick services / detailed presets' },
];

async function promptTopLevelMode(defaultMode: TopLevelMode): Promise<TopLevelMode> {
  // Pad labels so descriptions line up in a column. No inline color codes: inquirer's
  // highlight on the selected line would get cut short by an embedded reset.
  const labelWidth = Math.max(...modeChoices.map(choice => choice.label.length));
  const { mode } = (await prompt([
    {
      name: 'mode',
      type: 'select',
      message: 'How do you want to start the example monorepo?',
      default: defaultMode,
      choices: modeChoices.map(choice => ({
        name: `${choice.label.padEnd(labelWidth)}  │  ${choice.description}`,
        value: choice.value,
      })),
    },
  ])) as { mode: TopLevelMode };
  cache.setSync('mode', mode);
  return mode;
}

const getCachedMode = (): TopLevelMode | undefined => {
  const m = cache.getSync('mode') as unknown;
  return m === 'minimum' || m === 'balanced' || m === 'full' || m === 'custom' ? m : undefined;
};

const modeToPreset = (mode: Exclude<TopLevelMode, 'custom'>): Preset<Service> => {
  if (mode === 'minimum') return minimumPreset;
  if (mode === 'balanced') return balancedPreset;
  return fullPreset;
};

/** Prompts the user for deployments to launch, if they weren't provided at the command line */
async function promptDeployments(cachedSelections: ValidChoices): Promise<unknown[]> {
  const requiredDeployments = deploymentNames.filter(isRequired);
  const optionalDeployments = deploymentNames.filter(isOptional);

  const presetToChoice = (preset: Preset<Service>): InquirerCheckboxChoice => {
    let deploymentList = preset.deployments
      .filter(d => !getDeploymentConfig(d)?.required) // Exclude required deployments for brevity
      .map(deploymentName => {
        const { icon } = getDeploymentConfig(deploymentName) ?? { icon: '❗' };
        return [iconWithSpace(icon), deploymentName].join('');
      });

    if (preset.deployments.length > 10) {
      deploymentList = [...deploymentList.slice(0, 5), 'and many more!'];
    }

    return {
      name: `${preset.name} ${preset.name !== basicPreset.name ? '→ Basic preset +' : ''} ${deploymentList.join(', ')}`,
      value: preset,
      checked: shouldBeChecked(cachedSelections, preset),
    };
  };
  const deploymentToChoice = (deployment: Service): InquirerCheckboxChoice => {
    const notFoundMeta = {
      tldr: `We don't know this service??`,
      icon: '❗❗',
      color: colors.fg.red,
    };
    const { tldr, icon, color: configuredColor } = getDeploymentConfig(deployment) ?? notFoundMeta;
    const deploymentColor = configuredColor || randomColor();
    const checked = shouldBeChecked(cachedSelections, deployment);
    return {
      name: [iconWithSpace(icon), deploymentColor, deployment, colors.reset, ' → ', tldr].join(''),
      value: deployment,
      checked,
    };
  };

  const choices = [
    new Separator(' '),
    new Separator('Presets'),
    ...presets.map(presetToChoice),
    new Separator(' '),
    new Separator("Required apps (basic functionality won't work without these)"),
    ...requiredDeployments.map(deploymentToChoice).sort(checkedFirstThenAlphabetical),
    new Separator(' '),
    new Separator('Pick and mix apps'),
    ...optionalDeployments.map(deploymentToChoice).sort(checkedFirstThenAlphabetical),
  ];

  // Set the page size to be 85% of the terminal height
  const pageSize = process.stdout.rows ? Math.floor(process.stdout.rows * 0.85) : 20;

  const { deployments: promptSelections } = (await prompt([
    {
      name: 'deployments',
      message: 'Select deployments and/or presets to launch',
      type: 'checkbox',
      choices,
      pageSize,
      validate: (choices: readonly unknown[]) => (choices.length > 0 ? true : 'Select at least one deployment/preset'),
    },
  ])) as { deployments: unknown[] }; // Comes back as any, so forcing us to reconcile

  cache.setSync('deployments', promptSelections);
  // We persist your choices to the cache, but this method only cares about the deployments underneath
  return promptSelections;
}
