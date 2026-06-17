import { generateRefreshToken, hashRefreshToken } from "../lib/token.js";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import type { RefreshToken } from "../../generated/prisma/client.js";
import { AppError } from "../lib/app-error.js";

const createRefreshToken = async (userId: string): Promise<string> => {
  const rawToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(rawToken);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 3600 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });
  return rawToken;
};

const findValidRefreshToken = async (rawToken: string): Promise<RefreshToken | null> => {
  const tokenHash = hashRefreshToken(rawToken);

  const refreshToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash,
    },
  });

  if (!refreshToken) {
    return null;
  }

  // Branch 1: Revoked token (Reuse attack tripwire!)
  if (refreshToken.revokedAt !== null) {
    await revokeAllForUser(refreshToken.userId);
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
  // TODO: wrap in prisma.$transaction for atomicity
  await prisma.refreshToken.update({
    where: { id: oldRow.id },
    data: { revokedAt: new Date() },
  });
  return createRefreshToken(oldRow.userId);
};

const revokeRefreshToken = async (rawToken: string): Promise<void> => {
  const tokenHash = hashRefreshToken(rawToken);

  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

const revokeAllForUser = async (userId: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

export {
  createRefreshToken,
  findValidRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
};