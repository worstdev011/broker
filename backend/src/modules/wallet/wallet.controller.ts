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
   * BetaTransfer callback (CSRF skipped). Provider sends form-urlencoded payload.
   */
  async betaTransferWebhook(request: FastifyRequest, reply: FastifyReply) {
    logger.info({ body: request.body }, 'BetaTransfer webhook raw body');

    let beta;
    try {
      beta = getBetaTransferService();
    } catch (e) {
      if (e instanceof AppError && e.code === 'PAYMENT_NOT_CONFIGURED') {
        logger.error({ code: e.code }, 'BetaTransfer webhook rejected: payment provider not configured');
        return reply.status(503).send({ error: e.code, message: e.message });
      }
      throw e;
    }

    const body = request.body as Record<string, unknown>;
    const amount = body.amount != null ? String(body.amount) : '';
    const orderId = body.orderId != null ? String(body.orderId) : '';
    const sign = body.sign != null ? String(body.sign) : '';
    const orderAmountRaw = body.orderAmount != null ? String(body.orderAmount) : '';
    const externalId = body.id != null ? String(body.id) : null;

    if (!amount || !orderId || !sign) {
      logger.warn({ amount, orderId, hasSign: Boolean(sign), orderAmountRaw, externalId }, 'BetaTransfer webhook invalid params');
      return reply.status(400).send({ error: 'INVALID_PARAMS', message: 'amount, orderId and sign are required' });
    }

    if (!beta.verifyWebhook(amount, orderId, sign)) {
      logger.warn({ orderId, amount, orderAmountRaw, externalId }, 'BetaTransfer webhook invalid signature');
      return reply.status(403).send({ error: 'INVALID_SIGNATURE', message: 'Invalid signature' });
    }

    const transaction = await this.transactionRepository.findById(orderId);
    if (!transaction) {
      logger.warn({ orderId, amount, orderAmountRaw, externalId }, 'BetaTransfer webhook transaction not found');
      return reply.status(404).send({ error: 'TRANSACTION_NOT_FOUND', message: 'Transaction not found' });
    }

    const webhookAmount = Number(amount);
    if (Number.isNaN(webhookAmount)) {
      logger.warn({ orderId, amount, orderAmountRaw, externalId }, 'BetaTransfer webhook invalid amount format');
      return reply.status(400).send({ error: 'INVALID_AMOUNT', message: 'Invalid amount' });
    }

    const orderAmount = Number(orderAmountRaw);
    if (Number.isNaN(orderAmount)) {
      logger.error(
        { orderId, orderAmountRaw, externalId },
        'BetaTransfer webhook invalid orderAmount format',
      );
      return reply.status(400).send({ error: 'INVALID_ORDER_AMOUNT', message: 'Invalid orderAmount' });
    }

    if (transaction.type !== TransactionType.DEPOSIT && transaction.type !== TransactionType.WITHDRAW) {
      logger.warn({ orderId, txType: transaction.type, orderAmountRaw, externalId }, 'BetaTransfer webhook unsupported transaction type');
      return reply.status(400).send({ error: 'INVALID_TYPE', message: 'Unsupported transaction type' });
    }

    const patchExternal = externalId
      ? { externalId, externalStatus: 'success' }
      : { externalStatus: 'success' };

    if (transaction.status === TransactionStatus.CONFIRMED) {
      return reply.send({ ok: true });
    }
    if (transaction.status !== TransactionStatus.PENDING) {
      return reply.send({ ok: true });
    }

    await this.transactionRepository.update(transaction.id, patchExternal);
    await this.transactionRepository.confirm(transaction.id);

    if (transaction.type === TransactionType.DEPOSIT) {
      await this.accountRepository.updateBalance(transaction.accountId, orderAmount);
    }

    logger.info({ orderId, type: transaction.type, orderAmount, webhookAmount }, 'BetaTransfer webhook: confirmed');
    return reply.send({ ok: true });
  }
}
