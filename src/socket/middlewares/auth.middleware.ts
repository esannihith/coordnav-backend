import { Socket } from "socket.io";
import { verifyAccessToken } from "@/lib/token.js";
import { AppError } from "@/lib/app-error.js"; 

export const authMiddleware = (
  socket: Socket,
  next: (err?: Error) => void,
): void => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      const err = new Error("Authentication required");
      (err as any).data = { code: "TOKEN_INVALID" };
      return next(err);
    }

    const { userId } = verifyAccessToken(token);
    socket.data.userId = userId;

    next();
  } catch (error: any) {
    const err = new Error("Authentication failed");
    
    if (error instanceof AppError && error.message === "Token expired") {
      (err as any).data = { code: "TOKEN_EXPIRED" };
    } else {
      (err as any).data = { code: "TOKEN_INVALID" };
    }
    
    next(err);
  }
};
