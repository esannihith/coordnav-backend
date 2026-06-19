import { Server, Socket } from "socket.io";
import * as roomService from "@/services/room.service.js";
import { prisma } from "@/lib/prisma.js";

export const roomEvents = (io: Server, socket: Socket): void => {
  // Handle user joining a room
  socket.on("room:join", async (data) => {
    const userId = socket.data.userId;
    const roomId = data?.roomId;

    // Guard: Verify required parameters are present
    if (!userId || !roomId) {
      socket.emit("room:error", { message: "Invalid request parameters" });
      return;
    }

    try {
      // Guard: Verify that the user is actually a member of the room
      const membership = await roomService.getMembership(prisma, userId);
      if (!membership || membership.roomId !== roomId) {
        socket.emit("room:error", {
          message: "User is not a member of this room",
        });
        return;
      }

      // Join the socket room and store the active roomId in the socket session
      await socket.join(roomId);
      socket.data.roomId = roomId;

      // Fetch user details to broadcast membership
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, picture: true },
      });

      if (user) {
        socket.to(roomId).emit("room:member-joined", {
          id: user.id,
          name: user.name,
          picture: user.picture,
          joinedAt: new Date().toISOString(),
        });
      }

      // Broadcast the user's online presence to other members in the room
      socket.to(roomId).emit("presence:update", { userId, online: true });

      // Retrieve all sockets currently active in the room
      const sockets = await io.in(roomId).fetchSockets();

      // Map to user IDs, filtering out the joining user's own ID (standard practice)
      const onlineUserIds = sockets
        .map((s) => s.data.userId)
        .filter((id): id is string => typeof id === "string" && id !== userId);

      // Send the list of other online members to the joiner
      socket.emit("presence:list", onlineUserIds);
    } catch (error: any) {
      socket.emit("room:error", {
        message: error.message || "Failed to join room",
      });
    }
  });

  // Handle user leaving a room
  socket.on("room:leave", async () => {
    const userId = socket.data.userId;
    const roomId = socket.data.roomId;

    // Guard: Verify that the user was in a room
    if (!userId || !roomId) {
      socket.emit("room:error", { message: "Invalid request parameters" });
      return;
    }

    try {
      // Broadcast that the member left the room
      socket.to(roomId).emit("room:member-left", { userId });

      // Leave the socket room and clear the active roomId session key
      await socket.leave(roomId);
      socket.data.roomId = undefined;
    } catch (error: any) {
      socket.emit("room:error", {
        message: error.message || "Failed to leave room",
      });
    }
  });

  // Handle connection closure
  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    const userId = socket.data.userId;

    // If the user was actively in a room, broadcast their departure on disconnect
    if (roomId && userId) {
      socket.to(roomId).emit("presence:update", { userId, online: false });
    }
  });
};
