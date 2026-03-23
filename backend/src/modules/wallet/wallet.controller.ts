import type { FastifyRequest, FastifyReply } from 'fastify';
import { PaymentMethod } from '../../domain/finance/TransactionTypes.js';
import { TransactionType, TransactionStatus } from '../../domain/finance/TransactionTypes.js';
import type { DepositService } from '../../domain/finance/DepositService.js';
import type { WithdrawService } from '../../domain/finance/WithdrawService.js';
import type { AccountRepository } from '../../ports/repositories/AccountRepository.js';
import type { TransactionRepository } from '../../ports/repositories/TransactionRepository.js';
import { getBetaTransferService } from '../../services/BetaTransferService.js';
import { AppError } from '../../shared/errors/AppError.js';
import { logger } from '../../shared/logger.js';

export class WalletController {
  constructor(
    private depositService: DepositService,
    private withdrawService: WithdrawService,
    private accountRepository: AccountRepository,
    private transactionRepository: TransactionRepository,
  ) {}

  async deposit(request: FastifyRequest<{ Body: { amount: number } }>, reply: FastifyReply) {
    const userId = request.userId!;
    const { amount } = request.body;

    const result = await this.depositService.deposit({
      userId,
      amount,
      paymentMethod: PaymentMethod.CARD,
    });

    return reply.status(201).send(result);
  }

  async withdraw(
    request: FastifyRequest<{
      Body: { amount: number; cardNumber: string; twoFactorCode?: string };
    }>,
    reply: FastifyReply,
  ) {
    const userId = request.userId!;
    const { amount, cardNumber, twoFactorCode } = request.body;

    const transaction = await this.withdrawService.withdraw({
      userId,
      amount,
      cardNumber,
      paymentMethod: PaymentMethod.CARD,
      twoFactorCode,
    });

    return reply.send({
      transactionId: transaction.id,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
    });
  }

  async getBalance(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId!;

    const account = await this.accountRepository.getRealAccount(userId);

    return reply.send({ currency: account.currency, balance: account.balance });
  }

  async getTransactions(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId!;

    const account = await this.accountRepository.getRealAccount(userId);
    const all = await this.transactionRepository.findByAccountId(account.id);

    const transactions = all
      .filter((t) => t.type === TransactionType.DEPOSIT || t.type === TransactionType.WITHDRAW)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 50)
      .map((t) => ({
        id: t.id,
        type: t.type,
        date: t.createdAt,
        method: t.paymentMethod,
        status: t.status,
        amount: Math.abs(Number(t.amount)),
        currency: t.currency,
      }));

    return reply.send({ transactions });
  }

  /**
   * BetaTransfer callback (CSRF skipped). Body shape depends on provider; we require amount, orderId, sign, status.
   */
  async betaTransferWebhook(request: FastifyRequest, reply: FastifyReply) {
    let beta;
    try {
      beta = getBetaTransferService();
    } catch (e) {
      if (e instanceof AppError && e.code === 'PAYMENT_NOT_CONFIGURED') {
        return reply.status(503).send({ error: e.code, message: e.message });
      }
      throw e;
    }

    const body = request.body as Record<string, unknown>;
    const amount = body.amount != null ? String(body.amount) : '';
    const orderId = body.orderId != null ? String(body.orderId) : '';
    const sign = body.sign != null ? String(body.sign) : '';
    const statusRaw = body.status != null ? String(body.status) : '';
    const externalId = body.id != null ? String(body.id) : null;

    if (!amount || !orderId || !sign) {
      return reply.status(400).send({ error: 'INVALID_PARAMS', message: 'amount, orderId and sign are required' });
    }

    if (!beta.verifyWebhook(amount, orderId, sign)) {
      return reply.status(403).send({ error: 'INVALID_SIGNATURE', message: 'Invalid signature' });
    }

    const transaction = await this.transactionRepository.findById(orderId);
    if (!transaction) {
      return reply.status(404).send({ error: 'TRANSACTION_NOT_FOUND', message: 'Transaction not found' });
    }

    const status = statusRaw.toLowerCase();
    const webhookAmount = Number(amount);
    if (Number.isNaN(webhookAmount)) {
      return reply.status(400).send({ error: 'INVALID_AMOUNT', message: 'Invalid amount' });
    }

    const transactionAmount = Number(transaction.amount);
    if (Number.isNaN(transactionAmount)) {
      return reply.status(400).send({ error: 'INVALID_TRANSACTION_AMOUNT', message: 'Invalid transaction amount' });
    }

    if (transaction.type === TransactionType.DEPOSIT) {
      if (Math.abs(Number(webhookAmount) - Number(transactionAmount)) >= 0.01) {
        return reply.status(400).send({ error: 'AMOUNT_MISMATCH', message: 'Amount does not match transaction' });
      }
    } else if (transaction.type === TransactionType.WITHDRAW) {
      if (Math.abs(Math.abs(Number(webhookAmount)) - Math.abs(Number(transactionAmount))) >= 0.01) {
        return reply.status(400).send({ error: 'AMOUNT_MISMATCH', message: 'Amount does not match transaction' });
      }
    } else {
      return reply.status(400).send({ error: 'INVALID_TYPE', message: 'Unsupported transaction type' });
    }

    const patchExternal = externalId
      ? { externalId, externalStatus: statusRaw }
      : { externalStatus: statusRaw };

    if (status === 'success') {
      if (transaction.status === TransactionStatus.CONFIRMED) {
        return reply.send({ ok: true });
      }
      if (transaction.status !== TransactionStatus.PENDING) {
        return reply.send({ ok: true });
      }

      await this.transactionRepository.update(transaction.id, patchExternal);

      if (transaction.type === TransactionType.DEPOSIT) {
        await this.transactionRepository.confirm(transaction.id);
        await this.accountRepository.updateBalance(transaction.accountId, webhookAmount);
      } else {
        await this.transactionRepository.confirm(transaction.id);
      }

      logger.info({ orderId, status, type: transaction.type }, 'BetaTransfer webhook: success');
      return reply.send({ ok: true });
    }

    if (status === 'fail' || status === 'cancel' || status === 'failed' || status === 'cancelled') {
      if (transaction.status === TransactionStatus.FAILED) {
        return reply.send({ ok: true });
      }
      if (transaction.status === TransactionStatus.CONFIRMED) {
        return reply.send({ ok: true });
      }
      if (transaction.status !== TransactionStatus.PENDING) {
        return reply.send({ ok: true });
      }

      await this.transactionRepository.update(transaction.id, {
        ...patchExternal,
        status: TransactionStatus.FAILED,
        confirmedAt: null,
      });

      if (transaction.type === TransactionType.WITHDRAW) {
        await this.accountRepository.updateBalance(transaction.accountId, webhookAmount);
      }

      logger.info({ orderId, status, type: transaction.type }, 'BetaTransfer webhook: fail/cancel');
      return reply.send({ ok: true });
    }

    await this.transactionRepository.update(transaction.id, patchExternal);
    return reply.send({ ok: true });
  }
}
