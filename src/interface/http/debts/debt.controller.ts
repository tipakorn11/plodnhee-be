import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { DebtService } from '../../../application/debts/debt.service.js';
import type { CreateBillDto, CreateGroupDto, CreatePersonDto, UpdateBillDto } from '../../../application/debts/dto/debt.dto.js';
import { JwtAuthGuard, type AuthenticatedRequest } from '../auth/jwt-auth.guard.js';

@Controller()
@UseGuards(JwtAuthGuard)
export class DebtController {
  constructor(private readonly debts: DebtService) {}

  @Post('people') createPerson(@Req() req: AuthenticatedRequest, @Body() body: CreatePersonDto) { return this.debts.createPerson(req.user.id, body); }
  @Get('people') listPeople(@Req() req: AuthenticatedRequest) { return this.debts.listPeople(req.user.id); }
  @Post('groups') createGroup(@Req() req: AuthenticatedRequest, @Body() body: CreateGroupDto) { return this.debts.createGroup(req.user.id, body); }
  @Get('groups') listGroups(@Req() req: AuthenticatedRequest) { return this.debts.listGroups(req.user.id); }
  @Get('groups/:groupId') getGroup(@Req() req: AuthenticatedRequest, @Param('groupId') groupId: string) { return this.debts.getGroup(req.user.id, groupId); }
  @Post('groups/:groupId/bills') createBill(@Req() req: AuthenticatedRequest, @Param('groupId') groupId: string, @Body() body: CreateBillDto) { return this.debts.createBill(req.user.id, groupId, body); }
  @Patch('bills/:billId') updateBill(@Req() req: AuthenticatedRequest, @Param('billId') billId: string, @Body() body: UpdateBillDto) { return this.debts.updateBill(req.user.id, billId, body); }
  @Delete('bills/:billId') @HttpCode(204) deleteBill(@Req() req: AuthenticatedRequest, @Param('billId') billId: string): void { this.debts.deleteBill(req.user.id, billId); }
}
