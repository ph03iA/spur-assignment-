import { z } from "zod";

export const MAX_MESSAGE_LENGTH = 2000;

export const chatMessageRequestSchema = z.object({
  message: z
    .string({
      error: "Message is required."
    })
    .trim()
    .min(1, "Message cannot be empty.")
    .max(MAX_MESSAGE_LENGTH, `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`),
  sessionId: z
    .string()
    .trim()
    .min(1, "Session id cannot be empty.")
    .max(128, "Session id is too long.")
    .optional()
});

export const chatHistoryRequestSchema = z.object({
  sessionId: z
    .string({
      error: "Session id is required."
    })
    .trim()
    .min(1, "Session id is required.")
    .max(128, "Session id is too long.")
});

export function firstValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid request.";
}
