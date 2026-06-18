import { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/app-error.js";
import {
    createRoom as createRoomService,
    joinRoom as joinRoomService,
    leaveRoom as leaveRoomService,
    getCurrentRoom as getCurrentRoomService
} from "../services/room.service.js";

const createRoom = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId as string;
    const { name } = req.body;
    const roomName = name.trim();
    if (typeof roomName !== "string" || roomName.length === 0)
        throw new AppError(400, "Room name is required");
    
    if (roomName.length > 50) 
        throw new AppError(400, "Room name cannot be longer than 50 characters");
    
    const { room, members }  = await createRoomService(userId, name);
    res.status(201).json({
        data : {
            room, 
            members
        }
    })
}

const joinRoom = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId as string;
    const { roomCode } = req.body;
    const code = roomCode.trim().toUpperCase();
    if (typeof code !== "string" || code.length === 0)
        throw new AppError(400, "Room code is required");
    
    if(code.length !== 6)
        throw new AppError(400, "Room code is invalid");

    const { room, members } = await joinRoomService(userId, code);
    res.status(200).json({
        data: {
            room,
            members
        }
    })
}

const leaveRoom = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId as string;
    const result = await leaveRoomService(userId);
    res.status(200).json({
        data : {
            result
        }
    })
}

const currentRoom = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId as string;
    const { room, members } = await getCurrentRoomService(userId);
    res.status(200).json({
        data: {
            room,
            members
        }
    });
}

export {
    createRoom, 
    joinRoom, 
    leaveRoom,
    currentRoom
}