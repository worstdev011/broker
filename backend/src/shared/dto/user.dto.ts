import type { User } from "../../generated/prisma/client.js";

export interface UserPublicDTO {
  id: string;
  displayId: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  phone: string | null;
  avatarUrl: string | null;
  country: string | null;
  dateOfBirth: string | null;
  currency: string;
  kycStatus: "PENDING" | "VERIFIED" | "REJECTED" | null;
  twoFactorEnabled: boolean;
  role: "USER" | "ADMIN";
  createdAt: string;
}

export function toUserPublicDTO(user: User): UserPublicDTO {
  return {
    id: user.id,
    displayId: user.displayId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    nickname: user.nickname,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    country: user.country,
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString() : null,
    currency: user.currency,
    kycStatus: user.kycStatus,
    twoFactorEnabled: user.twoFactorEnabled,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}
