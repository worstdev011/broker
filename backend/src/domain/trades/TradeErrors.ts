import { AppError } from '../../shared/errors/AppError.js';

export class TradeNotFoundError extends AppError {
  constructor(tradeId?: string) {
    super(404, tradeId ? `Trade ${tradeId} not found` : 'Trade not found', 'TRADE_NOT_FOUND');
  }
}

export class InvalidTradeAmountError extends AppError {
  constructor() {
    super(400, 'Trade amount must be between 0.01 and 50,000', 'INVALID_TRADE_AMOUNT');
  }
}

export class InvalidExpirationError extends AppError {
  constructor() {
    super(400, 'Expiration must be a multiple of 5 seconds, between 5 and 300', 'INVALID_EXPIRATION');
  }
}

export class InvalidTradeDirectionError extends AppError {
  constructor() {
    super(400, 'Direction must be CALL or PUT', 'INVALID_TRADE_DIRECTION');
  }
}

export class UnauthorizedTradeAccessError extends AppError {
  constructor() {
    super(403, 'Unauthorized access to trade', 'UNAUTHORIZED_TRADE_ACCESS');
  }
}

export class TradeAlreadyClosedError extends AppError {
  constructor() {
    super(400, 'Trade is already closed', 'TRADE_ALREADY_CLOSED');
  }
}

export class InstrumentNotFoundError extends AppError {
  constructor(instrument: string) {
    super(400, `Unknown instrument: ${instrument}`, 'INSTRUMENT_NOT_FOUND');
  }
}

export class MarketClosedError extends AppError {
  constructor() {
    super(400, 'Market is closed', 'MARKET_CLOSED');
  }
}

export class PriceUnavailableError extends AppError {
  constructor(instrument: string) {
    super(503, `Price unavailable for ${instrument}`, 'PRICE_UNAVAILABLE');
  }
}
