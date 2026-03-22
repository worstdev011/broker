/**
 * Upload size check - reject oversized requests before multipart parsing
 * Saves bandwidth and CPU. Content-Length is checked against MAX_UPLOAD_SIZE + form overhead.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../config/env.js';

/** Form overhead (boundary, field names, etc.) - 1MB */
const FORM_OVERHEAD = 1024 * 1024;

export async function uploadSizeLimit(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const contentLength = request.headers['content-length'];
  if (!contentLength) {
    return; // Let multipart handle (chunked upload has no Content-Length)
  }

  const maxAllowed = env.MAX_UPLOAD_SIZE + FORM_OVERHEAD;
  const size = parseInt(contentLength, 10);
  if (!isNaN(size) && size > maxAllowed) {
    return reply.status(413).send({
      error: `Request too large. Maximum upload size: ${Math.round(env.MAX_UPLOAD_SIZE / 1024)}KB`,
    });
  }
}
