import type { AccountRepository } from '../../ports/repositories/AccountRepository.js';
import type { TransactionRepository } from '../../ports/repositories/TransactionRepository.js';
import type { BetaTransferService } from '../../services/BetaTransferService.js';
import { TransactionType, TransactionStatus, PaymentMethod } from './TransactionTypes.js';
import { InvalidAmountError } from './FinanceErrors.js';
import { logger } from '../../shared/logger.js';
import {
  DEPOSIT_MIN_AMOUNT,
  DEPOSIT_MAX_AMOUNT,
  DEFAULT_FIAT_CURRENCY,
} from '../../config/constants.js';
import { env } from '../../config/env.js';

export type DepositInitResult = {
  transactionId: string;
  paymentUrl: string;
  status: TransactionStatus;
  amount: number;
  currency: string;
};

export class DepositService {
  constructor(
    private accountRepository: AccountRepository,
    private transactionRepository: TransactionRepository,
    private getBetaTransfer: () => BetaTransferService,
  ) {}

  async deposit({
    userId,
    amount,
    paymentMethod = PaymentMethod.CARD,
  }: {
    userId: string;
    amount: number;
    paymentMethod?: PaymentMethod;
  }): Promise<DepositInitResult> {
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
      provider: 'betatransfer',
    });

    const beta = this.getBetaTransfer();
    const base = env.FRONTEND_URL.replace(/\/$/, '');
    const locale = env.FRONTEND_DEFAULT_LOCALE || 'ru';
    const successUrl = `${base}/${locale}/profile?tab=wallet&deposit=success`;
    const failUrl = `${base}/${locale}/profile?tab=wallet&deposit=fail`;

    try {
      const paymentUrl = await beta.createPayment({
        amount,
        orderId: transaction.id,
        payerId: userId,
        successUrl,
        failUrl,
      });

      logger.info(
        { userId, amount, txId: transaction.id },
        'BetaTransfer deposit: payment URL issued',
      );

      return {
        transactionId: transaction.id,
        paymentUrl,
        status: TransactionStatus.PENDING,
        amount,
        currency: DEFAULT_FIAT_CURRENCY,
      };
    } catch (err) {
      await this.transactionRepository.update(transaction.id, {
        status: TransactionStatus.FAILED,
        confirmedAt: null,
      });
      throw err;
    }
  }
}
