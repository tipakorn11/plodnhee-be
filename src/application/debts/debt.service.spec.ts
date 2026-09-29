import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { DebtService } from './debt.service.js';

describe('DebtService.createGroupCharge', () => {
  it('writes the charge, every member balance/status, and group total in one transaction', async () => {
    const tx = {
      group: { findFirst: vi.fn().mockResolvedValue({ id: 'group-1', members: [{ id: 'member-1' }, { id: 'member-2' }] }), update: vi.fn().mockResolvedValue({}) },
      groupCharge: { create: vi.fn().mockResolvedValue({ id: 'charge-1', groupId: 'group-1', amountPerPerson: 25, description: 'Lunch', createdBy: 'user-1', createdAt: new Date() }) },
      groupMember: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
    };
    const database = { client: { $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) } };
    const service = new DebtService(database as never);

    await expect(service.createGroupCharge('user-1', 'group-1', { amountPerPerson: 25, description: 'Lunch', createdBy: 'user-1' })).resolves.toMatchObject({ id: 'charge-1', amountPerPerson: 25 });

    expect(database.client.$transaction).toHaveBeenCalledOnce();
    expect(tx.groupCharge.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ groupId: 'group-1', amountPerPerson: 25 }) }));
    expect(tx.groupMember.updateMany).toHaveBeenCalledWith({ where: { groupId: 'group-1' }, data: { balance: { increment: 25 }, paymentStatus: 'PENDING' } });
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
