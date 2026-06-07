import { GoogleGenAI } from "@google/genai";
import { env } from "@/server/config/env";
import { STORE_SUPPORT_SYSTEM_PROMPT } from "@/server/services/llm/store-prompt";

type HistoryMessage = {
  sender: "user" | "ai";
  text: string;
};

type GenerateReplyInput = {
  history: HistoryMessage[];
  userMessage: string;
};

const GEMINI_TIMEOUT_MS = 20_000;
const MAX_HISTORY_MESSAGES = 12;
const MAX_OUTPUT_TOKENS = 900;

const COMPLETION_RETRY_PROMPT =
  "Your previous answer ended mid-sentence or mid-list. Reply again with one complete, concise support answer under 120 words. Do not end with a dangling number, colon, bullet, or standalone question mark.";

let geminiClient: GoogleGenAI | null = null;

class GeminiConfigurationError extends Error {
  constructor() {
    super("GEMINI_API_KEY is not configured.");
  }
}

function getGeminiClient() {
  if (!env.geminiApiKey) {
    throw new GeminiConfigurationError();
  }

  geminiClient ??= new GoogleGenAI({
    apiKey: env.geminiApiKey
  });

  return geminiClient;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Gemini request timed out."));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
}

function toGeminiContents(history: HistoryMessage[], userMessage: string) {
  const recentHistory = history.slice(-MAX_HISTORY_MESSAGES).map((message) => ({
    role: message.sender === "ai" ? "model" : "user",
    parts: [
      {
        text: message.text
      }
    ]
  }));

  return [
    ...recentHistory,
    {
      role: "user",
      parts: [
        {
          text: userMessage
        }
      ]
    }
  ];
}

function toRetryContents(
  history: HistoryMessage[],
  userMessage: string,
  incompleteReply: string
) {
  return [
    ...toGeminiContents(history, userMessage),
    {
      role: "model" as const,
      parts: [
        {
          text: incompleteReply
        }
      ]
    },
    {
      role: "user" as const,
      parts: [
        {
          text: COMPLETION_RETRY_PROMPT
        }
      ]
    }
  ];
}

function looksIncomplete(text: string) {
  const trimmed = text.trim();

  return (
    /(^|\n)\s*(\d+\.?|[-*]|\?)\s*$/.test(trimmed) ||
    /\b(with|steps?|include|need|provide|send):\s*$/i.test(trimmed)
  );
}

async function requestGeminiReply(
  client: GoogleGenAI,
  contents: ReturnType<typeof toGeminiContents>
) {
  return withTimeout(
    client.models.generateContent({
      model: env.geminiModel,
      contents,
      config: {
        systemInstruction: STORE_SUPPORT_SYSTEM_PROMPT,
        temperature: 0.35,
        maxOutputTokens: MAX_OUTPUT_TOKENS
      }
    }),
    GEMINI_TIMEOUT_MS
  );
}

export async function generateReply({ history, userMessage }: GenerateReplyInput) {
  const client = getGeminiClient();

  let response = await requestGeminiReply(
    client,
    toGeminiContents(history, userMessage)
  );

  let text = response.text?.trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  const finishReason = response.candidates?.[0]?.finishReason;

  if (finishReason === "MAX_TOKENS" || looksIncomplete(text)) {
    response = await requestGeminiReply(
      client,
      toRetryContents(history, userMessage, text)
    );

    text = response.text?.trim();
  }

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}
