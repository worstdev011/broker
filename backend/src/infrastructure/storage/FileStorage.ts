import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../../shared/types/env.js";
import { AppError } from "../../shared/errors/AppError.js";
import { logger } from "../../shared/logger.js";

const MAGIC_BYTES: Record<string, number[]> = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47],
  webp: [0x52, 0x49, 0x46, 0x46],
};

const EXT_MAP: Record<string, string> = {
  jpeg: ".jpg",
  png: ".png",
  webp: ".webp",
};

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

function detectFormat(buffer: Buffer): string | null {
  for (const [format, bytes] of Object.entries(MAGIC_BYTES)) {
    if (buffer.length >= bytes.length && bytes.every((b, i) => buffer[i] === b)) {
      return format;
    }
  }
  return null;
}

export const fileStorage = {
  /**
   * Validate magic bytes and size BEFORE writing anything to disk.
   * Returns the saved relative path (e.g. "avatars/uuid.jpg").
   */
  async saveAvatar(buffer: Buffer, originalFilename: string): Promise<string> {
    if (buffer.length > MAX_SIZE) {
      throw AppError.badRequest("File too large (max 2 MB)");
    }

    if (buffer.length < 4) {
      throw AppError.badRequest("File too small to be a valid image");
    }

    const format = detectFormat(buffer);
    if (!format) {
      throw AppError.badRequest("Unsupported image format. Allowed: JPEG, PNG, WebP");
    }

    const ext = EXT_MAP[format] ?? path.extname(originalFilename).toLowerCase();
    const filename = `${crypto.randomUUID()}${ext}`;
    const dir = path.join(env().UPLOAD_DIR, "avatars");

    await mkdir(dir, { recursive: true });
    const fullPath = path.join(dir, filename);
    await writeFile(fullPath, buffer);

    logger.debug({ filename, format, size: buffer.length }, "Avatar saved");
    return `avatars/${filename}`;
  },

  async deleteAvatar(relativePath: string): Promise<void> {
    if (!relativePath) return;
    const fullPath = path.join(env().UPLOAD_DIR, relativePath);
    const resolved = path.resolve(fullPath);
    const baseDir = path.resolve(env().UPLOAD_DIR);
    if (!resolved.startsWith(baseDir + path.sep) && resolved !== baseDir) {
      logger.warn({ path: relativePath }, "Path traversal attempt blocked");
      return;
    }
    try {
      await unlink(fullPath);
      logger.debug({ path: relativePath }, "Avatar deleted");
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        logger.warn({ err, path: relativePath }, "Failed to delete avatar file");
      }
    }
  },
};
