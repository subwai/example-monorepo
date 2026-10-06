import { Controller, Get, Inject } from '@nestjs/common';

import { HealthService, type HealthStatus } from '#health.service';

export const SERVICE_NAME = Symbol('SERVICE_NAME');

@Controller('status')
export class HealthController {
  constructor(
    private readonly health: HealthService,
    @Inject(SERVICE_NAME) private readonly serviceName: string,
  ) {}

  @Get()
  status(): HealthStatus {
    return this.health.status(this.serviceName);
  }
}
