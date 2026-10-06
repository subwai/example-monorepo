import { spawn } from 'node:child_process';
import { once } from 'node:events';

import type { Service } from '@example/sears-catalog';
import type { FileSystemCache } from 'file-system-cache';
import inquirer from 'inquirer';

import { monoRepoRoot } from '#utils';

const { prompt, Separator } = inquirer;

export const cachedPreReqs = (cache: FileSystemCache): PreReq[] => cache.getSync('preReqs', []) as PreReq[];

export const PREREQ_INSTALL = 'Install new node_modules';
export const PREREQ_CODEGEN = 'Generate code';
export const LAUNCH_OPTION_DEBUG_MODE = 'Enable Debugging';
export const LAUNCH_OPTION_FAST_RESTARTS =
  'Fast restarts (keep a warm standby process per Nest app, so restarts skip loading dependencies; uses more memory)';

export const bootstrapTasks = [PREREQ_INSTALL, PREREQ_CODEGEN] as const;
const launchOptions = [LAUNCH_OPTION_FAST_RESTARTS, LAUNCH_OPTION_DEBUG_MODE] as const;
const preReqs = [...bootstrapTasks, ...launchOptions] as const;
export type PreReq = (typeof preReqs)[number];

export async function promptPreReqs(cache: FileSystemCache): Promise<PreReq[]> {
  const choices = [
    new Separator(' '),
    new Separator('Bootstrap tasks'),
    ...bootstrapTasks,
    new Separator(' '),
    new Separator('Service configuration'),
    ...launchOptions,
  ];
  // Set the page size to be 85% of the terminal height
  const pageSize = process.stdout.rows ? Math.floor(process.stdout.rows * 0.85) : 20;

  const defaultsOff: PreReq[] = [LAUNCH_OPTION_DEBUG_MODE];
  const defaultSelections: PreReq[] = [...bootstrapTasks, ...launchOptions.filter(o => !defaultsOff.includes(o))];
  const cached = cachedPreReqs(cache);

  const { preReqs: pickedPreReqs } = (await prompt([
    {
      name: 'preReqs',
      message: 'Select launch options',
      type: 'checkbox',
      choices,
      default: cached.length > 0 ? cached : defaultSelections,
      pageSize,
    },
  ])) as { preReqs: PreReq[] };

  cache.setSync('preReqs', pickedPreReqs);
  return pickedPreReqs;
}

export async function runPreReqs(choices: readonly PreReq[], filters: string[]) {
  const spawnArgs = { cwd: monoRepoRoot, stdio: 'inherit' as const };

  if (choices.includes(PREREQ_INSTALL)) {
    // This needs to finish before anything else, because code generation runs installed tools
    const [code] = (await once(spawn('pnpm', ['install'], spawnArgs), 'exit')) as [number | null];
    if (code !== 0) return [[code]];
  }

  const preReqPromises: Promise<unknown[]>[] = [];

  if (choices.includes(PREREQ_CODEGEN) && filters.length > 0) {
    /**
     * Passing an empty list of filters would run codegen for every package, so only run it when we know
     * what's starting. `...` includes the packages each selected app depends on (e.g. proto packages).
     */
    const turboFilters = filters.map(filter => `${filter}...`);
    preReqPromises.push(
      once(spawn('turbo', ['run', 'codegen', '--output-logs=errors-only', ...turboFilters], spawnArgs), 'exit'),
    );
  }

  return Promise.all(preReqPromises);
}

export async function promptDebugService(deployments: Service[]): Promise<Service | undefined> {
  // Handle empty deployments
  if (deployments.length === 0) {
    return undefined;
  }

  // Always include api-rspack at the top in the deployments
  const commonServices: Service[] = deployments.filter(svc => svc === 'api-rspack');
  const otherServices = deployments.filter(svc => !commonServices.includes(svc));

  const choices: (string | InstanceType<typeof Separator>)[] = [new Separator(' ')];

  // Only add Common Services section if there are common services
  if (commonServices.length > 0) {
    choices.push(new Separator('Common Services'), ...commonServices, new Separator(' '));
  }

  // Only add Other Services section if there are other services
  if (otherServices.length > 0) {
    choices.push(new Separator('Other Services'), ...otherServices);
  }

  const { debugService } = (await prompt([
    {
      name: 'debugService',
      message: 'Select a service to debug',
      type: 'select',
      choices,
      default: commonServices[0] || otherServices[0],
    },
  ])) as { debugService: Service | undefined };

  return debugService;
}
