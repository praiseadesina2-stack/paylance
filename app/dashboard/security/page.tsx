"use client";
import { useState } from "react";
import {
  Shield, Lock, Key, AlertTriangle, CheckCircle,
  FileText, ArrowRight, UserCheck, RefreshCw, Eye
} from "lucide-react";
import { useFinanceStore } from "@/lib/finance-store";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { announceToScreenReader } from "@/lib/voice-service";

export default function SecurityPage() {
  const {
    limits,
    updateLimits,
    currency,
    auditLogs,
    walletAddress,
  } = useFinanceStore();

  const [maxPerTx, setMaxPerTx] = useState(limits.maxPerTransaction);
  const [maxDaily, setMaxDaily] = useState(limits.maxDailySpend);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [filterAction, setFilterAction] = useState<string>("ALL");

  function handleSaveLimits(e: React.FormEvent) {
    e.preventDefault();
    updateLimits({
      maxPerTransaction: Number(maxPerTx),
      maxDailySpend: Number(maxDaily),
    });
    setSaveSuccess(true);
    announceToScreenReader("Spending limits updated successfully.");
    setTimeout(() => setSaveSuccess(false), 2500);
  }

  const filteredLogs = auditLogs.filter((log) => {
    if (filterAction === "ALL") return true;
    return log.action.includes(filterAction);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <Shield size={18} color="hsl(var(--primary-light))" />
          <span style={{ fontSize: "0.78rem", color: "hsl(var(--primary-light))", fontWeight: 700 }}>
            Security & Trust Architecture
          </span>
        </div>
        <h1 className="font-heading" style={{ fontSize: "1.75rem", fontWeight: 800, color: "hsl(var(--text))" }}>
          Security Policies & Immutable Audit Trail
        </h1>
        <p style={{ color: "hsl(var(--text-2))", fontSize: "0.85rem", marginTop: 2 }}>
          Enforce strict spending limits, separate intelligence from execution, and audit all financial actions.
        </p>
      </div>

      {/* Security Principles Overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <Lock size={16} color="hsl(145 65% 50%)" />
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "hsl(var(--text))" }}>
              Separation of Intelligence & Execution
            </h3>
          </div>
          <p style={{ fontSize: "0.78rem", color: "hsl(var(--text-2))" }}>
            The AI model only extracts intent. Payments and allocations are strictly executed by deterministic services with user confirmation.
          </p>
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <UserCheck size={16} color="hsl(var(--primary-light))" />
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "hsl(var(--text))" }}>
              Explicit Authorization
            </h3>
          </div>
          <p style={{ fontSize: "0.78rem", color: "hsl(var(--text-2))" }}>
            No sensitive payment or rule activation occurs automatically from raw voice or AI prompts without explicit human-in-the-loop sign-off.
          </p>
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <Key size={16} color="hsl(280 80% 65%)" />
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "hsl(var(--text))" }}>
              Least-Privilege Scoping
            </h3>
          </div>
          <p style={{ fontSize: "0.78rem", color: "hsl(var(--text-2))" }}>
            Payment grants use GNAP tokens constrained strictly to approved destination wallets and predetermined spending limits.
          </p>
        </div>
      </div>

      {/* Spending Limits Configuration Form */}
      <div className="card">
        <h2 className="font-heading" style={{ fontSize: "1.1rem", fontWeight: 700, color: "hsl(var(--text))", marginBottom: "0.25rem" }}>
          User-Defined Transaction Limits
        </h2>
        <p style={{ fontSize: "0.78rem", color: "hsl(var(--text-3))", marginBottom: "1.25rem" }}>
          Any automation or manual payment exceeding these thresholds will be automatically blocked and logged.
        </p>

        <form onSubmit={handleSaveLimits} style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: "0.78rem", color: "hsl(var(--text-2))", display: "block", marginBottom: 4 }}>
              Maximum Amount Per Transaction ({currency === "NGN" ? "₦" : "$"})
            </label>
            <input
              type="number"
              value={maxPerTx}
              onChange={(e) => setMaxPerTx(Number(e.target.value))}
              className="input"
              style={{ width: 220 }}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.78rem", color: "hsl(var(--text-2))", display: "block", marginBottom: 4 }}>
              Maximum Daily Spending ({currency === "NGN" ? "₦" : "$"})
            </label>
            <input
              type="number"
              value={maxDaily}
              onChange={(e) => setMaxDaily(Number(e.target.value))}
              className="input"
              style={{ width: 220 }}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ height: 42 }}>
            Save Spending Limits
          </button>

          {saveSuccess && (
            <span style={{ fontSize: "0.82rem", color: "hsl(145 65% 50%)", display: "flex", alignItems: "center", gap: 4, height: 42 }}>
              <CheckCircle size={15} /> Limits updated and enforced!
            </span>
          )}
        </form>

        <div style={{ marginTop: "1rem", display: "flex", gap: "1.5rem", fontSize: "0.78rem", color: "hsl(var(--text-3))", borderTop: "1px solid hsl(var(--border) / 0.5)", paddingTop: "0.75rem" }}>
          <span>Current Daily Spend: <strong style={{ color: "hsl(var(--text))" }}>{formatCurrency(limits.spentToday, currency)}</strong></span>
          <span>Approved Sub-Wallets: <strong style={{ color: "hsl(var(--text))" }}>{limits.approvedRecipients.length} Active</strong></span>
        </div>
      </div>

      {/* Immutable Audit Log Table */}
      <div className="card">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1.25rem" }}>
          <div>
            <h2 className="font-heading" style={{ fontSize: "1.1rem", fontWeight: 700, color: "hsl(var(--text))" }}>
              Immutable Audit Logs ({auditLogs.length})
            </h2>
            <p style={{ fontSize: "0.78rem", color: "hsl(var(--text-3))" }}>
              Tamper-evident trail of rule modifications, execution events, and security checks.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.3rem" }}>
            {["ALL", "RULE", "PAYMENT", "LIMIT"].map((act) => (
              <button
                key={act}
                onClick={() => setFilterAction(act)}
                className={`btn btn-sm ${filterAction === act ? "btn-primary" : "btn-ghost"}`}
                style={{ fontSize: "0.72rem", padding: "0.2rem 0.6rem" }}
              >
                {act}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid hsl(var(--border))", color: "hsl(var(--text-3))", fontSize: "0.72rem", textTransform: "uppercase" }}>
                <th style={{ padding: "0.6rem 0.75rem" }}>Timestamp</th>
                <th style={{ padding: "0.6rem 0.75rem" }}>Action</th>
                <th style={{ padding: "0.6rem 0.75rem" }}>Resource & Details</th>
                <th style={{ padding: "0.6rem 0.75rem", textAlign: "center" }}>Severity</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: "1px solid hsl(var(--border) / 0.4)" }}>
                  <td style={{ padding: "0.75rem", color: "hsl(var(--text-2))", whiteSpace: "nowrap" }}>
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    <span className="badge badge-ghost" style={{ fontSize: "0.68rem" }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    <div style={{ fontWeight: 600, color: "hsl(var(--text))" }}>{log.details}</div>
                    <div style={{ fontSize: "0.68rem", color: "hsl(var(--text-3))", fontFamily: "monospace" }}>
                      Resource: {log.resourceType} [{log.resourceId}]
                    </div>
                  </td>
                  <td style={{ padding: "0.75rem", textAlign: "center" }}>
                    <span
                      className={`badge ${
                        log.status === "SUCCESS"
                          ? "badge-green"
                          : log.status === "CRITICAL"
                          ? "badge-red"
                          : log.status === "WARNING"
                          ? "badge-amber"
                          : "badge-blue"
                      }`}
                      style={{ fontSize: "0.68rem" }}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

