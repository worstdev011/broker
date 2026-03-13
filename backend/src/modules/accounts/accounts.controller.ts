import type { FastifyRequest, FastifyReply } from 'fastify';
import { AccountService } from '../../domain/accounts/AccountService.js';
import { AccountType } from '../../domain/accounts/AccountTypes.js';
import { emitAccountSnapshot } from '../../bootstrap/websocket.bootstrap.js';
import { logger } from '../../shared/logger.js';

export class AccountsController {
  constructor(private accountService: AccountService) {}

  async getAccounts(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId!;
    const accounts = await this.accountService.getAccounts(userId);
    return reply.send({ accounts });
  }

  async createAccount(
    request: FastifyRequest<{ Body: { type: 'demo' | 'real' } }>,
    reply: FastifyReply,
  ) {
    const userId = request.userId!;
    const { type } = request.body;

    const account = await this.accountService.createAccount({
      userId,
      type: type === 'demo' ? AccountType.DEMO : AccountType.REAL,
    });

    return reply.status(201).send({ account });
  }

  async switchAccount(
    request: FastifyRequest<{ Body: { accountId: string } }>,
    reply: FastifyReply,
  ) {
    const userId = request.userId!;
    const { accountId } = request.body;

    const account = await this.accountService.setActiveAccount(userId, accountId);

    this.emitSnapshot(userId);

    return reply.send({ account });
  }

  async getAccountSnapshot(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId!;

    const snapshot = await this.accountService.getAccountSnapshot(userId);
    if (!snapshot) {
      return reply.status(404).send({ error: 'ACCOUNT_NOT_FOUND', message: 'No active account found' });
    }

    return reply.send(snapshot);
  }

  async resetDemoAccount(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId!;

    const account = await this.accountService.resetDemoAccount(userId);

    this.emitSnapshot(userId);

    return reply.send({
      account: {
        id: account.id,
        balance: account.balance,
        currency: account.currency,
        type: account.type,
      },
    });
  }

  private emitSnapshot(userId: string): void {
    this.accountService.getAccountSnapshot(userId).then((snapshot) => {
      if (snapshot) {
        emitAccountSnapshot(userId, {
          ...snapshot,
          currency: snapshot.currency as 'USD' | 'RUB' | 'UAH',
        });
      }
    }).catch((err) => {
      logger.error({ err }, 'Failed to emit account snapshot');
    });
  }
}
