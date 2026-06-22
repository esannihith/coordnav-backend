import { Request, Response } from "express";
import { AppError } from "@/lib/app-error.js";
import * as RoomService from "@/services/room.service.js";
import { notifyRosterChanged } from "../socket/notifier.js";

// Create/join reject (409) when the user is already in a room. Responds with the
// same single `{ data }` envelope as every other endpoint, carrying the current
// room+members so the client can offer a non-destructive Rejoin. HTTP 409 +
// data.errorCode are the discriminators.
const respondAlreadyInRoom = async (
  res: Response,
  userId: string,
): Promise<void> => {
  const { room, members } = await RoomService.getCurrentRoom(userId);
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
  const { name } = req.body;

  if (typeof name !== "string")
    throw new AppError(400, "Room name is required");

  const roomName = name.trim();
  if (roomName.length === 0) throw new AppError(400, "Room name is required");

  if (roomName.length > 50)
    throw new AppError(400, "Room name cannot be longer than 50 characters");

  try {
    const { room, members } = await RoomService.createRoom(userId, roomName);
    res.status(201).json({
      data: {
        room,
        members,
      },
    });
  } catch (error) {
    if (error instanceof AppError && error.errorCode === "ALREADY_IN_ROOM") {
      return respondAlreadyInRoom(res, userId);
    }
    throw error;
  }
};

const joinRoom = async (req: Request, res: Response) => {
  const userId = req.userId as string;
  const { code } = req.body;

  if (typeof code !== "string")
    throw new AppError(400, "Room code is required");

  const roomCode = code.trim().toUpperCase();

  if (roomCode.length === 0) throw new AppError(400, "Room code is required");

  if (roomCode.length !== 6) throw new AppError(400, "Room code is invalid");

  try {
    const { room, members } = await RoomService.joinRoom(userId, roomCode);
    notifyRosterChanged(room.id);
    res.status(200).json({
      data: {
        room,
        members,
      },
    });
  } catch (error) {
    if (error instanceof AppError && error.errorCode === "ALREADY_IN_ROOM") {
      return respondAlreadyInRoom(res, userId);
    }
    throw error;
  }
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

export { createRoom, joinRoom, leaveRoom, currentRoom };
