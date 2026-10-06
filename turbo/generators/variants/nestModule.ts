import { join } from 'node:path';

import type { PlopTypes } from '@turbo/gen';

import { readList, readString } from '../shared/answers.ts';
import { addTemplates, assertAbsent } from '../shared/files.ts';
import { installAction } from '../shared/install.ts';
import { policyEntry } from '../shared/policy.ts';
import { consumersPrompt, namePrompt } from '../shared/prompts.ts';
import { packageName, type Repo, workspaceName } from '../shared/repo.ts';
import type { Variant } from '../shared/variant.ts';

/** `goals-domain` → `GoalsDomainModule`; `nest-health` → `NestHealthModule`, not `…ModuleModule`. */
export const nestModuleClass = (name: string): string => {
  const pascal = name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return pascal.endsWith('Module') ? pascal : `${pascal}Module`;
};

/**
 * Renders a compiled package that exports a Nest module. Shared with `service`, which creates `<name>-domain`.
 * Templates read `packageName` rather than `name`: Plop lets a prompt answer override an action's data, so the
 * service's own `name` answer would win.
 */
export const nestModuleActions = (root: string, name: string): PlopTypes.ActionType[] => [
  assertAbsent(root, `packages/${name}`),
  addTemplates('nest-module', join(root, 'packages', name), {
    packageName: name,
    moduleClass: nestModuleClass(name),
  }),
];

export const nestModule = ({ root, workspaces }: Repo): Variant => ({
  kind: 'nest-module',
  description: 'A compiled package that exports a Nest module',
  prompts: [namePrompt(root, 'package', name => `packages/${name}`), consumersPrompt(workspaces)],
  actions: answers => {
    const name = readString(answers, 'name');
    return [
      ...nestModuleActions(root, name),
      policyEntry(root, { name, paths: [`packages/${name}`] }),
      installAction(root, {
        dependencies: readList(answers, 'consumers').map(consumer => ({
          consumer: workspaceName(root, consumer),
          dependency: packageName(name),
          workspace: `packages/${name}`,
        })),
        builds: [],
      }),
    ];
  },
});
