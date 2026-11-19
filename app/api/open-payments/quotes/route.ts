import { NextRequest, NextResponse } from "next/server";
import { createOpenPaymentsQuote } from "@/lib/open-payments";
import { db } from "@/lib/backend-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { receiverWallet, amount, currency = "NGN" } = body;

    if (!receiverWallet || !amount || amount <= 0) {
      return NextResponse.json({ error: "Missing receiverWallet or valid amount" }, { status: 400 });
    }

    const quote = createOpenPaymentsQuote(db.walletAddress, receiverWallet, Number(amount), currency);

    return NextResponse.json({
      success: true,
      quote,
    });
  } catch (err: any) {
    console.error("API /api/open-payments/quotes error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

