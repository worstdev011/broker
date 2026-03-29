import type { FastifyRequest, FastifyReply } from "fastify";
import { terminalService } from "../../domain/terminal/terminal.service.js";

export const terminalController = {
  async snapshot(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId!;
    const { instrument } = request.query as { instrument?: string };

    const data = await terminalService.getSnapshot(userId, instrument);
    return reply.send(data);
  },
};
