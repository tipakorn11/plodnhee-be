import { Injectable } from '@nestjs/common';
import { HealthStatus } from '../../domain/health/health-status.js';
import { HealthCheckResultDto } from './dto/health-check-result.dto.js';

@Injectable()
export class GetHealthStatusUseCase {
  private readonly serviceName = 'plodnhee-be';

  execute(): HealthCheckResultDto {
    const healthStatus = HealthStatus.ok(this.serviceName);

    return {
      status: healthStatus.status,
      service: healthStatus.service,
      checkedAt: healthStatus.checkedAt.toISOString(),
    };
  }
}
