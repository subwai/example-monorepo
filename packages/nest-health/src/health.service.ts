import { Injectable } from '@nestjs/common';

export interface HealthStatus {
  status: 'ok';
  service: string;
  uptimeSeconds: number;
}

@Injectable()
export class HealthService {
  private readonly startedAt = Date.now();

  status(service: string): HealthStatus {
    return { status: 'ok', service, uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000) };
  }
}
