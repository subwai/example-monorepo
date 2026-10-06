import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { PlopTypes } from '@turbo/gen';

const KEBAB_CASE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** The workspace name. `directory` maps the answer to the directory it will create, to reject duplicates. */
export const namePrompt = (
  root: string,
  subject: string,
  directory: (name: string) => string,
): PlopTypes.PromptQuestion => ({
  type: 'input',
  name: 'name',
  message: `What's your ${subject}'s name? (omit @example, we automatically add that!)`,
  validate: (input: string) => {
    if (!KEBAB_CASE.test(input)) {
      return 'Use kebab-case, e.g. goals-client';
    }
    return existsSync(join(root, directory(input))) ? `${directory(input)} already exists` : true;
  },
});

/** Checkbox `choices` must be a plain list (not a function) for `--args` to answer it. */
export const consumersPrompt = (workspaces: string[]): PlopTypes.PromptQuestion => ({
  type: 'checkbox',
  name: 'consumers',
  message: 'Which apps and packages will use it?',
  choices: workspaces,
});
