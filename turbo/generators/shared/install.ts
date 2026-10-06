import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { PlopTypes } from '@turbo/gen';

export interface Dependency {
  /** Package name of the workspace that gets the dependency. */
  consumer: string;
  /** Package name of the new workspace package. */
  dependency: string;
  /** Repo-relative directory of the new package. Its `peerDependencies` are added to the consumer too. */
  workspace: string;
  dev?: boolean;
}

export interface InstallPlan {
  dependencies: Dependency[];
  /** Packages to build after installing, e.g. proto packages whose code is generated. */
  builds: string[];
}

/** `name@range` for each of a workspace's peerDependencies, e.g. `rxjs@catalog:`. */
export type PeersOf = (workspace: string) => string[];

/**
 * Apps bundle workspace packages but import third-party code from their own node_modules at runtime, so a
 * consumer has to provide every peer of the packages it uses.
 */
export const readPeers =
  (root: string): PeersOf =>
  workspace => {
    const manifest = join(root, workspace, 'package.json');
    if (!existsSync(manifest)) {
      return [];
    }
    const { peerDependencies = {} } = JSON.parse(readFileSync(manifest, 'utf8')) as {
      peerDependencies?: Record<string, string>;
    };
    return Object.entries(peerDependencies).map(([name, range]) => `${name}@${range}`);
  };

/**
 * The pnpm commands for a plan: one `pnpm add` per new package and dependency type, batched across consumers
 * and including the package's peers, then a single install (which also installs the new workspaces' own
 * dependencies), then any builds.
 */
export const pnpmCommands = ({ dependencies, builds }: InstallPlan, peersOf: PeersOf = () => []): string[][] => {
  const batches = new Map<string, Dependency[]>();
  for (const dependency of dependencies) {
    const key = `${dependency.dependency} ${dependency.dev === true ? 'dev' : 'prod'}`;
    batches.set(key, [...(batches.get(key) ?? []), dependency]);
  }
  const adds = [...batches.values()].map(batch => {
    const [{ dependency, workspace, dev }] = batch as [Dependency, ...Dependency[]];
    return [
      ...batch.flatMap(({ consumer }) => ['-F', consumer]),
      'add',
      ...(dev === true ? ['-D'] : []),
      `${dependency}@workspace:*`,
      ...peersOf(workspace),
    ];
  });
  return [...adds, ['install', '--no-frozen-lockfile'], ...builds.map(name => ['-F', name, 'build'])];
};

/**
 * The last action of every variant that creates a workspace. `GENERATOR_SKIP_INSTALL=1` only prints the
 * commands; the tests set it so they never install into a fixture.
 */
export const installAction =
  (root: string, plan: InstallPlan): PlopTypes.CustomActionFunction =>
  () => {
    const commands = pnpmCommands(plan, readPeers(root));
    const printed = commands.map(args => `pnpm ${args.join(' ')}`);
    if (process.env.GENERATOR_SKIP_INSTALL === '1') {
      return `skipped install: ${printed.join('; ')}`;
    }
    commands.forEach((args, index) => {
      console.log(`+ ${printed[index]}`);
      execFileSync('pnpm', args, { cwd: root, stdio: 'inherit' });
    });
    return printed.join('; ');
  };
