"use client";

import {
  type CSSProperties,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState
} from "react";
import { RefreshCcw, Send } from "lucide-react";

const MAX_MESSAGE_LENGTH = 2000;
const SESSION_STORAGE_KEY = "spur-ai-chat-session:v1";

type Sender = "user" | "ai";

type ChatMessage = {
  id: string;
  sender: Sender;
  text: string;
  createdAt: string;
};

type ChatHistoryResponse = {
  sessionId: string;
  messages: ChatMessage[];
};

type ChatMessageResponse = {
  reply: string;
  sessionId: string;
};

const policyHighlights = [
  {
    label: "Shipping",
    text: "Free India shipping over Rs. 999. US delivery in 7-12 business days."
  },
  {
    label: "Returns",
    text: "Unused items can be returned within 30 days."
  },
  {
    label: "Support",
    text: "Live support runs Monday to Friday, 9 AM to 6 PM IST."
  }
];

const starterPrompts = [
  "What is your return policy?",
  "Do you ship to the US?",
  "My item arrived damaged."
];

function createLocalMessage(sender: Sender, text: string): ChatMessage {
  return {
    id: `local-${sender}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sender,
    text,
    createdAt: new Date().toISOString()
  };
}

export function ChatWidget() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const savedSessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);

    async function loadHistory(activeSessionId: string | null) {
      await Promise.resolve();

      if (!activeSessionId) {
        setIsLoadingHistory(false);
        return;
      }

      setSessionId(activeSessionId);

      try {
        const response = await fetch(
          `/chat/history?sessionId=${encodeURIComponent(activeSessionId)}`
        );

        if (!response.ok) {
          throw new Error("Could not load the saved conversation.");
        }

        const data = (await response.json()) as ChatHistoryResponse;
        setMessages(data.messages);
      } catch {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
        setSessionId(null);
        setError("Saved chat history could not be loaded.");
      } finally {
        setIsLoadingHistory(false);
      }
    }

    void loadHistory(savedSessionId);
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }

    list.scrollTo({
      top: list.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, isSending]);

  function resetConversation() {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    setSessionId(null);
    setMessages([]);
    setInput("");
    setError(null);
  }

  function handlePromptSelect(prompt: string) {
    setInput(prompt);
    setError(null);
  }

  async function sendMessage() {
    const text = input.trim();

    if (!text || isSending) {
      return;
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
      setError(`Keep messages under ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }

    setError(null);
    setInput("");
    setIsSending(true);
    setMessages((current) => [...current, createLocalMessage("user", text)]);

    try {
      const response = await fetch("/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: text,
          ...(sessionId ? { sessionId } : {})
        })
      });

      const data = (await response.json()) as Partial<ChatMessageResponse> & {
        error?: string;
      };

      if (!response.ok || !data.reply || !data.sessionId) {
        throw new Error(data.error ?? "The support agent could not reply.");
      }

      window.localStorage.setItem(SESSION_STORAGE_KEY, data.sessionId);
      setSessionId(data.sessionId);
      setMessages((current) => [
        ...current,
        createLocalMessage("ai", data.reply as string)
      ]);
    } catch (sendError) {
      const message =
        sendError instanceof Error
          ? sendError.message
          : "The support agent could not reply.";
      setError(message);
      setMessages((current) => [...current, createLocalMessage("ai", message)]);
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  const characterCount = input.trim().length;
  const isSendDisabled =
    isSending || isLoadingHistory || characterCount === 0 || characterCount > MAX_MESSAGE_LENGTH;

  return (
    <main className="chat-shell">
      <section className="chat-frame" aria-label="AI support chat">
        <aside className="store-panel" aria-label="Store context">
          <div>
            <h1>Morrow Supply</h1>
            <p>
              Everyday gear, clear policies, and direct help from the support
              desk.
            </p>
          </div>

          <ul className="policy-list">
            {policyHighlights.map((item) => (
              <li key={item.label}>
                <strong>{item.label}</strong>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </aside>

        <section className="chat-panel">
          <header className="chat-header">
            <div className="chat-title">
              <strong>Morrow Support</strong>
              <span className="status-line">
                <span className="status-dot" aria-hidden="true" />
                {isSending ? "Typing" : "Online"}
              </span>
            </div>

            <button
              className="icon-button"
              type="button"
              title="Start a new conversation"
              aria-label="Start a new conversation"
              onClick={resetConversation}
              disabled={isSending}
            >
              <RefreshCcw size={18} aria-hidden="true" />
            </button>
          </header>

          <div className="messages" ref={listRef} aria-live="polite">
            {isLoadingHistory ? (
              <div className="empty-state">
                <div>
                  <h2>Loading chat</h2>
                  <p>Restoring your conversation.</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="empty-state">
                <div>
                  <h2>How can we help?</h2>
                  <p>
                    Ask about shipping, returns, refunds, or an order change.
                  </p>
                  <div className="prompt-list" aria-label="Suggested messages">
                    {starterPrompts.map((prompt) => (
                      <button
                        className="prompt-chip"
                        key={prompt}
                        onClick={() => handlePromptSelect(prompt)}
                        type="button"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  className={`message-row ${message.sender}`}
                  key={message.id}
                  style={{ "--index": index } as CSSProperties}
                >
                  <div className="message-bubble">{message.text}</div>
                </div>
              ))
            )}

            {isSending ? (
              <div className="message-row ai">
                <div className="message-bubble">
                  <span className="typing" aria-label="Agent is typing">
                    <span aria-hidden="true" />
                    <span aria-hidden="true" />
                    <span aria-hidden="true" />
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <footer className="composer">
            <form className="composer-form" onSubmit={handleSubmit}>
              <textarea
                aria-label="Message"
                disabled={isLoadingHistory}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about shipping, returns, or refunds"
                rows={1}
                value={input}
              />
              <button
                className="send-button"
                type="submit"
                title="Send message"
                aria-label="Send message"
                disabled={isSendDisabled}
              >
                <Send size={20} aria-hidden="true" />
              </button>
            </form>
            <div className="composer-meta">
              <span aria-live="polite" className={error ? "error-text" : undefined}>
                {error ?? ""}
              </span>
              <span>
                {characterCount}/{MAX_MESSAGE_LENGTH}
              </span>
            </div>
          </footer>
        </section>
      </section>
    </main>
  );
}
