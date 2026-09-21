import { Module } from '@nestjs/common';
import { DebtService } from '../../../application/debts/debt.service.js';
import { DebtController } from './debt.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({ imports: [AuthModule], controllers: [DebtController], providers: [DebtService] })
export class DebtModule {}
