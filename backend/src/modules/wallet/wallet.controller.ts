import type { FastifyRequest, FastifyReply } from "fastify";
import { depositBodySchema, withdrawBodySchema, webhookBodySchema, transactionsQuerySchema } from "./wallet.schema.js";
import { depositService } from "../../domain/finance/deposit.service.js";
import { withdrawService } from "../../domain/finance/withdraw.service.js";
import { transactionRepository } from "../../infrastructure/prisma/transaction.repository.js";
import { accountRepository } from "../../infrastructure/prisma/account.repository.js";
import { userRepository } from "../../infrastructure/prisma/user.repository.js";
import { partnerTrackingRepository } from "../../infrastructure/prisma/partner-tracking.repository.js";
import { betaTransferService } from "../../services/BetaTransferService.js";
import { toTransactionDTO } from "../../shared/dto/transaction.dto.js";
import { toAccountDTO } from "../../shared/dto/account.dto.js";
import { sendAccountSnapshot } from "../../shared/websocket/ws.events.js";
import { AppError } from "../../shared/errors/AppError.js";
import { logger } from "../../shared/logger.js";

export const walletController = {
  async deposit(request: FastifyRequest, reply: FastifyReply) {
    const body = depositBodySchema.parse(request.body);
    const userId = request.userId!;

    const account = await accountRepository.findByUserIdAndType(userId, "REAL");
    if (!account) throw AppError.notFound("REAL account not found");

    const result = await depositService.initiateDeposit({
      userId,
      accountId: body.accountId ?? account.id,
      amount: body.amount,
      currency: account.currency,
    });

    return reply.status(201).send({
      transactionId: result.transaction.id,
      paymentUrl: result.paymentUrl,
      status: result.transaction.status,
      amount: result.transaction.amount,
      currency: result.transaction.currency,
    });
  },

  async withdraw(request: FastifyRequest, reply: FastifyReply) {
    const body = withdrawBodySchema.parse(request.body);
    const userId = request.userId!;

    const account = await accountRepository.findByUserIdAndType(userId, "REAL");
    if (!account) throw AppError.notFound("REAL account not found");

    const result = await withdrawService.initiateWithdrawal({
      userId,
      accountId: body.accountId ?? account.id,
      amount: body.amount,
      currency: account.currency,
      cardNumber: body.cardNumber,
      twoFactorCode: body.twoFactorCode,
    });

    return reply.status(201).send({
      transactionId: result.transaction.id,
      status: result.transaction.status,
      amount: result.transaction.amount,
      currency: result.transaction.currency,
    });
  },

  async webhook(request: FastifyRequest, reply: FastifyReply) {
    const body = webhookBodySchema.parse(request.body);
    const signature = body.sign ?? "";

    if (signature.length === 0) {
      logger.warn({ ip: request.ip }, "Webhook: missing signature");
      throw AppError.unauthorized("Invalid signature");
    }

    if (!betaTransferService.verifySignature(String(body.amount), body.order_id, signature)) {
      logger.warn({ ip: request.ip }, "Webhook: invalid HMAC signature");
      throw AppError.unauthorized("Invalid signature");
    }

    logger.info(
      { orderId: body.order_id, status: body.status },
      "Webhook received",
    );

    const tx = await transactionRepository.findById(body.order_id);
    if (!tx) {
      logger.warn({ orderId: body.order_id }, "Webhook: transaction not found");
      return reply.send({ ok: true });
    }

    const webhookAmount = Number(body.amount);
    const txAmount = Number(tx.amount);
    if (Math.abs(webhookAmount - txAmount) > 0.01) {
      logger.warn(
        { orderId: body.order_id, expected: txAmount, received: webhookAmount },
        "Webhook: amount mismatch — rejecting",
      );
      throw AppError.badRequest("Amount mismatch");
    }

    if (tx.status !== "PENDING") {
      logger.info(
        { orderId: body.order_id, currentStatus: tx.status },
        "Webhook: already processed (idempotent no-op)",
      );
      return reply.send({ ok: true });
    }

    const externalStatus = body.status;

    if (externalStatus === "confirmed" || externalStatus === "success") {
      if (tx.type === "DEPOSIT") {
        const account = await transactionRepository.confirmDeposit(tx.id, externalStatus);
        if (account) {
          sendAccountSnapshot(tx.userId, toAccountDTO(account));
        }

        // Fire and forget: record FTD if this is the partner referral's first deposit
        setImmediate(async () => {
          try {
            const user = await userRepository.findById(tx.userId);
            if (user?.partnerId) {
              const alreadyFtd = await partnerTrackingRepository.hasEvent({
                userId: tx.userId,
                type: "FTD",
              });
              if (!alreadyFtd) {
                await partnerTrackingRepository.recordEvent({
                  partnerId: user.partnerId,
                  userId: tx.userId,
                  type: "FTD",
                  amount: Number(tx.amount),
                });
              }
            }
          } catch (err) {
            logger.warn({ err, txId: tx.id, userId: tx.userId }, "webhook: failed to record FTD event");
          }
        });
      } else if (tx.type === "WITHDRAWAL") {
        const account = await transactionRepository.confirmWithdrawal(tx.id, externalStatus);
        if (account) {
          sendAccountSnapshot(tx.userId, toAccountDTO(account));
        }
      } else {
        logger.error(
          { orderId: body.order_id, txType: tx.type },
          "Webhook: unexpected transaction type for confirmation",
        );
      }
    } else if (externalStatus === "failed" || externalStatus === "rejected") {
      const account = await transactionRepository.failTransaction(
        tx.id,
        externalStatus,
        body.failure_reason,
      );
      if (account) {
        sendAccountSnapshot(tx.userId, toAccountDTO(account));
      }
    }

    return reply.send({ ok: true });
  },

  async balance(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId!;
    const account = await accountRepository.findByUserIdAndType(userId, "REAL");
    if (!account) throw AppError.notFound("REAL account not found");

    reply.header('Cache-Control', 'no-store');
    return reply.send({
      currency: account.currency,
      balance: account.balance.toString(),
    });
  },

  async transactions(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId!;
    const query = transactionsQuerySchema.parse(request.query);

    const txs = await transactionRepository.findByUserId(
      userId,
      query.limit,
      query.offset,
    );

    reply.header('Cache-Control', 'no-store');
    return reply.send({ transactions: txs.map(toTransactionDTO) });
  },
};
