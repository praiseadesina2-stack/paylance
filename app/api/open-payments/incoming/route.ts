import { NextRequest, NextResponse } from "next/server";
import { createIncomingPaymentResource } from "@/lib/open-payments";
import { db } from "@/lib/backend-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { amount, currency = "NGN", description = "Paylance Invoice / Transfer Request" } = body;

    const resource = createIncomingPaymentResource(
      db.walletAddress,
      amount ? Number(amount) : undefined,
      currency,
      description
    );

    return NextResponse.json({
      success: true,
      incomingPayment: resource,
    });
  } catch (err: any) {
    console.error("API /api/open-payments/incoming error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

