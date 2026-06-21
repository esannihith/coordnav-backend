import { generateRefreshToken, hashRefreshToken } from "@/lib/token.js";
import { env } from "@/config/env.js";
import { prisma } from "@/lib/prisma.js";
import type { RefreshToken, RevocationReason } from "../../generated/prisma/client.js";
import { AppError } from "@/lib/app-error.js";

const createRefreshToken = async (userId: string): Promise<string> => {
  const rawToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(rawToken);
  const REFRESH_TOKEN_TTL_MS = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });
  return rawToken;
};

const validateRefreshToken = async (
  rawToken: string,
): Promise<RefreshToken | null> => {
  const tokenHash = hashRefreshToken(rawToken);

  const refreshToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash,
    },
  });

  if (!refreshToken) return null;

  // Branch 1: Revoked token (Reuse attack tripwire!)
  if (refreshToken.revokedAt) {
    if (
      refreshToken.reason === "SUPERSEDED" ||
      refreshToken.reason === "LOGOUT"
    ) {
      return null;
    }
    await revokeAllForUser(refreshToken.userId, "REUSE");
    throw new AppError(401, "Token reuse detected");
  }

  // Branch 2: Expired token
  if (refreshToken.expiresAt < new Date()) {
    return null;
  }

  // Branch 3: Valid token
  return refreshToken;
};

const rotateRefreshToken = async (oldRow: RefreshToken): Promise<string> => {
  await prisma.refreshToken.update({
    where: { id: oldRow.id },
    data: { revokedAt: new Date(), reason: "ROTATED" },
  });
  return createRefreshToken(oldRow.userId);
};

const revokeRefreshToken = async (rawToken: string): Promise<void> => {
  const tokenHash = hashRefreshToken(rawToken);

  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date(), reason: "LOGOUT" },
  });
};

const revokeAllForUser = async (
  userId: string,
  reason: RevocationReason = "LOGOUT",
): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), reason },
  });
};

const getUserIdFromToken = async (rawToken: string): Promise<string | null> => {
  const tokenHash = hashRefreshToken(rawToken);
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });
  return record ? record.userId : null;
};

export {
  createRefreshToken,
  validateRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
  getUserIdFromToken,
};
