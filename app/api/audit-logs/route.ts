import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/backend-service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter");

  let list = db.auditLogs;
  if (filter && filter !== "ALL") {
    list = list.filter((l) => l.action.includes(filter));
  }

  return NextResponse.json({
    success: true,
    total: list.length,
    logs: list,
  });
}

