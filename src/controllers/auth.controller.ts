import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/app-error.js";
import { signAccessToken } from "../lib/token.js";
import { upsertUserFromGoogle } from "../services/user.service.js";
import { verifyGoogleIdToken } from "../lib/google.js";
import { leaveRoom } from "../services/room.service.js";
import {
  createRefreshToken,
  findValidRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from "../services/refresh-token.service.js";

const googleSignIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      throw new AppError(400, "ID token is required");
    }

    const payload = await verifyGoogleIdToken(idToken);
    const user = await upsertUserFromGoogle(payload);
    const refreshToken = await createRefreshToken(user.id);
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
    if (!refreshToken) {
      throw new AppError(400, "Refresh token is required");
    }

    const validRefreshToken = await findValidRefreshToken(refreshToken);
    if (!validRefreshToken) {
      throw new AppError(401, "Invalid or expired refresh token");
    }

    const newAccessToken = signAccessToken({ userId: validRefreshToken.userId });
    const newRefreshToken = await rotateRefreshToken(validRefreshToken);

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
    if (!refreshToken) {
      throw new AppError(400, "Refresh token is required");
    }

    const tokenInfo = await findValidRefreshToken(refreshToken).catch(() => null);
    if (tokenInfo) {
      try {
        await leaveRoom(tokenInfo.userId);
      } catch (error) {
        // Ignore if user is not in any room
      }
    }

    await revokeRefreshToken(refreshToken);

    res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

export { googleSignIn, refresh, signout };