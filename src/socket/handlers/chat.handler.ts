import { Server, Socket } from "socket.io";
import { prisma } from "@/lib/prisma.js";
import { getMembership } from "@/services/room.service.js";
import * as chatService from "@/services/chat.service.js";
import { PlaceSnapshot } from "@/types/chat.type.js";

const MESSAGE_TEXT_MAX = 2000;

const isValidPlace = (place: any): place is PlaceSnapshot =>
  !!place &&
  typeof place.placeId === "string" &&
  place.placeId.length > 0 &&
  typeof place.name === "string" &&
  place.name.trim().length > 0 &&
  Number.isFinite(place.lat) &&
  place.lat >= -90 &&
  place.lat <= 90 &&
  Number.isFinite(place.lng) &&
  place.lng >= -180 &&
  place.lng <= 180;

export const chatEvents = (io: Server, socket: Socket): void => {
  socket.on("chat:send", async (data) => {
    const userId = socket.data.userId;
    const roomId = socket.data.roomId;
    const clientId = data?.clientId;

    if (!userId || !roomId) {
      socket.emit("chat:error", { clientId, message: "Not in a room" });
      return;
    }

    try {
      // Chat writes persist, so guard a stale/evicted-but-connected socket whose
      // membership has changed since room:join.
      const membership = await getMembership(prisma, userId);
      if (!membership || membership.roomId !== roomId) {
        socket.emit("chat:error", {
          clientId,
          message: "Not a member of this room",
        });
        return;
      }

      const kind = data?.kind;
      let message;

      if (kind === "TEXT") {
        const text = typeof data?.text === "string" ? data.text.trim() : "";
        if (text.length === 0 || text.length > MESSAGE_TEXT_MAX) {
          socket.emit("chat:error", {
            clientId,
            message: "Invalid message text",
          });
          return;
        }
        message = await chatService.createMessage({
          roomId,
          senderId: userId,
          kind: "TEXT",
          text,
        });
      } else if (kind === "PLACE") {
        const place = data?.place;
        if (!isValidPlace(place)) {
          socket.emit("chat:error", { clientId, message: "Invalid place" });
          return;
        }
        const snapshot: PlaceSnapshot = {
          placeId: place.placeId,
          name: place.name.trim(),
          address:
            typeof place.address === "string" ? place.address : undefined,
          lat: place.lat,
          lng: place.lng,
        };
        message = await chatService.createMessage({
          roomId,
          senderId: userId,
          kind: "PLACE",
          place: snapshot,
        });
      } else {
        socket.emit("chat:error", { clientId, message: "Unknown message kind" });
        return;
      }

      // Broadcast to the whole room (sender included). The echoed clientId lets
      // the sender reconcile its optimistic bubble with the authoritative row.
      io.to(roomId).emit("chat:new", { ...message, clientId });
    } catch (error: any) {
      console.error("Failed to send chat message:", error);
      socket.emit("chat:error", { clientId, message: "Failed to send message" });
    }
  });
};
