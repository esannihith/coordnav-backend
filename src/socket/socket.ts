import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { authMiddleware } from "./middlewares/auth.middleware.js";
import { registerSocketEvents } from "./events.js";

let io: Server | null = null;

const initSocket = (server: HttpServer): void => {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });
  io.use(authMiddleware);
  registerSocketEvents();
};

const getSocket = (): Server => {
  if (!io) throw new Error("Socket not initialized");
  return io;
};

export { initSocket, getSocket };
