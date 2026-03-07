/**
 * Integration tests: WebSocket flow
 * subscribe → price updates
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
import { createApp } from '../../src/app.js';
import { bootstrapAll } from '../../src/bootstrap/index.js';
import type { FastifyInstance } from 'fastify';
import { registerAndGetCookie } from './helpers.js';

describe('WebSocket Subscribe Integration', () => {
  let app: FastifyInstance | null = null;
  let serverUrl: string | null = null;

  beforeAll(async () => {
    if (!process.env.PORT) process.env.PORT = '3002';
    if (!process.env.DATABASE_URL)
      process.env.DATABASE_URL = 'postgresql://postgres:ghfjsadf87asd867fa8sdfu2@localhost:5432/im5_test';
    if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test';

    try {
      app = await createApp();
      await bootstrapAll(app);
      await app.ready();
      const address = await app.listen({ port: 0, host: '127.0.0.1' });
      serverUrl = address.replace('http://', 'ws://');
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err?.code === 'P1003' || err?.message?.includes('does not exist')) {
        console.warn('⚠️  Skipping WebSocket integration tests - database not available');
        return;
      }
      throw error;
    }
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('Subscribe flow', () => {
    it.skipIf(!app || !serverUrl)('should receive subscribed confirmation', async () => {
      const cookie = await registerAndGetCookie(app!);
      expect(cookie).toBeDefined();

      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`${serverUrl}/ws`, {
          headers: { Cookie: `${cookie!.name}=${cookie!.value}` },
        });

        ws.on('open', () => {
          ws.send(JSON.stringify({ type: 'subscribe', instrument: 'EURUSD_OTC' }));
        });

        ws.on('message', (data) => {
          try {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'subscribed' && msg.instrument === 'EURUSD_OTC') {
              ws.close();
              resolve();
            }
          } catch {
            // Ignore parse errors
          }
        });

        ws.on('error', reject);
        setTimeout(() => reject(new Error('Timeout waiting for subscribed')), 5000);
      });
    });

    it.skipIf(!app || !serverUrl)('should receive price:update after subscribe', async () => {
      const cookie = await registerAndGetCookie(app!);
      expect(cookie).toBeDefined();

      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`${serverUrl}/ws`, {
          headers: { Cookie: `${cookie!.name}=${cookie!.value}` },
        });

        let subscribed = false;
        let receivedPriceUpdate = false;

        ws.on('open', () => {
          ws.send(JSON.stringify({ type: 'subscribe', instrument: 'EURUSD_OTC' }));
        });

        ws.on('message', (data) => {
          try {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'subscribed' && msg.instrument === 'EURUSD_OTC') {
              subscribed = true;
            }
            if (subscribed && msg.type === 'price:update' && msg.instrument === 'EURUSD_OTC') {
              expect(msg.data).toHaveProperty('price');
              expect(msg.data).toHaveProperty('timestamp');
              expect(typeof msg.data.price).toBe('number');
              receivedPriceUpdate = true;
              ws.close();
              resolve();
            }
          } catch {
            // Ignore
          }
        });

        ws.on('error', reject);
        // OTC engines emit price every ~500ms, wait up to 5s
        setTimeout(() => {
          if (!receivedPriceUpdate) {
            ws.close();
            reject(new Error('Did not receive price:update within 5s'));
          }
        }, 5000);
      });
    }, 8000);

    it.skipIf(!app || !serverUrl)('should receive unsubscribed after unsubscribe', async () => {
      const cookie = await registerAndGetCookie(app!);
      expect(cookie).toBeDefined();

      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`${serverUrl}/ws`, {
          headers: { Cookie: `${cookie!.name}=${cookie!.value}` },
        });

        ws.on('open', () => {
          ws.send(JSON.stringify({ type: 'subscribe', instrument: 'GBPUSD_OTC' }));
        });

        ws.on('message', (data) => {
          try {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'subscribed' && msg.instrument === 'GBPUSD_OTC') {
              ws.send(JSON.stringify({ type: 'unsubscribe', instrument: 'GBPUSD_OTC' }));
            }
            if (msg.type === 'unsubscribed' && msg.instrument === 'GBPUSD_OTC') {
              ws.close();
              resolve();
            }
          } catch {
            // Ignore
          }
        });

        ws.on('error', reject);
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });
    });
  });
});
