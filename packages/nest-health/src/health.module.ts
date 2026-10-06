import { type DynamicModule, Module } from '@nestjs/common';

import { HealthController, SERVICE_NAME } from '#health.controller';
import { HealthService } from '#health.service';

/** Adds `GET /status` to an app. */
@Module({})
export class HealthModule {
  static forService(serviceName: string): DynamicModule {
    return {
      module: HealthModule,
      controllers: [HealthController],
      providers: [HealthService, { provide: SERVICE_NAME, useValue: serviceName }],
      exports: [HealthService],
    };
  }
}
