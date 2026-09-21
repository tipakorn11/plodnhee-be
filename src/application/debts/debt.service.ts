import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Bill, Group, Person } from '../../domain/debts/debt.types.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import type { CreateBillDto, CreateGroupDto, CreatePersonDto, UpdateBillDto } from './dto/debt.dto.js';

@Injectable()
export class DebtService {
  constructor(private readonly database: PrismaService) {}

  async createPerson(ownerId: string, input: CreatePersonDto): Promise<Person> {
    const row = await this.database.client.person.create({ data: { id: randomUUID(), ownerId, name: this.text(input.name, 'name'), profileImageUrl: this.imageUrl(input.profileImageUrl) } });
    return this.person(row);
  }
  async listPeople(ownerId: string): Promise<Person[]> { return (await this.database.client.person.findMany({ where: { ownerId }, orderBy: { createdAt: 'asc' } })).map((row) => this.person(row)); }
  async createGroup(ownerId: string, input: CreateGroupDto): Promise<Group> { return this.group(await this.database.client.group.create({ data: { id: randomUUID(), ownerId, name: this.text(input.name, 'name') } })); }
  async listGroups(ownerId: string) { return Promise.all((await this.database.client.group.findMany({ where: { ownerId }, orderBy: { createdAt: 'asc' } })).map((row) => this.groupDetail(this.group(row)))); }
  async getGroup(ownerId: string, id: string) { return this.groupDetail(await this.getGroupEntity(ownerId, id)); }
  async createBill(ownerId: string, groupId: string, input: CreateBillDto): Promise<Bill> {
    await this.getGroupEntity(ownerId, groupId);
    const person = await this.database.client.person.findFirst({ where: { id: input.personId, ownerId } });
    if (!person) throw new NotFoundException('Person not found');
    return this.bill(await this.database.client.bill.create({ data: { id: randomUUID(), groupId, personId: input.personId, amount: this.amount(input.amount), description: input.description === undefined ? undefined : this.text(input.description, 'description') } }));
  }
  async updateBill(ownerId: string, id: string, input: UpdateBillDto): Promise<Bill> {
    await this.getBill(ownerId, id);
    if (input.amount === undefined && input.description === undefined) throw new BadRequestException('Provide amount or description');
    return this.bill(await this.database.client.bill.update({ where: { id }, data: { amount: input.amount === undefined ? undefined : this.amount(input.amount), description: input.description === undefined ? undefined : this.text(input.description, 'description') } }));
  }
  async deleteBill(ownerId: string, id: string): Promise<void> { await this.getBill(ownerId, id); await this.database.client.bill.delete({ where: { id } }); }

  private async groupDetail(group: Group) {
    const rows = await this.database.client.bill.findMany({ where: { groupId: group.id }, include: { person: true }, orderBy: { createdAt: 'asc' } });
    const bills = rows.map((row) => this.bill(row));
    const members = new Map<string, { person: Person; totalOwed: number; billCount: number }>();
    for (const row of rows) { const bill = this.bill(row); const person = this.person(row.person); const member = members.get(person.id) ?? { person, totalOwed: 0, billCount: 0 }; member.totalOwed += bill.amount; member.billCount += 1; members.set(person.id, member); }
    return { ...group, bills, totalOwed: bills.reduce((sum, bill) => sum + bill.amount, 0), members: [...members.values()] };
  }
  private async getGroupEntity(ownerId: string, id: string): Promise<Group> { const row = await this.database.client.group.findFirst({ where: { id, ownerId } }); if (!row) throw new NotFoundException('Group not found'); return this.group(row); }
  private async getBill(ownerId: string, id: string): Promise<Bill> { const row = await this.database.client.bill.findFirst({ where: { id, group: { ownerId } } }); if (!row) throw new NotFoundException('Bill not found'); return this.bill(row); }
  private person(row: { id: string; ownerId: string; name: string; profileImageUrl: string | null; createdAt: Date }): Person { return { ...row, profileImageUrl: row.profileImageUrl ?? undefined }; }
  private group(row: { id: string; ownerId: string; name: string; createdAt: Date }): Group { return row; }
  private bill(row: { id: string; groupId: string; personId: string; amount: { toString(): string }; description: string | null; createdAt: Date; updatedAt: Date }): Bill { return { ...row, amount: Number(row.amount), description: row.description ?? undefined }; }
  private text(value: unknown, field: string): string { if (typeof value !== 'string' || !value.trim()) throw new BadRequestException(`${field} is required`); return value.trim(); }
  private amount(value: unknown): number { if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) throw new BadRequestException('amount must be a positive number'); return Math.round(value * 100) / 100; }
  private imageUrl(value: unknown): string | undefined { if (value === undefined) return undefined; if (typeof value !== 'string') throw new BadRequestException('profileImageUrl must be a URL'); try { const url = new URL(value); if (url.protocol !== 'https:') throw new Error(); return url.toString(); } catch { throw new BadRequestException('profileImageUrl must be an HTTPS URL'); } }
}
