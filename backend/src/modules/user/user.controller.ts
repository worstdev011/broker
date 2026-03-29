import { createHash } from "node:crypto";
import type { FastifyRequest, FastifyReply } from "fastify";
import { userService } from "../../domain/user/user.service.js";
import { AppError } from "../../shared/errors/AppError.js";
import {
  updateProfileSchema,
  changePasswordSchema,
  setPasswordSchema,
  deleteProfileSchema,
  verify2FASchema,
  disable2FASchema,
} from "./user.schema.js";

const ALLOWED_AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const userController = {
  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    const user = await userService.getProfile(request.userId!);
    return reply.send({ user });
  },

  async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    const body = updateProfileSchema.parse(request.body);
    const user = await userService.updateProfile(request.userId!, body);
    return reply.send({ user });
  },

  async uploadAvatar(request: FastifyRequest, reply: FastifyReply) {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: "BAD_REQUEST", message: "No file uploaded" });
    }

    if (!ALLOWED_AVATAR_MIME_TYPES.has(data.mimetype)) {
      throw AppError.badRequest("Unsupported file type. Allowed: JPEG, PNG, WebP");
    }

    const buffer = await data.toBuffer();
    const avatarUrl = await userService.uploadAvatar(
      request.userId!,
      buffer,
      data.filename,
    );
    return reply.send({ avatarUrl });
  },

  async deleteAvatar(request: FastifyRequest, reply: FastifyReply) {
    await userService.deleteAvatar(request.userId!);
    return reply.status(204).send();
  },

  async deleteProfile(request: FastifyRequest, reply: FastifyReply) {
    const body = deleteProfileSchema.parse(request.body ?? {});
    await userService.deleteAccount(request.userId!, body.password);
    return reply.status(204).send();
  },

  async changePassword(request: FastifyRequest, reply: FastifyReply) {
    const body = changePasswordSchema.parse(request.body);
    await userService.changePassword(request.userId!, body.currentPassword, body.newPassword);
    return reply.send({ message: "Password changed" });
  },

  async setPassword(request: FastifyRequest, reply: FastifyReply) {
    const body = setPasswordSchema.parse(request.body);
    await userService.setPassword(request.userId!, body.newPassword);
    return reply.send({ message: "Password set" });
  },

  async getSessions(request: FastifyRequest, reply: FastifyReply) {
    const sessions = await userService.getSessions(request.userId!);
    return reply.send({ sessions });
  },

  async deleteSession(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    await userService.deleteSession(request.userId!, id);
    return reply.status(204).send();
  },

  async deleteOtherSessions(request: FastifyRequest, reply: FastifyReply) {
    const signed = request.cookies["session_token"];
    if (!signed) {
      return reply.status(401).send({ error: "UNAUTHORIZED", message: "No session" });
    }
    const unsigned = request.unsignCookie(signed);
    if (!unsigned.valid || !unsigned.value) {
      return reply.status(401).send({ error: "UNAUTHORIZED", message: "Invalid cookie" });
    }
    const currentHash = createHash("sha256").update(unsigned.value).digest("hex");
    const count = await userService.deleteOtherSessions(request.userId!, currentHash);
    return reply.send({ deleted: count });
  },

  async enable2FA(request: FastifyRequest, reply: FastifyReply) {
    const result = await userService.enable2FA(request.userId!);
    return reply.send({ qrCode: result.qrCode });
  },

  async verify2FA(request: FastifyRequest, reply: FastifyReply) {
    const body = verify2FASchema.parse(request.body);
    await userService.verify2FA(request.userId!, body.code);
    return reply.send({ message: "2FA enabled" });
  },

  async disable2FA(request: FastifyRequest, reply: FastifyReply) {
    const body = disable2FASchema.parse(request.body);
    await userService.disable2FA(request.userId!, body.password, body.code);
    return reply.send({ message: "2FA disabled" });
  },
};
