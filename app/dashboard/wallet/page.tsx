"use client";
import { useState } from "react";
import {
  Wallet, ArrowUpRight, ArrowDownRight, Zap, Shield,
  Copy, Check, ExternalLink, QrCode, RefreshCw, Layers,
  Send, Plus, DollarSign, Clock, Info
} from "lucide-react";
import { useFinanceStore } from "@/lib/finance-store";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { createOpenPaymentsQuote, executeOpenPaymentsOutgoing, createIncomingPaymentResource } from "@/lib/open-payments";
import { playEarcon, announceToScreenReader } from "@/lib/voice-service";

export default function WalletPage() {
  const {
    userName,
    walletAddress,
    currency,
    balance,
    savingsBalance,
    subscriptionsBalance,
    transactions,
    sendDirectPayment,
  } = useFinanceStore();

  const [copied, setCopied] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  // Send Form
  const [recipient, setRecipient] = useState("$ilp.paylance.io/sam");
  const [sendAmount, setSendAmount] = useState(25000);
  const [sendCategory, setSendCategory] = useState("Transfers");
  const [sendNote, setSendNote] = useState("Freelance Collaboration");
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  // Receive Form
  const [receiveAmount, setReceiveAmount] = useState(50000);
  const [receiveDesc, setReceiveDesc] = useState("Invoice Settlement");
  const [generatedIncomingUrl, setGeneratedIncomingUrl] = useState<string | null>(null);

  function handleCopyPointer() {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      playEarcon("CONFIRM");
      announceToScreenReader("Wallet payment pointer copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleSendPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!recipient || sendAmount <= 0) return;

    setIsSending(true);
    setSendResult(null);

    try {
      const res = await sendDirectPayment(recipient, sendAmount, sendCategory, sendNote);
      if (res.success) {
        playEarcon("SUCCESS");
        setSendResult(`✅ Payment successfully sent via Open Payments! Reference: ${res.tx?.providerReference}`);
        announceToScreenReader(`Payment of ${formatCurrency(sendAmount, currency)} sent to ${recipient}.`);
        setTimeout(() => {
          setShowSendModal(false);
          setSendResult(null);
        }, 1800);
      } else {
        playEarcon("ALERT");
        setSendResult(`⚠️ ${res.message}`);
      }
    } catch (e: any) {
      setSendResult(`Error: ${e.message}`);
    } finally {
      setIsSending(false);
    }
  }

  function handleGenerateIncoming() {
    const resource = createIncomingPaymentResource(walletAddress, receiveAmount, currency, receiveDesc);
    setGeneratedIncomingUrl(resource.paymentUrl);
    playEarcon("CONFIRM");
    announceToScreenReader("Incoming Open Payments resource created.");
  }

  const walletTransactions = transactions.filter((t) => t.currency === currency);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <Wallet size={18} color="hsl(var(--primary-light))" />
            <span style={{ fontSize: "0.78rem", color: "hsl(var(--primary-light))", fontWeight: 700 }}>
              Module 5: Payment Infrastructure
            </span>
          </div>
          <h1 className="font-heading" style={{ fontSize: "1.75rem", fontWeight: 800, color: "hsl(var(--text))" }}>
            Interledger Open Payments Wallet
          </h1>
          <p style={{ color: "hsl(var(--text-2))", fontSize: "0.85rem", marginTop: 2 }}>
            Universal payment pointers, instant quotes, and global interoperable settlement.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button
            onClick={() => setShowSendModal(true)}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Send size={15} /> Send Payment
          </button>
          <button
            onClick={() => {
              setShowReceiveModal(true);
              handleGenerateIncoming();
            }}
            className="btn btn-ghost"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <ArrowDownRight size={15} /> Receive via ILP
          </button>
        </div>
      </div>

      {/* Main Wallet Hero Card */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, hsl(217 91% 55% / 0.16), hsl(200 100% 60% / 0.06))",
          border: "1px solid hsl(217 91% 55% / 0.35)",
          padding: "1.75rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div className="grid-bg" style={{ position: "absolute", inset: 0, opacity: 0.1, pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: "1.5rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
              <div className="status-dot online" />
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "hsl(var(--text-2))" }}>
                Connected Open Payments Address
              </span>
            </div>

            <div className="font-heading" style={{ fontSize: "2.75rem", fontWeight: 800, color: "hsl(var(--text))", letterSpacing: "-0.04em", lineHeight: 1.1 }}>
              {formatCurrency(balance, currency)}
            </div>

            <div style={{ marginTop: "1rem", display: "inline-flex", alignItems: "center", gap: "0.6rem", background: "hsl(var(--surface-3))", padding: "0.4rem 0.85rem", borderRadius: 99, border: "1px solid hsl(var(--border))" }}>
              <Zap size={14} color="hsl(145 65% 50%)" />
              <span style={{ fontSize: "0.8rem", color: "hsl(var(--text))", fontFamily: "monospace", fontWeight: 600 }}>
                {walletAddress}
              </span>
              <button
                onClick={handleCopyPointer}
                style={{ background: "none", border: "none", color: "hsl(var(--primary-light))", cursor: "pointer", display: "flex", alignItems: "center" }}
                title="Copy Payment Pointer"
                aria-label="Copy Payment Pointer"
              >
                {copied ? <Check size={14} color="hsl(145 65% 50%)" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Sub-allocations Cards */}
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ background: "hsl(var(--surface-3) / 0.9)", border: "1px solid hsl(var(--border))", borderRadius: 12, padding: "1rem", minWidth: 160 }}>
              <div style={{ fontSize: "0.72rem", color: "hsl(var(--text-3))", textTransform: "uppercase", fontWeight: 700 }}>
                🏦 Savings Reserve
              </div>
              <div className="font-heading" style={{ fontSize: "1.3rem", fontWeight: 800, color: "hsl(145 65% 50%)", marginTop: 4 }}>
                {formatCurrency(savingsBalance, currency)}
              </div>
              <div style={{ fontSize: "0.7rem", color: "hsl(var(--text-3))", marginTop: 2 }}>
                Protected Auto-Save
              </div>
            </div>

            <div style={{ background: "hsl(var(--surface-3) / 0.9)", border: "1px solid hsl(var(--border))", borderRadius: 12, padding: "1rem", minWidth: 160 }}>
              <div style={{ fontSize: "0.72rem", color: "hsl(var(--text-3))", textTransform: "uppercase", fontWeight: 700 }}>
                🔁 Subscriptions Fund
              </div>
              <div className="font-heading" style={{ fontSize: "1.3rem", fontWeight: 800, color: "hsl(217 91% 70%)", marginTop: 4 }}>
                {formatCurrency(subscriptionsBalance, currency)}
              </div>
              <div style={{ fontSize: "0.7rem", color: "hsl(var(--text-3))", marginTop: 2 }}>
                Recurring Obligations
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Protocol Features Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <Shield size={16} color="hsl(var(--primary-light))" />
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "hsl(var(--text))" }}>
              Idempotency & Replay Protection
            </h3>
          </div>
          <p style={{ fontSize: "0.78rem", color: "hsl(var(--text-2))" }}>
            Every automation run and manual dispatch utilizes unique client idempotency keys, preventing duplicate executions even during network retries.
          </p>
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <Zap size={16} color="hsl(145 65% 50%)" />
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "hsl(var(--text))" }}>
              Cryptographic ILP Settlement
            </h3>
          </div>
          <p style={{ fontSize: "0.78rem", color: "hsl(var(--text-2))" }}>
            Payments route across packet-switched Interledger infrastructure, reaching recipient wallets within seconds with deterministic status verification.
          </p>
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <Layers size={16} color="hsl(280 80% 65%)" />
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "hsl(var(--text))" }}>
              Scoped GNAP Grant Authorization
            </h3>
          </div>
          <p style={{ fontSize: "0.78rem", color: "hsl(var(--text-2))" }}>
            Private keys are stored in tamper-proof hardware; the AI layer only proposes actions, requiring valid authorization tokens to execute.
          </p>
        </div>
      </div>

      {/* Wallet Ledger Records */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <div>
            <h2 className="font-heading" style={{ fontSize: "1.1rem", fontWeight: 700, color: "hsl(var(--text))" }}>
              Wallet Ledger Records ({walletTransactions.length})
            </h2>
            <p style={{ fontSize: "0.78rem", color: "hsl(var(--text-3))" }}>
              Real-time feed of credits, debits, and automated sub-wallet allocations.
            </p>
          </div>
          <span className="badge badge-blue">Verified Ledger</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid hsl(var(--border))", color: "hsl(var(--text-3))", fontSize: "0.72rem", textTransform: "uppercase" }}>
                <th style={{ padding: "0.6rem 0.75rem" }}>Date</th>
                <th style={{ padding: "0.6rem 0.75rem" }}>Transaction Reference</th>
                <th style={{ padding: "0.6rem 0.75rem" }}>Type</th>
                <th style={{ padding: "0.6rem 0.75rem" }}>Destination / Source</th>
                <th style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>Amount</th>
                <th style={{ padding: "0.6rem 0.75rem", textAlign: "center" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {walletTransactions.map((tx) => {
                const isCredit = tx.amount > 0;
                return (
                  <tr key={tx.id} style={{ borderBottom: "1px solid hsl(var(--border) / 0.4)" }}>
                    <td style={{ padding: "0.75rem", color: "hsl(var(--text-2))", whiteSpace: "nowrap" }}>
                      {formatDate(tx.date)}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <div style={{ fontWeight: 600, color: "hsl(var(--text))" }}>{tx.description}</div>
                      <div style={{ fontSize: "0.68rem", color: "hsl(var(--text-3))", fontFamily: "monospace" }}>
                        {tx.providerReference || "ilp_tx_verified"}
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <span className="badge badge-ghost" style={{ fontSize: "0.68rem" }}>
                        {tx.type}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem", color: "hsl(var(--text-2))", fontSize: "0.78rem" }}>
                      {isCredit ? (tx.sender || "External Payer") : (tx.recipient || "Internal Allocation")}
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>
                      <span style={{ color: isCredit ? "hsl(145 65% 50%)" : "hsl(var(--text))" }}>
                        {isCredit ? "+" : ""}{formatCurrency(tx.amount, tx.currency)}
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
        </div>
      </div>

      {/* Send Payment Modal */}
      {showSendModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "1rem",
          }}
        >
          <div className="card" style={{ maxWidth: 480, width: "100%", background: "hsl(var(--surface-2))", borderRadius: 16, padding: "1.5rem" }}>
            <h2 className="font-heading" style={{ fontSize: "1.2rem", fontWeight: 700, color: "hsl(var(--text))", marginBottom: "0.5rem" }}>
              Send via Interledger Open Payments
            </h2>
            <p style={{ fontSize: "0.78rem", color: "hsl(var(--text-3))", marginBottom: "1.25rem" }}>
              Generates an authenticated Open Payments quote and executes an authorized push.
            </p>

            <form onSubmit={handleSendPayment} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "hsl(var(--text-2))", display: "block", marginBottom: 4 }}>
                  Recipient Payment Pointer
                </label>
                <input
                  type="text"
                  placeholder="$ilp.paylance.io/username"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  required
                  className="input"
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "hsl(var(--text-2))", display: "block", marginBottom: 4 }}>
                  Amount ({currency === "NGN" ? "₦" : "$"})
                </label>
                <input
                  type="number"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(Number(e.target.value))}
                  required
                  className="input"
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "hsl(var(--text-2))", display: "block", marginBottom: 4 }}>
                  Purpose / Note
                </label>
                <input
                  type="text"
                  value={sendNote}
                  onChange={(e) => setSendNote(e.target.value)}
                  className="input"
                />
              </div>

              {/* Quote Preview */}
              <div style={{ background: "hsl(var(--surface-3))", padding: "0.75rem", borderRadius: 8, fontSize: "0.78rem", color: "hsl(var(--text-2))" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span>Network Transfer Fee:</span>
                  <strong style={{ color: "hsl(var(--text))" }}>
                    {currency === "NGN" ? "₦15.00" : "$0.05"}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Settlement Time:</span>
                  <span style={{ color: "hsl(145 65% 50%)", fontWeight: 700 }}>&lt; 5 seconds</span>
                </div>
              </div>

              {sendResult && (
                <div style={{ padding: "0.6rem", background: "hsl(var(--surface-4))", borderRadius: 8, fontSize: "0.8rem", color: "hsl(var(--text))" }}>
                  {sendResult}
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="submit" disabled={isSending} className="btn btn-primary" style={{ flex: 1 }}>
                  {isSending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>Confirm & Send Payment</span>
                </button>
                <button type="button" onClick={() => setShowSendModal(false)} className="btn btn-ghost">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive / Incoming Payment Modal */}
      {showReceiveModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "1rem",
          }}
        >
          <div className="card" style={{ maxWidth: 480, width: "100%", background: "hsl(var(--surface-2))", borderRadius: 16, padding: "1.5rem" }}>
            <h2 className="font-heading" style={{ fontSize: "1.2rem", fontWeight: 700, color: "hsl(var(--text))", marginBottom: "0.5rem" }}>
              Request Payment via Open Payments
            </h2>
            <p style={{ fontSize: "0.78rem", color: "hsl(var(--text-3))", marginBottom: "1.25rem" }}>
              Generates an Incoming Payment URL that any Open Payments wallet or client can pay into.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "hsl(var(--text-2))", display: "block", marginBottom: 4 }}>
                  Requested Amount ({currency === "NGN" ? "₦" : "$"})
                </label>
                <input
                  type="number"
                  value={receiveAmount}
                  onChange={(e) => setReceiveAmount(Number(e.target.value))}
                  className="input"
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "hsl(var(--text-2))", display: "block", marginBottom: 4 }}>
                  Description
                </label>
                <input
                  type="text"
                  value={receiveDesc}
                  onChange={(e) => setReceiveDesc(e.target.value)}
                  className="input"
                />
              </div>

              {generatedIncomingUrl && (
                <div style={{ background: "hsl(var(--surface-3))", padding: "0.75rem", borderRadius: 8 }}>
                  <div style={{ fontSize: "0.72rem", color: "hsl(var(--text-3))", marginBottom: 4 }}>
                    OPEN PAYMENTS INCOMING RESOURCE URL:
                  </div>
                  <code style={{ fontSize: "0.75rem", color: "hsl(var(--primary-light))", wordBreak: "break-all" }}>
                    {generatedIncomingUrl}
                  </code>
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    if (generatedIncomingUrl) {
                      navigator.clipboard.writeText(generatedIncomingUrl);
                      alert("Incoming payment URL copied!");
                    }
                  }}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  <Copy size={14} /> Copy Request URL
                </button>
                <button type="button" onClick={() => setShowReceiveModal(false)} className="btn btn-ghost">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
