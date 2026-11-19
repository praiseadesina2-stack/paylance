"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, DollarSign, Wallet,
  Calendar, Cog, ArrowUpRight, ArrowDownRight,
  Filter, Search, CheckCircle, AlertCircle, Play,
  Zap, Volume2, Sparkles, RefreshCw, ChevronRight,
  ShieldCheck, Layers, PieChart as PieChartIcon
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend
} from "recharts";
import { useFinanceStore, CATEGORY_MAP, DEFAULT_CATEGORIES } from "@/lib/finance-store";
import {
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateNetCashFlow,
  calculateCategoryBreakdown,
  calculateRecurringCommitments
} from "@/lib/financial-engine";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { speakText, announceToScreenReader } from "@/lib/voice-service";

export default function FinancialDashboardPage() {
  const {
    userName,
    currency,
    balance,
    savingsBalance,
    subscriptionsBalance,
    walletAddress,
    transactions,
    rules,
    upcoming,
    executions,
    simulateIncomingPayment,
    updateTransactionCategory,
  } = useFinanceStore();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);

  // Deterministic calculations
  const totalIncome = useMemo(() => calculateTotalIncome(transactions, currency), [transactions, currency]);
  const totalExpenses = useMemo(() => calculateTotalExpenses(transactions, currency), [transactions, currency]);
  const netCashFlow = useMemo(() => calculateNetCashFlow(transactions, currency), [transactions, currency]);
  const recurringTotal = useMemo(() => calculateRecurringCommitments(upcoming, currency), [upcoming, currency]);
  const activeRulesCount = useMemo(() => rules.filter(r => r.status === "ACTIVE").length, [rules]);

  // Category breakdown
  const categoryBreakdown = useMemo(
    () => calculateCategoryBreakdown(transactions, currency, CATEGORY_MAP),
    [transactions, currency]
  );

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesCurrency = t.currency === currency;
      const matchesCategory = selectedCategory ? t.categoryName === selectedCategory : true;
      const matchesSearch = searchQuery
        ? t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.recipient && t.recipient.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (t.sender && t.sender.toLowerCase().includes(searchQuery.toLowerCase()))
        : true;
      return matchesCurrency && matchesCategory && matchesSearch;
    });
  }, [transactions, currency, selectedCategory, searchQuery]);

  // Chart data for Income vs Spend
  const chartData = useMemo(() => {
    return [
      { name: "Week 1", income: currency === "NGN" ? 150000 : 950, expenses: currency === "NGN" ? 42000 : 280 },
      { name: "Week 2", income: currency === "NGN" ? 80000 : 500, expenses: currency === "NGN" ? 35000 : 220 },
      { name: "Week 3", income: currency === "NGN" ? 120000 : 750, expenses: currency === "NGN" ? 54000 : 340 },
      { name: "This Week", income: totalIncome, expenses: totalExpenses },
    ];
  }, [currency, totalIncome, totalExpenses]);

  // Trigger the PRD Section 10 Demo Scenario
  async function runDemoScenario() {
    setDemoRunning(true);
    setDemoMessage("Simulating incoming payment of ₦100,000 from client...");
    announceToScreenReader("Starting demo scenario: Simulating incoming payment of 100,000 Naira.");

    try {
      const res = await simulateIncomingPayment(100000, "Apex Global Tech");
      if (res.success) {
        setDemoMessage("Payment received! Rule evaluated: 20% allocated to Savings, 10% to Subscriptions, 70% retained in Main Wallet.");
        const spoken = "Incoming payment of 100,000 Naira received. Rule executed: 20,000 allocated to savings, 10,000 to subscriptions, and 70,000 added to your main wallet.";
        announceToScreenReader(spoken);
        speakText(spoken);
      } else {
        setDemoMessage(res.message);
      }
    } catch (e: any) {
      setDemoMessage(`Simulation error: ${e.message}`);
    } finally {
      setTimeout(() => setDemoRunning(false), 800);
    }
  }

  // Voice breakdown announcement
  function handleReadCategoriesAloud() {
    if (categoryBreakdown.length === 0) {
      speakText("No expense transactions recorded yet.");
      return;
    }
    const top3 = categoryBreakdown.slice(0, 3).map(c => `${c.name}: ${formatCurrency(c.totalSpent, currency)} (${c.percentage}%)`).join(", ");
    const speech = `Your top spending categories are: ${top3}. Total outgoing expenses are ${formatCurrency(totalExpenses, currency)}.`;
    announceToScreenReader(speech);
    speakText(speech);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Top Banner / Welcome */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
            <div className="status-dot online" />
            <span style={{ fontSize: "0.78rem", color: "hsl(145 65% 50%)", fontWeight: 700 }}>
              Interledger Open Payments Active
            </span>
          </div>
          <h1 className="font-heading" style={{ fontSize: "1.85rem", fontWeight: 800, color: "hsl(var(--text))", letterSpacing: "-0.03em" }}>
            Financial Intelligence Dashboard
          </h1>
          <p style={{ color: "hsl(var(--text-2))", fontSize: "0.88rem", marginTop: 2 }}>
            Real-time analytics, automated allocations, and verified Open Payments activity.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <button
            onClick={runDemoScenario}
            disabled={demoRunning}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            {demoRunning ? <RefreshCw size={15} className="animate-spin" /> : <Play size={15} fill="currentColor" />}
            <span>Run ₦100,000 Demo Scenario</span>
          </button>

          <Link href="/dashboard/assistant" className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Sparkles size={15} color="hsl(var(--primary-light))" />
            <span>AI Assistant</span>
          </Link>
        </div>
      </div>

      {/* Demo Scenario Notification Feedback */}
      {demoMessage && (
        <div
          role="status"
          style={{
            background: "linear-gradient(135deg, hsl(217 91% 55% / 0.15), hsl(145 65% 42% / 0.15))",
            border: "1px solid hsl(217 91% 55% / 0.35)",
            borderRadius: 12,
            padding: "0.85rem 1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <CheckCircle size={18} color="hsl(145 65% 50%)" />
            <span style={{ fontSize: "0.85rem", color: "hsl(var(--text))", fontWeight: 600 }}>
              {demoMessage}
            </span>
          </div>
          <button
            onClick={() => setDemoMessage(null)}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 5 Key Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        {/* Available Balance */}
        <div className="card metric-card" style={{ position: "relative", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "hsl(var(--text-3))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Available Balance
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "hsl(var(--primary) / 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Wallet size={16} color="hsl(var(--primary-light))" />
            </div>
          </div>
          <div className="font-heading" style={{ fontSize: "1.75rem", fontWeight: 800, color: "hsl(var(--text))", letterSpacing: "-0.03em" }}>
            {formatCurrency(balance, currency)}
          </div>
          <div style={{ fontSize: "0.72rem", color: "hsl(var(--text-2))", marginTop: 4 }}>
            Savings: <span style={{ color: "hsl(145 65% 50%)", fontWeight: 700 }}>{formatCurrency(savingsBalance, currency)}</span>
          </div>
        </div>

        {/* Total Income */}
        <div className="card metric-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "hsl(var(--text-3))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Income
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "hsl(145 65% 42% / 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUp size={16} color="hsl(145 65% 50%)" />
            </div>
          </div>
          <div className="font-heading" style={{ fontSize: "1.75rem", fontWeight: 800, color: "hsl(145 65% 50%)", letterSpacing: "-0.03em" }}>
            +{formatCurrency(totalIncome, currency)}
          </div>
          <div style={{ fontSize: "0.72rem", color: "hsl(var(--text-2))", marginTop: 4 }}>
            From verified inflows
          </div>
        </div>

        {/* Total Expenses */}
        <div className="card metric-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "hsl(var(--text-3))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Expenses
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "hsl(0 84% 60% / 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingDown size={16} color="hsl(0 84% 65%)" />
            </div>
          </div>
          <div className="font-heading" style={{ fontSize: "1.75rem", fontWeight: 800, color: "hsl(0 84% 65%)", letterSpacing: "-0.03em" }}>
            -{formatCurrency(totalExpenses, currency)}
          </div>
          <div style={{ fontSize: "0.72rem", color: "hsl(var(--text-3))", marginTop: 4 }}>
            Excludes self-wallet transfers
          </div>
        </div>

        {/* Net Cash Flow */}
        <div className="card metric-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "hsl(var(--text-3))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Net Cash Flow
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "hsl(200 100% 60% / 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <DollarSign size={16} color="hsl(200 100% 65%)" />
            </div>
          </div>
          <div className="font-heading" style={{ fontSize: "1.75rem", fontWeight: 800, color: netCashFlow >= 0 ? "hsl(var(--text))" : "hsl(0 84% 65%)", letterSpacing: "-0.03em" }}>
            {netCashFlow >= 0 ? "+" : ""}{formatCurrency(netCashFlow, currency)}
          </div>
          <div style={{ fontSize: "0.72rem", color: "hsl(145 65% 50%)", marginTop: 4 }}>
            {netCashFlow >= 0 ? "Positive Surplus" : "Deficit"}
          </div>
        </div>

        {/* Automation & Obligations */}
        <div className="card metric-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "hsl(var(--text-3))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Active Automations
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "hsl(280 80% 65% / 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Cog size={16} color="hsl(280 80% 70%)" />
            </div>
          </div>
          <div className="font-heading" style={{ fontSize: "1.75rem", fontWeight: 800, color: "hsl(var(--text))", letterSpacing: "-0.03em" }}>
            {activeRulesCount} Rules
          </div>
          <div style={{ fontSize: "0.72rem", color: "hsl(var(--text-2))", marginTop: 4 }}>
            Upcoming: {formatCurrency(recurringTotal, currency)}
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid: Spending by Category + Cash Flow Trends */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
        {/* Category Breakdown (Module 4) */}
        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div>
              <h2 className="font-heading" style={{ fontSize: "1.1rem", fontWeight: 700, color: "hsl(var(--text))" }}>
                Expense Categorization
              </h2>
              <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-3))" }}>
                Click a category below to filter contributing transactions
              </p>
            </div>
            <button
              onClick={handleReadCategoriesAloud}
              className="btn btn-ghost btn-sm"
              title="Read categories aloud"
              aria-label="Read category spending breakdown aloud"
            >
              <Volume2 size={14} />
            </button>
          </div>

          {/* Donut Chart */}
          <div style={{ height: 180, width: "100%", position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  dataKey="totalSpent"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value), currency), "Spent"]}
                  contentStyle={{ background: "hsl(var(--surface-3))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "white" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Category List Pills */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.5rem", maxHeight: 180, overflowY: "auto" }}>
            {categoryBreakdown.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(isSelected ? null : cat.name)}
                  aria-pressed={isSelected}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.45rem 0.65rem",
                    borderRadius: 8,
                    background: isSelected ? "hsl(var(--primary) / 0.2)" : "hsl(var(--surface-3) / 0.6)",
                    border: isSelected ? "1px solid hsl(var(--primary))" : "1px solid transparent",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: cat.color }} />
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "hsl(var(--text))" }}>
                      {cat.name}
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "hsl(var(--text-3))" }}>
                      ({cat.count})
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "hsl(var(--text))" }}>
                      {formatCurrency(cat.totalSpent, currency)}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "hsl(var(--text-3))" }}>
                      {cat.percentage}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedCategory && (
            <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "hsl(var(--primary-light))" }}>
                Filtered by: <strong>{selectedCategory}</strong>
              </span>
              <button
                onClick={() => setSelectedCategory(null)}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem" }}
              >
                Clear Filter
              </button>
            </div>
          )}
        </div>

        {/* Income vs Outflow Trends */}
        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div>
              <h2 className="font-heading" style={{ fontSize: "1.1rem", fontWeight: 700, color: "hsl(var(--text))" }}>
                Income vs Outflow Overview
              </h2>
              <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-3))" }}>
                Weekly cash movement breakdown
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "hsl(145 65% 50%)" }} />
                <span style={{ color: "hsl(var(--text-2))" }}>Income</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "hsl(217 91% 60%)" }} />
                <span style={{ color: "hsl(var(--text-2))" }}>Expenses</span>
              </div>
            </div>
          </div>

          <div style={{ height: 260, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(145 65% 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(145 65% 50%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--text-3))", fontSize: 11 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--text-3))", fontSize: 11 }}
                  tickFormatter={(val) => currency === "NGN" ? `₦${val/1000}k` : `$${val}`}
                />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value), currency), ""]}
                  contentStyle={{ background: "hsl(var(--surface-3))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "white" }}
                />
                <Area type="monotone" dataKey="income" stroke="hsl(145 65% 50%)" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expenses" stroke="hsl(217 91% 60%)" strokeWidth={2} fillOpacity={1} fill="url(#colorExpenses)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Transactions Section with Interactive Category Reclassification */}
      <div className="card">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1.25rem" }}>
          <div>
            <h2 className="font-heading" style={{ fontSize: "1.15rem", fontWeight: 700, color: "hsl(var(--text))" }}>
              Verified Transaction Records
            </h2>
            <p style={{ fontSize: "0.78rem", color: "hsl(var(--text-3))" }}>
              Grounded database entries. Users can manually correct transaction categories.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {/* Search Input */}
            <div style={{ position: "relative", minWidth: 200 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "hsl(var(--text-3))" }} />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input"
                style={{ paddingLeft: "1.85rem", fontSize: "0.8rem", height: 34 }}
              />
            </div>

            {selectedCategory && (
              <span className="badge badge-blue">
                {selectedCategory}
              </span>
            )}
          </div>
        </div>

        {/* Transaction Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid hsl(var(--border))", color: "hsl(var(--text-3))", fontSize: "0.72rem", textTransform: "uppercase" }}>
                <th style={{ padding: "0.6rem 0.75rem" }}>Date</th>
                <th style={{ padding: "0.6rem 0.75rem" }}>Description & Reference</th>
                <th style={{ padding: "0.6rem 0.75rem" }}>Category</th>
                <th style={{ padding: "0.6rem 0.75rem" }}>Party</th>
                <th style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>Amount</th>
                <th style={{ padding: "0.6rem 0.75rem", textAlign: "center" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => {
                const isIncome = tx.amount > 0;
                const isAllocation = tx.type === "ALLOCATION";
                const isEditing = editingTxId === tx.id;

                return (
                  <tr key={tx.id} style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)", transition: "background 0.15s" }}>
                    <td style={{ padding: "0.75rem", color: "hsl(var(--text-2))", whiteSpace: "nowrap" }}>
                      {formatDate(tx.date)}
                    </td>

                    <td style={{ padding: "0.75rem" }}>
                      <div style={{ fontWeight: 600, color: "hsl(var(--text))" }}>{tx.description}</div>
                      {tx.providerReference && (
                        <div style={{ fontSize: "0.68rem", color: "hsl(var(--text-3))", fontFamily: "monospace" }}>
                          Ref: {tx.providerReference}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: "0.75rem" }}>
                      {isEditing ? (
                        <select
                          className="input"
                          style={{ padding: "0.2rem 0.4rem", fontSize: "0.75rem", height: 28 }}
                          defaultValue={tx.categoryId}
                          onChange={(e) => {
                            const newCat = DEFAULT_CATEGORIES.find(c => c.id === e.target.value);
                            if (newCat) {
                              updateTransactionCategory(tx.id, newCat.id, newCat.name);
                            }
                            setEditingTxId(null);
                          }}
                          onBlur={() => setEditingTxId(null)}
                          autoFocus
                        >
                          {DEFAULT_CATEGORIES.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingTxId(tx.id)}
                          title="Click to correct category"
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                            textAlign: "left",
                          }}
                        >
                          <span
                            className="badge"
                            style={{
                              background: CATEGORY_MAP[tx.categoryName]?.color ? `${CATEGORY_MAP[tx.categoryName]?.color}22` : "hsl(var(--surface-3))",
                              color: CATEGORY_MAP[tx.categoryName]?.color || "hsl(var(--text-2))",
                              border: `1px solid ${CATEGORY_MAP[tx.categoryName]?.color || "hsl(var(--border))"}44`,
                            }}
                          >
                            {tx.categoryName} ✎
                          </span>
                        </button>
                      )}
                    </td>

                    <td style={{ padding: "0.75rem", color: "hsl(var(--text-2))", fontSize: "0.78rem" }}>
                      {isIncome ? `From: ${tx.sender || "External"}` : `To: ${tx.recipient || "Vendor"}`}
                    </td>

                    <td style={{ padding: "0.75rem", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>
                      <span style={{ color: isIncome ? "hsl(145 65% 50%)" : isAllocation ? "hsl(217 91% 70%)" : "hsl(0 84% 65%)" }}>
                        {isIncome ? "+" : ""}{formatCurrency(tx.amount, tx.currency)}
                      </span>
                    </td>

                    <td style={{ padding: "0.75rem", textAlign: "center" }}>
                      <span className="badge badge-green" style={{ fontSize: "0.68rem" }}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredTransactions.length === 0 && (
            <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "hsl(var(--text-3))" }}>
              No transactions match your search criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

