import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import { wsManager } from "./ws.manager.js";
import { authenticateWebSocket } from "./ws.auth.js";
import { handleWsMessage } from "./ws.handler.js";
import { logger } from "../shared/logger.js";

export async function wsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/ws", { websocket: true }, async (socket: WebSocket, request) => {
    let userId: string;

    try {
      userId = await authenticateWebSocket(request);
    } catch (err) {
      logger.warn({ err, ip: request.ip }, "WS auth failed");
      socket.close(4001, "Unauthorized");
      return;
    }

    wsManager.addConnection(socket, userId);

    socket.send(
      JSON.stringify({
        type: "ws:ready",
        sessionId: request.id,
        serverTime: Date.now(),
      }),
    );

    socket.on("pong", () => {
      wsManager.markAlive(socket);
    });

    socket.on("message", (data: Buffer) => {
      handleWsMessage(socket, data.toString());
    });

    socket.on("close", () => {
      wsManager.removeConnection(socket);
    });

    socket.on("error", (err: Error) => {
      logger.warn({ err, userId }, "WS connection error");
      wsManager.removeConnection(socket);
    });
  });
}
