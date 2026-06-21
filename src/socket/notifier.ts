import { getSocket } from "./socket.js";

/**
 * Notifies all active room sockets that the roster has changed.
 * This is a best-effort operation and will never throw errors into the caller.
 */
export const notifyRosterChanged = (roomId: string): void => {
  try {
    const io = getSocket();
    io.to(roomId).emit("room:roster-changed", { roomId });
  } catch (error) {
    console.error(`[Notifier] Failed to emit roster-changed event for room ${roomId}:`, error);
  }
};
