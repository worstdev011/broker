import type { AccountRepository } from '../../ports/repositories/AccountRepository.js';
import type { TransactionRepository } from '../../ports/repositories/TransactionRepository.js';
import type { UserRepository } from '../../ports/repositories/UserRepository.js';
import type { BetaTransferService } from '../../services/BetaTransferService.js';
import { TransactionType, TransactionStatus, PaymentMethod } from './TransactionTypes.js';
import { InvalidAmountError, TransactionNotFoundError } from './FinanceErrors.js';
import { InsufficientBalanceError } from '../accounts/AccountErrors.js';
import { TwoFactorService } from '../user/TwoFactorService.js';
import { AppError } from '../../shared/errors/AppError.js';
import { logger } from '../../shared/logger.js';
import {
  WITHDRAW_MIN_AMOUNT,
  WITHDRAW_MAX_AMOUNT,
  DEFAULT_FIAT_CURRENCY,
} from '../../config/constants.js';

function digitsOnlyPan(pan: string): string {
  return pan.replace(/\s/g, '').replace(/\D/g, '');
}

function cardLastFourMask(panDigits: string): string {
  const tail = panDigits.slice(-4);
  return tail.length === 4 ? `****${tail}` : '****';
}

export class WithdrawService {
  constructor(
    private accountRepository: AccountRepository,
    private transactionRepository: TransactionRepository,
    private userRepository: UserRepository,
    private twoFactorService: TwoFactorService,
    private getBetaTransfer: () => BetaTransferService,
  ) {}

  async withdraw({
    userId,
    amount,
    cardNumber,
    paymentMethod = PaymentMethod.CARD,
    twoFactorCode,
  }: {
    userId: string;
    amount: number;
    cardNumber: string;
    paymentMethod?: PaymentMethod;
    twoFactorCode?: string;
  }) {
    if (amount < WITHDRAW_MIN_AMOUNT || amount > WITHDRAW_MAX_AMOUNT) {
      throw new InvalidAmountError(WITHDRAW_MIN_AMOUNT, WITHDRAW_MAX_AMOUNT, DEFAULT_FIAT_CURRENCY);
    }

    const pan = digitsOnlyPan(cardNumber);
    if (pan.length < 16 || pan.length > 19) {
      throw new AppError(400, 'Valid card number required for withdrawal', 'INVALID_CARD');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        throw new AppError(403, '2FA code is required for withdrawal', 'TWO_FACTOR_REQUIRED');
      }
      if (!user.twoFactorSecret) {
        throw new AppError(403, '2FA is misconfigured for this account', 'TWO_FACTOR_INVALID');
      }
      const isValid = await this.twoFactorService.verifyToken(user.twoFactorSecret, twoFactorCode);
      if (!isValid) {
        throw new AppError(403, 'Invalid 2FA code', 'TWO_FACTOR_INVALID');
      }
    }

    const account = await this.accountRepository.getRealAccount(userId);

    if (Number(account.balance) < amount) {
      throw new InsufficientBalanceError();
    }

    const cardMask = cardLastFourMask(pan);

    const transaction = await this.transactionRepository.create({
      userId,
      accountId: account.id,
      type: TransactionType.WITHDRAW,
      status: TransactionStatus.PENDING,
      amount: -amount,
      currency: DEFAULT_FIAT_CURRENCY,
      paymentMethod,
      provider: 'betatransfer',
      cardLastFour: cardMask,
    });

    await this.accountRepository.updateBalance(account.id, -amount);

    const beta = this.getBetaTransfer();

    try {
      const result = await beta.createWithdrawal({
        amount,
        orderId: transaction.id,
        cardNumber: pan,
        payerId: userId,
      });

      await this.transactionRepository.update(transaction.id, {
        externalId: String(result.id),
        externalStatus: result.status,
      });

      logger.info(
        { userId, amount, txId: transaction.id, externalId: result.id },
        'BetaTransfer withdrawal accepted',
      );

      const updated = await this.transactionRepository.findById(transaction.id);
      if (!updated) {
        throw new TransactionNotFoundError(transaction.id);
      }

      return { ...updated, amount: Math.abs(updated.amount) };
    } catch (err) {
      await this.accountRepository.updateBalance(account.id, amount);
      await this.transactionRepository.update(transaction.id, { status: TransactionStatus.FAILED });
      throw err;
    }
  }
}
