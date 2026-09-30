import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { GetHealthStatusUseCase } from '../../../application/health/get-health-status.use-case.js';
import type { HealthCheckResultDto } from '../../../application/health/dto/health-check-result.dto.js';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';

@Controller()
export class HealthController {
  constructor(
    private readonly getHealthStatus: GetHealthStatusUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  check(): HealthCheckResultDto {
    return this.getHealthStatus.execute();
  }

  @Get('keep-alive')
  async keepAlive(@Headers('authorization') authorization?: string): Promise<{ ok: true }> {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
      throw new UnauthorizedException();
    }

    await this.prisma.client.$queryRaw`SELECT 1`;
    return { ok: true };
  }
}
