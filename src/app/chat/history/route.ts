import { NextResponse } from "next/server";
import { getChatHistory } from "@/server/services/chat-service";
import {
  chatHistoryRequestSchema,
  firstValidationMessage
} from "@/server/validation/chat";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const parsed = chatHistoryRequestSchema.safeParse({
    sessionId: new URL(request.url).searchParams.get("sessionId")
  });

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
    const result = await getChatHistory(parsed.data.sessionId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Chat history request failed", error);

    return NextResponse.json(
      {
        error: "Chat history is unavailable right now."
      },
      {
        status: 500
      }
    );
  }
}
