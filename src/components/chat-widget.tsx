"use client";

import {
  type CSSProperties,
  FormEvent,
  KeyboardEvent,
  type ReactNode,
  useReducer,
  useEffect,
  useRef,
} from "react";
import { RefreshCcw, Send } from "lucide-react";
import { CHAT_SESSION_COOKIE, CHAT_SESSION_STORAGE_KEY } from "@/lib/chat-session";

const MAX_MESSAGE_LENGTH = 2000;

type Sender = "user" | "ai";

export type ChatMessage = {
  id: string;
  sender: Sender;
  text: string;
  createdAt: string;
};

type ChatMessageResponse = {
  reply: string;
  sessionId: string;
};

type ChatState = {
  messages: ChatMessage[];
  input: string;
  isSending: boolean;
  error: string | null;
};

type ChatAction =
  | { type: "inputChanged"; input: string }
  | { type: "promptSelected"; input: string }
  | { type: "conversationReset" }
  | { type: "sendStarted"; message: ChatMessage }
  | { type: "sendSucceeded"; message: ChatMessage }
  | { type: "sendFailed"; message: ChatMessage; error: string };

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

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "inputChanged":
    case "promptSelected":
      return {
        ...state,
        input: action.input,
        error: null
      };
    case "conversationReset":
      return {
        messages: [],
        input: "",
        isSending: false,
        error: null
      };
    case "sendStarted":
      return {
        ...state,
        input: "",
        isSending: true,
        error: null,
        messages: [...state.messages, action.message]
      };
    case "sendSucceeded":
      return {
        ...state,
        isSending: false,
        messages: [...state.messages, action.message]
      };
    case "sendFailed":
      return {
        ...state,
        isSending: false,
        error: action.error,
        messages: [...state.messages, action.message]
      };
  }
}

function renderMessageText(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    return part;
  });
}

type ChatWidgetProps = {
  initialMessages: ChatMessage[];
  initialSessionId: string | null;
  initialError: string | null;
};

export function ChatWidget({
  initialMessages,
  initialSessionId,
  initialError
}: ChatWidgetProps) {
  const [state, dispatch] = useReducer(chatReducer, {
    messages: initialMessages,
    input: "",
    isSending: false,
    error: initialError
  });
  const sessionIdRef = useRef(initialSessionId);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }

    list.scrollTo({
      top: list.scrollHeight,
      behavior: "smooth"
    });
  }, [state.messages, state.isSending]);

  function resetConversation() {
    document.cookie = `${CHAT_SESSION_COOKIE}=; Max-Age=0; path=/`;
    window.localStorage.removeItem(CHAT_SESSION_STORAGE_KEY);
    sessionIdRef.current = null;
    dispatch({ type: "conversationReset" });
  }

  function handlePromptSelect(prompt: string) {
    dispatch({ type: "promptSelected", input: prompt });
  }

  async function sendMessage() {
    const text = state.input.trim();

    if (!text || state.isSending) {
      return;
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
      dispatch({
        type: "sendFailed",
        error: `Keep messages under ${MAX_MESSAGE_LENGTH} characters.`,
        message: createLocalMessage(
          "ai",
          `Keep messages under ${MAX_MESSAGE_LENGTH} characters.`
        )
      });
      return;
    }

    dispatch({
      type: "sendStarted",
      message: createLocalMessage("user", text)
    });

    try {
      const sessionId = sessionIdRef.current;
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

      window.localStorage.setItem(CHAT_SESSION_STORAGE_KEY, data.sessionId);
      sessionIdRef.current = data.sessionId;
      dispatch({
        type: "sendSucceeded",
        message: createLocalMessage("ai", data.reply as string)
      });
    } catch (sendError) {
      const message =
        sendError instanceof Error
          ? sendError.message
          : "The support agent could not reply.";
      dispatch({
        type: "sendFailed",
        error: message,
        message: createLocalMessage("ai", message)
      });
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

  const characterCount = state.input.trim().length;
  const isSendDisabled =
    state.isSending || characterCount === 0 || characterCount > MAX_MESSAGE_LENGTH;

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
                {state.isSending ? "Typing" : "Online"}
              </span>
            </div>

            <button
              className="icon-button"
              type="button"
              title="Start a new conversation"
              aria-label="Start a new conversation"
              onClick={resetConversation}
              disabled={state.isSending}
            >
              <RefreshCcw size={18} aria-hidden="true" />
            </button>
          </header>

          <div className="messages" ref={listRef} aria-live="polite">
            {state.messages.length === 0 ? (
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
              state.messages.map((message, index) => (
                <div
                  className={`message-row ${message.sender}`}
                  key={message.id}
                  style={{ "--index": index } as CSSProperties}
                >
                  <div className="message-bubble">
                    {message.sender === "ai"
                      ? renderMessageText(message.text)
                      : message.text}
                  </div>
                </div>
              ))
            )}

            {state.isSending ? (
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
                onChange={(event) =>
                  dispatch({
                    type: "inputChanged",
                    input: event.target.value
                  })
                }
                onKeyDown={handleKeyDown}
                placeholder="Ask about shipping, returns, or refunds"
                rows={1}
                value={state.input}
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
              <span
                aria-live="polite"
                className={state.error ? "error-text" : undefined}
              >
                {state.error ?? ""}
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
