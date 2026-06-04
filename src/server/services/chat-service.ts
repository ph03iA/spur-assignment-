import {
  appendMessage,
  findConversation,
  listMessages,
  resolveConversation
} from "@/server/repositories/conversation-repository";
import { generateReply } from "@/server/services/llm/gemini";

const LLM_FALLBACK_REPLY =
  "I am having trouble reaching the AI support system right now. Please try again in a moment, or email support@morrowsupply.example for help.";

export async function createChatReply(input: {
  message: string;
  sessionId?: string;
}) {
  const conversation = await resolveConversation(input.sessionId);
  const history = await listMessages(conversation.id, 24);

  await appendMessage(conversation.id, "user", input.message);

  let reply = LLM_FALLBACK_REPLY;

  try {
    reply = await generateReply({
      history,
      userMessage: input.message
    });
  } catch (error) {
    console.error("LLM reply generation failed", error);
  }

  await appendMessage(conversation.id, "ai", reply);

  return {
    reply,
    sessionId: conversation.id
  };
}

export async function getChatHistory(sessionId: string) {
  const conversation = await findConversation(sessionId);

  if (!conversation) {
    return {
      sessionId,
      messages: []
    };
  }

  const messages = await listMessages(conversation.id, 100);

  return {
    sessionId: conversation.id,
    messages: messages.map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString()
    }))
  };
}
