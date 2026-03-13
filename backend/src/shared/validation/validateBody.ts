import type { FastifyRequest } from 'fastify';
import type { ZodSchema } from 'zod';

/**
 * Parses request.body with a Zod schema.
 * Throws ZodError on failure — caught by the global error handler.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return async function (request: FastifyRequest) {
    const parsed = schema.parse(request.body);
    (request as FastifyRequest & { body: T }).body = parsed;
  };
}
