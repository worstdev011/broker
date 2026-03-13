import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { logger } from '../shared/logger.js';
import { AppError } from '../shared/errors/AppError.js';
import { env } from '../config/env.js';

function formatZodError(zodError: ZodError) {
  const details: Record<string, string[]> = {};

  for (const issue of zodError.issues) {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
    if (!details[path]) {
      details[path] = [];
    }
    details[path].push(issue.message);
  }

  return {
    error: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    details,
  };
}

export async function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  logger.error(
    {
      err: error,
      requestId: request.id,
      url: request.url,
      method: request.method,
      userId: (request as { userId?: string }).userId,
      statusCode: error instanceof AppError ? error.statusCode : undefined,
    },
    'Request error',
  );

  if (error instanceof ZodError) {
    return reply.status(400).send(formatZodError(error));
  }

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
    });
  }

  const fastifyErr = error as FastifyError;

  // CSRF token validation failures
  if (fastifyErr.code === 'FST_CSRF_MISSING_SECRET' || fastifyErr.code?.startsWith('FST_CSRF')) {
    return reply.status(403).send({
      error: 'CSRF_ERROR',
      message: 'Invalid or missing CSRF token',
    });
  }

  if ('validation' in fastifyErr && fastifyErr.validation) {
    return reply.status(400).send({
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: fastifyErr.validation,
    });
  }

  if (fastifyErr.statusCode != null) {
    return reply.status(fastifyErr.statusCode).send({
      error: 'HTTP_ERROR',
      message: fastifyErr.message || 'An error occurred',
    });
  }

  const isProduction = env.NODE_ENV === 'production';
  return reply.status(500).send({
    error: 'INTERNAL_SERVER_ERROR',
    message: isProduction ? 'An internal server error occurred' : error.message,
    ...(isProduction ? {} : { stack: error.stack }),
  });
}
