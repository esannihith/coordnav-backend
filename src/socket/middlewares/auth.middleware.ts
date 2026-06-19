import { Socket } from "socket.io";
import { verifyAccessToken } from "@/lib/token.js";

export const authMiddleware = (
  socket: Socket,
  next: (err?: Error) => void,
): void => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) return next(new Error("Authentication required"));

    const { userId } = verifyAccessToken(token);
    socket.data.userId = userId;

    next();
  } catch (error) {
    next(new Error("Authentication failed"));
  }
};
