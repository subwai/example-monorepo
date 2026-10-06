import type { PlopTypes } from '@turbo/gen';

import { inject } from './files.ts';

export interface PolicyEntry {
  name: string;
  /** Repo-relative directories the rule covers, e.g. `packages/foo`. */
  paths: string[];
  /** GitHub team slug, e.g. `example-org/platform`. Without one, the entry is a placeholder to fill in. */
  team?: string;
}

const template = `{{#unless team}}
  # Find an existing team or policy to add this package to. Every package should have an owner.
{{/unless}}
  - name: {{ name }} added as reviewer
    if:
      changed_files:
        paths:
{{#each paths}}
          - '^{{ this }}/.*'
{{/each}}
    requires:
      count: 1
      teams:
        - '{{#if team}}{{ team }}{{else}}example-org/REPLACE-ME{{/if}}'
    options:
      request_review:
        enabled: true
        mode: teams

`;

/** Adds a policy-bot approval rule so every new workspace has an owner. */
export const policyEntry = (root: string, entry: PolicyEntry): PlopTypes.CustomActionFunction =>
  inject(root, { path: '.policy.yml', marker: '# Generator Injection', position: 'before', template, data: { ...entry } });
