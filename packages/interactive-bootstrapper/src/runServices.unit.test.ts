import { describe, expect, it } from 'vitest';

import { deploymentsToPathFilters } from '#pathFilters';
import { convertPromptSelectionsToOvermindProcesses } from '#runServices';

describe('convertPromptSelectionsToOvermindProcesses', () => {
  it('flattens presets and services into unique catalog services, dropping unknown names', () => {
    expect(
      convertPromptSelectionsToOvermindProcesses([
        { name: 'Goals', deployments: ['api-rspack', 'web', 'api-rspack-subgraph-goals'] },
        'api-rspack',
        'not-a-service',
      ]),
    ).toEqual(['api-rspack', 'web', 'api-rspack-subgraph-goals']);
  });
});

describe('deploymentsToPathFilters', () => {
  it('filters on each package once', () => {
    expect(deploymentsToPathFilters(['api-rspack', 'api-rspack-subgraph-goals', 'web'])).toEqual([
      '--filter=api-rspack',
      '--filter=web',
    ]);
  });
});
