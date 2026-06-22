import { Request, Response } from "express";
import { AppError } from "@/lib/app-error.js";
import { prisma } from "@/lib/prisma.js";
import { getMembership } from "@/services/room.service.js";
import * as ChatService from "@/services/chat.service.js";

// GET /api/v1/room/messages?limit=&before=
// Returns the current room's recent messages, scoped to the caller's membership
// window (createdAt >= joinedAt) and capped at `limit` (newest-first).
const getMessages = async (req: Request, res: Response) => {
  const userId = req.userId as string;

  const membership = await getMembership(prisma, userId);
  if (!membership) throw new AppError(404, "User is not in any room");

  const limitRaw = Number(req.query.limit);
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(Math.floor(limitRaw), ChatService.MESSAGE_HISTORY_MAX)
      : ChatService.MESSAGE_HISTORY_LIMIT;

  let before: Date | undefined;
  const beforeRaw = req.query.before;
  if (typeof beforeRaw === "string" && beforeRaw.length > 0) {
    const parsed = new Date(beforeRaw);
    if (Number.isNaN(parsed.getTime()))
      throw new AppError(400, "Invalid 'before' cursor");
    before = parsed;
  }

  const messages = await ChatService.getMessages(
    membership.roomId,
    membership.joinedAt,
    limit,
    before,
  );

  res.status(200).json({
    data: { messages },
  });
};

export { getMessages };
