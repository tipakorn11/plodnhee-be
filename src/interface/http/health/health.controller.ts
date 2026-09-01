import { Controller, Get } from '@nestjs/common';
import { GetHealthStatusUseCase } from '../../../application/health/get-health-status.use-case.js';
import type { HealthCheckResultDto } from '../../../application/health/dto/health-check-result.dto.js';

@Controller()
export class HealthController {
  constructor(private readonly getHealthStatus: GetHealthStatusUseCase) {}

  @Get()
  check(): HealthCheckResultDto {
    return this.getHealthStatus.execute();
  }
}
