import type { AccountRepository } from '../../ports/repositories/AccountRepository.js';
import type { TransactionRepository } from '../../ports/repositories/TransactionRepository.js';
import { TransactionType, TransactionStatus, PaymentMethod } from './TransactionTypes.js';
import { InvalidAmountError, TransactionNotFoundError } from './FinanceErrors.js';
import { logger } from '../../shared/logger.js';
import {
  DEPOSIT_MIN_AMOUNT,
  DEPOSIT_MAX_AMOUNT,
  DEFAULT_FIAT_CURRENCY,
} from '../../config/constants.js';

export class DepositService {
  constructor(
    private accountRepository: AccountRepository,
    private transactionRepository: TransactionRepository,
  ) {}

  async deposit({
    userId,
    amount,
    paymentMethod,
  }: {
    userId: string;
    amount: number;
    paymentMethod: PaymentMethod;
  }) {
    if (amount < DEPOSIT_MIN_AMOUNT || amount > DEPOSIT_MAX_AMOUNT) {
      throw new InvalidAmountError(DEPOSIT_MIN_AMOUNT, DEPOSIT_MAX_AMOUNT, DEFAULT_FIAT_CURRENCY);
    }

    const account = await this.accountRepository.getRealAccount(userId);

    const transaction = await this.transactionRepository.create({
      userId,
      accountId: account.id,
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.PENDING,
      amount,
      currency: DEFAULT_FIAT_CURRENCY,
      paymentMethod,
      provider: 'manual',
    });

    // TODO: integrate real payment provider (Stripe/Crypto/Bank)
    await this.transactionRepository.confirm(transaction.id);
    await this.accountRepository.updateBalance(account.id, amount);

    logger.info(`Deposit created: userId=${userId}, amount=${amount}, txId=${transaction.id}`);

    const confirmed = await this.transactionRepository.findById(transaction.id);
    if (!confirmed) {
      throw new TransactionNotFoundError(transaction.id);
    }

    return confirmed;
  }
}
