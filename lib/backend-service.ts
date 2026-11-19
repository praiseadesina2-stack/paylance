// ─── Paylance Server-Side Backend Service ────────────────────────────────────
// Handles server-side business logic, Open Payments quote & payment processing,
// rule evaluation, transaction ledger, and audit logging.

import { createOpenPaymentsQuote, executeOpenPaymentsOutgoing, createIncomingPaymentResource } from "./open-payments";
import {
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateNetCashFlow,
  calculateCategoryBreakdown,
  calculateRecurringCommitments,
  answerFinancialQuery,
  TransactionRecord,
  UpcomingPayment,
} from "./financial-engine";
import {
  AutomationRule,
  AutomationExecution,
  AuditLogItem,
  SpendingLimits,
  INITIAL_TRANSACTIONS,
  INITIAL_RULES,
  INITIAL_UPCOMING,
  INITIAL_EXECUTIONS,
  INITIAL_AUDIT_LOGS,
  CATEGORY_MAP,
  DEFAULT_CATEGORIES,
} from "./finance-store";

// Server-side state holder
interface BackendDatabase {
  walletAddress: string;
  currency: "NGN" | "USD";
  balance: number;
  savingsBalance: number;
  subscriptionsBalance: number;
  limits: SpendingLimits;
  transactions: TransactionRecord[];
  rules: AutomationRule[];
  executions: AutomationExecution[];
  upcoming: UpcomingPayment[];
  auditLogs: AuditLogItem[];
}

// Global server singleton to maintain state across API calls in Node runtime
const globalStore = global as unknown as { __paylance_db?: BackendDatabase };

if (!globalStore.__paylance_db) {
  globalStore.__paylance_db = {
    walletAddress: "$ilp.paylance.io/alex",
    currency: "NGN",
    balance: 315000,
    savingsBalance: 85000,
    subscriptionsBalance: 42000,
    limits: {
      maxPerTransaction: 500000,
      maxDailySpend: 1000000,
      spentToday: 35000,
      approvedRecipients: ["$ilp.paylance.io/alex/savings", "$ilp.paylance.io/workspace", "$ilp.paylance.io/tools"],
    },
    transactions: [...INITIAL_TRANSACTIONS],
    rules: [...INITIAL_RULES],
    executions: [...INITIAL_EXECUTIONS],
    upcoming: [...INITIAL_UPCOMING],
    auditLogs: [...INITIAL_AUDIT_LOGS],
  };
}

export const db = globalStore.__paylance_db;

export function getBackendSummary(currency: "NGN" | "USD" = "NGN") {
  const totalIncome = calculateTotalIncome(db.transactions, currency);
  const totalExpenses = calculateTotalExpenses(db.transactions, currency);
  const netCashFlow = calculateNetCashFlow(db.transactions, currency);
  const recurringCommitments = calculateRecurringCommitments(db.upcoming, currency);
  const categoryBreakdown = calculateCategoryBreakdown(db.transactions, currency, CATEGORY_MAP);

  return {
    walletAddress: db.walletAddress,
    currency,
    balance: db.balance,
    savingsBalance: db.savingsBalance,
    subscriptionsBalance: db.subscriptionsBalance,
    totalIncome,
    totalExpenses,
    netCashFlow,
    recurringCommitments,
    activeRulesCount: db.rules.filter((r) => r.status === "ACTIVE").length,
    categoryBreakdown,
    limits: db.limits,
    transactionsCount: db.transactions.length,
    auditLogsCount: db.auditLogs.length,
  };
}

export function logBackendAudit(
  action: AuditLogItem["action"],
  resourceType: AuditLogItem["resourceType"],
  resourceId: string,
  details: string,
  status: AuditLogItem["status"] = "SUCCESS"
): AuditLogItem {
  const log: AuditLogItem = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    action,
    resourceType,
    resourceId,
    details,
    status,
  };
  db.auditLogs.unshift(log);
  return log;
}

// Backend Simulation of PRD Section 10: Inflow of ₦100,000 -> Rule Trigger -> Open Payments Dispatches
export async function executeServerInflowSimulation(
  amount: number = 100000,
  sender: string = "Global Client Ltd",
  currency: "NGN" | "USD" = "NGN"
) {
  // 1. Record incoming transaction
  const inflowId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const inflowTx: TransactionRecord = {
    id: inflowId,
    date: new Date().toISOString(),
    amount,
    currency,
    type: "INFLOW",
    categoryId: "income",
    categoryName: "Income",
    sender,
    recipient: db.walletAddress,
    description: `Incoming Payment from ${sender}`,
    status: "COMPLETED",
    providerReference: `ilp_inflow_${Date.now()}`,
  };

  db.transactions.unshift(inflowTx);
  db.balance += amount;

  logBackendAudit(
    "PAYMENT_COMPLETED",
    "WALLET",
    db.walletAddress,
    `Received verified incoming payment of ${currency === "NGN" ? "₦" : "$"}${amount.toLocaleString()} from ${sender} via Open Payments.`
  );

  // 2. Find matching active rules
  const matchingRules = db.rules.filter(
    (r) =>
      r.status === "ACTIVE" &&
      (r.triggerType === "INCOMING_PAYMENT" || r.frequency === "ON_INFLOW") &&
      (!r.conditions.minAmount || amount >= r.conditions.minAmount)
  );

  if (matchingRules.length === 0) {
    return {
      success: true,
      message: `Inflow of ${amount} recorded, but no active rule matched trigger condition.`,
      inflowTx,
      executions: [],
    };
  }

  const rule = matchingRules[0];
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const allocationsExecuted: { destination: string; amount: number; quoteId: string; txHash: string }[] = [];

  let savingsAdd = 0;
  let subscriptionsAdd = 0;

  // 3. Process allocations
  for (const action of rule.actions) {
    let actionAmount = 0;
    if (action.type === "ALLOCATE_PERCENT" && action.percentage) {
      actionAmount = (amount * action.percentage) / 100;
    } else if (action.type === "ALLOCATE_FIXED" && action.amount) {
      actionAmount = action.amount;
    }

    if (actionAmount > 0 && action.destination !== "Main Wallet") {
      // Limit check
      if (actionAmount > db.limits.maxPerTransaction) {
        logBackendAudit(
          "LIMIT_ENFORCED",
          "SECURITY",
          rule.id,
          `Allocation of ${actionAmount} to ${action.destination} exceeded limit (${db.limits.maxPerTransaction}).`,
          "CRITICAL"
        );
        continue;
      }

      const destPointer =
        action.destinationWalletAddress ||
        `${db.walletAddress}/${action.destination.toLowerCase().replace(/\s+/g, "")}`;

      // Open Payments Quote & Outgoing Payment
      const quote = createOpenPaymentsQuote(db.walletAddress, destPointer, actionAmount, currency);
      const payment = executeOpenPaymentsOutgoing(
        quote,
        `idemp_${executionId}_${action.destination}`,
        rule.authorizationScope
      );

      allocationsExecuted.push({
        destination: `${action.destination} (${action.percentage ? action.percentage + "%" : "Fixed"})`,
        amount: actionAmount,
        quoteId: quote.id,
        txHash: payment.txHash,
      });

      if (action.destination.toLowerCase().includes("saving")) {
        savingsAdd += actionAmount;
      } else if (action.destination.toLowerCase().includes("subscription")) {
        subscriptionsAdd += actionAmount;
      }

      // Add allocation transaction record
      const allocTx: TransactionRecord = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        date: new Date().toISOString(),
        amount: -actionAmount,
        currency,
        type: "ALLOCATION",
        categoryId: action.destination.toLowerCase().includes("saving") ? "savings" : "subscriptions",
        categoryName: action.destination.toLowerCase().includes("saving") ? "Savings" : "Subscriptions",
        sender: db.walletAddress,
        recipient: destPointer,
        description: `Automated Allocation (${action.percentage || 0}%) to ${action.destination}`,
        status: "COMPLETED",
        isSelfTransfer: action.destination.toLowerCase().includes("saving"),
        providerReference: payment.txHash,
      };

      db.transactions.unshift(allocTx);
      db.balance -= actionAmount;
    } else if (action.destination === "Main Wallet") {
      allocationsExecuted.push({
        destination: `Main Wallet (${action.percentage || 70}%)`,
        amount: actionAmount,
        quoteId: "quote_internal_retain",
        txHash: "internal_balance_retain",
      });
    }
  }

  // 4. Update state & execution record
  db.savingsBalance += savingsAdd;
  db.subscriptionsBalance += subscriptionsAdd;

  const execution: AutomationExecution = {
    id: executionId,
    ruleId: rule.id,
    ruleName: rule.name,
    executionReference: `ref_${Date.now()}`,
    status: "SUCCESS",
    triggerAmount: amount,
    currency,
    allocations: allocationsExecuted,
    executedAt: new Date().toISOString(),
  };

  db.executions.unshift(execution);
  rule.executionCount += 1;
  rule.lastExecuted = new Date().toISOString();

  logBackendAudit(
    "AUTOMATION_TRIGGERED",
    "RULE",
    rule.id,
    `Rule "${rule.name}" triggered on inflow of ${amount} ${currency}. Executed ${allocationsExecuted.length} allocations via Open Payments.`
  );

  return {
    success: true,
    message: `Rule "${rule.name}" successfully executed on ${currency === "NGN" ? "₦" : "$"}${amount.toLocaleString()} inflow.`,
    inflowTx,
    execution,
    newBalances: {
      balance: db.balance,
      savingsBalance: db.savingsBalance,
      subscriptionsBalance: db.subscriptionsBalance,
    },
  };
}

// Backend Outgoing Transfer via Open Payments
export function executeServerOutgoingPayment(
  recipient: string,
  amount: number,
  category: string,
  note: string,
  currency: "NGN" | "USD" = "NGN"
) {
  if (amount > db.balance) {
    return { success: false, message: "Insufficient wallet balance." };
  }

  if (amount > db.limits.maxPerTransaction) {
    logBackendAudit(
      "LIMIT_ENFORCED",
      "SECURITY",
      recipient,
      `Payment of ${amount} exceeded maximum per-transaction limit of ${db.limits.maxPerTransaction}`,
      "CRITICAL"
    );
    return { success: false, message: `Amount exceeds limit of ${db.limits.maxPerTransaction}.` };
  }

  const quote = createOpenPaymentsQuote(db.walletAddress, recipient, amount, currency);
  const payment = executeOpenPaymentsOutgoing(quote, undefined, "urn:paylance:openpayments:transfer");

  const tx: TransactionRecord = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    date: new Date().toISOString(),
    amount: -amount,
    currency,
    type: "PAYMENT",
    categoryId: category.toLowerCase().replace(/\s+/g, "_"),
    categoryName: category,
    sender: db.walletAddress,
    recipient,
    description: note || `Payment to ${recipient}`,
    status: "COMPLETED",
    providerReference: payment.txHash,
  };

  db.transactions.unshift(tx);
  db.balance -= amount;

  logBackendAudit(
    "PAYMENT_COMPLETED",
    "WALLET",
    recipient,
    `Sent ${currency === "NGN" ? "₦" : "$"}${amount.toLocaleString()} to ${recipient} via Open Payments [Quote: ${quote.id}].`
  );

  return {
    success: true,
    message: "Payment sent successfully.",
    quote,
    payment,
    tx,
    newBalance: db.balance,
  };
}

