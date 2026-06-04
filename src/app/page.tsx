import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ChatWidget } from "@/components/chat-widget";
import { CHAT_SESSION_COOKIE } from "@/lib/chat-session";
import { getChatHistory } from "@/server/services/chat-service";

export const metadata: Metadata = {
  title: "Morrow Support Chat",
  description: "A persisted AI support chat for Morrow Supply customers."
};

async function loadInitialChat() {
  const sessionId = (await cookies()).get(CHAT_SESSION_COOKIE)?.value;

  if (!sessionId) {
    return {
      initialMessages: [],
      initialSessionId: null,
      initialError: null
    };
  }

  try {
    const history = await getChatHistory(sessionId);

    return {
      initialMessages: history.messages,
      initialSessionId: history.sessionId,
      initialError: null
    };
  } catch {
    return {
      initialMessages: [],
      initialSessionId: null,
      initialError: "Saved chat history could not be loaded."
    };
  }
}

export default async function Home() {
  const initialChat = await loadInitialChat();

  return <ChatWidget {...initialChat} />;
}
