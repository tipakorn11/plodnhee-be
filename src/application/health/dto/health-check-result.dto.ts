import { HealthStatusValue } from '../../../domain/health/health-status.js';

export interface HealthCheckResultDto {
  status: HealthStatusValue;
  service: string;
  checkedAt: string;
}
