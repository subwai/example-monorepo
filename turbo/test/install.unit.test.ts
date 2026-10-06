import { describe, expect, it } from 'vitest';

import { pnpmCommands } from '../generators/shared/install.ts';

describe('pnpmCommands', () => {
  it('batches consumers per dependency and type with the package peers, installs once, then builds', () => {
    const peers = (workspace: string): string[] => (workspace === 'packages/a' ? ['rxjs@catalog:'] : []);
    expect(
      pnpmCommands(
        {
          dependencies: [
            { consumer: 'web', dependency: '@example/a', workspace: 'packages/a' },
            { consumer: 'api', dependency: '@example/a', workspace: 'packages/a' },
            { consumer: 'api', dependency: '@example/a', workspace: 'packages/a', dev: true },
            { consumer: 'web', dependency: '@example/b', workspace: 'packages/b' },
          ],
          builds: ['@example/a'],
        },
        peers,
      ),
    ).toEqual([
      ['-F', 'web', '-F', 'api', 'add', '@example/a@workspace:*', 'rxjs@catalog:'],
      ['-F', 'api', 'add', '-D', '@example/a@workspace:*', 'rxjs@catalog:'],
      ['-F', 'web', 'add', '@example/b@workspace:*'],
      ['install', '--no-frozen-lockfile'],
      ['-F', '@example/a', 'build'],
    ]);
  });

  it('still installs when there is nothing to add, so the new workspace gets its dependencies', () => {
    expect(pnpmCommands({ dependencies: [], builds: [] })).toEqual([['install', '--no-frozen-lockfile']]);
  });
});
