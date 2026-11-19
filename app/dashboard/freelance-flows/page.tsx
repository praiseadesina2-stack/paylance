"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Briefcase, FileText, CheckCircle, Clock, Zap,
  Cpu, ArrowRight, Shield, Play, Lock, Users,
  Video, DollarSign, AlertCircle
} from "lucide-react";
import { useJobsStore } from "@/lib/jobs-store";
import { DEMO_JOBS, DEMO_SESSIONS, DEMO_FREELANCERS } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function FreelanceFlowsPage() {
  const jobs = useJobsStore((s) => s.jobs);
  const allJobs = jobs.length > 0 ? jobs : DEMO_JOBS;
  const sessions = DEMO_SESSIONS;

  const [activeTab, setActiveTab] = useState<"CONTRACTS" | "SESSIONS" | "TALENT">("CONTRACTS");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <FileText size={18} color="hsl(var(--primary-light))" />
            <span style={{ fontSize: "0.78rem", color: "hsl(var(--primary-light))", fontWeight: 700 }}>
              Maintained Payment Flows
            </span>
          </div>
          <h1 className="font-heading" style={{ fontSize: "1.75rem", fontWeight: 800, color: "hsl(var(--text))" }}>
            Freelance, Milestone Escrow & Streaming Sessions
          </h1>
          <p style={{ color: "hsl(var(--text-2))", fontSize: "0.85rem", marginTop: 2 }}>
            Complete Interledger escrow lifecycle, AI deliverable verification, and pay-per-minute consultations.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link href="/dashboard/employer/jobs/new" className="btn btn-primary btn-sm">
            Post Milestone Job
          </Link>
          <Link href="/dashboard/employer/jobs" className="btn btn-ghost btn-sm">
            View All Jobs
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid hsl(var(--border))", paddingBottom: "0.5rem" }}>
        <button
          onClick={() => setActiveTab("CONTRACTS")}
          className={`btn btn-sm ${activeTab === "CONTRACTS" ? "btn-primary" : "btn-ghost"}`}
        >
          <Briefcase size={14} /> Milestone Escrow Contracts ({allJobs.length})
        </button>
        <button
          onClick={() => setActiveTab("SESSIONS")}
          className={`btn btn-sm ${activeTab === "SESSIONS" ? "btn-primary" : "btn-ghost"}`}
        >
          <Video size={14} /> Pay-Per-Minute Sessions ({sessions.length})
        </button>
        <button
          onClick={() => setActiveTab("TALENT")}
          className={`btn btn-sm ${activeTab === "TALENT" ? "btn-primary" : "btn-ghost"}`}
        >
          <Users size={14} /> Talent & AI Matching ({DEMO_FREELANCERS.length})
        </button>
      </div>

      {/* TAB 1: Milestone Contracts */}
      {activeTab === "CONTRACTS" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {allJobs.map((job) => (
            <div key={job.id} className="card">
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h2 className="font-heading" style={{ fontSize: "1.15rem", fontWeight: 700, color: "hsl(var(--text))" }}>
                      {job.title}
                    </h2>
                    <span className="badge badge-blue">{job.status}</span>
                  </div>
                  <p style={{ fontSize: "0.82rem", color: "hsl(var(--text-2))", marginTop: 4, maxWidth: 650 }}>
                    {job.description}
                  </p>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.72rem", color: "hsl(var(--text-3))", textTransform: "uppercase" }}>
                    Escrow Budget
                  </div>
                  <div className="font-heading" style={{ fontSize: "1.3rem", fontWeight: 800, color: "hsl(145 65% 50%)" }}>
                    ${job.budget.toLocaleString()} USD
                  </div>
                </div>
              </div>

              {/* Escrow Status Bar */}
              <div style={{ background: "hsl(var(--surface-3))", padding: "0.85rem", borderRadius: 10, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Shield size={16} color="hsl(var(--primary-light))" />
                  <span style={{ fontSize: "0.8rem", color: "hsl(var(--text))" }}>
                    Escrow: <strong>{job.escrow.funded > 0 ? "Funded on ILP" : "Pending Funding"}</strong>
                  </span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "hsl(var(--text-2))" }}>
                  Funded: <strong>${job.escrow.funded}</strong> · Released: <strong>${job.escrow.released}</strong>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <Link href={`/dashboard/employer/jobs/${job.id}/contract`} className="btn btn-primary btn-sm">
                    View Contract & Escrow <ArrowRight size={13} />
                  </Link>
                  <Link href={`/dashboard/employer/jobs/${job.id}/matches`} className="btn btn-ghost btn-sm">
                    AI Talent Matches
                  </Link>
                </div>
              </div>

              {/* Milestones list */}
              {job.milestones && job.milestones.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-3))", fontWeight: 700, textTransform: "uppercase" }}>
                    Milestones & Deliverables
                  </div>
                  {job.milestones.map((m, idx) => (
                    <div
                      key={m.id || idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.5rem 0.75rem",
                        background: "hsl(var(--surface-4) / 0.5)",
                        borderRadius: 8,
                        fontSize: "0.82rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontWeight: 700, color: "hsl(var(--text-3))" }}>#{idx + 1}</span>
                        <span style={{ fontWeight: 600, color: "hsl(var(--text))" }}>{m.title}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <strong style={{ color: "hsl(var(--text))" }}>${m.amount}</strong>
                        <Link
                          href={`/dashboard/freelancer/contracts/${job.id}/submit/${m.id || `m_${idx}`}`}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem" }}
                        >
                          Submit Work
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: Sessions */}
      {activeTab === "SESSIONS" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {sessions.map((sess) => (
            <div key={sess.id} className="card" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <h3 className="font-heading" style={{ fontSize: "1.1rem", fontWeight: 700, color: "hsl(var(--text))" }}>
                    {sess.title}
                  </h3>
                  <span className="badge badge-cyan">{sess.status}</span>
                </div>
                <div style={{ fontSize: "0.82rem", color: "hsl(var(--text-2))", marginTop: 4 }}>
                  Consultant: <strong>{sess.consultantName}</strong> ({sess.freelancer?.title})
                </div>
                <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-3))", marginTop: 2 }}>
                  Rate: <strong>${sess.freelancer?.ratePerMinute}/min</strong> · Scheduled: {formatDate(sess.startTime)}
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <Link
                  href={`/dashboard/sessions/room/${sess.id}`}
                  className="btn btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <Video size={15} /> Join Live Streaming Room
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: Talent */}
      {activeTab === "TALENT" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
          {DEMO_FREELANCERS.map((dev) => (
            <div key={dev.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <img src={dev.avatar} alt={dev.name} style={{ width: 44, height: 44, borderRadius: "50%" }} />
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "hsl(var(--text))" }}>{dev.name}</h3>
                  <div style={{ fontSize: "0.78rem", color: "hsl(var(--text-2))" }}>{dev.title}</div>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {dev.skills.map((s) => (
                  <span key={s} className="badge badge-ghost" style={{ fontSize: "0.7rem" }}>{s}</span>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid hsl(var(--border) / 0.5)", paddingTop: "0.5rem", fontSize: "0.78rem" }}>
                <span>Rate: <strong>${dev.hourlyRate}/hr</strong> (${dev.ratePerMinute}/min)</span>
                <span style={{ color: "hsl(145 65% 50%)", fontWeight: 700 }}>★ {dev.trustScore}% Trust</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

