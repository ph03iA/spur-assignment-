import { MessageSender, type Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export type PersistedMessage = {
  id: string;
  sender: "user" | "ai";
  text: string;
  createdAt: Date;
};

const senderMap: Record<MessageSender, PersistedMessage["sender"]> = {
  [MessageSender.USER]: "user",
  [MessageSender.AI]: "ai"
};

function toPersistedMessage(message: {
  id: string;
  sender: MessageSender;
  text: string;
  createdAt: Date;
}): PersistedMessage {
  return {
    id: message.id,
    sender: senderMap[message.sender],
    text: message.text,
    createdAt: message.createdAt
  };
}

export async function resolveConversation(sessionId?: string) {
  if (sessionId) {
    const existing = await prisma.conversation.findUnique({
      where: {
        id: sessionId
      }
    });

    if (existing) {
      return existing;
    }
  }

  return prisma.conversation.create({
    data: {
      metadata: sessionId ? ({ replacedSessionId: sessionId } as Prisma.JsonObject) : undefined
    }
  });
}

export async function findConversation(sessionId: string) {
  return prisma.conversation.findUnique({
    where: {
      id: sessionId
    }
  });
}

export async function listMessages(conversationId: string, limit = 100) {
  const messages = await prisma.message.findMany({
    where: {
      conversationId
    },
    orderBy: {
      createdAt: "desc"
    },
    take: limit
  });

  return messages.reverse().map(toPersistedMessage);
}

export async function appendMessage(
  conversationId: string,
  sender: PersistedMessage["sender"],
  text: string
) {
  const message = await prisma.message.create({
    data: {
      conversationId,
      sender: sender === "user" ? MessageSender.USER : MessageSender.AI,
      text
    }
  });

  return toPersistedMessage(message);
}
