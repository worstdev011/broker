import type { FastifyRequest, FastifyReply } from "fastify";
import { accountService } from "../../domain/accounts/account.service.js";
import { switchBodySchema, snapshotQuerySchema } from "./accounts.schema.js";
import { sendAccountSnapshot } from "../../shared/websocket/ws.events.js";
import { AppError } from "../../shared/errors/AppError.js";

export const accountsController = {
  async handleList(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!request.userId) throw AppError.unauthorized();

    const accounts = await accountService.listByUser(request.userId);
    reply.send({ accounts });
  },

  async handleSwitch(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!request.userId) throw AppError.unauthorized();

    const body = switchBodySchema.parse(request.body);
    const account = await accountService.switchAccount(
      request.userId,
      body.accountId,
    );

    sendAccountSnapshot(request.userId, account);
    reply.send({ account });
  },

  async handleDemoReset(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!request.userId) throw AppError.unauthorized();

    const account = await accountService.resetDemo(request.userId);

    sendAccountSnapshot(request.userId, account);
    reply.send({ account });
  },

  async handleSnapshot(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!request.userId) throw AppError.unauthorized();

    const query = snapshotQuerySchema.parse(request.query);
    const snapshot = await accountService.snapshot(request.userId, query.type);
    reply.send(snapshot);
  },
};
