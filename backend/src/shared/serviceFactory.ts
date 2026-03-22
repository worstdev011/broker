/**
 * Centralized service/repository factory.
 * Singleton instances — created once, shared across all route modules.
 * Replaces duplicated `new PrismaXxxRepository()` in every route file.
 */

import { PrismaUserRepository } from '../infrastructure/prisma/PrismaUserRepository.js';
import { PrismaSessionRepository } from '../infrastructure/prisma/PrismaSessionRepository.js';
import { PrismaAccountRepository } from '../infrastructure/prisma/PrismaAccountRepository.js';
import { PrismaTransactionRepository } from '../infrastructure/prisma/PrismaTransactionRepository.js';
import { PrismaTradeRepository } from '../infrastructure/prisma/PrismaTradeRepository.js';
import { PrismaInstrumentRepository } from '../infrastructure/prisma/PrismaInstrumentRepository.js';
import { PriceServiceAdapter } from '../infrastructure/pricing/PriceServiceAdapter.js';
import { getPriceEngineManager } from '../bootstrap/prices.bootstrap.js';
import { SystemClock } from '../infrastructure/time/SystemClock.js';
import { FileStorage } from '../infrastructure/storage/FileStorage.js';
import { AccountService } from '../domain/accounts/AccountService.js';
import { AuthService } from '../domain/auth/AuthService.js';
import { TradeService } from '../domain/trades/TradeService.js';
import { UserService } from '../domain/user/UserService.js';
import { DepositService } from '../domain/finance/DepositService.js';
import { WithdrawService } from '../domain/finance/WithdrawService.js';
import { TwoFactorService } from '../domain/user/TwoFactorService.js';
import { getBetaTransferService } from '../services/BetaTransferService.js';
import { TerminalSnapshotAdapter } from '../infrastructure/terminal/TerminalSnapshotAdapter.js';
import { TerminalSnapshotService } from '../domain/terminal/TerminalSnapshotService.js';
import type { PriceProvider } from '../ports/pricing/PriceProvider.js';

// ── Repositories (singletons) ───────────────────────────────────────

let _userRepo: PrismaUserRepository | null = null;
let _sessionRepo: PrismaSessionRepository | null = null;
let _accountRepo: PrismaAccountRepository | null = null;
let _transactionRepo: PrismaTransactionRepository | null = null;
let _tradeRepo: PrismaTradeRepository | null = null;
let _instrumentRepo: PrismaInstrumentRepository | null = null;

export function getUserRepository() {
  return (_userRepo ??= new PrismaUserRepository());
}
export function getSessionRepository() {
  return (_sessionRepo ??= new PrismaSessionRepository());
}
export function getAccountRepository() {
  return (_accountRepo ??= new PrismaAccountRepository());
}
export function getTransactionRepository() {
  return (_transactionRepo ??= new PrismaTransactionRepository());
}
export function getTradeRepository() {
  return (_tradeRepo ??= new PrismaTradeRepository());
}
export function getInstrumentRepository() {
  return (_instrumentRepo ??= new PrismaInstrumentRepository());
}

// ── Infrastructure (singletons) ─────────────────────────────────────

let _priceProvider: PriceProvider | null = null;
let _fileStorage: FileStorage | null = null;
let _clock: SystemClock | null = null;

export function getLazyPriceProvider(): PriceProvider {
  if (!_priceProvider) {
    let adapter: PriceServiceAdapter | null = null;
    _priceProvider = {
      getCurrentPrice: async (asset: string) => {
        if (!adapter) {
          adapter = new PriceServiceAdapter(getPriceEngineManager());
        }
        return adapter.getCurrentPrice(asset);
      },
    };
  }
  return _priceProvider;
}

export function getFileStorage() {
  return (_fileStorage ??= new FileStorage());
}

export function getClock() {
  return (_clock ??= new SystemClock());
}

// ── Services (singletons) ───────────────────────────────────────────

let _accountService: AccountService | null = null;
let _authService: AuthService | null = null;
let _tradeService: TradeService | null = null;
let _userService: UserService | null = null;
let _depositService: DepositService | null = null;
let _withdrawService: WithdrawService | null = null;
let _terminalSnapshotService: TerminalSnapshotService | null = null;

export function getAccountService() {
  return (_accountService ??= new AccountService(
    getAccountRepository(),
    getTransactionRepository(),
  ));
}

export function getAuthService() {
  return (_authService ??= new AuthService(
    getUserRepository(),
    getSessionRepository(),
    getAccountService(),
  ));
}

export function getTradeService() {
  return (_tradeService ??= new TradeService(
    getTradeRepository(),
    getAccountRepository(),
    getLazyPriceProvider(),
    getTransactionRepository(),
    getInstrumentRepository(),
  ));
}

export function getUserService() {
  return (_userService ??= new UserService(
    getUserRepository(),
    getSessionRepository(),
  ));
}

export function getDepositService() {
  return (_depositService ??= new DepositService(
    getAccountRepository(),
    getTransactionRepository(),
    () => getBetaTransferService(),
  ));
}

export function getWithdrawService() {
  return (_withdrawService ??= new WithdrawService(
    getAccountRepository(),
    getTransactionRepository(),
    getUserRepository(),
    new TwoFactorService(),
    () => getBetaTransferService(),
  ));
}

export function getTerminalSnapshotService() {
  if (!_terminalSnapshotService) {
    const adapter = new TerminalSnapshotAdapter(
      getUserRepository(),
      getAccountRepository(),
      getTradeRepository(),
      getClock(),
    );
    _terminalSnapshotService = new TerminalSnapshotService(adapter);
  }
  return _terminalSnapshotService;
}
