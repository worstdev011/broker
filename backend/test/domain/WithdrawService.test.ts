/**
 * Domain tests: WithdrawService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WithdrawService } from '../../src/domain/finance/WithdrawService.js';
import { mockAccountRepository } from '../helpers/mocks.js';
import { mockTransactionRepository } from '../helpers/mocks.js';
import { createTestAccount } from '../helpers/factories.js';
import { AccountType } from '../../src/domain/accounts/AccountTypes.js';
import { PaymentMethod } from '../../src/domain/finance/TransactionTypes.js';
import type { UserRepository } from '../../src/ports/repositories/UserRepository.js';
import type { TwoFactorService } from '../../src/domain/user/TwoFactorService.js';

const TEST_PAN = '4111111111111111';

describe('WithdrawService', () => {
  let withdrawService: WithdrawService;
  let accountRepository: ReturnType<typeof mockAccountRepository>;
  let transactionRepository: ReturnType<typeof mockTransactionRepository>;
  let createWithdrawal: ReturnType<typeof vi.fn>;
  let userRepository: Pick<UserRepository, 'findById'>;
  let twoFactorService: Pick<TwoFactorService, 'verifyToken'>;

  beforeEach(() => {
    accountRepository = mockAccountRepository();
    transactionRepository = mockTransactionRepository();
    createWithdrawal = vi.fn().mockResolvedValue({ id: 42, status: 'success' });
    userRepository = {
      findById: vi.fn().mockResolvedValue({
        id: 'user-1',
        twoFactorEnabled: false,
        twoFactorSecret: null,
      }),
    };
    twoFactorService = {
      verifyToken: vi.fn(),
    };
    withdrawService = new WithdrawService(
      accountRepository,
      transactionRepository,
      userRepository as UserRepository,
      twoFactorService as TwoFactorService,
      () =>
        ({ createWithdrawal } as unknown as import('../../src/services/BetaTransferService.js').BetaTransferService),
    );
  });

  it('should reject amount below 300', async () => {
    await expect(
      withdrawService.withdraw({
        userId: 'user-1',
        amount: 100,
        cardNumber: TEST_PAN,
        paymentMethod: PaymentMethod.CARD,
      }),
    ).rejects.toThrow(/300.*29999/);
  });

  it('should reject amount above 29999', async () => {
    await expect(
      withdrawService.withdraw({
        userId: 'user-1',
        amount: 30_000,
        cardNumber: TEST_PAN,
        paymentMethod: PaymentMethod.CARD,
      }),
    ).rejects.toThrow(/300.*29999/);
  });

  it('should reject invalid card', async () => {
    await expect(
      withdrawService.withdraw({
        userId: 'user-1',
        amount: 500,
        cardNumber: '123',
        paymentMethod: PaymentMethod.CARD,
      }),
    ).rejects.toThrow(/Valid card number/);
  });

  it('should reject when insufficient balance', async () => {
    const realAccount = createTestAccount({
      id: 'real-1',
      userId: 'user-1',
      type: AccountType.REAL,
      balance: 100,
    });
    accountRepository.getRealAccount = async () => realAccount;

    await expect(
      withdrawService.withdraw({
        userId: 'user-1',
        amount: 500,
        cardNumber: TEST_PAN,
        paymentMethod: PaymentMethod.CARD,
      }),
    ).rejects.toThrow('Insufficient balance');
  });

  it('should create pending withdraw, freeze balance, call BetaTransfer', async () => {
    const realAccount = createTestAccount({
      id: 'real-1',
      userId: 'user-1',
      type: AccountType.REAL,
      balance: 5000,
    });
    accountRepository.getRealAccount = async () => realAccount;
    transactionRepository.create = async (data) =>
      ({
        ...data,
        id: 'tx-w1',
        provider: data.provider ?? null,
        externalId: null,
        externalStatus: null,
        cardLastFour: data.cardLastFour ?? null,
        createdAt: new Date(),
        confirmedAt: null,
      }) as import('../../src/domain/finance/TransactionTypes.js').Transaction;
    transactionRepository.findById = async () =>
      ({
        id: 'tx-w1',
        userId: 'user-1',
        accountId: 'real-1',
        type: 'WITHDRAW',
        status: 'PENDING',
        amount: -500,
        currency: 'UAH',
        paymentMethod: 'CARD',
        provider: 'betatransfer',
        externalId: '42',
        externalStatus: 'success',
        cardLastFour: '****1111',
        createdAt: new Date(),
        confirmedAt: null,
      }) as import('../../src/domain/finance/TransactionTypes.js').Transaction;

    let balanceAfterFreeze = 5000;
    accountRepository.updateBalance = vi.fn(async (_id, delta) => {
      balanceAfterFreeze += delta;
      return { ...realAccount, balance: balanceAfterFreeze } as any;
    });

    const result = await withdrawService.withdraw({
      userId: 'user-1',
      amount: 500,
      cardNumber: TEST_PAN,
      paymentMethod: PaymentMethod.CARD,
    });

    expect(result.amount).toBe(500);
    expect(createWithdrawal).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 500,
        orderId: 'tx-w1',
        cardNumber: TEST_PAN,
      }),
    );
    expect(accountRepository.updateBalance).toHaveBeenCalledWith('real-1', -500);
    expect(balanceAfterFreeze).toBe(4500);
  });
});
