import { execFileSync } from 'node:child_process';

import type { PlopTypes } from '@turbo/gen';

import { inject } from './files.ts';

export const CATALOG = 'packages/sears-catalog/src/deploymentCatalog.ts';

export interface CatalogEntry {
  /** The overmind process name, e.g. `reviews-graphql`. */
  name: string;
  type: 'graphql-api' | 'grpc-api';
  tldr: string;
  icon: string;
  env: Record<string, string | number>;
  pkg: string;
  script: string;
}

// `this.pkg`, not `pkg`: Plop has a built-in `pkg` helper, and Handlebars prefers helpers over data fields.
const template = `  '{{ name }}': {
    type: '{{ type }}',
    tldr: '{{ tldr }}',
    required: false,
    icon: '{{ icon }}',
    env: {
{{{ envLines }}}
    },
    pkg: '{{ this.pkg }}',
    script: '{{ script }}',
  },
`;

/** Adds services to the catalog `pnpm start` picks from (`@example/sears-catalog`). */
export const catalogEntries = (root: string, entries: CatalogEntry[]): PlopTypes.CustomActionFunction[] =>
  entries.map(entry =>
    inject(root, {
      path: CATALOG,
      marker: '// Generator Injection',
      position: 'before',
      template,
      data: {
        ...entry,
        // Strings are quoted for TypeScript; numbers stay bare. Rendered with {{{ }}} so quotes aren't escaped.
        envLines: Object.entries(entry.env)
          .map(([key, value]) => `      ${key}: ${typeof value === 'number' ? value : `'${value}'`},`)
          .join('\n'),
      },
    }),
  );

/**
 * Regenerates the Procfile `pnpm start` hands to overmind, after the catalog changed. Runs after the install,
 * since it reads the new workspace's scripts. `GENERATOR_SKIP_INSTALL=1` skips it with the install.
 */
export const regenerateProcfile =
  (root: string): PlopTypes.CustomActionFunction =>
  () => {
    const args = ['-F', '@example/interactive-bootstrapper', 'codegen'];
    if (process.env.GENERATOR_SKIP_INSTALL === '1') {
      return `skipped: pnpm ${args.join(' ')}`;
    }
    console.log(`+ pnpm ${args.join(' ')}`);
    execFileSync('pnpm', args, { cwd: root, stdio: 'inherit' });
    return `pnpm ${args.join(' ')}`;
  };
