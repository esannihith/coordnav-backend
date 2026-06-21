import { Server, Socket } from "socket.io";
import * as roomService from "@/services/room.service.js";
import { prisma } from "@/lib/prisma.js";
import * as Registry from "../presence.registry.js";

export const roomEvents = (io: Server, socket: Socket): void => {
  socket.on("room:join", async (data) => {
    const userId = socket.data.userId;
    const roomId = data?.roomId;

    if (!userId || !roomId) {
      socket.emit("room:error", { message: "Invalid request parameters" });
      return;
    }

    try {
      const membership = await roomService.getMembership(prisma, userId);
      if (!membership || membership.roomId !== roomId) {
        socket.emit("room:error", {
          message: "User is not a member of this room",
        });
        return;
      }

      await Registry.addSocket(roomId, userId, socket.id);

      await socket.join(roomId);
      socket.data.roomId = roomId;

      const locations = await Registry.getRoomLocations(roomId);
      const filtered = locations.filter((loc) => loc.userId !== userId);
      socket.emit("location:list", filtered);
    } catch (error: any) {
      socket.emit("room:error", {
        message: error.message || "Failed to join room",
      });
    }
  });

  // Handle location update from client
  socket.on("location:update", async (data) => {
    const userId = socket.data.userId;
    const roomId = socket.data.roomId;
    const lat = data?.lat;
    const lng = data?.lng;

    if (!userId || !roomId || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return;
    }

    try {
      await Registry.setLocation(roomId, userId, lat, lng);

      socket.to(roomId).emit("location:update", {
        userId,
        lat,
        lng,
        updatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Failed to update location:", error);
    }
  });

  socket.on("location:share:stop", async () => {
    const userId = socket.data.userId;
    const roomId = socket.data.roomId;

    if (!userId || !roomId) {
      return;
    }

    try {
      await Registry.clearLocation(roomId, userId);
      socket.to(roomId).emit("location:share:stopped", { userId });
    } catch (error: any) {
      console.error("Failed to stop location sharing:", error);
    }
  });


  socket.on("disconnect", async () => {
    const roomId = socket.data.roomId;
    const userId = socket.data.userId;

    if (roomId && userId) {
      try {
        await Registry.removeSocket(roomId, userId, socket.id);
      } catch (error: any) {
        console.error("Error handling disconnect presence cleanup:", error);
      }
    }
  });
};
