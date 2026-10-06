import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import {
  type AppConfig,
  deploymentCatalog,
  generateOverlaysForApp,
  PORTS_WE_SHOULDNT_USE,
} from '@example/sears-catalog';

import { monoRepoRoot, PROCFILE_PATH } from '#utils';

const DEBUG_PORTS_PATH = path.join(import.meta.dirname, 'debugPorts.json');

let packages: { name: string; path: string }[] | undefined;

function findPackageJsonPath(pkgName: string): string {
  packages ??= JSON.parse(
    execSync(`pnpm list --json --depth -1 -F='*'`, { cwd: monoRepoRoot, encoding: 'utf8' }),
  ) as { name: string; path: string }[];
  const pkg = packages.find(p => p.name === pkgName);
  if (!pkg) {
    throw new Error(`Could not find package "${pkgName}" in pnpm list`);
  }
  return pkg.path;
}

export function rewriteCommandPaths(cmd: string): string {
  // Every CLI tool that is in path will need to be added to this list, which is not great but let's see how it goes.
  // The Procfile runs commands outside pnpm, so each workspace's node_modules/.bin isn't on PATH.
  const cliTools = ['labuild', 'react-router'];
  const cliToolRegex = new RegExp(`(?<![\\w./-])(?:${cliTools.join('|')})(?![\\w-])`, 'g');

  return cmd.replace(cliToolRegex, tool => `./node_modules/.bin/${tool}`);
}

// Generate a unique debug port for each service to avoid conflicts
function getDebugPortForService(serviceName: string): number {
  // Simple hash function to generate consistent port numbers
  let hash = 0;
  for (let i = 0; i < serviceName.length; i += 1) {
    const char = serviceName.charCodeAt(i);
    hash = hash * 31 + char;
  }
  // Map to range 9230-9450 (221 ports) to reduce collision risk
  return 9230 + (Math.abs(hash) % 221);
}

/**
 * Load existing debug port assignments from the stable mapping file
 */
function loadExistingDebugPorts(): Record<string, number> {
  try {
    const content = fs.readFileSync(DEBUG_PORTS_PATH, 'utf8');
    const data = JSON.parse(content) as { ports?: Record<string, number> };
    return data.ports || {};
  } catch (error) {
    // If file doesn't exist, return empty object (first-time generation)
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    // For any other error (permissions, invalid JSON, etc.), throw to fail loudly
    throw error;
  }
}

/**
 * Save debug port assignments to the stable mapping file
 */
function saveDebugPorts(debugPorts: Record<string, number>): void {
  fs.writeFileSync(DEBUG_PORTS_PATH, JSON.stringify({ ports: debugPorts }, null, 2) + '\n');
}

/**
 * Collects all service names (base and overlays) from the deployment catalog
 */
function collectAllServiceNames(): string[] {
  const serviceNames: string[] = [];
  const names = Object.keys(deploymentCatalog).sort() as (keyof typeof deploymentCatalog)[];

  names.forEach(name => {
    const conf: AppConfig = deploymentCatalog[name];
    const overlayConfs = generateOverlaysForApp(conf);
    serviceNames.push(name, ...overlayConfs.map(([overlayName]) => overlayName));
  });

  return serviceNames;
}

/**
 * Initializes the set of used ports from deployment catalog and reserved ports.
 * Includes ALL ports to prevent conflicts. Service PORT/GRPC_PORT values take
 * priority over debug port assignments since they are required for services to run.
 */
function initializeUsedPorts(): Set<number> {
  const usedPorts = new Set<number>();

  // Add all ports from deployment catalog
  Object.values(deploymentCatalog).forEach((conf: AppConfig) => {
    const { PORT, GRPC_PORT } = conf.env;

    if (typeof PORT === 'number') {
      usedPorts.add(PORT);
    }

    if (typeof GRPC_PORT === 'number') {
      usedPorts.add(GRPC_PORT);
    }
  });

  // Add all reserved ports
  PORTS_WE_SHOULDNT_USE.forEach(port => {
    usedPorts.add(port);
  });

  return usedPorts;
}

/**
 * Finds the next available port within the debug range, with wraparound.
 * Searches up to `range` ports starting from `startPort`, wrapping around
 * within the range [minPort, minPort + range - 1].
 *
 * @returns An available port number, or null if all ports in range are used
 */
function findAvailablePort(startPort: number, usedPorts: Set<number>, minPort: number, range: number): number | null {
  for (let attempts = 0; attempts < range; attempts += 1) {
    const offset = (startPort - minPort + attempts) % range;
    const port = minPort + offset;

    if (!usedPorts.has(port)) {
      return port;
    }
  }

  // All ports in range are used
  return null;
}

/**
 * Allocates a new debug port for a service, falling back to unrestricted allocation if needed
 */
function allocateNewPort(serviceName: string, usedPorts: Set<number>, minPort: number, maxPort: number, range: number): number {
  const startPort = getDebugPortForService(serviceName);
  const port = findAvailablePort(startPort, usedPorts, minPort, range);

  if (port !== null) {
    return port;
  }

  // Exhausted preferred range - fall back to simple increment
  console.warn(
    `Warning: Unable to allocate debug port for service "${serviceName}" within preferred range ${minPort}-${maxPort}. Falling back to port allocation beyond preferred range.`,
  );

  let fallbackPort = startPort;

  while (usedPorts.has(fallbackPort)) {
    fallbackPort += 1;
  }

  return fallbackPort;
}

/**
 * Allocates debug ports for all services, ensuring no conflicts with existing ports.
 * Preserves existing port assignments for stability when new services are added.
 */
export function allocateDebugPorts(): Record<string, number> {
  const DEBUG_PORT_MIN = 9230;
  const DEBUG_PORT_MAX = 9450;
  const DEBUG_PORT_RANGE = DEBUG_PORT_MAX - DEBUG_PORT_MIN + 1;

  const usedPorts = initializeUsedPorts();
  const existingDebugPorts = loadExistingDebugPorts();
  const debugPorts: Record<string, number> = {};

  // Process all services: preserve existing assignments or allocate new ones
  collectAllServiceNames().forEach(serviceName => {
    // Try to preserve existing assignment first. The used-ports set includes every debug port assigned so far.
    const existingPort = existingDebugPorts[serviceName];
    const port =
      existingPort !== undefined && !usedPorts.has(existingPort)
        ? existingPort
        : allocateNewPort(serviceName, usedPorts, DEBUG_PORT_MIN, DEBUG_PORT_MAX, DEBUG_PORT_RANGE);
    debugPorts[serviceName] = port;
    usedPorts.add(port);
  });

  saveDebugPorts(debugPorts);
  return debugPorts;
}

/**
 * Recursively resolves a script from a package.json `scripts` block by following
 * any nested `pnpm` commands.
 *
 * Used to flatten multi-layered script chains into a single executable command.
 */
export function unfurlScript(scripts: Record<string, string>, entry: string): string | undefined {
  const visited = new Set<string>();
  let currentCommand = scripts[entry];
  let currentEntry = entry;

  while (currentCommand !== undefined) {
    visited.add(currentEntry);

    const match = currentCommand.match(/\bpnpm(?: run)? (?<script>[\w:-]+)/);
    const nextScript = match?.groups?.script;
    if (match === null || nextScript === undefined) {
      break;
    }
    if (visited.has(nextScript)) {
      throw new Error(`Circular script reference: ${[...visited, nextScript].join(' -> ')}`);
    }
    const nextCommand = scripts[nextScript];
    if (nextCommand === undefined) {
      throw new Error(`Missing script "${nextScript}" in package.json`);
    }

    currentCommand = currentCommand.replace(match[0], nextCommand);
    currentEntry = nextScript;
  }

  return currentCommand;
}

function genProcfile() {
  const seenPorts: Record<number, string> = {};
  PORTS_WE_SHOULDNT_USE.forEach(p => {
    seenPorts[p] = 'RESERVED_PORT';
  });

  const outputLines: string[] = [
    '# this file is generated in codegen. do not manually edit',
    '# Debug ports are statically allocated per service. Use ENABLE_NODE_DEBUGGING=true.',
  ];

  // Allocate debug ports for all services
  const debugPorts = allocateDebugPorts();

  const names = Object.keys(deploymentCatalog).sort() as (keyof typeof deploymentCatalog)[];

  function buildLine(conf: Omit<AppConfig, 'overlays'>, name: string) {
    const pkg = conf.pkg;
    const debugPort = debugPorts[name];

    // Try to unfurl the script if possible
    let command: string;
    let workingDir: string | null = null;

    if (pkg) {
      const pkgPath = findPackageJsonPath(pkg);
      const pkgJson = JSON.parse(fs.readFileSync(path.join(pkgPath, 'package.json'), 'utf8')) as {
        scripts?: Record<string, string>;
      };
      const unfurled = unfurlScript(pkgJson.scripts ?? {}, conf.script);
      if (unfurled === undefined) {
        throw new Error(`${pkg} has no "${conf.script}" script for ${name}`);
      }
      const args = conf.args?.join(' ') ?? '';

      workingDir = path.relative(monoRepoRoot, pkgPath);
      command = rewriteCommandPaths(unfurled) + (args ? ` ${args}` : '');
    } else {
      // Fallback to pnpm command
      command = `pnpm ${conf.script}${conf.args ? ` ${conf.args.join(' ')}` : ''}`;
    }

    // Build the common line structure
    let currentLine = `${name}: `;

    if (workingDir) {
      currentLine += `cd ${workingDir} && `;
    }
    currentLine += `export LABUILD_COORDINATOR_PROC_NAME='${name}' && `;
    currentLine += `export LABUILD_DEBUG_PORT='${debugPort}' && `;
    Object.entries(conf.env).forEach(([k, v]) => {
      currentLine += `export ${k}='${v}' && `;
    });

    currentLine += command;
    outputLines.push(currentLine);
  }

  // Build the lines for each key in the deployment catalog
  names.forEach(name => {
    const conf: AppConfig = deploymentCatalog[name];
    const { PORT, GRPC_PORT } = conf.env;

    // We want to validate ports before we generate overlays
    for (const port of [PORT, GRPC_PORT]) {
      if (typeof port === 'number') {
        if (seenPorts[port]) {
          throw new Error(`port collision at ${port} for ${name} already occupied by ${seenPorts[port]}`);
        }
        seenPorts[port] = name;
      }
    }

    // Now we apply the overlays, since overlays can have the same port as their base
    const allConfs = [[name, conf] as const, ...generateOverlaysForApp(conf)];

    allConfs.forEach(([name, conf]) => {
      buildLine(conf, name);
    });
  });

  fs.writeFileSync(PROCFILE_PATH, outputLines.join('\n') + '\n');
  console.log(`wrote ${path.relative(monoRepoRoot, PROCFILE_PATH)}`);
}

// When executed directly, generate the Procfile
if (import.meta.main) {
  genProcfile();
}
