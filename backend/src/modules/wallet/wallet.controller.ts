import type { FastifyRequest, FastifyReply } from 'fastify';
import type { PaymentMethod } from '../../domain/finance/TransactionTypes.js';
import { TransactionType } from '../../domain/finance/TransactionTypes.js';
import type { DepositService } from '../../domain/finance/DepositService.js';
import type { WithdrawService } from '../../domain/finance/WithdrawService.js';
import type { AccountRepository } from '../../ports/repositories/AccountRepository.js';
import type { TransactionRepository } from '../../ports/repositories/TransactionRepository.js';

export class WalletController {
  constructor(
    private depositService: DepositService,
    private withdrawService: WithdrawService,
    private accountRepository: AccountRepository,
    private transactionRepository: TransactionRepository,
  ) {}

  async deposit(
    request: FastifyRequest<{ Body: { amount: number; paymentMethod: string } }>,
    reply: FastifyReply,
  ) {
    const userId = request.userId!;
    const { amount, paymentMethod } = request.body;

    const transaction = await this.depositService.deposit({
      userId,
      amount,
      paymentMethod: paymentMethod as PaymentMethod,
    });

    return reply.send({
      transactionId: transaction.id,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
    });
  }

  async withdraw(
    request: FastifyRequest<{ Body: { amount: number; paymentMethod: string } }>,
    reply: FastifyReply,
  ) {
    const userId = request.userId!;
    const { amount, paymentMethod } = request.body;

    const transaction = await this.withdrawService.withdraw({
      userId,
      amount,
      paymentMethod: paymentMethod as PaymentMethod,
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
    const balance = await this.transactionRepository.getBalance(account.id);

    return reply.send({ currency: account.currency, balance });
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
}
