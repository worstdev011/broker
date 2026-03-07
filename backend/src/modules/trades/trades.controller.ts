/**
 * Trades controller - handles HTTP requests
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { TradeService } from '../../domain/trades/TradeService.js';
import { TradeRepository } from '../../ports/repositories/TradeRepository.js';
import {
  InvalidTradeAmountError,
  InsufficientBalanceError,
  InvalidExpirationError,
  InvalidTradeDirectionError,
} from '../../domain/trades/TradeErrors.js';
import { AccountNotFoundError, UnauthorizedAccountAccessError } from '../../domain/accounts/AccountErrors.js';
import { TradeDirection } from '../../domain/trades/TradeTypes.js';
import { emitTradeOpen, emitAccountSnapshot } from '../../bootstrap/websocket.bootstrap.js';
import { registerTradeForCountdown } from '../../bootstrap/time.bootstrap.js';
import { logger } from '../../shared/logger.js';
import { AccountService } from '../../domain/accounts/AccountService.js';

export class TradesController {
  constructor(
    private tradeService: TradeService,
    private accountService: AccountService,
  ) {}

  async openTrade(
    request: FastifyRequest<{
      Body: {
        accountId: string;
        direction: 'CALL' | 'PUT';
        amount: number;
        expirationSeconds: number;
        instrument: string; // Trading instrument (e.g., 'EURUSD_OTC', 'AUDCHF_REAL')
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.userId!; // Set by requireAuth middleware
      const { accountId, direction, amount, expirationSeconds, instrument } = request.body;

      // Validate instrument
      if (!instrument || typeof instrument !== 'string') {
        return reply.status(400).send({
          error: 'Invalid instrument',
          message: 'Instrument is required',
        });
      }

      const trade = await this.tradeService.openTrade({
        userId,
        accountId,
        direction: direction === 'CALL' ? TradeDirection.CALL : TradeDirection.PUT,
        amount,
        expirationSeconds,
        instrument, // Pass instrument to service
      });

      const tradeDTO = this.toDTO(trade);

      // Emit WebSocket events
      try {
        emitTradeOpen(tradeDTO, userId);
        // Register trade for countdown updates
        const expiresAt = new Date(trade.expiresAt).getTime();
        registerTradeForCountdown(trade.id, userId, expiresAt);
        
        // 🔥 FLOW A-ACCOUNT: Emit account snapshot after balance update
        const snapshot = await this.accountService.getAccountSnapshot(userId);
        if (snapshot) {
          emitAccountSnapshot(userId, snapshot);
        }
      } catch (error) {
        logger.error('Failed to emit WebSocket events:', error);
        // Don't fail the request if WS fails
      }

      return reply.status(201).send({
        trade: tradeDTO,
      });
    } catch (error) {
      if (error instanceof InvalidTradeAmountError) {
        return reply.status(400).send({
          error: 'Invalid trade amount',
          message: error.message,
        });
      }

      if (error instanceof InvalidTradeDirectionError) {
        return reply.status(400).send({
          error: 'Invalid trade direction',
          message: error.message,
        });
      }

      if (error instanceof InvalidExpirationError) {
        return reply.status(400).send({
          error: 'Invalid expiration',
          message: error.message,
        });
      }

      if (error instanceof InsufficientBalanceError) {
        return reply.status(400).send({
          error: 'Insufficient balance',
          message: error.message,
        });
      }

      if (error instanceof AccountNotFoundError || error instanceof UnauthorizedAccountAccessError) {
        return reply.status(403).send({
          error: 'Account access denied',
          message: error.message,
        });
      }

      const errMsg = error instanceof Error ? error.message : String(error);
      const errStack = error instanceof Error ? error.stack : undefined;
      logger.error({ err: error, message: errMsg, stack: errStack }, 'Open trade error');
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  async getTrades(
    request: FastifyRequest<{
      Querystring: { limit?: string; offset?: string; status?: 'open' | 'closed' };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.userId!; // Set by requireAuth middleware
      const limit = Math.min(Math.max(parseInt(request.query.limit || '25', 10) || 25, 1), 100);
      const offset = Math.max(parseInt(request.query.offset || '0', 10) || 0, 0);
      const status = request.query.status === 'open' ? 'open' : 'closed';

      const { trades, hasMore } = await this.tradeService.getTradesPaginated(userId, status, limit, offset);

      return reply.send({
        trades: trades.map((trade) => this.toDTO(trade)),
        hasMore,
      });
    } catch (error) {
      logger.error('Get trades error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * 🔥 FLOW TRADE-STATS: GET /api/trades/statistics
   * Get trading statistics for the current user
   */
  async getStatistics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId!; // Set by requireAuth middleware

      const statistics = await this.tradeService.getTradeStatistics(userId);

      return reply.send({
        statistics,
      });
    } catch (error) {
      logger.error('Get trade statistics error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * 🔥 FLOW TRADE-STATS: GET /api/trades/balance-history
   * Get balance history by date range for the current user's REAL account
   */
  async getBalanceHistory(
    request: FastifyRequest<{
      Querystring: {
        startDate?: string; // YYYY-MM-DD
        endDate?: string; // YYYY-MM-DD
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.userId!; // Set by requireAuth middleware
      
      // Parse dates or use defaults
      let startDate: Date;
      let endDate: Date = new Date();
      endDate.setHours(23, 59, 59, 999);

      if (request.query.startDate && request.query.endDate) {
        startDate = new Date(request.query.startDate);
        endDate = new Date(request.query.endDate);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return reply.status(400).send({
            error: 'Invalid date format',
            message: 'Dates must be in YYYY-MM-DD format',
          });
        }

        if (startDate > endDate) {
          return reply.status(400).send({
            error: 'Invalid date range',
            message: 'Start date must be before end date',
          });
        }
      } else {
        // Default to last 30 days if no dates provided
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
      }

      const history = await this.tradeService.getBalanceHistory(userId, startDate, endDate);

      return reply.send({
        history,
      });
    } catch (error) {
      logger.error('Get balance history error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/trades/analytics?startDate=&endDate=
   * Get trade analytics: distribution by instrument and direction
   */
  async getAnalytics(
    request: FastifyRequest<{
      Querystring: { startDate?: string; endDate?: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.userId!;
      let startDate: Date;
      let endDate: Date = new Date();
      endDate.setHours(23, 59, 59, 999);

      if (request.query.startDate && request.query.endDate) {
        startDate = new Date(request.query.startDate);
        endDate = new Date(request.query.endDate);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return reply.status(400).send({
            error: 'Invalid date format',
            message: 'Dates must be in YYYY-MM-DD format',
          });
        }
        if (startDate > endDate) {
          return reply.status(400).send({
            error: 'Invalid date range',
            message: 'Start date must be before end date',
          });
        }
      } else {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
      }

      const analytics = await this.tradeService.getTradeAnalytics(userId, startDate, endDate);

      return reply.send({ analytics });
    } catch (error) {
      logger.error('Get trade analytics error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  private toDTO(trade: any) {
    return {
      id: trade.id,
      accountId: trade.accountId,
      direction: trade.direction,
      instrument: trade.instrument, // ✅ Добавляем instrument в DTO
      amount: trade.amount.toString(),
      entryPrice: trade.entryPrice.toString(),
      exitPrice: trade.exitPrice !== null ? trade.exitPrice.toString() : null,
      payout: trade.payout.toString(),
      status: trade.status,
      openedAt: trade.openedAt.toISOString(),
      expiresAt: trade.expiresAt.toISOString(),
      closedAt: trade.closedAt !== null ? trade.closedAt.toISOString() : null,
    };
  }
}
