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
const MAX_OUTPUT_TOKENS = 420;

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

export async function generateReply({ history, userMessage }: GenerateReplyInput) {
  const client = getGeminiClient();

  const response = await withTimeout(
    client.models.generateContent({
      model: env.geminiModel,
      contents: toGeminiContents(history, userMessage),
      config: {
        systemInstruction: STORE_SUPPORT_SYSTEM_PROMPT,
        temperature: 0.35,
        maxOutputTokens: MAX_OUTPUT_TOKENS
      }
    }),
    GEMINI_TIMEOUT_MS
  );

  const text = response.text?.trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}
