// ─── Paylance Deterministic Financial Calculation Engine ──────────────────────
// PRD Module 4 & Module 1: All figures are calculated directly from verified records,
// never estimated or hallucinated by an LLM.

export interface TransactionRecord {
  id: string;
  date: string;
  amount: number; // positive for inflow, negative for outflow
  currency: "NGN" | "USD";
  type: "INFLOW" | "EXPENSE" | "ALLOCATION" | "TRANSFER" | "PAYMENT";
  categoryId: string;
  categoryName: string;
  sender?: string;
  recipient?: string;
  description: string;
  isSelfTransfer?: boolean;
  status: "COMPLETED" | "PENDING" | "FAILED";
  providerReference?: string;
}

export interface CategorySummary {
  id: string;
  name: string;
  totalSpent: number;
  percentage: number;
  color: string;
  iconName: string;
  count: number;
}

export interface FinancialOverviewData {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  availableBalance: number;
  recurringCommitments: number;
  activeRulesCount: number;
  categoryBreakdown: CategorySummary[];
  recentTransactions: TransactionRecord[];
}

export interface UpcomingPayment {
  id: string;
  name: string;
  amount: number;
  currency: "NGN" | "USD";
  dueDate: string;
  recipient: string;
  frequency: "MONTHLY" | "WEEKLY" | "DAILY" | "CUSTOM";
  category: string;
  status: "SCHEDULED" | "PAID";
}

// Total Income: sum of all positive incoming transactions
export function calculateTotalIncome(transactions: TransactionRecord[], currency: "NGN" | "USD" = "NGN"): number {
  return transactions
    .filter(t => t.currency === currency && t.status === "COMPLETED" && t.amount > 0 && t.type === "INFLOW")
    .reduce((sum, t) => sum + t.amount, 0);
}

// Total Expenses: sum of outgoing expense transactions (excludes transfers between own wallets!)
export function calculateTotalExpenses(transactions: TransactionRecord[], currency: "NGN" | "USD" = "NGN"): number {
  return transactions
    .filter(t => 
      t.currency === currency && 
      t.status === "COMPLETED" && 
      t.amount < 0 && 
      !t.isSelfTransfer && 
      (t.type === "EXPENSE" || t.type === "PAYMENT" || t.type === "ALLOCATION")
    )
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

// Net Cash Flow = Total Income - Total Expenses
export function calculateNetCashFlow(transactions: TransactionRecord[], currency: "NGN" | "USD" = "NGN"): number {
  const income = calculateTotalIncome(transactions, currency);
  const expenses = calculateTotalExpenses(transactions, currency);
  return income - expenses;
}

// Category Percentage Breakdown
export function calculateCategoryBreakdown(
  transactions: TransactionRecord[],
  currency: "NGN" | "USD" = "NGN",
  categoryMeta: Record<string, { color: string; icon: string }>
): CategorySummary[] {
  const totalExpenses = calculateTotalExpenses(transactions, currency);
  const catMap = new Map<string, { total: number; count: number; name: string }>();

  transactions
    .filter(t => 
      t.currency === currency && 
      t.status === "COMPLETED" && 
      t.amount < 0 && 
      !t.isSelfTransfer
    )
    .forEach(t => {
      const existing = catMap.get(t.categoryName) || { total: 0, count: 0, name: t.categoryName };
      existing.total += Math.abs(t.amount);
      existing.count += 1;
      catMap.set(t.categoryName, existing);
    });

  const list: CategorySummary[] = [];
  catMap.forEach((val, name) => {
    const meta = categoryMeta[name] || { color: "hsl(220 15% 55%)", icon: "Tag" };
    const percentage = totalExpenses > 0 ? (val.total / totalExpenses) * 100 : 0;
    list.push({
      id: name.toLowerCase().replace(/\s+/g, "_"),
      name,
      totalSpent: val.total,
      percentage: Number(percentage.toFixed(1)),
      color: meta.color,
      iconName: meta.icon,
      count: val.count,
    });
  });

  return list.sort((a, b) => b.totalSpent - a.totalSpent);
}

// Sum of upcoming recurring payment commitments within the current cycle
export function calculateRecurringCommitments(upcoming: UpcomingPayment[], currency: "NGN" | "USD" = "NGN"): number {
  return upcoming
    .filter(u => u.currency === currency && u.status === "SCHEDULED")
    .reduce((sum, u) => sum + u.amount, 0);
}

// Deterministic query solver for natural language questions:
// Matches user query against verified database records
export interface QueryAnswer {
  question: string;
  numericResult?: number;
  currency: "NGN" | "USD";
  summaryText: string;
  supportingTransactions: TransactionRecord[];
  confidence: number;
}

export function answerFinancialQuery(
  question: string,
  transactions: TransactionRecord[],
  upcoming: UpcomingPayment[],
  currency: "NGN" | "USD" = "NGN"
): QueryAnswer {
  const q = question.toLowerCase();

  // 1. Inquiries about subscriptions or allocated to subscriptions
  if (q.includes("subscription")) {
    const matching = transactions.filter(t => 
      t.currency === currency && 
      (t.categoryName.toLowerCase().includes("subscription") || t.description.toLowerCase().includes("subscription"))
    );
    const total = matching.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const sym = currency === "NGN" ? "₦" : "$";
    const formatted = `${sym}${total.toLocaleString()}`;

    return {
      question,
      numericResult: total,
      currency,
      summaryText: `You have allocated and spent a total of ${formatted} on subscriptions across ${matching.length} transaction${matching.length === 1 ? "" : "s"}.`,
      supportingTransactions: matching,
      confidence: 1.0,
    };
  }

  // 2. Inquiries about food and groceries
  if (q.includes("food") || q.includes("grocer") || q.includes("dining") || q.includes("eat")) {
    const matching = transactions.filter(t => 
      t.currency === currency && 
      (t.categoryName.toLowerCase().includes("food") || t.description.toLowerCase().includes("food") || t.description.toLowerCase().includes("restaurant") || t.description.toLowerCase().includes("groceries"))
    );
    const total = matching.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const sym = currency === "NGN" ? "₦" : "$";
    const formatted = `${sym}${total.toLocaleString()}`;

    return {
      question,
      numericResult: total,
      currency,
      summaryText: `You have spent ${formatted} on Food and Groceries across ${matching.length} verified transactions this month.`,
      supportingTransactions: matching,
      confidence: 1.0,
    };
  }

  // 3. Inquiries about savings or savings allocations
  if (q.includes("saving") || q.includes("saved")) {
    const matching = transactions.filter(t => 
      t.currency === currency && 
      (t.categoryName.toLowerCase().includes("saving") || t.description.toLowerCase().includes("saving"))
    );
    const total = matching.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const sym = currency === "NGN" ? "₦" : "$";
    const formatted = `${sym}${total.toLocaleString()}`;

    return {
      question,
      numericResult: total,
      currency,
      summaryText: `You have allocated ${formatted} to your Savings wallet across ${matching.length} automated allocation${matching.length === 1 ? "" : "s"}.`,
      supportingTransactions: matching,
      confidence: 1.0,
    };
  }

  // 4. Inquiries about total income or earnings
  if (q.includes("income") || q.includes("earn") || q.includes("receive") || q.includes("made")) {
    const matching = transactions.filter(t => t.currency === currency && t.amount > 0 && t.type === "INFLOW");
    const total = matching.reduce((sum, t) => sum + t.amount, 0);
    const sym = currency === "NGN" ? "₦" : "$";
    const formatted = `${sym}${total.toLocaleString()}`;

    return {
      question,
      numericResult: total,
      currency,
      summaryText: `Your total verified income is ${formatted} from ${matching.length} incoming transaction${matching.length === 1 ? "" : "s"}.`,
      supportingTransactions: matching,
      confidence: 1.0,
    };
  }

  // 5. Inquiries about upcoming payments or obligations
  if (q.includes("upcoming") || q.includes("due") || q.includes("obligation") || q.includes("bills")) {
    const totalUpcoming = calculateRecurringCommitments(upcoming, currency);
    const sym = currency === "NGN" ? "₦" : "$";
    const formatted = `${sym}${totalUpcoming.toLocaleString()}`;
    const items = upcoming.map(u => `${u.name} (${sym}${u.amount.toLocaleString()} due on ${u.dueDate})`).join(", ");

    return {
      question,
      numericResult: totalUpcoming,
      currency,
      summaryText: `You have ${upcoming.length} upcoming obligations totaling ${formatted}: ${items}.`,
      supportingTransactions: [],
      confidence: 1.0,
    };
  }

  // 6. Inquiries about total expenses
  if (q.includes("expense") || q.includes("spend") || q.includes("spent")) {
    const totalExpenses = calculateTotalExpenses(transactions, currency);
    const sym = currency === "NGN" ? "₦" : "$";
    const formatted = `${sym}${totalExpenses.toLocaleString()}`;

    return {
      question,
      numericResult: totalExpenses,
      currency,
      summaryText: `Your total outgoing expenses (excluding transfers between your own wallets) amount to ${formatted}.`,
      supportingTransactions: transactions.filter(t => t.amount < 0 && !t.isSelfTransfer),
      confidence: 1.0,
    };
  }

  // Default: overall financial position
  const income = calculateTotalIncome(transactions, currency);
  const expenses = calculateTotalExpenses(transactions, currency);
  const net = income - expenses;
  const sym = currency === "NGN" ? "₦" : "$";

  return {
    question,
    currency,
    summaryText: `Summary: Total income is ${sym}${income.toLocaleString()}, total expenses are ${sym}${expenses.toLocaleString()}, and net cash flow is ${sym}${net.toLocaleString()}.`,
    supportingTransactions: transactions.slice(0, 5),
    confidence: 0.9,
  };
}

