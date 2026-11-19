import { NextRequest, NextResponse } from "next/server";
import { executeServerOutgoingPayment } from "@/lib/backend-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { recipient, amount, category = "Transfers", note = "Direct Open Payments Dispatch", currency = "NGN" } = body;

    if (!recipient || !amount || amount <= 0) {
      return NextResponse.json({ error: "Missing recipient or valid amount" }, { status: 400 });
    }

    const result = executeServerOutgoingPayment(
      recipient,
      Number(amount),
      category,
      note,
      currency
    );

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error("API /api/open-payments/outgoing error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

