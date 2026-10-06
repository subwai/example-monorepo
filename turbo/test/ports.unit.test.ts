import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CATALOG } from '../generators/shared/catalog.ts';
import { unusedPort } from '../generators/shared/ports.ts';
import { createFixture, type Fixture } from './fixture.ts';

describe('unusedPort', () => {
  let fixture: Fixture;
  beforeEach(() => {
    fixture = createFixture();
    writeFileSync(
      join(fixture.root, CATALOG),
      [
        'const RESERVED = [4002];',
        'export const deploymentCatalog = { a: { env: { PORT: 4000, GRPC_PORT: 5003 } } };',
        '',
      ].join('\n'),
    );
  });
  afterEach(() => fixture.remove());

  it('skips every port the catalog mentions, including at each offset', () => {
    expect(unusedPort(fixture.root, 4000)).toBe(4001);
    // 4001 + 1 is reserved, 4002 is reserved, 4003 + 1000 is taken.
    expect(unusedPort(fixture.root, 4000, [1, 1000])).toBe(4004);
  });
});
