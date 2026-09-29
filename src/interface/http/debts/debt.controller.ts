import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { DebtService } from '../../../application/debts/debt.service.js';
import type { AddGroupMemberDto, CreateBillDto, CreateGroupChargeDto, CreateGroupDto, CreateMemberDiscountDto, CreatePersonDto, PayBillsDto, UpdateBillDto } from '../../../application/debts/dto/debt.dto.js';
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
  @Post('groups/:groupId/members') addGroupMember(@Req() req: AuthenticatedRequest, @Param('groupId') groupId: string, @Body() body: AddGroupMemberDto) { return this.debts.addGroupMember(req.user.id, groupId, body); }
  @Post('expense-groups/:groupId/charges') createGroupCharge(@Req() req: AuthenticatedRequest, @Param('groupId') groupId: string, @Body() body: CreateGroupChargeDto) { return this.debts.createGroupCharge(req.user.id, groupId, body); }
  @Post('expense-groups/:groupId/members/:personId/discounts') createMemberDiscount(@Req() req: AuthenticatedRequest, @Param('groupId') groupId: string, @Param('personId') personId: string, @Body() body: CreateMemberDiscountDto) { return this.debts.createMemberDiscount(req.user.id, groupId, personId, body); }
  @Post('groups/:groupId/bills') createBill(@Req() req: AuthenticatedRequest, @Param('groupId') groupId: string, @Body() body: CreateBillDto) { return this.debts.createBill(req.user.id, groupId, body); }
  @Post('people/:personId/bills') createPersonalBill(@Req() req: AuthenticatedRequest, @Param('personId') personId: string, @Body() body: Omit<CreateBillDto, 'personId'>) { return this.debts.createPersonalBill(req.user.id, personId, body); }
  @Post('groups/:groupId/members/:personId/payments') payGroupBills(@Req() req: AuthenticatedRequest, @Param('groupId') groupId: string, @Param('personId') personId: string, @Body() body: PayBillsDto) { return this.debts.payGroupBills(req.user.id, groupId, personId, body); }
  @Post('people/:personId/bills/payments') payPersonalBills(@Req() req: AuthenticatedRequest, @Param('personId') personId: string, @Body() body: PayBillsDto) { return this.debts.payPersonalBills(req.user.id, personId, body); }
  @Patch('bills/:billId') updateBill(@Req() req: AuthenticatedRequest, @Param('billId') billId: string, @Body() body: UpdateBillDto) { return this.debts.updateBill(req.user.id, billId, body); }
  @Delete('bills/:billId') @HttpCode(204) deleteBill(@Req() req: AuthenticatedRequest, @Param('billId') billId: string): void { this.debts.deleteBill(req.user.id, billId); }
}
