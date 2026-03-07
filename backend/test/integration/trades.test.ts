/**
 * Integration tests: Trade flow
 * open → (auto-close) → balance update
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../../src/app.js';
import { bootstrapAll } from '../../src/bootstrap/index.js';
import type { FastifyInstance } from 'fastify';
import { registerAndGetCookie, cookieHeader } from './helpers.js';

describe('Trade Flow Integration', () => {
  let app: FastifyInstance | null = null;

  beforeAll(async () => {
    if (!process.env.PORT) process.env.PORT = '3002';
    if (!process.env.DATABASE_URL)
      process.env.DATABASE_URL = 'postgresql://postgres:ghfjsadf87asd867fa8sdfu2@localhost:5432/im5_test';
    if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test';

    try {
      app = await createApp();
      await bootstrapAll(app);
      await app.ready();
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err?.code === 'P1003' || err?.message?.includes('does not exist')) {
        console.warn('⚠️  Skipping trade integration tests - database not available');
        return;
      }
      throw error;
    }
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('POST /api/trades/open', () => {
    it.skipIf(!app)('should open trade and deduct balance', async () => {
      const cookie = await registerAndGetCookie(app!);
      expect(cookie).toBeDefined();

      // Get demo account
      const accountsRes = await app!.inject({
        method: 'GET',
        url: '/api/accounts',
        headers: cookieHeader(cookie!),
      });
      expect(accountsRes.statusCode).toBe(200);
      const accounts = JSON.parse(accountsRes.body);
      const demoAccount = accounts.find((a: { type: string }) => a.type === 'demo');
      expect(demoAccount).toBeDefined();

      // Open trade
      const openRes = await app!.inject({
        method: 'POST',
        url: '/api/trades/open',
        headers: cookieHeader(cookie!),
        payload: {
          accountId: demoAccount.id,
          direction: 'CALL',
          amount: 10,
          expirationSeconds: 5,
          instrument: 'EURUSD_OTC',
        },
      });

      expect(openRes.statusCode).toBe(201);
      const body = JSON.parse(openRes.body);
      expect(body.trade).toBeDefined();
      expect(body.trade.id).toBeDefined();
      expect(body.trade.status).toBe('OPEN');
      expect(body.trade.instrument).toBe('EURUSD_OTC');

      // Balance should be deducted (10000 - 10 = 9990)
      const snapshotRes = await app!.inject({
        method: 'GET',
        url: '/api/account/snapshot',
        headers: cookieHeader(cookie!),
      });
      expect(snapshotRes.statusCode).toBe(200);
      const snapshot = JSON.parse(snapshotRes.body);
      expect(Number(snapshot.balance)).toBe(9990);
    });

    it.skipIf(!app)('should reject trade without auth', async () => {
      const res = await app!.inject({
        method: 'POST',
        url: '/api/trades/open',
        payload: {
          accountId: 'any',
          direction: 'CALL',
          amount: 10,
          expirationSeconds: 5,
          instrument: 'EURUSD_OTC',
        },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('Trade close → balance update', () => {
    it.skipIf(!app)('should close expired trade and update balance', async () => {
      const cookie = await registerAndGetCookie(app!);
      expect(cookie).toBeDefined();

      const accountsRes = await app!.inject({
        method: 'GET',
        url: '/api/accounts',
        headers: cookieHeader(cookie!),
      });
      const demoAccount = JSON.parse(accountsRes.body).find((a: { type: string }) => a.type === 'demo');
      expect(demoAccount).toBeDefined();

      // Open trade with 5s expiration
      const openRes = await app!.inject({
        method: 'POST',
        url: '/api/trades/open',
        headers: cookieHeader(cookie!),
        payload: {
          accountId: demoAccount.id,
          direction: 'CALL',
          amount: 50,
          expirationSeconds: 5,
          instrument: 'EURUSD_OTC',
        },
      });
      expect(openRes.statusCode).toBe(201);
      const tradeId = JSON.parse(openRes.body).trade.id;

      // Wait for trade to expire and close (TradeClosingService runs every 1s)
      await new Promise((r) => setTimeout(r, 7000));

      // Trade should be closed
      const tradesRes = await app!.inject({
        method: 'GET',
        url: '/api/trades?status=closed',
        headers: cookieHeader(cookie!),
      });
      expect(tradesRes.statusCode).toBe(200);
      const { trades } = JSON.parse(tradesRes.body);
      const closedTrade = trades.find((t: { id: string }) => t.id === tradeId);
      expect(closedTrade).toBeDefined();
      expect(['WIN', 'LOSS', 'TIE']).toContain(closedTrade.status);

      // Balance should reflect result (WIN: +payout, LOSS: 0, TIE: +amount)
      const snapshotRes = await app!.inject({
        method: 'GET',
        url: '/api/account/snapshot',
        headers: cookieHeader(cookie!),
      });
      expect(snapshotRes.statusCode).toBe(200);
      const snapshot = JSON.parse(snapshotRes.body);
      expect(Number(snapshot.balance)).toBeGreaterThanOrEqual(0);
    }, 15000);
  });
});
