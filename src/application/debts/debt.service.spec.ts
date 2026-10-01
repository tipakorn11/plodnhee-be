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

    await expect(service.createGroupCharge('user-1', 'group-1', { totalAmount: 50, description: 'Lunch', createdBy: 'user-1' })).resolves.toMatchObject({ id: 'charge-1', amountPerPerson: 25 });

    expect(database.client.$transaction).toHaveBeenCalledOnce();
    expect(tx.groupCharge.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ groupId: 'group-1', amountPerPerson: 25 }) }));
    expect(tx.bill.createMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.arrayContaining([expect.objectContaining({ groupId: 'group-1', personId: 'person-1', amount: 25 })]) }));
    expect(tx.group.update).toHaveBeenCalledWith({ where: { id: 'group-1' }, data: { totalOwed: { increment: 50 } } });
  });

  it('rejects a group without members before writing any ledger rows', async () => {
    const tx = { group: { findFirst: vi.fn().mockResolvedValue({ id: 'group-1', members: [] }) } };
    const database = { client: { $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) } };
    const service = new DebtService(database as never);

    await expect(service.createGroupCharge('user-1', 'group-1', { totalAmount: 50 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not authorize a charge for a group the caller cannot edit', async () => {
    const tx = { group: { findFirst: vi.fn().mockResolvedValue(null) } };
    const database = { client: { $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) } };
    const service = new DebtService(database as never);

    await expect(service.createGroupCharge('other-user', 'group-1', { totalAmount: 50 })).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('DebtService.deleteGroup', () => {
  it('deletes only a group owned by the caller', async () => {
    const database = { client: {
      group: {
        findFirst: vi.fn().mockResolvedValue({ id: 'group-1', ownerId: 'user-1', name: 'Trip', totalOwed: 0, createdAt: new Date() }),
        delete: vi.fn().mockResolvedValue({}),
      },
    } };
    const service = new DebtService(database as never);

    await expect(service.deleteGroup('user-1', 'group-1')).resolves.toBeUndefined();

    expect(database.client.group.findFirst).toHaveBeenCalledWith({ where: { id: 'group-1', ownerId: 'user-1' } });
    expect(database.client.group.delete).toHaveBeenCalledWith({ where: { id: 'group-1' } });
  });
});

describe('DebtService.payGroupBills', () => {
  it('reduces a selected bill when the member makes a partial payment', async () => {
    const tx = {
      bill: {
        findMany: vi.fn().mockResolvedValue([{ id: 'bill-1', amount: 100 }]),
        update: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn(),
        aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 60 } }),
      },
      group: { update: vi.fn().mockResolvedValue({}) },
      groupMember: { updateMany: vi.fn().mockResolvedValue({}) },
    };
    const database = { client: {
      group: { findFirst: vi.fn().mockResolvedValue({ id: 'group-1', ownerId: 'user-1', name: 'Trip', totalOwed: 100, createdAt: new Date() }) },
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    } };
    const service = new DebtService(database as never);

    await expect(service.payGroupBills('user-1', 'group-1', 'person-1', { scope: 'one', billId: 'bill-1', amount: 40 })).resolves.toMatchObject({ totalPaid: 40 });

    expect(tx.bill.update).toHaveBeenCalledWith({ where: { id: 'bill-1' }, data: { amount: { decrement: 40 } } });
    expect(tx.bill.updateMany).not.toHaveBeenCalled();
    expect(tx.group.update).toHaveBeenCalledWith({ where: { id: 'group-1' }, data: { totalOwed: { decrement: 40 } } });
  });
});
