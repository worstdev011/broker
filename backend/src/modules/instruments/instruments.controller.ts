import type { FastifyRequest, FastifyReply } from 'fastify';
import { INSTRUMENTS } from '../../config/instruments.js';
import { getInstrumentRepository } from '../../shared/serviceFactory.js';
import { InstrumentNotFoundError } from '../../domain/trades/TradeErrors.js';

export class InstrumentsController {
  private get instrumentRepository() {
    return getInstrumentRepository();
  }

  async getInstruments(_request: FastifyRequest, reply: FastifyReply) {
    const instruments = await this.instrumentRepository.findAll();

    const response = instruments.map((inst) => ({
      id: inst.id,
      name: `${inst.base} / ${inst.quote}`,
      base: inst.base,
      quote: inst.quote,
      digits: inst.digits,
      payoutPercent: inst.payoutPercent ?? 75,
    }));

    return reply.send(response);
  }

  async updatePayout(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { payoutPercent: number };
    }>,
    reply: FastifyReply,
  ) {
    const { id } = request.params;
    const { payoutPercent } = request.body;

    if (!INSTRUMENTS[id]) {
      throw new InstrumentNotFoundError(id);
    }

    await this.instrumentRepository.updatePayout(id, payoutPercent);

    return reply.send({ success: true });
  }
}
