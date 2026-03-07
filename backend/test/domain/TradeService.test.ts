/**
 * Domain tests: TradeService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TradeService } from '../../src/domain/trades/TradeService.js';
import { TradeDirection } from '../../src/domain/trades/TradeTypes.js';
import {
  InvalidTradeAmountError,
  InsufficientBalanceError,
  InvalidExpirationError,
} from '../../src/domain/trades/TradeErrors.js';
import { AccountNotFoundError, UnauthorizedAccountAccessError } from '../../src/domain/accounts/AccountErrors.js';
import { mockPriceProvider } from '../helpers/mocks.js';
import { mockAccountRepository } from '../helpers/mocks.js';
import { mockTradeRepository } from '../helpers/mocks.js';
import { createTestAccount } from '../helpers/factories.js';
import { AccountType } from '../../src/domain/accounts/AccountTypes.js';

describe('TradeService', () => {
  let tradeService: TradeService;
  let accountRepository: ReturnType<typeof mockAccountRepository>;
  let tradeRepository: ReturnType<typeof mockTradeRepository>;
  let priceProvider: ReturnType<typeof mockPriceProvider>;

  beforeEach(() => {
    accountRepository = mockAccountRepository();
    tradeRepository = mockTradeRepository();
    priceProvider = mockPriceProvider();
    tradeService = new TradeService(tradeRepository, accountRepository, priceProvider);
  });

  describe('openTrade', () => {
    const userId = 'user-1';
    const accountId = 'account-1';

    it('should open trade and decrease balance', async () => {
      // Setup: active account with balance
      const account = createTestAccount({
        id: accountId,
        userId,
        balance: 1000,
        isActive: true,
      });

      accountRepository.findById = async (id: string) => {
        if (id === accountId) return account;
        return null;
      };
      accountRepository.updateBalance = async (id: string, delta: number) => {
        expect(id).toBe(accountId);
        expect(delta).toBe(-100); // Amount deducted
      };

      priceProvider.getCurrentPrice = async () => ({ price: 50000, timestamp: Date.now() });

      // Execute
      const trade = await tradeService.openTrade({
        userId,
        accountId,
        direction: TradeDirection.CALL,
        amount: 100,
        expirationSeconds: 30,
        instrument: 'EURUSD_OTC',
      });

      // Assert
      expect(trade).toBeDefined();
      expect(trade.direction).toBe(TradeDirection.CALL);
      expect(trade.amount.toString()).toBe('100');
      expect(trade.status).toBe('OPEN');
    });

    it('should throw InvalidTradeAmountError for zero amount', async () => {
      const account = createTestAccount({ id: accountId, userId, isActive: true });
      accountRepository.findById = async (id: string) => {
        if (id === accountId) return account;
        return null;
      };

      await expect(
        tradeService.openTrade({
          userId,
          accountId,
          direction: TradeDirection.CALL,
          amount: 0,
          expirationSeconds: 30,
          instrument: 'EURUSD_OTC',
        }),
      ).rejects.toThrow(InvalidTradeAmountError);
    });

    it('should throw InvalidTradeAmountError for negative amount', async () => {
      const account = createTestAccount({ id: accountId, userId, isActive: true });
      accountRepository.findById = async (id: string) => {
        if (id === accountId) return account;
        return null;
      };

      await expect(
        tradeService.openTrade({
          userId,
          accountId,
          direction: TradeDirection.CALL,
          amount: -10,
          expirationSeconds: 30,
          instrument: 'EURUSD_OTC',
        }),
      ).rejects.toThrow(InvalidTradeAmountError);
    });

    it('should throw InsufficientBalanceError when balance is too low', async () => {
      const account = createTestAccount({
        id: accountId,
        userId,
        balance: 50, // Less than amount
        isActive: true,
      });
      accountRepository.findById = async (id: string) => {
        if (id === accountId) return account;
        return null;
      };

      await expect(
        tradeService.openTrade({
          userId,
          accountId,
          direction: TradeDirection.CALL,
          amount: 100,
          expirationSeconds: 30,
          instrument: 'EURUSD_OTC',
        }),
      ).rejects.toThrow(InsufficientBalanceError);
    });

    it('should throw AccountNotFoundError when account does not exist', async () => {
      accountRepository.findById = async () => null;

      await expect(
        tradeService.openTrade({
          userId,
          accountId,
          direction: TradeDirection.CALL,
          amount: 100,
          expirationSeconds: 30,
          instrument: 'EURUSD_OTC',
        }),
      ).rejects.toThrow(AccountNotFoundError);
    });

    it('should throw UnauthorizedAccountAccessError when account belongs to different user', async () => {
      const account = createTestAccount({
        id: accountId,
        userId: 'different-user', // Different user
        isActive: true,
      });
      accountRepository.findById = async (id: string) => {
        if (id === accountId) return account;
        return null;
      };

      await expect(
        tradeService.openTrade({
          userId,
          accountId,
          direction: TradeDirection.CALL,
          amount: 100,
          expirationSeconds: 30,
          instrument: 'EURUSD_OTC',
        }),
      ).rejects.toThrow(UnauthorizedAccountAccessError);
    });

    it('should throw InvalidExpirationError for expiration less than 5 seconds', async () => {
      const account = createTestAccount({ id: accountId, userId, isActive: true });
      accountRepository.findById = async (id: string) => {
        if (id === accountId) return account;
        return null;
      };

      await expect(
        tradeService.openTrade({
          userId,
          accountId,
          direction: TradeDirection.CALL,
          amount: 100,
          expirationSeconds: 4, // Less than 5
          instrument: 'EURUSD_OTC',
        }),
      ).rejects.toThrow(InvalidExpirationError);
    });

    it('should throw InvalidExpirationError for expiration not multiple of 5', async () => {
      const account = createTestAccount({ id: accountId, userId, isActive: true });
      accountRepository.findById = async (id: string) => {
        if (id === accountId) return account;
        return null;
      };

      await expect(
        tradeService.openTrade({
          userId,
          accountId,
          direction: TradeDirection.CALL,
          amount: 100,
          expirationSeconds: 13, // Not multiple of 5
          instrument: 'EURUSD_OTC',
        }),
      ).rejects.toThrow(InvalidExpirationError);
    });
  });
});
