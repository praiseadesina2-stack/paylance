"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  Zap, LayoutDashboard, Bot, Cog, Wallet,
  FileText, Shield, Volume2, VolumeX, Eye,
  Menu, X, Sparkles, ArrowRight, Mic, MicOff,
  Bell, CheckCircle, RefreshCw, SunMoon
} from "lucide-react";
import { useFinanceStore } from "@/lib/finance-store";
import { formatCurrency, getInitials } from "@/lib/utils";
import { VoiceRecognitionService, speakText, stopSpeaking, playEarcon, announceToScreenReader } from "@/lib/voice-service";
import { calculateTotalIncome, calculateTotalExpenses, calculateNetCashFlow } from "@/lib/financial-engine";

const MAIN_NAV = [
  { href: "/dashboard", label: "Financial Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/assistant", label: "AI Financial Assistant", icon: Bot, badge: "Voice" },
  { href: "/dashboard/automations", label: "Payment Automation", icon: Cog },
  { href: "/dashboard/wallet", label: "Open Payments Wallet", icon: Wallet },
  { href: "/dashboard/freelance-flows", label: "Freelance & Escrow", icon: FileText, sub: "Maintained flows" },
  { href: "/dashboard/security", label: "Security & Audit Logs", icon: Shield },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const {
    userName,
    userRole,
    walletAddress,
    currency,
    balance,
    savingsBalance,
    subscriptionsBalance,
    setCurrency,
    highContrast,
    toggleHighContrast,
    voiceEnabled,
    toggleVoiceEnabled,
    autoSpeak,
    transactions,
    upcoming,
    rules,
  } = useFinanceStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const voiceServiceRef = useRef<VoiceRecognitionService | null>(null);

  useEffect(() => {
    voiceServiceRef.current = new VoiceRecognitionService();
  }, []);

  // Sync high contrast with document element
  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  }, [highContrast]);

  // Voice shortcut: Read Financial Summary aloud
  function handleReadSummaryAloud() {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    const income = calculateTotalIncome(transactions, currency);
    const expenses = calculateTotalExpenses(transactions, currency);
    const net = calculateNetCashFlow(transactions, currency);
    const sym = currency === "NGN" ? "Naira" : "Dollars";

    const speechText = `Paylance Financial Summary. Your available balance is ${balance.toLocaleString()} ${sym}. Total income is ${income.toLocaleString()} ${sym}, total expenses are ${expenses.toLocaleString()} ${sym}, resulting in a net cash flow of ${net.toLocaleString()} ${sym}. You have ${rules.filter(r => r.status === "ACTIVE").length} active automation rules and ${upcoming.length} upcoming obligations.`;

    announceToScreenReader(speechText);
    setIsSpeaking(true);
    speakText(speechText, {
      onEnd: () => setIsSpeaking(false),
    });
  }

  // Quick mic toggle in header
  function toggleQuickListen() {
    if (isListening) {
      voiceServiceRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    }

    setVoiceTranscript("Listening for financial command...");
    setIsListening(true);
    announceToScreenReader("Microphone active. Listening for financial command.");

    voiceServiceRef.current?.start(
      (transcript, isFinal) => {
        setVoiceTranscript(transcript);
        if (isFinal) {
          setIsListening(false);
          announceToScreenReader(`Heard: ${transcript}`);
          // Redirect to assistant with question
          router.push(`/dashboard/assistant?q=${encodeURIComponent(transcript)}`);
        }
      },
      (err) => {
        setIsListening(false);
        setVoiceTranscript(`Voice error: ${err}`);
      },
      () => {
        setIsListening(false);
      }
    );
  }

  return (
    <div className={`min-h-screen ${highContrast ? "high-contrast" : ""}`} style={{ background: "hsl(var(--surface))" }}>
      {/* Hidden Live Region for WCAG Screen Readers */}
      <div id="paylance-live-region" role="status" aria-live="polite" className="sr-only" />

      {/* Top Accessibility & Global Controls Bar */}
      <header
        role="banner"
        style={{
          borderBottom: "1px solid hsl(var(--border))",
          background: "hsl(var(--surface-2))",
          padding: "0.5rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden btn btn-ghost btn-sm"
            aria-label="Toggle Navigation Menu"
            style={{ padding: "0.4rem" }}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none" }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(200 100% 60%))",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Zap size={16} color="white" fill="white" />
            </div>
            <div>
              <span className="font-heading" style={{ fontSize: "1.15rem", fontWeight: 800, color: "hsl(var(--text))", letterSpacing: "-0.03em" }}>
                Pay<span style={{ color: "hsl(var(--primary-light))" }}>lance</span>
              </span>
              <span style={{ marginLeft: 6, fontSize: "0.65rem", padding: "0.15rem 0.4rem", borderRadius: 4, background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary-light))", fontWeight: 700 }}>
                Open Payments
              </span>
            </div>
          </Link>
        </div>

        {/* Accessibility & Voice Quick Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* Currency Switcher */}
          <div style={{ display: "inline-flex", background: "hsl(var(--surface-3))", borderRadius: 8, padding: 2, border: "1px solid hsl(var(--border))" }}>
            <button
              onClick={() => setCurrency("NGN")}
              aria-label="Set currency to Nigerian Naira"
              style={{
                padding: "0.25rem 0.6rem",
                borderRadius: 6,
                fontSize: "0.75rem",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: currency === "NGN" ? "hsl(var(--primary))" : "transparent",
                color: currency === "NGN" ? "white" : "hsl(var(--text-2))",
              }}
            >
              ₦ NGN
            </button>
            <button
              onClick={() => setCurrency("USD")}
              aria-label="Set currency to US Dollars"
              style={{
                padding: "0.25rem 0.6rem",
                borderRadius: 6,
                fontSize: "0.75rem",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: currency === "USD" ? "hsl(var(--primary))" : "transparent",
                color: currency === "USD" ? "white" : "hsl(var(--text-2))",
              }}
            >
              $ USD
            </button>
          </div>

          {/* Read Summary Aloud (TTS) */}
          <button
            onClick={handleReadSummaryAloud}
            className={`btn btn-sm ${isSpeaking ? "btn-primary" : "btn-ghost"}`}
            title="Read financial summary aloud (WCAG 2.2 AA Audio)"
            aria-label="Read financial summary aloud"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            {isSpeaking ? (
              <>
                <VolumeX size={15} />
                <span className="hidden sm:inline text-xs">Stop Speaking</span>
              </>
            ) : (
              <>
                <Volume2 size={15} />
                <span className="hidden sm:inline text-xs">Audio Summary</span>
              </>
            )}
          </button>

          {/* Quick Mic Button (STT) */}
          <button
            onClick={toggleQuickListen}
            className={`btn btn-sm ${isListening ? "btn-primary pulse-blue" : "btn-ghost"}`}
            title="Voice Command Assistant"
            aria-label="Voice Command Assistant"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            {isListening ? (
              <>
                <MicOff size={15} />
                <span className="hidden sm:inline text-xs font-bold">Listening...</span>
                <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <span className="voice-bar-anim" />
                  <span className="voice-bar-anim" />
                  <span className="voice-bar-anim" />
                </div>
              </>
            ) : (
              <>
                <Mic size={15} />
                <span className="hidden sm:inline text-xs">Voice Mode</span>
              </>
            )}
          </button>

          {/* High Contrast Mode Toggle */}
          <button
            onClick={toggleHighContrast}
            className={`btn btn-sm ${highContrast ? "btn-primary" : "btn-ghost"}`}
            title="Toggle High Contrast Mode (WCAG AAA)"
            aria-label="Toggle High Contrast Mode"
            style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}
          >
            <SunMoon size={15} />
            <span className="hidden sm:inline text-xs">Contrast</span>
          </button>
        </div>
      </header>

      {/* Main Body with Sidebar + Content */}
      <div style={{ display: "flex", minHeight: "calc(100vh - 54px)" }}>
        {/* Sidebar */}
        <aside
          role="navigation"
          aria-label="Dashboard Main Navigation"
          style={{
            width: 260,
            background: "hsl(var(--surface-2))",
            borderRight: "1px solid hsl(var(--border))",
            display: "flex",
            flexDirection: "column",
            position: "sticky",
            top: 54,
            height: "calc(100vh - 54px)",
            overflowY: "auto",
            zIndex: 30,
          }}
          className={`${sidebarOpen ? "block fixed inset-y-0 left-0 top-[54px] w-64 shadow-2xl" : "hidden md:flex"}`}
        >
          {/* User & Wallet card */}
          <div style={{ padding: "1.25rem 1rem", borderBottom: "1px solid hsl(var(--border))" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div className="avatar" style={{ width: 36, height: 36, fontSize: "0.85rem" }}>
                {getInitials(userName)}
              </div>
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "hsl(var(--text))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {userName}
                </div>
                <div style={{ fontSize: "0.72rem", color: "hsl(145 65% 50%)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <div className="status-dot online" /> Connected
                </div>
              </div>
            </div>

            {/* Balances summary */}
            <div style={{ marginTop: "0.875rem", background: "hsl(var(--surface-3))", borderRadius: 8, padding: "0.6rem 0.75rem", border: "1px solid hsl(var(--border))" }}>
              <div style={{ fontSize: "0.68rem", color: "hsl(var(--text-3))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Main Wallet Balance
              </div>
              <div className="font-heading" style={{ fontSize: "1.15rem", fontWeight: 800, color: "hsl(var(--text))", marginTop: 2 }}>
                {formatCurrency(balance, currency)}
              </div>
              <div style={{ fontSize: "0.72rem", color: "hsl(var(--primary-light))", fontFamily: "monospace", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis" }}>
                {walletAddress}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ padding: "0.875rem 0.75rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "hsl(var(--text-3))", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 0.5rem 0.25rem" }}>
              Platform Modules
            </div>

            {MAIN_NAV.map(({ href, label, icon: Icon, badge, sub }) => {
              const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.6rem 0.75rem",
                    borderRadius: 8,
                    textDecoration: "none",
                    background: active ? "hsl(var(--primary) / 0.15)" : "transparent",
                    color: active ? "hsl(var(--primary-light))" : "hsl(var(--text-2))",
                    fontWeight: active ? 700 : 500,
                    fontSize: "0.85rem",
                    borderLeft: active ? "3px solid hsl(var(--primary))" : "3px solid transparent",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                    <Icon size={16} />
                    <div>
                      <div>{label}</div>
                      {sub && <div style={{ fontSize: "0.65rem", color: "hsl(var(--text-3))" }}>{sub}</div>}
                    </div>
                  </div>
                  {badge && (
                    <span style={{ fontSize: "0.65rem", padding: "0.1rem 0.45rem", borderRadius: 99, background: "hsl(var(--primary) / 0.25)", color: "hsl(var(--primary-light))", fontWeight: 700 }}>
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Sub-allocations peek */}
          <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid hsl(var(--border))", background: "hsl(var(--surface-3) / 0.5)" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "hsl(var(--text-3))", marginBottom: "0.5rem" }}>
              Sub-Wallet Allocations
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.3rem" }}>
              <span style={{ color: "hsl(var(--text-2))" }}>🏦 Savings:</span>
              <span style={{ fontWeight: 700, color: "hsl(145 65% 50%)" }}>{formatCurrency(savingsBalance, currency)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
              <span style={{ color: "hsl(var(--text-2))" }}>🔁 Subscriptions:</span>
              <span style={{ fontWeight: 700, color: "hsl(217 91% 70%)" }}>{formatCurrency(subscriptionsBalance, currency)}</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main
          role="main"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.5rem",
            maxWidth: 1300,
            width: "100%",
            margin: "0 auto",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
