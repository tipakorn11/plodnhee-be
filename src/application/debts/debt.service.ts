import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  Bill,
  Group,
  GroupCharge,
  MemberDiscount,
  Person,
} from '../../domain/debts/debt.types.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import type {
  AddGroupMemberDto,
  CreateBillDto,
  CreateGroupChargeDto,
  CreateGroupDto,
  CreateMemberDiscountDto,
  CreatePersonDto,
  UpdateBillDto,
} from './dto/debt.dto.js';

type PersonRow = {
  id: string;
  ownerId: string;
  name: string;
  profileImageUrl: string | null;
  createdAt: Date;
};
type BillRow = {
  id: string;
  groupId: string;
  personId: string;
  amount: { toString(): string };
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  person: PersonRow;
};
type GroupMemberRow = {
  personId: string;
  balance: { toString(): string };
  paymentStatus: string;
  person: PersonRow;
};
type GroupChargeRow = {
  id: string;
  groupId: string;
  amountPerPerson: { toString(): string };
  description: string | null;
  createdBy: string | null;
  createdAt: Date;
};
type MemberDiscountRow = {
  id: string;
  groupId: string;
  personId: string;
  amount: { toString(): string };
  description: string | null;
  createdBy: string | null;
  createdAt: Date;
};

@Injectable()
export class DebtService {
  constructor(private readonly database: PrismaService) {}

  async createPerson(ownerId: string, input: CreatePersonDto): Promise<Person> {
    const row = await this.database.client.person.create({
      data: {
        id: randomUUID(),
        ownerId,
        name: this.text(input.name, 'name'),
        profileImageUrl: this.imageUrl(input.profileImageUrl),
      },
    });
    return this.person(row);
  }
  async listPeople(ownerId: string): Promise<Person[]> {
    return (
      await this.database.client.person.findMany({
        where: { ownerId },
        orderBy: { createdAt: 'asc' },
      })
    ).map((row) => this.person(row));
  }
  async createGroup(ownerId: string, input: CreateGroupDto): Promise<Group> {
    const memberIds = this.memberIds(input.memberIds);
    if (memberIds.length) await this.assertPeopleOwned(ownerId, memberIds);
    return this.group(
      await this.database.client.group.create({
        data: {
          id: randomUUID(),
          ownerId,
          name: this.text(input.name, 'name'),
          members: {
            create: memberIds.map((personId) => ({
              id: randomUUID(),
              personId,
            })),
          },
        },
      }),
    );
  }
  async listGroups(ownerId: string) {
    const groups = await this.database.client.group.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
      include: {
        bills: { include: { person: true }, orderBy: { createdAt: 'asc' } },
        members: { include: { person: true }, orderBy: { createdAt: 'asc' } },
        charges: { orderBy: { createdAt: 'asc' } },
        discounts: { orderBy: { createdAt: 'asc' } },
      },
    });
    return groups.map(({ bills, members, charges, discounts, ...group }) =>
      this.groupDetailFromRows(this.group(group), bills, members, charges, discounts),
    );
  }
  async getGroup(ownerId: string, id: string) {
    return this.groupDetail(await this.getGroupEntity(ownerId, id));
  }
  async createBill(
    ownerId: string,
    groupId: string,
    input: CreateBillDto,
  ): Promise<Bill> {
    await this.getGroupEntity(ownerId, groupId);
    const person = await this.database.client.person.findFirst({
      where: { id: input.personId, ownerId },
    });
    if (!person) throw new NotFoundException('Person not found');
    const amount = this.amount(input.amount);
    return this.database.client.$transaction(async (tx) => {
      await tx.groupMember.upsert({
        where: { groupId_personId: { groupId, personId: input.personId } },
        create: { id: randomUUID(), groupId, personId: input.personId },
        update: {},
      });
      const bill = await tx.bill.create({
        data: {
          id: randomUUID(),
          groupId,
          personId: input.personId,
          amount,
          description:
            input.description === undefined
              ? undefined
              : this.text(input.description, 'description'),
        },
      });
      await tx.group.update({
        where: { id: groupId },
        data: { totalOwed: { increment: amount } },
      });
      return this.bill(bill);
    });
  }
  async updateBill(
    ownerId: string,
    id: string,
    input: UpdateBillDto,
  ): Promise<Bill> {
    const existing = await this.getBill(ownerId, id);
    if (input.amount === undefined && input.description === undefined)
      throw new BadRequestException('Provide amount or description');
    const amount =
      input.amount === undefined ? undefined : this.amount(input.amount);
    return this.database.client.$transaction(async (tx) => {
      const bill = await tx.bill.update({
        where: { id },
        data: {
          amount,
          description:
            input.description === undefined
              ? undefined
              : this.text(input.description, 'description'),
        },
      });
      if (amount !== undefined)
        await tx.group.update({
          where: { id: existing.groupId },
          data: { totalOwed: { increment: amount - existing.amount } },
        });
      return this.bill(bill);
    });
  }
  async deleteBill(ownerId: string, id: string): Promise<void> {
    const bill = await this.getBill(ownerId, id);
    await this.database.client.$transaction([
      this.database.client.bill.delete({ where: { id } }),
      this.database.client.group.update({
        where: { id: bill.groupId },
        data: { totalOwed: { decrement: bill.amount } },
      }),
    ]);
  }

  async addGroupMember(
    ownerId: string,
    groupId: string,
    input: AddGroupMemberDto,
  ) {
    await this.getGroupEntity(ownerId, groupId);
    const personId = this.personId(input.personId);
    await this.assertPeopleOwned(ownerId, [personId]);
    return this.database.client.groupMember.upsert({
      where: { groupId_personId: { groupId, personId } },
      create: { id: randomUUID(), groupId, personId },
      update: {},
      include: { person: true },
    });
  }

  /** Adds the same positive amount to every current member in one atomic ledger update. */
  async createGroupCharge(
    ownerId: string,
    groupId: string,
    input: CreateGroupChargeDto,
  ): Promise<GroupCharge> {
    const amountPerPerson = this.amount(
      input.amountPerPerson,
      'amountPerPerson',
    );
    const description =
      input.description === undefined
        ? undefined
        : this.text(input.description, 'description');
    const createdBy =
      input.createdBy === undefined
        ? undefined
        : this.text(input.createdBy, 'createdBy');
    return this.database.client.$transaction(async (tx) => {
      const group = await tx.group.findFirst({
        where: { id: groupId, ownerId },
        include: { members: { select: { id: true } } },
      });
      if (!group) throw new NotFoundException('Group not found');
      if (!group.members.length)
        throw new BadRequestException(
          'Group must have at least one member before adding a charge',
        );
      const charge = await tx.groupCharge.create({
        data: {
          id: randomUUID(),
          groupId,
          amountPerPerson,
          description,
          createdBy,
        },
      });
      const updatedMembers = await tx.groupMember.updateMany({
        where: { groupId },
        data: {
          balance: { increment: amountPerPerson },
          paymentStatus: 'PENDING',
        },
      });
      await tx.group.update({
        where: { id: groupId },
        data: {
          totalOwed: { increment: amountPerPerson * updatedMembers.count },
        },
      });
      return this.charge(charge);
    });
  }

  /** Discounts remain a person-level operation; they never create a group-wide charge. */
  async createMemberDiscount(
    ownerId: string,
    groupId: string,
    personId: string,
    input: CreateMemberDiscountDto,
  ): Promise<MemberDiscount> {
    const amount = this.amount(input.amount);
    const description =
      input.description === undefined
        ? undefined
        : this.text(input.description, 'description');
    const createdBy =
      input.createdBy === undefined
        ? undefined
        : this.text(input.createdBy, 'createdBy');
    return this.database.client.$transaction(async (tx) => {
      const group = await tx.group.findFirst({
        where: { id: groupId, ownerId },
      });
      if (!group) throw new NotFoundException('Group not found');
      const member = await tx.groupMember.findUnique({
        where: { groupId_personId: { groupId, personId } },
      });
      if (!member) throw new NotFoundException('Group member not found');
      const discount = await tx.memberDiscount.create({
        data: {
          id: randomUUID(),
          groupId,
          personId,
          amount,
          description,
          createdBy,
        },
      });
      await tx.groupMember.update({
        where: { id: member.id },
        data: { balance: { decrement: amount }, paymentStatus: 'PENDING' },
      });
      await tx.group.update({
        where: { id: groupId },
        data: { totalOwed: { decrement: amount } },
      });
      return this.discount(discount);
    });
  }

  private async groupDetail(group: Group) {
    const [rows, memberRows, chargeRows, discountRows] = await Promise.all([
      this.database.client.bill.findMany({
        where: { groupId: group.id },
        include: { person: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.database.client.groupMember.findMany({
        where: { groupId: group.id },
        include: { person: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.database.client.groupCharge.findMany({
        where: { groupId: group.id },
        orderBy: { createdAt: 'asc' },
      }),
      this.database.client.memberDiscount.findMany({
        where: { groupId: group.id },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return this.groupDetailFromRows(group, rows, memberRows, chargeRows, discountRows);
  }
  private groupDetailFromRows(
    group: Group,
    rows: BillRow[],
    memberRows: GroupMemberRow[],
    chargeRows: GroupChargeRow[],
    discountRows: MemberDiscountRow[],
  ) {
    const bills = rows.map((row) => this.bill(row));
    const members = new Map<
      string,
      {
        person: Person;
        totalOwed: number;
        billCount: number;
        balance: number;
        paymentStatus: string;
      }
    >();
    for (const row of memberRows)
      members.set(row.personId, {
        person: this.person(row.person),
        totalOwed: Number(row.balance),
        billCount: 0,
        balance: Number(row.balance),
        paymentStatus: row.paymentStatus,
      });
    for (const row of rows) {
      const bill = this.bill(row);
      const person = this.person(row.person);
      const member = members.get(person.id) ?? {
        person,
        totalOwed: 0,
        billCount: 0,
        balance: 0,
        paymentStatus: 'PAID',
      };
      member.totalOwed += bill.amount;
      member.billCount += 1;
      members.set(person.id, member);
    }
    return {
      ...group,
      bills,
      charges: chargeRows.map((row) => this.charge(row)),
      discounts: discountRows.map((row) => this.discount(row)),
      members: [...members.values()],
    };
  }
  private async getGroupEntity(ownerId: string, id: string): Promise<Group> {
    const row = await this.database.client.group.findFirst({
      where: { id, ownerId },
    });
    if (!row) throw new NotFoundException('Group not found');
    return this.group(row);
  }
  private async getBill(ownerId: string, id: string): Promise<Bill> {
    const row = await this.database.client.bill.findFirst({
      where: { id, group: { ownerId } },
    });
    if (!row) throw new NotFoundException('Bill not found');
    return this.bill(row);
  }
  private person(row: {
    id: string;
    ownerId: string;
    name: string;
    profileImageUrl: string | null;
    createdAt: Date;
  }): Person {
    return { ...row, profileImageUrl: row.profileImageUrl ?? undefined };
  }
  private group(row: {
    id: string;
    ownerId: string;
    name: string;
    totalOwed: { toString(): string };
    createdAt: Date;
  }): Group {
    return { ...row, totalOwed: Number(row.totalOwed) };
  }
  private bill(row: {
    id: string;
    groupId: string;
    personId: string;
    amount: { toString(): string };
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Bill {
    return {
      ...row,
      amount: Number(row.amount),
      description: row.description ?? undefined,
    };
  }
  private text(value: unknown, field: string): string {
    if (typeof value !== 'string' || !value.trim())
      throw new BadRequestException(`${field} is required`);
    return value.trim();
  }
  private charge(row: {
    id: string;
    groupId: string;
    amountPerPerson: { toString(): string };
    description: string | null;
    createdBy: string | null;
    createdAt: Date;
  }): GroupCharge {
    return {
      ...row,
      amountPerPerson: Number(row.amountPerPerson),
      description: row.description ?? undefined,
      createdBy: row.createdBy ?? undefined,
    };
  }
  private discount(row: {
    id: string;
    groupId: string;
    personId: string;
    amount: { toString(): string };
    description: string | null;
    createdBy: string | null;
    createdAt: Date;
  }): MemberDiscount {
    return {
      ...row,
      amount: Number(row.amount),
      description: row.description ?? undefined,
      createdBy: row.createdBy ?? undefined,
    };
  }
  private amount(value: unknown, field = 'amount'): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
      throw new BadRequestException(`${field} must be a positive number`);
    return Math.round(value * 100) / 100;
  }
  private personId(value: unknown): string {
    if (typeof value !== 'string' || !value.trim())
      throw new BadRequestException('personId is required');
    return value;
  }
  private memberIds(value: unknown): string[] {
    if (value === undefined) return [];
    if (!Array.isArray(value))
      throw new BadRequestException('memberIds must be an array');
    const ids = value.map((id) => this.personId(id));
    if (new Set(ids).size !== ids.length)
      throw new BadRequestException('memberIds must not contain duplicates');
    return ids;
  }
  private async assertPeopleOwned(
    ownerId: string,
    personIds: string[],
  ): Promise<void> {
    const count = await this.database.client.person.count({
      where: { ownerId, id: { in: personIds } },
    });
    if (count !== personIds.length)
      throw new NotFoundException('Person not found');
  }
  private imageUrl(value: unknown): string | undefined {
    if (value === undefined) return undefined;
    if (typeof value !== 'string')
      throw new BadRequestException('profileImageUrl must be a URL');
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') throw new Error();
      return url.toString();
    } catch {
      throw new BadRequestException('profileImageUrl must be an HTTPS URL');
    }
  }
}
