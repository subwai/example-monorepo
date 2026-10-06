import 'reflect-metadata';

import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';

import { GoalsModule } from '#modules/goals/goals.module';
import { GoalsResolver } from '#modules/goals/goals.resolver';

describe('GoalsResolver', () => {
  it('lists goals from the service', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [GoalsModule] }).compile();

    expect(moduleRef.get(GoalsResolver).goals()).toContainEqual(
      expect.objectContaining({ title: 'Ship the generators' }),
    );
  });
});
