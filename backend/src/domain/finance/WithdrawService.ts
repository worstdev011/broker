import type { AccountRepository } from '../../ports/repositories/AccountRepository.js';
import type { TransactionRepository } from '../../ports/repositories/TransactionRepository.js';
import { TransactionType, TransactionStatus, PaymentMethod } from './TransactionTypes.js';
import { InvalidAmountError, TransactionNotFoundError } from './FinanceErrors.js';
import { InsufficientBalanceError } from '../accounts/AccountErrors.js';
import { logger } from '../../shared/logger.js';
import {
  WITHDRAW_MIN_AMOUNT,
  WITHDRAW_MAX_AMOUNT,
  DEFAULT_FIAT_CURRENCY,
} from '../../config/constants.js';

export class WithdrawService {
  constructor(
    private accountRepository: AccountRepository,
    private transactionRepository: TransactionRepository,
  ) {}

  async withdraw({
    userId,
    amount,
    paymentMethod,
  }: {
    userId: string;
    amount: number;
    paymentMethod: PaymentMethod;
  }) {
    if (amount < WITHDRAW_MIN_AMOUNT || amount > WITHDRAW_MAX_AMOUNT) {
      throw new InvalidAmountError(WITHDRAW_MIN_AMOUNT, WITHDRAW_MAX_AMOUNT, DEFAULT_FIAT_CURRENCY);
    }

    const account = await this.accountRepository.getRealAccount(userId);
    const balance = await this.transactionRepository.getBalance(account.id);

    if (balance < amount) {
      throw new InsufficientBalanceError();
    }

    const transaction = await this.transactionRepository.create({
      userId,
      accountId: account.id,
      type: TransactionType.WITHDRAW,
      status: TransactionStatus.PENDING,
      amount: -amount,
      currency: DEFAULT_FIAT_CURRENCY,
      paymentMethod,
      provider: 'manual',
    });

    // TODO: integrate real payment provider
    await this.transactionRepository.confirm(transaction.id);
    await this.accountRepository.updateBalance(account.id, -amount);

    logger.info(`Withdraw created: userId=${userId}, amount=${amount}, txId=${transaction.id}`);

    const confirmed = await this.transactionRepository.findById(transaction.id);
    if (!confirmed) {
      throw new TransactionNotFoundError(transaction.id);
    }

    return { ...confirmed, amount: Math.abs(confirmed.amount) };
  }
}
