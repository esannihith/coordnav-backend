import { Request, Response } from "express";
import { AppError } from "@/lib/app-error.js";
import * as RoomService from "@/services/room.service.js";
import { notifyRosterChanged } from "../socket/notifier.js";
import { RoomDestinationInput } from "@/types/room.type.js";

const parseDestination = (value: unknown): RoomDestinationInput => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError(400, "Destination must be an object");
  }

  const candidate = value as Record<string, unknown>;
  const placeId =
    typeof candidate.placeId === "string" ? candidate.placeId.trim() : "";
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  const formattedAddress =
    typeof candidate.formattedAddress === "string"
      ? candidate.formattedAddress.trim()
      : "";
  const lat = candidate.lat;
  const lng = candidate.lng;

  if (!placeId || !name || !formattedAddress) {
    throw new AppError(
      400,
      "Destination placeId, name, and formattedAddress are required",
    );
  }

  if (
    typeof lat !== "number" ||
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90 ||
    typeof lng !== "number" ||
    !Number.isFinite(lng) ||
    lng < -180 ||
    lng > 180
  ) {
    throw new AppError(400, "Destination coordinates are invalid");
  }

  return { placeId, name, formattedAddress, lat, lng };
};

// Already-in-a-room conflict: same single `{ data }` envelope as every other
// endpoint, carrying the current room+members so the client can offer a
// non-destructive Rejoin. HTTP 409 + data.errorCode are the discriminators.
const respondAlreadyInRoom = (
  res: Response,
  room: unknown,
  members: unknown,
): void => {
  res.status(409).json({
    data: {
      errorCode: "ALREADY_IN_ROOM",
      room,
      members,
    },
  });
};

const createRoom = async (req: Request, res: Response) => {
  const userId = req.userId as string;
  const { name, destination } = req.body ?? {};

  if (typeof name !== "string")
    throw new AppError(400, "Room name is required");

  const roomName = name.trim();
  if (roomName.length === 0) throw new AppError(400, "Room name is required");

  if (roomName.length > 50)
    throw new AppError(400, "Room name cannot be longer than 50 characters");

  const parsedDestination =
    destination === undefined || destination === null
      ? null
      : parseDestination(destination);

  const result = await RoomService.createRoom(
    userId,
    roomName,
    parsedDestination,
  );
  if ("alreadyInRoom" in result) {
    return respondAlreadyInRoom(res, result.room, result.members);
  }

  res.status(201).json({
    data: {
      room: result.room,
      members: result.members,
    },
  });
};

const joinRoom = async (req: Request, res: Response) => {
  const userId = req.userId as string;
  const { code } = req.body;

  if (typeof code !== "string")
    throw new AppError(400, "Room code is required");

  const roomCode = code.trim().toUpperCase();

  if (roomCode.length === 0) throw new AppError(400, "Room code is required");

  if (roomCode.length !== 6) throw new AppError(400, "Room code is invalid");

  const result = await RoomService.joinRoom(userId, roomCode);
  if ("alreadyInRoom" in result) {
    return respondAlreadyInRoom(res, result.room, result.members);
  }

  notifyRosterChanged(result.room.id);
  res.status(200).json({
    data: {
      room: result.room,
      members: result.members,
    },
  });
};

const leaveRoom = async (req: Request, res: Response) => {
  const userId = req.userId as string;
  const result = await RoomService.leaveRoom(userId);
  notifyRosterChanged(result.roomId);
  res.status(200).json({
    data: result,
  });
};

const currentRoom = async (req: Request, res: Response) => {
  const userId = req.userId as string;
  const { room, members } = await RoomService.getCurrentRoom(userId);
  res.status(200).json({
    data: {
      room,
      members,
    },
  });
};

const updateDestination = async (req: Request, res: Response) => {
  const userId = req.userId as string;
  const { destination } = req.body ?? {};

  if (destination === undefined) {
    throw new AppError(400, "Destination is required; use null to clear it");
  }

  const parsedDestination =
    destination === null ? null : parseDestination(destination);
  const { room, members } = await RoomService.updateDestination(
    userId,
    parsedDestination,
  );

  notifyRosterChanged(room.id);

  res.status(200).json({
    data: {
      room,
      members,
    },
  });
};

export { createRoom, joinRoom, leaveRoom, currentRoom, updateDestination };
