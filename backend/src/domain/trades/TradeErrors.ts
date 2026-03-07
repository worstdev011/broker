/**
 * Domain errors for Trades
 */

export class TradeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TradeError';
  }
}

export class TradeNotFoundError extends TradeError {
  constructor(tradeId?: string) {
    super(tradeId ? `Trade with id ${tradeId} not found` : 'Trade not found');
    this.name = 'TradeNotFoundError';
  }
}

export class InvalidTradeAmountError extends TradeError {
  constructor() {
    super('Trade amount must be between 0.01 and 50,000');
    this.name = 'InvalidTradeAmountError';
  }
}

export class InsufficientBalanceError extends TradeError {
  constructor() {
    super('Insufficient balance for this trade');
    this.name = 'InsufficientBalanceError';
  }
}

export class InvalidExpirationError extends TradeError {
  constructor() {
    super('Expiration must be a multiple of 5 seconds, between 5 and 300 seconds');
    this.name = 'InvalidExpirationError';
  }
}

export class InvalidTradeDirectionError extends TradeError {
  constructor() {
    super('Invalid trade direction. Must be CALL or PUT');
    this.name = 'InvalidTradeDirectionError';
  }
}

export class UnauthorizedTradeAccessError extends TradeError {
  constructor() {
    super('Unauthorized access to trade');
    this.name = 'UnauthorizedTradeAccessError';
  }
}

export class TradeAlreadyClosedError extends TradeError {
  constructor() {
    super('Trade is already closed');
    this.name = 'TradeAlreadyClosedError';
  }
}
