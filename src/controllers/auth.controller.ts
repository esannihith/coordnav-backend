import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/app-error.js";
import { signAccessToken } from "../lib/token.js";
import { upsertUserFromGoogle } from "../services/user.service.js";
import { verifyGoogleIdToken } from "../lib/google.js";
import * as tokenService from "../services/refresh-token.service.js";
import * as RoomService from "../services/room.service.js";
import { notifyRosterChanged } from "../socket/notifier.js";
import { prisma } from "../lib/prisma.js";


const googleSignIn = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { idToken } = req.body;

    if (!idToken) throw new AppError(400, "ID token is required");

    const payload = await verifyGoogleIdToken(idToken);
    const user = await upsertUserFromGoogle(payload);
    await tokenService.revokeAllForUser(user.id, "SUPERSEDED");
    const refreshToken = await tokenService.createRefreshToken(user.id);
    const accessToken = signAccessToken({ userId: user.id });

    res.status(200).json({
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError(400, "Refresh token is required");

    const refreshTokenRecord =
      await tokenService.validateRefreshToken(refreshToken);
    if (!refreshTokenRecord)
      throw new AppError(401, "Invalid or expired refresh token");

    const newAccessToken = signAccessToken({
      userId: refreshTokenRecord.userId,
    });
    const newRefreshToken =
      await tokenService.rotateRefreshToken(refreshTokenRecord);

    res.status(200).json({
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

const signout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError(400, "Refresh token is required");

    const userId = await tokenService.getUserIdFromToken(refreshToken);
    let roomIdToNotify: string | null = null;

    if (userId) {
      const membership = await RoomService.getMembership(prisma, userId);
      if (membership) {
        roomIdToNotify = membership.roomId;
        await RoomService.leaveRoom(userId);
      }
    }

    await tokenService.revokeRefreshToken(refreshToken);

    if (roomIdToNotify) {
      notifyRosterChanged(roomIdToNotify);
    }

    res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

export { googleSignIn, refresh, signout };
