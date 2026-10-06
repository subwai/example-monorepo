import type { PlopTypes } from '@turbo/gen';

import type { Answers } from './shared/answers.ts';
import type { Kind, Variant } from './shared/variant.ts';

const PACKAGE_KINDS: Kind[] = ['library', 'nest-module', 'proto'];

const packageKindLabels: Partial<Record<Kind, string>> = {
  library: 'library (frontend or backend, JIT or compiled)',
  'nest-module': 'Nest module (compiled)',
  proto: 'gRPC API (proto, compiled)',
};

const selectedKind = (answers: Answers): Kind | undefined => {
  const kind: unknown = answers?.kind === 'package' ? answers.packageKind : answers?.kind;
  return typeof kind === 'string' ? (kind as Kind) : undefined;
};

type When = PlopTypes.PromptQuestion['when'];

const onlyFor = (kind: Kind, when: When): When => async (answers: Answers) =>
  selectedKind(answers) === kind && (typeof when === 'function' ? await when(answers) : when !== false);

/**
 * The interactive entry point: asks what you're creating, then runs that variant's prompts and actions.
 * Plop refuses to answer conditional prompts from `--args`, so scripts call a variant directly instead.
 */
export const newGenerator = (variants: Variant[]): Partial<PlopTypes.PlopGeneratorConfig> => ({
  description: 'Create a package, service or api-rspack subgraph (interactive)',
  prompts: [
    {
      type: 'list',
      name: 'kind',
      message: 'What are you creating?',
      choices: [
        { name: 'package', value: 'package' },
        { name: 'service', value: 'service' },
        { name: 'api-rspack subgraph', value: 'subgraph' },
      ],
    },
    {
      type: 'list',
      name: 'packageKind',
      message: 'What kind of package?',
      choices: PACKAGE_KINDS.map(kind => ({ name: packageKindLabels[kind], value: kind })),
      when: (answers: Answers) => answers?.kind === 'package',
    },
    ...variants.flatMap(variant =>
      variant.prompts.map(prompt => ({ ...prompt, when: onlyFor(variant.kind, prompt.when) })),
    ),
  ],
  actions: (answers?: Answers) => {
    const variant = variants.find(({ kind }) => kind === selectedKind(answers));
    if (variant === undefined) {
      throw new Error('Pick something to create');
    }
    return variant.actions(answers);
  },
});
