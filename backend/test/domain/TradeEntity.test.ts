/**
 * Domain tests: TradeEntity
 */

import { describe, it, expect } from 'vitest';
import { TradeEntity } from '../../src/domain/trades/TradeEntity.js';
import { TradeDirection, TradeStatus } from '../../src/domain/trades/TradeTypes.js';

describe('TradeEntity', () => {
  const baseTrade = {
    id: 'trade-1',
    userId: 'user-1',
    accountId: 'account-1',
    direction: TradeDirection.CALL,
    instrument: 'EURUSD_OTC',
    amount: 100,
    entryPrice: 50000,
    payout: 0.8,
    status: TradeStatus.OPEN,
    openedAt: new Date(),
    expiresAt: new Date(Date.now() + 30000),
    closedAt: null,
  };

  describe('determineResult', () => {
    it('should return WIN for CALL when exitPrice > entryPrice', () => {
      const entity = new TradeEntity(
        baseTrade.id,
        baseTrade.userId,
        baseTrade.accountId,
        TradeDirection.CALL,
        baseTrade.instrument,
        baseTrade.amount,
        baseTrade.entryPrice,
        50100, // exit > entry
        baseTrade.payout,
        TradeStatus.OPEN,
        baseTrade.openedAt,
        baseTrade.expiresAt,
        new Date()
      );
      expect(entity.determineResult()).toBe(TradeStatus.WIN);
    });

    it('should return LOSS for CALL when exitPrice < entryPrice', () => {
      const entity = new TradeEntity(
        baseTrade.id,
        baseTrade.userId,
        baseTrade.accountId,
        TradeDirection.CALL,
        baseTrade.instrument,
        baseTrade.amount,
        baseTrade.entryPrice,
        49900, // exit < entry
        baseTrade.payout,
        TradeStatus.OPEN,
        baseTrade.openedAt,
        baseTrade.expiresAt,
        new Date()
      );
      expect(entity.determineResult()).toBe(TradeStatus.LOSS);
    });

    it('should return WIN for PUT when exitPrice < entryPrice', () => {
      const entity = new TradeEntity(
        baseTrade.id,
        baseTrade.userId,
        baseTrade.accountId,
        TradeDirection.PUT,
        baseTrade.instrument,
        baseTrade.amount,
        baseTrade.entryPrice,
        49900, // exit < entry
        baseTrade.payout,
        TradeStatus.OPEN,
        baseTrade.openedAt,
        baseTrade.expiresAt,
        new Date()
      );
      expect(entity.determineResult()).toBe(TradeStatus.WIN);
    });

    it('should return LOSS for PUT when exitPrice > entryPrice', () => {
      const entity = new TradeEntity(
        baseTrade.id,
        baseTrade.userId,
        baseTrade.accountId,
        TradeDirection.PUT,
        baseTrade.instrument,
        baseTrade.amount,
        baseTrade.entryPrice,
        50100, // exit > entry
        baseTrade.payout,
        TradeStatus.OPEN,
        baseTrade.openedAt,
        baseTrade.expiresAt,
        new Date()
      );
      expect(entity.determineResult()).toBe(TradeStatus.LOSS);
    });

    it('should return TIE when exitPrice === entryPrice', () => {
      const entity = new TradeEntity(
        baseTrade.id,
        baseTrade.userId,
        baseTrade.accountId,
        TradeDirection.CALL,
        baseTrade.instrument,
        baseTrade.amount,
        baseTrade.entryPrice,
        50000, // exit === entry
        baseTrade.payout,
        TradeStatus.OPEN,
        baseTrade.openedAt,
        baseTrade.expiresAt,
        new Date()
      );
      expect(entity.determineResult()).toBe(TradeStatus.TIE);
    });

    it('should throw when exitPrice is null', () => {
      const entity = new TradeEntity(
        baseTrade.id,
        baseTrade.userId,
        baseTrade.accountId,
        TradeDirection.CALL,
        baseTrade.instrument,
        baseTrade.amount,
        baseTrade.entryPrice,
        null,
        baseTrade.payout,
        TradeStatus.OPEN,
        baseTrade.openedAt,
        baseTrade.expiresAt,
        null
      );
      expect(() => entity.determineResult()).toThrow('Cannot determine result');
    });
  });

  describe('calculatePayoutAmount', () => {
    it('should return amount * payout percentage', () => {
      const entity = new TradeEntity(
        baseTrade.id,
        baseTrade.userId,
        baseTrade.accountId,
        TradeDirection.CALL,
        baseTrade.instrument,
        100,
        baseTrade.entryPrice,
        null,
        0.8, // 80%
        TradeStatus.OPEN,
        baseTrade.openedAt,
        baseTrade.expiresAt,
        null
      );
      expect(entity.calculatePayoutAmount()).toBe(80);
    });
  });

  describe('isExpired', () => {
    it('should return false when now < expiresAt', () => {
      const expiresAt = new Date(Date.now() + 10000);
      const entity = new TradeEntity(
        baseTrade.id,
        baseTrade.userId,
        baseTrade.accountId,
        TradeDirection.CALL,
        baseTrade.instrument,
        baseTrade.amount,
        baseTrade.entryPrice,
        null,
        baseTrade.payout,
        TradeStatus.OPEN,
        baseTrade.openedAt,
        expiresAt,
        null
      );
      expect(entity.isExpired(new Date(Date.now()))).toBe(false);
    });

    it('should return true when now >= expiresAt', () => {
      const expiresAt = new Date(Date.now() - 1000);
      const entity = new TradeEntity(
        baseTrade.id,
        baseTrade.userId,
        baseTrade.accountId,
        TradeDirection.CALL,
        baseTrade.instrument,
        baseTrade.amount,
        baseTrade.entryPrice,
        null,
        baseTrade.payout,
        TradeStatus.OPEN,
        baseTrade.openedAt,
        expiresAt,
        null
      );
      expect(entity.isExpired(new Date())).toBe(true);
    });
  });

  describe('isOpen', () => {
    it('should return true when status is OPEN', () => {
      const entity = new TradeEntity(
        baseTrade.id,
        baseTrade.userId,
        baseTrade.accountId,
        TradeDirection.CALL,
        baseTrade.instrument,
        baseTrade.amount,
        baseTrade.entryPrice,
        null,
        baseTrade.payout,
        TradeStatus.OPEN,
        baseTrade.openedAt,
        baseTrade.expiresAt,
        null
      );
      expect(entity.isOpen()).toBe(true);
    });

    it('should return false when status is WIN', () => {
      const entity = new TradeEntity(
        baseTrade.id,
        baseTrade.userId,
        baseTrade.accountId,
        TradeDirection.CALL,
        baseTrade.instrument,
        baseTrade.amount,
        baseTrade.entryPrice,
        50100,
        baseTrade.payout,
        TradeStatus.WIN,
        baseTrade.openedAt,
        baseTrade.expiresAt,
        new Date()
      );
      expect(entity.isOpen()).toBe(false);
    });
  });
});
