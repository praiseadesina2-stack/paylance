import { NextRequest, NextResponse } from "next/server";
import { processAssistantMessage } from "@/lib/gemini-assistant";
import { db } from "@/lib/backend-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, currency = "NGN" } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing or invalid message string" }, { status: 400 });
    }

    const response = await processAssistantMessage(
      message,
      db.transactions,
      db.upcoming,
      currency
    );

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (err: any) {
    console.error("API /api/ai/assistant error:", err);
    return NextResponse.json({ error: err.message || "Failed to process instruction" }, { status: 500 });
  }
}

