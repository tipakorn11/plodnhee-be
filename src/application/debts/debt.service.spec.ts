import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { DebtService } from './debt.service.js';

describe('DebtService.createGroupCharge', () => {
  it('writes one payable bill for every member and the group total in one transaction', async () => {
    const tx = {
      group: { findFirst: vi.fn().mockResolvedValue({ id: 'group-1', members: [{ personId: 'person-1' }, { personId: 'person-2' }] }), update: vi.fn().mockResolvedValue({}) },
      groupCharge: { create: vi.fn().mockResolvedValue({ id: 'charge-1', groupId: 'group-1', amountPerPerson: 25, description: 'Lunch', createdBy: 'user-1', createdAt: new Date() }) },
      bill: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
    };
    const database = { client: { $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) } };
    const service = new DebtService(database as never);

    await expect(service.createGroupCharge('user-1', 'group-1', { amountPerPerson: 25, description: 'Lunch', createdBy: 'user-1' })).resolves.toMatchObject({ id: 'charge-1', amountPerPerson: 25 });

    expect(database.client.$transaction).toHaveBeenCalledOnce();
    expect(tx.groupCharge.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ groupId: 'group-1', amountPerPerson: 25 }) }));
    expect(tx.bill.createMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.arrayContaining([expect.objectContaining({ groupId: 'group-1', personId: 'person-1', amount: 25 })]) }));
    expect(tx.group.update).toHaveBeenCalledWith({ where: { id: 'group-1' }, data: { totalOwed: { increment: 50 } } });
  });

  it('rejects a group without members before writing any ledger rows', async () => {
    const tx = { group: { findFirst: vi.fn().mockResolvedValue({ id: 'group-1', members: [] }) } };
    const database = { client: { $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) } };
    const service = new DebtService(database as never);

    await expect(service.createGroupCharge('user-1', 'group-1', { amountPerPerson: 25 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not authorize a charge for a group the caller cannot edit', async () => {
    const tx = { group: { findFirst: vi.fn().mockResolvedValue(null) } };
    const database = { client: { $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) } };
    const service = new DebtService(database as never);

    await expect(service.createGroupCharge('other-user', 'group-1', { amountPerPerson: 25 })).rejects.toBeInstanceOf(NotFoundException);
  });
});
