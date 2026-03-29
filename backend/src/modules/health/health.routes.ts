import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });
}
