import { NextRequest, NextResponse } from "next/server";
import { executeServerInflowSimulation, getBackendSummary } from "@/lib/backend-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { amount = 100000, sender = "Apex Global Tech Ltd", currency = "NGN" } = body;

    const result = await executeServerInflowSimulation(Number(amount), String(sender), currency as any);
    const summary = getBackendSummary(currency as any);

    return NextResponse.json({
      success: true,
      data: result,
      summary,
    });
  } catch (err: any) {
    console.error("API /api/automations/simulate-inflow error:", err);
    return NextResponse.json({ error: err.message || "Failed to simulate inflow" }, { status: 500 });
  }
}

