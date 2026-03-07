/**
 * DI Container - единая точка регистрации зависимостей
 *
 * Все репозитории и сервисы — singleton.
 * PriceProvider использует lazy resolution (зависит от bootstrap).
 * PrismaClient инжектируется при вызове configureContainer(prisma).
 */

import 'reflect-metadata';
import {
  container,
  Lifecycle,
  instanceCachingFactory,
  type DependencyContainer,
} from 'tsyringe';
import type { PrismaClient } from '@prisma/client';
import type { KeyValueStore } from './bootstrap/redis.js';
import type { PriceProvider } from './ports/pricing/PriceProvider.js';
import { CandleStore } from './prices/store/CandleStore.js';
import { PricePointWriter } from './prices/PricePointWriter.js';
import { LineChartController } from './modules/linechart/linechart.controller.js';
import type { PriceEngineManager } from './prices/PriceEngineManager.js';
import { PrismaUserRepository } from './infrastructure/prisma/PrismaUserRepository.js';
import { PrismaSessionRepository } from './infrastructure/prisma/PrismaSessionRepository.js';
import { PrismaAccountRepository } from './infrastructure/prisma/PrismaAccountRepository.js';
import { PrismaTransactionRepository } from './infrastructure/prisma/PrismaTransactionRepository.js';
import { PrismaTradeRepository } from './infrastructure/prisma/PrismaTradeRepository.js';
import { PrismaInstrumentRepository } from './infrastructure/prisma/PrismaInstrumentRepository.js';
import { AuthService } from './domain/auth/AuthService.js';
import { AccountService } from './domain/accounts/AccountService.js';
import { TradeService } from './domain/trades/TradeService.js';
import { UserService } from './domain/user/UserService.js';
import { DepositService } from './domain/finance/DepositService.js';
import { WithdrawService } from './domain/finance/WithdrawService.js';
import { PriceServiceAdapter } from './infrastructure/pricing/PriceServiceAdapter.js';
import { getPriceEngineManager } from './bootstrap/prices.bootstrap.js';
import { SystemClock } from './infrastructure/time/SystemClock.js';
import { TerminalSnapshotAdapter } from './infrastructure/terminal/TerminalSnapshotAdapter.js';
import { TerminalSnapshotService } from './domain/terminal/TerminalSnapshotService.js';
import { FileStorage } from './infrastructure/storage/FileStorage.js';
import { AuthController } from './modules/auth/auth.controller.js';
import { AccountsController } from './modules/accounts/accounts.controller.js';
import { TradesController } from './modules/trades/trades.controller.js';
import { UserController } from './modules/user/user.controller.js';
import { WalletController } from './modules/wallet/wallet.controller.js';
import { InstrumentsController } from './modules/instruments/instruments.controller.js';
import { TerminalController } from './modules/terminal/terminal.controller.js';
import type { UserRepository } from './ports/repositories/UserRepository.js';
import type { SessionRepository } from './ports/repositories/SessionRepository.js';
import type { AccountRepository } from './ports/repositories/AccountRepository.js';
import type { TransactionRepository } from './ports/repositories/TransactionRepository.js';
import type { TradeRepository } from './ports/repositories/TradeRepository.js';
import type { InstrumentRepository } from './ports/repositories/InstrumentRepository.js';

// Tokens для интерфейсов (tsyringe не резолвит интерфейсы по умолчанию)
export const T = {
  PrismaClient: Symbol('PrismaClient'),
  KeyValueStore: Symbol('KeyValueStore'),
  UserRepository: Symbol('UserRepository'),
  SessionRepository: Symbol('SessionRepository'),
  AccountRepository: Symbol('AccountRepository'),
  TransactionRepository: Symbol('TransactionRepository'),
  TradeRepository: Symbol('TradeRepository'),
  InstrumentRepository: Symbol('InstrumentRepository'),
  PriceProvider: Symbol('PriceProvider'),
  GetPriceEngineManager: Symbol('GetPriceEngineManager'),
} as const;

let priceProviderInstance: PriceServiceAdapter | null = null;

function getPriceProvider(): PriceProvider {
  if (!priceProviderInstance) {
    const manager = getPriceEngineManager();
    priceProviderInstance = new PriceServiceAdapter(manager);
  }
  return priceProviderInstance;
}

const SINGLETON = { lifecycle: Lifecycle.Singleton } as const;

export function configureContainer(
  prisma: PrismaClient,
  keyValueStore: KeyValueStore,
  getPriceEngineManager: () => PriceEngineManager,
): DependencyContainer {
  // PrismaClient и KeyValueStore — инжектируются при старте
  container.register<PrismaClient>(T.PrismaClient, { useValue: prisma });
  container.register<KeyValueStore>(T.KeyValueStore, { useValue: keyValueStore });

  // CandleStore, PricePointWriter — для PriceEngineManager (bootstrap)
  container.register(CandleStore, {
    useFactory: (c) =>
      new CandleStore(c.resolve<PrismaClient>(T.PrismaClient), c.resolve<KeyValueStore>(T.KeyValueStore)),
  });
  container.register(PricePointWriter, {
    useFactory: (c) => new PricePointWriter(c.resolve<PrismaClient>(T.PrismaClient)),
  });

  // Repositories (singleton via instanceCachingFactory) — получают PrismaClient через DI
  container.register<UserRepository>(T.UserRepository, {
    useFactory: instanceCachingFactory((c: DependencyContainer) =>
      new PrismaUserRepository(c.resolve<PrismaClient>(T.PrismaClient)),
    ),
  });
  container.register<SessionRepository>(T.SessionRepository, {
    useFactory: instanceCachingFactory((c: DependencyContainer) =>
      new PrismaSessionRepository(c.resolve<PrismaClient>(T.PrismaClient)),
    ),
  });
  container.register<AccountRepository>(T.AccountRepository, {
    useFactory: instanceCachingFactory((c: DependencyContainer) =>
      new PrismaAccountRepository(c.resolve<PrismaClient>(T.PrismaClient)),
    ),
  });
  container.register<TransactionRepository>(T.TransactionRepository, {
    useFactory: instanceCachingFactory((c: DependencyContainer) =>
      new PrismaTransactionRepository(c.resolve<PrismaClient>(T.PrismaClient)),
    ),
  });
  container.register<TradeRepository>(T.TradeRepository, {
    useFactory: instanceCachingFactory((c: DependencyContainer) =>
      new PrismaTradeRepository(c.resolve<PrismaClient>(T.PrismaClient)),
    ),
  });
  container.register<InstrumentRepository>(T.InstrumentRepository, {
    useFactory: instanceCachingFactory((c: DependencyContainer) =>
      new PrismaInstrumentRepository(c.resolve<PrismaClient>(T.PrismaClient)),
    ),
  });

  // PriceProvider — lazy (getPriceEngineManager доступен только после bootstrap)
  container.register<PriceProvider>(T.PriceProvider, {
    useFactory: instanceCachingFactory(() => ({
      getCurrentPrice: async (asset: string) => getPriceProvider().getCurrentPrice(asset),
    })),
  });

  // Services (singleton via instanceCachingFactory)
  container.register(AccountService, {
    useFactory: instanceCachingFactory((c: DependencyContainer) =>
      new AccountService(
        c.resolve<AccountRepository>(T.AccountRepository),
        c.resolve<TransactionRepository>(T.TransactionRepository),
      ),
    ),
  });

  container.register(AuthService, {
    useFactory: instanceCachingFactory((c: DependencyContainer) =>
      new AuthService(
        c.resolve<UserRepository>(T.UserRepository),
        c.resolve<SessionRepository>(T.SessionRepository),
        c.resolve(AccountService),
      ),
    ),
  });

  container.register(UserService, {
    useFactory: instanceCachingFactory((c: DependencyContainer) =>
      new UserService(
        c.resolve<UserRepository>(T.UserRepository),
        c.resolve<SessionRepository>(T.SessionRepository),
      ),
    ),
  });

  container.register(TradeService, {
    useFactory: instanceCachingFactory((c: DependencyContainer) =>
      new TradeService(
        c.resolve<TradeRepository>(T.TradeRepository),
        c.resolve<AccountRepository>(T.AccountRepository),
        c.resolve<PriceProvider>(T.PriceProvider),
        c.resolve<TransactionRepository>(T.TransactionRepository),
        c.resolve<InstrumentRepository>(T.InstrumentRepository),
      ),
    ),
  });

  container.register(DepositService, {
    useFactory: instanceCachingFactory((c: DependencyContainer) =>
      new DepositService(
        c.resolve<AccountRepository>(T.AccountRepository),
        c.resolve<TransactionRepository>(T.TransactionRepository),
      ),
    ),
  });

  container.register(WithdrawService, {
    useFactory: instanceCachingFactory((c: DependencyContainer) =>
      new WithdrawService(
        c.resolve<AccountRepository>(T.AccountRepository),
        c.resolve<TransactionRepository>(T.TransactionRepository),
      ),
    ),
  });

  // TerminalSnapshotAdapter — нужны репозитории + getManager + clock
  container.register(TerminalSnapshotAdapter, {
    useFactory: instanceCachingFactory((c: DependencyContainer) => {
      const clock = new SystemClock();
      return new TerminalSnapshotAdapter(
        c.resolve<UserRepository>(T.UserRepository),
        c.resolve<AccountRepository>(T.AccountRepository),
        c.resolve<TradeRepository>(T.TradeRepository),
        getPriceEngineManager,
        clock,
      );
    }),
  });

  container.register(TerminalSnapshotService, {
    useFactory: instanceCachingFactory((c: DependencyContainer) =>
      new TerminalSnapshotService(c.resolve(TerminalSnapshotAdapter)),
    ),
  });

  // FileStorage — stateless
  container.register(FileStorage, { useClass: FileStorage }, SINGLETON);

  // Controllers (transient — создаются при каждом resolve, но используют singleton-сервисы)
  container.register(AuthController, {
    useFactory: (c) => new AuthController(c.resolve(AuthService)),
  });
  container.register(AccountsController, {
    useFactory: (c) => new AccountsController(c.resolve(AccountService)),
  });
  container.register(TradesController, {
    useFactory: (c) =>
      new TradesController(c.resolve(TradeService), c.resolve(AccountService)),
  });
  container.register(UserController, {
    useFactory: (c) => new UserController(c.resolve(UserService)),
  });
  container.register(WalletController, {
    useFactory: (c) =>
      new WalletController(
        c.resolve(DepositService),
        c.resolve(WithdrawService),
        c.resolve<AccountRepository>(T.AccountRepository),
        c.resolve<TransactionRepository>(T.TransactionRepository),
      ),
  });
  container.register(InstrumentsController, {
    useFactory: (c) =>
      new InstrumentsController(c.resolve<InstrumentRepository>(T.InstrumentRepository)),
  });
  container.register(LineChartController, {
    useFactory: (c) =>
      new LineChartController(c.resolve<PrismaClient>(T.PrismaClient), getPriceEngineManager),
  });
  container.register(TerminalController, {
    useFactory: (c) =>
      new TerminalController(
        c.resolve(TerminalSnapshotService),
        getPriceEngineManager,
      ),
  });

  return container;
}

export function getContainer(): DependencyContainer {
  return container;
}
