import { NextRequest, NextResponse } from "next/server";
import { db, logBackendAudit } from "@/lib/backend-service";
import { createOpenPaymentsQuote, executeOpenPaymentsOutgoing } from "@/lib/open-payments";
import { TransactionRecord } from "@/lib/financial-engine";

export async function POST(req: NextRequest) {
  try {
    const executedItems = [];

    // Find due recurring payments
    const scheduled = db.upcoming.filter((u) => u.status === "SCHEDULED");

    for (const obligation of scheduled) {
      if (obligation.amount > db.balance) {
        logBackendAudit(
          "LIMIT_ENFORCED",
          "WALLET",
          obligation.id,
          `Recurring obligation "${obligation.name}" failed: insufficient wallet funds.`,
          "WARNING"
        );
        continue;
      }

      // Generate quote & execute
      const quote = createOpenPaymentsQuote(
        db.walletAddress,
        obligation.recipient,
        obligation.amount,
        obligation.currency
      );
      const payment = executeOpenPaymentsOutgoing(
        quote,
        `idemp_sched_${obligation.id}_${Date.now()}`,
        "urn:paylance:openpayments:scheduled"
      );

      const tx: TransactionRecord = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        date: new Date().toISOString(),
        amount: -obligation.amount,
        currency: obligation.currency,
        type: "EXPENSE",
        categoryId: obligation.category.toLowerCase().replace(/\s+/g, "_"),
        categoryName: obligation.category,
        sender: db.walletAddress,
        recipient: obligation.recipient,
        description: `Recurring Scheduled Obligation: ${obligation.name}`,
        status: "COMPLETED",
        providerReference: payment.txHash,
      };

      db.transactions.unshift(tx);
      db.balance -= obligation.amount;
      obligation.status = "PAID";

      logBackendAudit(
        "PAYMENT_COMPLETED",
        "SECURITY",
        obligation.id,
        `Executed recurring obligation: ${obligation.name} (${obligation.amount} ${obligation.currency}) via Open Payments.`
      );

      executedItems.push({
        obligation: obligation.name,
        amount: obligation.amount,
        currency: obligation.currency,
        quoteId: quote.id,
        txHash: payment.txHash,
      });
    }

    return NextResponse.json({
      success: true,
      executedCount: executedItems.length,
      executedItems,
      newBalance: db.balance,
    });
  } catch (err: any) {
    console.error("API /api/cron/process-recurring error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

