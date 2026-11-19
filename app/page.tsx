"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Zap, Globe, Shield, ChevronRight, Star, TrendingUp,
  Users, DollarSign, Clock, CheckCircle, ArrowRight,
  Cpu, Lock, Wifi, BarChart2, Menu, X, Bot, Cog,
  Volume2, Eye, Play, Sparkles
} from "lucide-react";

const STATS = [
  { label: "Payment Settlement", value: "< 5 sec", icon: Zap },
  { label: "Automation Rules", value: "Custom & Natural", icon: Cog },
  { label: "Accessibility Tier", value: "WCAG 2.2 AA", icon: Volume2 },
  { label: "Infrastructure", value: "Interledger Open Payments", icon: Globe },
];

const MODULES = [
  {
    icon: Bot,
    title: "AI Financial Assistant",
    desc: "Interact with finances using natural language. Query verified spending, schedule payments, and draft automation rules with zero hallucination.",
    badge: "Module 1",
  },
  {
    icon: Cog,
    title: "Payment Automation Engine",
    desc: "Conditional inflows, percentage allocations, and recurring obligations executed deterministically with strict spending limits.",
    badge: "Module 2",
  },
  {
    icon: Volume2,
    title: "Accessible Voice Finance",
    desc: "WCAG 2.2 AA voice-driven platform for visually impaired individuals with text-to-speech feedback and non-visual audio cues.",
    badge: "Module 3",
  },
  {
    icon: BarChart2,
    title: "Financial Intelligence Dashboard",
    desc: "Real-time expense categorization across 10+ categories, cash flow breakdown, and interactive drill-downs into verified records.",
    badge: "Module 4",
  },
  {
    icon: Globe,
    title: "Interledger Open Payments",
    desc: "Interoperable multi-currency payment pointers, automated quote negotiation, and cryptographic payment settlement.",
    badge: "Module 5",
  },
  {
    icon: Shield,
    title: "Security & Trust Architecture",
    desc: "Strict separation of AI intent and execution, user-defined transaction limits, and tamper-evident audit logging.",
    badge: "Module 6",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Connect Your Open Payments Wallet",
    desc: "Link your universal payment pointer ($ilp.paylance.io/yourname) in NGN or USD with instant balance verification.",
  },
  {
    step: "02",
    title: "Define Rules in Everyday Language",
    desc: 'Tell the AI: "Whenever I receive ₦100,000, allocate 20% to savings, 10% to subscriptions, and keep 70% in my main wallet."',
  },
  {
    step: "03",
    title: "Review & Explicitly Authorize",
    desc: "The system inspects limits, validates destination accounts, and requests your explicit confirmation before activation.",
  },
  {
    step: "04",
    title: "Autonomous Settlement & Voice Feedback",
    desc: "Funds arrive, the engine executes Open Payments quotes automatically, updates your analytics, and reports via audio summary.",
  },
];

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div style={{ background: "hsl(0 0% 4%)", minHeight: "100vh", color: "white" }}>
      {/* Top Navbar */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          transition: "all 0.3s",
          background: scrolled ? "hsl(220 14% 8% / 0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid hsl(220 20% 16%)" : "none",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(200 100% 60%))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Zap size={16} color="white" fill="white" />
            </div>
            <span className="font-heading" style={{ fontSize: "1.25rem", fontWeight: 800, color: "white", letterSpacing: "-0.03em" }}>
              Pay<span style={{ color: "hsl(217 91% 65%)" }}>lance</span>
            </span>
          </div>

          <div style={{ display: "flex", gap: "2rem", alignItems: "center" }} className="hidden md:flex">
            <a href="#modules" style={{ color: "hsl(220 15% 65%)", fontSize: "0.875rem", fontWeight: 500, textDecoration: "none" }}>
              Modules
            </a>
            <a href="#how-it-works" style={{ color: "hsl(220 15% 65%)", fontSize: "0.875rem", fontWeight: 500, textDecoration: "none" }}>
              How It Works
            </a>
            <a href="#accessibility" style={{ color: "hsl(220 15% 65%)", fontSize: "0.875rem", fontWeight: 500, textDecoration: "none" }}>
              Accessibility
            </a>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <Link href="/dashboard" className="btn btn-primary btn-sm">
              Launch Dashboard <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ paddingTop: "7.5rem", paddingBottom: "4.5rem", position: "relative", overflow: "hidden" }}>
        <div className="hero-bg" style={{ position: "absolute", inset: 0, opacity: 0.8, pointerEvents: "none" }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 1.5rem", position: "relative", zIndex: 1, textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "hsl(220 20% 12%)", border: "1px solid hsl(217 91% 55% / 0.4)", padding: "0.35rem 0.85rem", borderRadius: 99, marginBottom: "1.5rem" }}>
            <Sparkles size={14} color="hsl(217 91% 65%)" />
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "hsl(217 91% 75%)" }}>
              CU Next Gen Hackathon 2026 · Payment Automation Track
            </span>
          </div>

          <h1 className="font-heading" style={{ fontSize: "clamp(2.5rem, 5.5vw, 4.2rem)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", maxWidth: 900, margin: "0 auto 1.5rem" }}>
            Your Money. <span className="text-gradient-blue">Your Rules.</span> Your Control.
          </h1>

          <p style={{ fontSize: "1.15rem", color: "hsl(220 15% 70%)", maxWidth: 720, margin: "0 auto 2rem", lineHeight: 1.6 }}>
            Paylance is the AI-powered financial management and payment automation platform. Manage, understand, and automate your money using everyday language, voice commands, and Interledger Open Payments.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "3rem" }}>
            <Link href="/dashboard" className="btn btn-primary btn-lg" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Play size={16} fill="currentColor" /> Enter Interactive Demo
            </Link>
            <Link href="/dashboard/assistant" className="btn btn-ghost btn-lg" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Bot size={18} /> Try AI Voice Assistant
            </Link>
          </div>

          {/* Key Stats Bar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", maxWidth: 960, margin: "0 auto" }}>
            {STATS.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div key={idx} className="card" style={{ padding: "1rem", display: "flex", alignItems: "center", gap: "0.75rem", textAlign: "left" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "hsl(217 91% 55% / 0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={18} color="hsl(217 91% 70%)" />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "hsl(220 15% 55%)", textTransform: "uppercase" }}>{s.label}</div>
                    <div className="font-heading" style={{ fontSize: "1rem", fontWeight: 700, color: "white" }}>{s.value}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Modules Grid */}
      <section id="modules" style={{ padding: "5rem 1.5rem", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2 className="font-heading" style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
            Engineered for Autonomous Finance
          </h2>
          <p style={{ color: "hsl(220 15% 65%)", fontSize: "1rem", marginTop: 6 }}>
            Six interconnected modules driving intelligence, accessibility, and financial automation.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
          {MODULES.map((m, idx) => {
            const Icon = m.icon;
            return (
              <div key={idx} className="card card-hover" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "hsl(217 91% 55% / 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={20} color="hsl(217 91% 70%)" />
                  </div>
                  <span className="badge badge-blue">{m.badge}</span>
                </div>
                <h3 className="font-heading" style={{ fontSize: "1.15rem", fontWeight: 700, color: "white" }}>
                  {m.title}
                </h3>
                <p style={{ fontSize: "0.85rem", color: "hsl(220 15% 65%)", lineHeight: 1.5 }}>
                  {m.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it Works / Walkthrough */}
      <section id="how-it-works" style={{ padding: "5rem 1.5rem", background: "hsl(220 14% 6%)", borderTop: "1px solid hsl(220 20% 14%)", borderBottom: "1px solid hsl(220 20% 14%)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "hsl(145 65% 50%)", fontWeight: 700, textTransform: "uppercase" }}>
              The Hackathon Showcase Scenario
            </span>
            <h2 className="font-heading" style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.03em", marginTop: 4 }}>
              From Inflow to Automatic Split in Seconds
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
            {HOW_IT_WORKS.map((step, idx) => (
              <div key={idx} className="card" style={{ background: "hsl(220 16% 9%)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <span className="font-heading" style={{ fontSize: "2rem", fontWeight: 800, color: "hsl(217 91% 65% / 0.5)" }}>
                  {step.step}
                </span>
                <h3 className="font-heading" style={{ fontSize: "1.1rem", fontWeight: 700, color: "white" }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: "0.82rem", color: "hsl(220 15% 60%)", lineHeight: 1.5 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "3rem 1.5rem", borderTop: "1px solid hsl(220 20% 14%)", textAlign: "center", color: "hsl(220 15% 50%)", fontSize: "0.85rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: "hsl(217 91% 55%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={14} color="white" fill="white" />
            </div>
            <strong style={{ color: "white" }}>Paylance</strong> · CU Next Gen Hackathon 2026
          </div>
          <div>
            Built with Interledger Open Payments & Gemini AI
          </div>
        </div>
      </footer>
    </div>
  );
}
