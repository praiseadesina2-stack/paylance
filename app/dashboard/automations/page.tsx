"use client";
import { useState } from "react";
import {
  Cog, Plus, Play, Pause, Trash2, CheckCircle,
  AlertCircle, ArrowRight, Shield, RefreshCw, Zap,
  Calendar, Layers, Clock, Check, X, Filter
} from "lucide-react";
import { useFinanceStore, AutomationRule } from "@/lib/finance-store";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { playEarcon, announceToScreenReader, speakText } from "@/lib/voice-service";

export default function AutomationsPage() {
  const {
    rules,
    executions,
    currency,
    toggleRuleStatus,
    deleteAutomationRule,
    addAutomationRule,
    simulateIncomingPayment,
    limits,
    updateLimits,
  } = useFinanceStore();

  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "PAUSED">("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [simAmount, setSimAmount] = useState(100000);
  const [simSender, setSimSender] = useState("Acme Client Ltd");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);

  // Form state for creating a rule manually
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleTrigger, setNewRuleTrigger] = useState<"INCOMING_PAYMENT" | "BALANCE_THRESHOLD" | "RECURRING_SCHEDULE">("INCOMING_PAYMENT");
  const [newRuleThreshold, setNewRuleThreshold] = useState(100000);
  const [savingsPct, setSavingsPct] = useState(20);
  const [subsPct, setSubsPct] = useState(10);
  const [walletPct, setWalletPct] = useState(70);

  const filteredRules = rules.filter((r) => {
    if (filter === "ALL") return true;
    return r.status === filter;
  });

  async function handleSimulate() {
    setIsSimulating(true);
    setSimulationResult("Evaluating active automation rules against incoming payment...");
    announceToScreenReader(`Testing inflow simulation of ${formatCurrency(simAmount, currency)}.`);

    try {
      const res = await simulateIncomingPayment(simAmount, simSender);
      if (res.success) {
        playEarcon("SUCCESS");
        setSimulationResult(`✅ Execution Success: Rule triggered on ${formatCurrency(simAmount, currency)} from ${simSender}. Allocations processed through Open Payments!`);
        speakText(`Incoming payment of ${simAmount} received. Rule triggered and executed.`);
      } else {
        setSimulationResult(`ℹ️ Result: ${res.message}`);
      }
    } catch (e: any) {
      setSimulationResult(`Error: ${e.message}`);
    } finally {
      setIsSimulating(false);
    }
  }

  function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    if (!newRuleName.trim()) return;

    if (savingsPct + subsPct + walletPct > 100) {
      alert("Allocations total cannot exceed 100%");
      return;
    }

    addAutomationRule({
      name: newRuleName,
      description: `Automated split for incoming funds >= ${formatCurrency(newRuleThreshold, currency)}: ${savingsPct}% Savings, ${subsPct}% Subscriptions, ${walletPct}% Wallet`,
      triggerType: newRuleTrigger,
      conditions: {
        minAmount: newRuleThreshold,
        currency,
      },
      actions: [
        {
          id: `act_${Date.now()}_1`,
          type: "ALLOCATE_PERCENT",
          percentage: savingsPct,
          destination: "Savings",
          destinationWalletAddress: "$ilp.paylance.io/alex/savings",
        },
        {
          id: `act_${Date.now()}_2`,
          type: "ALLOCATE_PERCENT",
          percentage: subsPct,
          destination: "Subscriptions",
          destinationWalletAddress: "$ilp.paylance.io/alex/subscriptions",
        },
        {
          id: `act_${Date.now()}_3`,
          type: "ALLOCATE_PERCENT",
          percentage: walletPct,
          destination: "Main Wallet",
          destinationWalletAddress: "$ilp.paylance.io/alex",
        },
      ],
      frequency: "ON_INFLOW",
      status: "ACTIVE",
      authorizationScope: "urn:paylance:openpayments:transfer:auto",
    });

    setShowCreateModal(false);
    setNewRuleName("");
    playEarcon("CONFIRM");
    announceToScreenReader("New automation rule created and activated.");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <Cog size={18} color="hsl(var(--primary-light))" />
            <span style={{ fontSize: "0.78rem", color: "hsl(var(--primary-light))", fontWeight: 700 }}>
              Module 2: Autonomous Engine
            </span>
          </div>
          <h1 className="font-heading" style={{ fontSize: "1.75rem", fontWeight: 800, color: "hsl(var(--text))" }}>
            Payment Automation Engine
          </h1>
          <p style={{ color: "hsl(var(--text-2))", fontSize: "0.85rem", marginTop: 2 }}>
            Manage conditional money movement, recurring obligations, and Open Payments execution rules.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <Plus size={16} /> Create Automation Rule
        </button>
      </div>

      {/* Inflow Simulation Testing Bar (PRD Section 10 Demo Tool) */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, hsl(217 91% 55% / 0.12), hsl(200 100% 60% / 0.05))",
          border: "1px solid hsl(217 91% 55% / 0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Zap size={18} color="hsl(var(--primary-light))" />
            <h2 className="font-heading" style={{ fontSize: "1rem", fontWeight: 700, color: "hsl(var(--text))" }}>
              Live Inflow Trigger Simulator (Demo Walkthrough)
            </h2>
          </div>
          <span className="badge badge-blue">Interactive Demo</span>
        </div>

        <p style={{ fontSize: "0.8rem", color: "hsl(var(--text-2))", marginBottom: "1rem" }}>
          Simulate an incoming client payment to trigger matching automation rules, generate Open Payments quotes, and disburse allocations automatically.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.78rem", color: "hsl(var(--text-3))" }}>Amount:</label>
            <input
              type="number"
              value={simAmount}
              onChange={(e) => setSimAmount(Number(e.target.value))}
              className="input"
              style={{ width: 140, height: 36, fontSize: "0.85rem" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.78rem", color: "hsl(var(--text-3))" }}>Client / Sender:</label>
            <input
              type="text"
              value={simSender}
              onChange={(e) => setSimSender(e.target.value)}
              className="input"
              style={{ width: 180, height: 36, fontSize: "0.85rem" }}
            />
          </div>

          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="btn btn-primary"
            style={{ height: 36, fontSize: "0.85rem" }}
          >
            {isSimulating ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
            <span>Trigger Incoming Inflow</span>
          </button>
        </div>

        {simulationResult && (
          <div style={{ marginTop: "1rem", padding: "0.6rem 0.85rem", background: "hsl(var(--surface-3))", borderRadius: 8, fontSize: "0.82rem", color: "hsl(var(--text))" }}>
            {simulationResult}
          </div>
        )}
      </div>

      {/* Rules Management Section */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <div>
            <h2 className="font-heading" style={{ fontSize: "1.1rem", fontWeight: 700, color: "hsl(var(--text))" }}>
              Active & Configured Rules ({rules.length})
            </h2>
            <p style={{ fontSize: "0.78rem", color: "hsl(var(--text-3))" }}>
              Rules enforce spending limits and deterministic execution without AI hallucination.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.3rem", background: "hsl(var(--surface-3))", padding: 2, borderRadius: 8 }}>
            {(["ALL", "ACTIVE", "PAUSED"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                style={{
                  padding: "0.25rem 0.6rem",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  background: filter === st ? "hsl(var(--primary))" : "transparent",
                  color: filter === st ? "white" : "hsl(var(--text-2))",
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filteredRules.map((rule) => {
            const isActive = rule.status === "ACTIVE";

            return (
              <div
                key={rule.id}
                style={{
                  background: "hsl(var(--surface-3) / 0.6)",
                  border: isActive ? "1px solid hsl(var(--border))" : "1px dashed hsl(var(--border))",
                  borderRadius: 12,
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.85rem",
                  opacity: isActive ? 1 : 0.65,
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "hsl(var(--text))" }}>
                        {rule.name}
                      </h3>
                      <span className={`badge ${isActive ? "badge-green" : "badge-amber"}`} style={{ fontSize: "0.68rem" }}>
                        {rule.status}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.82rem", color: "hsl(var(--text-2))", marginTop: 2 }}>
                      {rule.description}
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                    <button
                      onClick={() => toggleRuleStatus(rule.id)}
                      className={`btn btn-sm ${isActive ? "btn-ghost" : "btn-primary"}`}
                      style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                    >
                      {isActive ? <><Pause size={12} /> Pause</> : <><Play size={12} fill="currentColor" /> Resume</>}
                    </button>
                    <button
                      onClick={() => deleteAutomationRule(rule.id)}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: "0.75rem", padding: "0.3rem 0.5rem", color: "hsl(0 84% 65%)" }}
                      aria-label="Delete Rule"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Allocation breakdown badges */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {rule.actions.map((act) => (
                    <div
                      key={act.id}
                      style={{
                        background: "hsl(var(--surface-4))",
                        borderRadius: 6,
                        padding: "0.35rem 0.65rem",
                        fontSize: "0.78rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        border: "1px solid hsl(var(--border) / 0.7)",
                      }}
                    >
                      <span style={{ color: "hsl(var(--text-3))" }}>👉</span>
                      <span style={{ fontWeight: 600, color: "hsl(var(--text))" }}>{act.destination}:</span>
                      <strong style={{ color: "hsl(var(--primary-light))" }}>
                        {act.percentage ? `${act.percentage}%` : formatCurrency(act.amount || 0, rule.conditions.currency)}
                      </strong>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", color: "hsl(var(--text-3))", borderTop: "1px solid hsl(var(--border) / 0.5)", paddingTop: "0.5rem" }}>
                  <span>Frequency: <strong>{rule.frequency}</strong></span>
                  <span>Executions: <strong>{rule.executionCount} runs</strong></span>
                  {rule.lastExecuted && <span>Last run: {formatDate(rule.lastExecuted)}</span>}
                  <span>Scope: <code style={{ color: "hsl(var(--primary-light))" }}>{rule.authorizationScope}</code></span>
                </div>
              </div>
            );
          })}

          {filteredRules.length === 0 && (
            <div style={{ textAlign: "center", padding: "2rem", color: "hsl(var(--text-3))" }}>
              No automation rules found under this filter.
            </div>
          )}
        </div>
      </div>

      {/* Execution Logs (Audit & History) */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <div>
            <h2 className="font-heading" style={{ fontSize: "1.1rem", fontWeight: 700, color: "hsl(var(--text))" }}>
              Execution History & Open Payments Dispatches
            </h2>
            <p style={{ fontSize: "0.78rem", color: "hsl(var(--text-3))" }}>
              Cryptographically verified execution logs per rule trigger.
            </p>
          </div>
          <span className="badge badge-cyan">{executions.length} Total Runs</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid hsl(var(--border))", color: "hsl(var(--text-3))", fontSize: "0.72rem", textTransform: "uppercase" }}>
                <th style={{ padding: "0.6rem 0.75rem" }}>Timestamp</th>
                <th style={{ padding: "0.6rem 0.75rem" }}>Rule Name</th>
                <th style={{ padding: "0.6rem 0.75rem" }}>Trigger Amount</th>
                <th style={{ padding: "0.6rem 0.75rem" }}>Allocations & Quotes</th>
                <th style={{ padding: "0.6rem 0.75rem", textAlign: "center" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {executions.map((exec) => (
                <tr key={exec.id} style={{ borderBottom: "1px solid hsl(var(--border) / 0.4)" }}>
                  <td style={{ padding: "0.75rem", color: "hsl(var(--text-2))", whiteSpace: "nowrap" }}>
                    {formatDateTime(exec.executedAt)}
                  </td>
                  <td style={{ padding: "0.75rem", fontWeight: 600, color: "hsl(var(--text))" }}>
                    {exec.ruleName}
                  </td>
                  <td style={{ padding: "0.75rem", fontWeight: 700, color: "hsl(145 65% 50%)" }}>
                    {formatCurrency(exec.triggerAmount, exec.currency)}
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      {exec.allocations.map((a, i) => (
                        <div key={i} style={{ fontSize: "0.78rem", color: "hsl(var(--text-2))" }}>
                          • {a.destination}: <strong>{formatCurrency(a.amount, exec.currency)}</strong>
                          <span style={{ fontSize: "0.68rem", color: "hsl(var(--text-3))", marginLeft: 4, fontFamily: "monospace" }}>
                            [{a.quoteId}]
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: "0.75rem", textAlign: "center" }}>
                    <span className="badge badge-green" style={{ fontSize: "0.68rem" }}>
                      {exec.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Rule Creation Modal */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "1rem",
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 500,
              width: "100%",
              background: "hsl(var(--surface-2))",
              border: "1px solid hsl(var(--border-light))",
              borderRadius: 16,
              padding: "1.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <h2 className="font-heading" style={{ fontSize: "1.2rem", fontWeight: 700, color: "hsl(var(--text))" }}>
                Create Automation Rule
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn btn-ghost btn-sm"
                style={{ padding: "0.2rem 0.5rem" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRule} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "hsl(var(--text-2))", display: "block", marginBottom: 4 }}>
                  Rule Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Freelance Inflow Allocator"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  required
                  className="input"
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "hsl(var(--text-2))", display: "block", marginBottom: 4 }}>
                  Trigger Condition
                </label>
                <select
                  value={newRuleTrigger}
                  onChange={(e) => setNewRuleTrigger(e.target.value as any)}
                  className="input"
                >
                  <option value="INCOMING_PAYMENT">Incoming Payment Received</option>
                  <option value="BALANCE_THRESHOLD">Balance Exceeds Threshold</option>
                  <option value="RECURRING_SCHEDULE">Recurring Schedule</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "hsl(var(--text-2))", display: "block", marginBottom: 4 }}>
                  Minimum Trigger Amount ({currency === "NGN" ? "₦" : "$"})
                </label>
                <input
                  type="number"
                  value={newRuleThreshold}
                  onChange={(e) => setNewRuleThreshold(Number(e.target.value))}
                  required
                  className="input"
                />
              </div>

              {/* Allocation Sliders */}
              <div style={{ background: "hsl(var(--surface-3))", padding: "0.85rem", borderRadius: 10, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "hsl(var(--text-2))" }}>
                  Destination Allocations (% of Inflow)
                </span>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: 2 }}>
                    <span>Savings:</span>
                    <strong>{savingsPct}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={savingsPct}
                    onChange={(e) => setSavingsPct(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: 2 }}>
                    <span>Subscriptions Reserve:</span>
                    <strong>{subsPct}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={subsPct}
                    onChange={(e) => setSubsPct(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: 2 }}>
                    <span>Main Wallet Retained:</span>
                    <strong>{100 - savingsPct - subsPct}%</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Create & Activate Rule
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

