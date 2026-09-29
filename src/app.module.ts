import { Module } from '@nestjs/common';
import { HealthModule } from './interface/http/health/health.module.js';
import { DebtModule } from './interface/http/debts/debt.module.js';
import { AuthModule } from './interface/http/auth/auth.module.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';

@Module({
  imports: [
    HealthModule,
    DatabaseModule,
    AuthModule,
    DebtModule,
  ],
})
export class AppModule {}
