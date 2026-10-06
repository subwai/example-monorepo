import 'reflect-metadata';

import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';

import { HealthController } from '#health.controller';
import { HealthModule } from '#health.module';

describe('HealthModule', () => {
  it('injects the service name into the status controller', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [HealthModule.forService('example')],
    }).compile();

    expect(moduleRef.get(HealthController).status()).toMatchObject({ status: 'ok', service: 'example' });
  });
});
