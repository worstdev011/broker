import type { FastifyRequest, FastifyReply } from "fastify";
import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { chartSettingsSchema } from "./user.schema.js";

export const chartSettingsController = {
  async get(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId!;

    const settings = await prisma.userChartSettings.findUnique({
      where: { userId },
    });

    return reply.send({
      settings: settings
        ? {
            instrument: settings.instrument,
            timeframe: settings.timeframe,
            chartType: settings.chartType,
            indicators: settings.indicators,
          }
        : null,
    });
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userId!;
    const body = chartSettingsSchema.parse(request.body);

    const data = {
      instrument: body.instrument,
      timeframe: body.timeframe,
      chartType: body.chartType,
      indicators: body.indicators as Prisma.InputJsonValue | undefined,
    };

    const settings = await prisma.userChartSettings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });

    return reply.send({
      settings: {
        instrument: settings.instrument,
        timeframe: settings.timeframe,
        chartType: settings.chartType,
        indicators: settings.indicators,
      },
    });
  },
};
