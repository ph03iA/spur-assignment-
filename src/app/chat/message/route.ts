import { NextResponse } from "next/server";
import { createChatReply } from "@/server/services/chat-service";
import {
  chatMessageRequestSchema,
  firstValidationMessage
} from "@/server/validation/chat";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Request body must be valid JSON."
      },
      {
        status: 400
      }
    );
  }

  const parsed = chatMessageRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: firstValidationMessage(parsed.error)
      },
      {
        status: 400
      }
    );
  }

  try {
    const result = await createChatReply(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Chat message request failed", error);

    return NextResponse.json(
      {
        error: "The support agent is unavailable right now. Please try again."
      },
      {
        status: 500
      }
    );
  }
}
