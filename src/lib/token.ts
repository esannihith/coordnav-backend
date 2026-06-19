import { env } from "../config/env.js";
import jwt, { JwtPayload, type SignOptions } from "jsonwebtoken";
import crypto from "node:crypto";
import { AppError } from "./app-error.js";

type AccessTokenPayload = {
  userId: string;
};

const signAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions["expiresIn"],
  });
};

const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

    if (typeof decoded.userId !== "string")
      throw new AppError(401, "Invalid token");

    return {
      userId: decoded.userId,
    };
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError)
      throw new AppError(401, "Token expired");
    throw new AppError(401, "Invalid or expired token");
  }
};

const generateRefreshToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

const hashRefreshToken = (raw: string): string => {
  return crypto.createHash("sha256").update(raw).digest("hex");
};

export {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
};
