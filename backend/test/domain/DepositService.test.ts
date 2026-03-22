/**
 * Domain tests: DepositService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DepositService } from '../../src/domain/finance/DepositService.js';
import { mockAccountRepository } from '../helpers/mocks.js';
import { mockTransactionRepository } from '../helpers/mocks.js';
import { createTestAccount } from '../helpers/factories.js';
import { AccountType } from '../../src/domain/accounts/AccountTypes.js';
import { PaymentMethod } from '../../src/domain/finance/TransactionTypes.js';
import { TransactionStatus } from '../../src/domain/finance/TransactionTypes.js';

describe('DepositService', () => {
  let depositService: DepositService;
  let accountRepository: ReturnType<typeof mockAccountRepository>;
  let transactionRepository: ReturnType<typeof mockTransactionRepository>;
  let createPayment: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    accountRepository = mockAccountRepository();
    transactionRepository = mockTransactionRepository();
    createPayment = vi.fn().mockResolvedValue('https://merchant.betatransfer.io/pay');
    depositService = new DepositService(accountRepository, transactionRepository, () =>
      ({ createPayment } as unknown as import('../../src/services/BetaTransferService.js').BetaTransferService),
    );
  });

  it('should reject amount below 300', async () => {
    await expect(
      depositService.deposit({
        userId: 'user-1',
        amount: 100,
        paymentMethod: PaymentMethod.CARD,
      }),
    ).rejects.toThrow(/300.*29999/);
  });

  it('should reject amount above 29999', async () => {
    await expect(
      depositService.deposit({
        userId: 'user-1',
        amount: 30_000,
        paymentMethod: PaymentMethod.CARD,
      }),
    ).rejects.toThrow(/300.*29999/);
  });

  it('should create pending deposit and return paymentUrl', async () => {
    const realAccount = createTestAccount({
      id: 'real-1',
      userId: 'user-1',
      type: AccountType.REAL,
      balance: 0,
    });
    accountRepository.getRealAccount = async () => realAccount;
    transactionRepository.create = async (data) =>
      ({
        ...data,
        id: 'tx-1',
        provider: data.provider ?? null,
        externalId: null,
        externalStatus: null,
        cardLastFour: null,
        createdAt: new Date(),
        confirmedAt: null,
      }) as import('../../src/domain/finance/TransactionTypes.js').Transaction;

    const result = await depositService.deposit({
      userId: 'user-1',
      amount: 500,
      paymentMethod: PaymentMethod.CARD,
    });

    expect(result.status).toBe(TransactionStatus.PENDING);
    expect(result.paymentUrl).toBe('https://merchant.betatransfer.io/pay');
    expect(result.transactionId).toBe('tx-1');
    expect(createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 500,
        orderId: 'tx-1',
        payerId: 'user-1',
      }),
    );
  });
});
