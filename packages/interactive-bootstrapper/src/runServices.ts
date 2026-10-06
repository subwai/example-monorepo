import { type ChildProcess, spawn, type SpawnOptions } from 'node:child_process';

import { isService, type Service } from '@example/sears-catalog';

import { updateLaunchConfigForDebugService } from '#genLaunchConfig';
import { killPorts, portsFromServices } from '#killPorts';
import { clearStaleOvermindSocket } from '#overmind';
import {
  LAUNCH_OPTION_DEBUG_MODE,
  LAUNCH_OPTION_FAST_RESTARTS,
  type PreReq,
  promptDebugService,
} from '#launchOptions';
import { monoRepoRoot, PROCFILE_PATH } from '#utils';

export const convertPromptSelectionsToOvermindProcesses = (promptSelections: unknown[]): Service[] => {
  const overmindProcesses: Service[] = [];

  for (const deployment of promptSelections) {
    switch (typeof deployment) {
      case 'string': {
        if (isService(deployment)) {
          overmindProcesses.push(deployment);
        }

        break;
      }
      case 'object': {
        if (deployment !== null && 'deployments' in deployment && Array.isArray(deployment.deployments)) {
          overmindProcesses.push(...deployment.deployments.filter(isService));
        }

        break;
      }
      default: {
        break;
      }
    }
  }
  return [...new Set(overmindProcesses)]; // de-dupe
};

export async function runServices(
  deployments: Service[],
  preReqsChoices: PreReq[],
  envs?: Record<string, string>,
): Promise<ChildProcess> {
  const envInjection: Record<string, string> = {
    ...envs,
  };

  clearStaleOvermindSocket();

  // Kill anything still listening on the selected services' ports, e.g. from a previous run that didn't
  // shut down cleanly
  const portMappings = portsFromServices(deployments, true);
  killPorts(portMappings.map(p => p.port));

  // Read by @example/rspack-configs when `labuild dev` restarts an app.
  envInjection.LABUILD_STANDBY = preReqsChoices.includes(LAUNCH_OPTION_FAST_RESTARTS) ? 'true' : 'false';

  const debugModeEnabled = preReqsChoices.includes(LAUNCH_OPTION_DEBUG_MODE);

  if (debugModeEnabled) {
    envInjection.ENABLE_NODE_DEBUGGING = 'true';
    const debugService = await promptDebugService(deployments);

    if (debugService) {
      envInjection.DEBUG_SERVICE = debugService;
      console.log(`🐛 Debug mode enabled for service: ${debugService}`);

      // Generate launch.json configuration for the debug service
      updateLaunchConfigForDebugService(debugService);
    } else {
      console.log('🐛 Debug mode enabled, but no valid service selected.');
    }
  }

  const spawnArgs: SpawnOptions = {
    cwd: monoRepoRoot,
    stdio: 'inherit',
    env: {
      ...envInjection,
      ...process.env,
    },
  };

  // Ctrl-C reaches overmind too. Wait for it to stop its processes and remove its socket instead of exiting first.
  process.on('SIGINT', () => {});

  const overmindProcess = spawn(
    'overmind',
    [
      'start',
      '--processes',
      deployments.join(','),
      '--procfile',
      PROCFILE_PATH,
      '--root',
      monoRepoRoot,
      '--shell',
      'bash',
    ],
    spawnArgs,
  );
  overmindProcess.on('exit', code => process.exit(code ?? 0));
  return overmindProcess;
}
