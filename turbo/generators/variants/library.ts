import { join } from 'node:path';

import { readList, readString } from '../shared/answers.ts';
import { addTemplates, assertAbsent } from '../shared/files.ts';
import { installAction } from '../shared/install.ts';
import { policyEntry } from '../shared/policy.ts';
import { consumersPrompt, namePrompt } from '../shared/prompts.ts';
import { packageName, type Repo, workspaceName } from '../shared/repo.ts';
import type { Variant } from '../shared/variant.ts';

/** A plain TypeScript package. Frontend or backend, and JIT (consumers compile its source) or compiled. */
export const library = ({ root, workspaces }: Repo): Variant => ({
  kind: 'library',
  description: 'A TypeScript package, JIT or compiled',
  prompts: [
    namePrompt(root, 'package', name => `packages/${name}`),
    consumersPrompt(workspaces),
    {
      type: 'list',
      name: 'side',
      message: 'Is it for the frontend or the backend?',
      choices: ['frontend', 'backend'],
    },
    {
      type: 'list',
      name: 'compilation',
      message: 'JIT (consumers compile its source) or compiled (ships dist)?',
      choices: ['jit', 'compiled'],
      default: (answers: { side?: string }) => (answers.side === 'frontend' ? 'jit' : 'compiled'),
    },
  ],
  actions: answers => {
    const name = readString(answers, 'name');
    const side = readString(answers, 'side');
    const compilation = readString(answers, 'compilation');
    const workspace = `packages/${name}`;
    const destination = join(root, workspace);
    const data = { name, frontend: side === 'frontend', compiled: compilation === 'compiled' };
    return [
      assertAbsent(root, workspace),
      addTemplates('library/files', destination, data),
      addTemplates(`library/${side}`, destination, data),
      ...(data.compiled ? [addTemplates('library/compiled', destination, data)] : []),
      policyEntry(root, { name, paths: [workspace] }),
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
