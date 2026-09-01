import { Module } from '@nestjs/common';
import { GetHealthStatusUseCase } from '../../../application/health/get-health-status.use-case.js';
import { HealthController } from './health.controller.js';

@Module({
  controllers: [HealthController],
  providers: [GetHealthStatusUseCase],
})
export class HealthModule {}
