import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/app-error.js";
import { Prisma } from "../../generated/prisma/client.js";

const generateRoomCode = () => {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const getMembership = async (tx: Prisma.TransactionClient, userId: string) => {
  return await tx.roomMember.findUnique({ where: { userId } });
};

const removeMembership = async (tx: Prisma.TransactionClient, userId: string) => {
  const membership = await getMembership(tx, userId);
  if (!membership) return null;

  await tx.roomMember.delete({ where: { userId } });

  const remaining = await tx.roomMember.count({ where: { roomId: membership.roomId } });
  if (remaining === 0) {
    await tx.room.delete({ where: { id: membership.roomId } });
  }
  return membership;
};

const getRoomMembers = async (tx: Prisma.TransactionClient, roomId: string) => {
  const rows = await tx.roomMember.findMany({
    where: { roomId },
    include: { user: true },
  });
  return rows.map(m => ({
    id: m.user.id,
    name: m.user.name,
    picture: m.user.picture,
    joinedAt: m.joinedAt,
  }));
};

const createMembership = async (tx: Prisma.TransactionClient, userId: string, roomId: string) => {
  return await tx.roomMember.create({
    data: {
      userId,
      roomId,
    }
  });
};

const getRoomAndMembers = async (tx: Prisma.TransactionClient, roomId: string) => {
  const room = await tx.room.findUnique({
    where: { id: roomId }
  });
  if (!room || !room.isActive) {
    throw new AppError(404, "Room not found or inactive");
  }
  const members = await getRoomMembers(tx, roomId);
  return { room, members };
};

const createRoom = async (userId: string, name: string) => {
  return await prisma.$transaction(async (tx) => {
    await removeMembership(tx, userId)

    // 2. Generate a unique room code
    let code = '';
    let isCodeUnique = false;
    while (!isCodeUnique) {
      code = generateRoomCode();
      const existingRoom = await tx.room.findUnique({
        where: { roomCode: code }
      });
      isCodeUnique = existingRoom === null;
    }

    // 3. Create new room
    const room = await tx.room.create({
      data: {
        name,
        roomCode: code,
      }
    });

    // 4. Join the new room
    await createMembership(tx, userId, room.id);

    return await getRoomAndMembers(tx, room.id);
  });
};

const joinRoom = async (userId: string, roomCode: string) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Find the room
    const room = await tx.room.findUnique({
      where: { roomCode }
    });

    if (!room || !room.isActive) {
      throw new AppError(404, "Room not found or inactive");
    }

    const existingMembership = await getMembership(tx, userId);

    if (existingMembership && existingMembership.roomId === room.id ) {
      return await getRoomAndMembers(tx, room.id);
    }

    await removeMembership(tx, userId);
    await createMembership(tx, userId, room.id);

    return await getRoomAndMembers(tx, room.id);
  });
};

const leaveRoom = async (userId: string) => {
  return await prisma.$transaction(async (tx) => {
    const membership = await removeMembership(tx, userId);
    if (!membership) {
      throw new AppError(404, "Room membership not found");
    }

    return { left: true };
  });
};

const getCurrentRoom = async (userId: string) => {
  return await prisma.$transaction(async (tx) => {
    const membership = await getMembership(tx, userId);
    if (!membership) {
      throw new AppError(404, "User is not in any room");
    }
    return await getRoomAndMembers(tx, membership.roomId);
  });
};

export {
  createRoom,
  joinRoom,
  leaveRoom,
  getCurrentRoom
}