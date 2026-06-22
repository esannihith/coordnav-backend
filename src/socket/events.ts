import { getSocket } from "./socket.js";
import { roomEvents } from "./handlers/room.handler.js";
import { chatEvents } from "./handlers/chat.handler.js";

export const registerSocketEvents = (): void => {
  const io = getSocket();
  io.on("connection", (socket) => {
    console.log("Socket connected : ", socket.id);
    roomEvents(io, socket);
    chatEvents(io, socket);
  });
};
