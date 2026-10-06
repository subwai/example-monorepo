import type { PlopTypes } from '@turbo/gen';

import type { Answers } from './answers.ts';

export type Kind = 'library' | 'nest-module' | 'proto' | 'service' | 'subgraph';

/**
 * One thing the generators can create. Each variant is registered on its own, so `pnpm gen <kind> --args …`
 * only counts that variant's prompts, and `new` composes all of them behind "What are you creating?".
 */
export interface Variant {
  kind: Kind;
  description: string;
  prompts: PlopTypes.PromptQuestion[];
  actions: (answers: Answers) => PlopTypes.ActionType[];
}
