import { Module } from '@nestjs/common';
import { HealthModule } from './interface/http/health/health.module.js';
import { ObserveModule } from './infrastructure/observability/observability.module.js';
import { DebtModule } from './interface/http/debts/debt.module.js';
import { AuthModule } from './interface/http/auth/auth.module.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'plodnhee-be',
    }),
    HealthModule,
    DatabaseModule,
    AuthModule,
    DebtModule,
  ],
})
export class AppModule {}
