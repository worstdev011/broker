import type { FastifyRequest, FastifyReply } from "fastify";
import { instrumentService } from "../../domain/instruments/instrument.service.js";
import { updatePayoutBodySchema, instrumentParamsSchema } from "./instruments.schema.js";

export const instrumentsController = {
  async handleList(
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const instruments = await instrumentService.listActive();
    reply.send(instruments);
  },

  async handleUpdatePayout(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = instrumentParamsSchema.parse(request.params);
    const body = updatePayoutBodySchema.parse(request.body);
    const instrument = await instrumentService.updatePayout(id, body.payoutPercent);
    reply.send(instrument);
  },

  async handleToggle(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const { id } = instrumentParamsSchema.parse(request.params);
    const instrument = await instrumentService.toggleActive(id);
    reply.send(instrument);
  },
};
