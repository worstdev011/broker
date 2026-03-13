import type { AccountRepository } from '../../ports/repositories/AccountRepository.js';
import type { TransactionRepository } from '../../ports/repositories/TransactionRepository.js';
import type { Account, CreateAccountInput, AccountDTO } from './AccountTypes.js';
import { AccountType } from './AccountTypes.js';
import {
  AccountNotFoundError,
  AccountAlreadyExistsError,
  InvalidAccountTypeError,
  InsufficientBalanceError,
  UnauthorizedAccountAccessError,
  DemoResetNotAllowedError,
  DemoAccountNotFoundError,
} from './AccountErrors.js';
import {
  DEMO_INITIAL_BALANCE,
  DEMO_RESET_LIMIT,
  DEMO_DEFAULT_CURRENCY,
  REAL_DEFAULT_CURRENCY,
} from '../../config/constants.js';

export class AccountService {
  constructor(
    private accountRepository: AccountRepository,
    private transactionRepository?: TransactionRepository,
  ) {}

  async getAccounts(userId: string): Promise<AccountDTO[]> {
    const accounts = await this.accountRepository.findByUserId(userId);
    return accounts.map(this.toDTO);
  }

  async getActiveAccount(userId: string): Promise<AccountDTO | null> {
    const account = await this.accountRepository.findActiveByUserId(userId);
    return account ? this.toDTO(account) : null;
  }

  async createAccount(input: CreateAccountInput): Promise<AccountDTO> {
    if (input.type !== AccountType.DEMO && input.type !== AccountType.REAL) {
      throw new InvalidAccountTypeError(input.type);
    }

    const existing = await this.accountRepository.findByUserIdAndType(input.userId, input.type);
    if (existing) {
      throw new AccountAlreadyExistsError(input.userId, input.type);
    }

    const allAccounts = await this.accountRepository.findByUserId(input.userId);
    const isFirstAccount = allAccounts.length === 0;

    const initialBalance = input.type === AccountType.DEMO ? DEMO_INITIAL_BALANCE : 0;
    const currency = input.type === AccountType.DEMO ? DEMO_DEFAULT_CURRENCY : REAL_DEFAULT_CURRENCY;

    const account = await this.accountRepository.create({
      userId: input.userId,
      type: input.type,
      balance: initialBalance,
      currency,
      isActive: isFirstAccount,
    });

    return this.toDTO(account);
  }

  async setActiveAccount(userId: string, accountId: string): Promise<AccountDTO> {
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new AccountNotFoundError(accountId);
    }

    if (account.userId !== userId) {
      throw new UnauthorizedAccountAccessError();
    }

    await this.accountRepository.setActive(userId, accountId);

    const updatedAccount = await this.accountRepository.findById(accountId);
    if (!updatedAccount) {
      throw new AccountNotFoundError(accountId);
    }

    return this.toDTO(updatedAccount);
  }

  async adjustBalance(accountId: string, delta: number): Promise<Account> {
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new AccountNotFoundError(accountId);
    }

    if (Number(account.balance) + delta < 0) {
      throw new InsufficientBalanceError();
    }

    return this.accountRepository.updateBalance(accountId, delta);
  }

  async resetDemoAccount(userId: string): Promise<AccountDTO> {
    const demoAccount = await this.accountRepository.findDemoByUserId(userId);
    if (!demoAccount) {
      throw new DemoAccountNotFoundError();
    }

    if (Number(demoAccount.balance) >= DEMO_RESET_LIMIT) {
      throw new DemoResetNotAllowedError();
    }

    const updatedAccount = await this.accountRepository.setBalance(
      demoAccount.id,
      DEMO_INITIAL_BALANCE,
    );

    return this.toDTO(updatedAccount);
  }

  async getAccountSnapshot(userId: string): Promise<{
    accountId: string;
    type: 'REAL' | 'DEMO';
    balance: number;
    currency: string;
    updatedAt: number;
  } | null> {
    const account = await this.accountRepository.findActiveByUserId(userId);
    if (!account) return null;

    return {
      accountId: account.id,
      type: account.type === AccountType.DEMO ? 'DEMO' : 'REAL',
      balance: Number(account.balance),
      currency: account.currency,
      updatedAt: Date.now(),
    };
  }

  private toDTO(account: Account): AccountDTO {
    return {
      id: account.id,
      type: account.type,
      balance: account.balance.toString(),
      currency: account.currency,
      isActive: account.isActive,
    };
  }
}
