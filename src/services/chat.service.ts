import { prisma } from "@/lib/prisma.js";
import { Prisma, MessageKind, Message } from "../../generated/prisma/client.js";
import {
  ChatMessage,
  MessageSender,
  PlaceSnapshot,
} from "@/types/chat.type.js";

export const MESSAGE_HISTORY_LIMIT = 50;
export const MESSAGE_HISTORY_MAX = 100;

const senderInclude = {
  sender: { select: { id: true, name: true, picture: true } },
} satisfies Prisma.MessageInclude;

type MessageRow = Message & { sender: MessageSender };

const toChatMessage = (row: MessageRow): ChatMessage => ({
  id: row.id,
  roomId: row.roomId,
  sender: row.sender,
  kind: row.kind,
  text: row.text ?? undefined,
  place: row.place ? (row.place as unknown as PlaceSnapshot) : undefined,
  createdAt: row.createdAt.toISOString(),
});

type CreateMessageInput = {
  roomId: string;
  senderId: string;
  kind: MessageKind;
  text?: string;
  place?: PlaceSnapshot;
};

const createMessage = async (
  input: CreateMessageInput,
): Promise<ChatMessage> => {
  const row = await prisma.message.create({
    data: {
      roomId: input.roomId,
      senderId: input.senderId,
      kind: input.kind,
      text: input.text ?? null,
      place: input.place
        ? (input.place as unknown as Prisma.InputJsonValue)
        : undefined,
    },
    include: senderInclude,
  });

  return toChatMessage(row);
};

// Newest-first page of a room's messages, scoped to the requesting member's
// visibility window: only messages created at/after `since` (their joinedAt),
// capped at `limit`. `before` (a message's createdAt) pages further back.
const getMessages = async (
  roomId: string,
  since: Date,
  limit: number,
  before?: Date,
): Promise<ChatMessage[]> => {
  const rows = await prisma.message.findMany({
    where: {
      roomId,
      createdAt: {
        gte: since,
        ...(before ? { lt: before } : {}),
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: senderInclude,
  });

  return rows.map(toChatMessage);
};

export { createMessage, getMessages };
