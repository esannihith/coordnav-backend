import { prisma } from "@/lib/prisma.js";
import { AppError } from "@/lib/app-error.js";
import { Prisma, RoomMember } from "../../generated/prisma/client.js";

const generateRoomCode = (): string => {
  const characters = "ACDEFHJKMNPQRTUVWXY3479";

  let result = "";

  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return result;
};

const getMembership = (
  tx: Prisma.TransactionClient | typeof prisma,
  userId: string,
) => {
  return tx.roomMember.findUnique({
    where: { userId },
  });
};

const removeMembership = async (
  tx: Prisma.TransactionClient,
  membership: RoomMember | null,
) => {
  if (!membership) return null;

  await tx.roomMember.delete({
    where: { id: membership.id },
  });

  const remainingMembers = await tx.roomMember.count({
    where: {
      roomId: membership.roomId,
    },
  });

  if (remainingMembers === 0) {
    await tx.room.delete({
      where: {
        id: membership.roomId,
      },
    });
  }

  return membership;
};

const createMembership = (
  tx: Prisma.TransactionClient,
  userId: string,
  roomId: string,
) => {
  return tx.roomMember.create({
    data: {
      userId,
      roomId,
    },
  });
};

const getRoomAndMembers = async (
  tx: Prisma.TransactionClient | typeof prisma,
  roomId: string,
) => {
  const room = await tx.room.findUnique({
    where: { id: roomId },
    include: {
      members: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!room || !room.isActive) {
    throw new AppError(404, "Room not found or inactive");
  }

  const members = room.members.map((member) => ({
    id: member.user.id,
    name: member.user.name,
    picture: member.user.picture,
    joinedAt: member.joinedAt,
  }));

  const { members: _, ...roomData } = room;

  return {
    room: roomData,
    members,
  };
};

const MAX_ROOM_CODE_ATTEMPTS = 5;

const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

const createRoom = async (userId: string, name: string) => {
  // Retry on the (astronomically rare) room-code collision instead of a
  // pre-check loop — the unique constraint is the source of truth, and the
  // membership check happens inside the transaction so an already-in-a-room
  // user is rejected before any insert (no wasted code lookups).
  for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt++) {
    const roomCode = generateRoomCode();
    try {
      return await prisma.$transaction(async (tx) => {
        const membership = await getMembership(tx, userId);

        if (membership) {
          const current = await getRoomAndMembers(tx, membership.roomId);
          return { ...current, alreadyInRoom: true as const };
        }

        const room = await tx.room.create({
          data: {
            name,
            roomCode,
          },
        });

        await createMembership(tx, userId, room.id);

        return getRoomAndMembers(tx, room.id);
      });
    } catch (error) {
      // A unique-constraint hit is either a room-code collision (retry with a
      // fresh code) or a concurrent membership (the retry re-checks and returns
      // the alreadyInRoom conflict). Anything else propagates.
      if (isUniqueConstraintError(error)) continue;
      throw error;
    }
  }

  throw new AppError(500, "Failed to generate a unique room code");
};

const joinRoom = async (userId: string, roomCode: string) => {
  return prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { roomCode },
    });

    if (!room || !room.isActive) {
      throw new AppError(404, "Room not found or inactive");
    }

    const membership = await getMembership(tx, userId);

    if (membership) {
      // Idempotent re-join of the same room; otherwise report the conflict with
      // the current room (fetched atomically) without destroying the existing
      // membership — switching requires an explicit leave.
      if (membership.roomId === room.id) {
        return getRoomAndMembers(tx, room.id);
      }
      const current = await getRoomAndMembers(tx, membership.roomId);
      return { ...current, alreadyInRoom: true as const };
    }

    await createMembership(tx, userId, room.id);

    return getRoomAndMembers(tx, room.id);
  });
};

const leaveRoom = async (userId: string) => {
  return prisma.$transaction(async (tx) => {
    const membership = await getMembership(tx, userId);

    if (!membership) {
      throw new AppError(404, "Room membership not found");
    }

    await removeMembership(tx, membership);

    return {
      left: true,
      roomId: membership.roomId,
    };
  });
};

const getCurrentRoom = async (userId: string) => {
  const membership = await getMembership(prisma, userId);

  if (!membership) {
    throw new AppError(404, "User is not in any room");
  }

  return getRoomAndMembers(prisma, membership.roomId);
};

export {
  createRoom,
  joinRoom,
  leaveRoom,
  getCurrentRoom,
  getRoomAndMembers,
  getMembership,
};
