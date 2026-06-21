import { Request, Response } from "express";
import { AppError } from "@/lib/app-error.js";
import * as RoomService from "@/services/room.service.js";
import { notifyRosterChanged } from "../socket/notifier.js";


const createRoom = async (req: Request, res: Response) => {
  const userId = req.userId as string;
  const { name } = req.body;

  if (typeof name !== "string")
    throw new AppError(400, "Room name is required");

  const roomName = name.trim();
  if (roomName.length === 0) throw new AppError(400, "Room name is required");

  if (roomName.length > 50)
    throw new AppError(400, "Room name cannot be longer than 50 characters");

  const { room, members } = await RoomService.createRoom(userId, roomName);
  res.status(201).json({
    data: {
      room,
      members,
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

  const { room, members } = await RoomService.joinRoom(userId, roomCode);
  notifyRosterChanged(room.id);
  res.status(200).json({
    data: {
      room,
      members,
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

export { createRoom, joinRoom, leaveRoom, currentRoom };
