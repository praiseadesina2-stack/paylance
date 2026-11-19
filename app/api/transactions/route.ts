import { NextRequest, NextResponse } from "next/server";
import { db, getBackendSummary, logBackendAudit } from "@/lib/backend-service";
import { TransactionRecord } from "@/lib/financial-engine";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const currency = (searchParams.get("currency") as "NGN" | "USD") || "NGN";
  const category = searchParams.get("category");
  const query = searchParams.get("q")?.toLowerCase();

  let list = db.transactions.filter((t) => t.currency === currency);

  if (category) {
    list = list.filter((t) => t.categoryName.toLowerCase() === category.toLowerCase());
  }

  if (query) {
    list = list.filter(
      (t) =>
        t.description.toLowerCase().includes(query) ||
        t.categoryName.toLowerCase().includes(query) ||
        (t.sender && t.sender.toLowerCase().includes(query)) ||
        (t.recipient && t.recipient.toLowerCase().includes(query))
    );
  }

  const summary = getBackendSummary(currency);

  return NextResponse.json({
    success: true,
    transactions: list,
    total: list.length,
    summary,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, txId, newCategoryName, newCategoryId, txData } = body;

    // Category manual reclassification
    if (action === "RECLASSIFY" && txId && newCategoryName) {
      const tx = db.transactions.find((t) => t.id === txId);
      if (!tx) {
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
      }
      tx.categoryName = newCategoryName;
      if (newCategoryId) tx.categoryId = newCategoryId;

      logBackendAudit(
        "CATEGORY_CORRECTED",
        "TRANSACTION",
        txId,
        `Reclassified transaction "${tx.description}" to category ${newCategoryName}`,
        "INFO"
      );

      return NextResponse.json({ success: true, transaction: tx });
    }

    // Direct transaction ingestion
    if (txData) {
      const newTx: TransactionRecord = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        date: txData.date || new Date().toISOString(),
        amount: Number(txData.amount),
        currency: txData.currency || "NGN",
        type: txData.type || (txData.amount > 0 ? "INFLOW" : "EXPENSE"),
        categoryId: txData.categoryId || "others",
        categoryName: txData.categoryName || "Others",
        sender: txData.sender,
        recipient: txData.recipient,
        description: txData.description || "Ingested transaction",
        status: txData.status || "COMPLETED",
        isSelfTransfer: Boolean(txData.isSelfTransfer),
        providerReference: txData.providerReference || `ilp_tx_${Date.now()}`,
      };

      db.transactions.unshift(newTx);
      db.balance += newTx.amount;

      logBackendAudit(
        "PAYMENT_COMPLETED",
        "TRANSACTION",
        newTx.id,
        `Recorded transaction: ${newTx.description} [${newTx.amount}]`
      );

      return NextResponse.json({ success: true, transaction: newTx });
    }

    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  } catch (err: any) {
    console.error("API /api/transactions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

