// ─── Paylance Extended Store ──────────────────────────────────────────────────
// Extends the existing Zustand store with jobs, contracts, and escrow management
// Drop this alongside the existing lib/store.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GeneratedJobPlan, VerificationResult } from "./gemini";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MilestoneStatus =
  | "LOCKED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "NEEDS_REVISION"
  | "ESCALATED";

export interface StoredMilestone {
  id: string;
  title: string;
  description: string;
  deliverables: string[];
  amount: number;
  durationDays: number;
  acceptanceCriteria: string;
  status: MilestoneStatus;
  submittedAt?: string;
  submissionNotes?: string;
  submittedFiles?: string[];
  verificationResult?: VerificationResult;
  paidAt?: string;
}

export type JobStatus = "DRAFT" | "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type EscrowStatus = "PENDING" | "FUNDED" | "PARTIAL_RELEASE" | "RELEASED" | "REFUNDED";

export interface StoredJob {
  id: string;
  employerId: string;
  employerName: string;
  title: string;
  description: string;
  skills: string[];
  budget: number;
  status: JobStatus;
  milestones: StoredMilestone[];
  aiPlan?: GeneratedJobPlan;
  createdAt: string;
  deadline: string;
  // contract info (set after hiring)
  freelancerId?: string;
  freelancerName?: string;
  escrow: {
    status: EscrowStatus;
    total: number;
    funded: number;
    released: number;
    ilpTxId?: string;
  };
  // download lock
  downloadUnlocked: boolean;
  finalFiles?: string[];
}

interface JobsStore {
  jobs: StoredJob[];
  addJob: (job: StoredJob) => void;
  updateJob: (id: string, patch: Partial<StoredJob>) => void;
  fundEscrow: (jobId: string) => void;
  hireFreelancer: (jobId: string, freelancerId: string, freelancerName: string) => void;
  submitMilestone: (jobId: string, milestoneId: string, notes: string, files: string[]) => void;
  recordVerdict: (jobId: string, milestoneId: string, result: VerificationResult) => void;
  releaseMilestonePayment: (jobId: string, milestoneId: string) => void;
  unlockDownload: (jobId: string, files: string[]) => void;
  getJobById: (id: string) => StoredJob | undefined;
  getEmployerJobs: (employerId: string) => StoredJob[];
  getFreelancerContracts: (freelancerId: string) => StoredJob[];
}

export const useJobsStore = create<JobsStore>()(
  persist(
    (set, get) => ({
      jobs: [],

      addJob: (job) =>
        set((s) => ({ jobs: [job, ...s.jobs] })),

      updateJob: (id, patch) =>
        set((s) => ({
          jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)),
        })),

      fundEscrow: (jobId) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  escrow: {
                    ...j.escrow,
                    status: "FUNDED",
                    funded: j.escrow.total,
                    ilpTxId: `ilp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  },
                }
              : j
          ),
        })),

      hireFreelancer: (jobId, freelancerId, freelancerName) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  status: "IN_PROGRESS" as JobStatus,
                  freelancerId,
                  freelancerName,
                  milestones: j.milestones.map((m, i) => ({
                    ...m,
                    status: (i === 0 ? "IN_PROGRESS" : "LOCKED") as MilestoneStatus,
                  })),
                }
              : j
          ),
        })),

      submitMilestone: (jobId, milestoneId, notes, files) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  milestones: j.milestones.map((m) =>
                    m.id === milestoneId
                      ? {
                          ...m,
                          status: "UNDER_REVIEW" as MilestoneStatus,
                          submittedAt: new Date().toISOString(),
                          submissionNotes: notes,
                          submittedFiles: files,
                        }
                      : m
                  ),
                }
              : j
          ),
        })),

      recordVerdict: (jobId, milestoneId, result) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  milestones: j.milestones.map((m) =>
                    m.id === milestoneId
                      ? {
                          ...m,
                          status: result.verdict === "APPROVED"
                            ? ("APPROVED" as MilestoneStatus)
                            : result.verdict === "NEEDS_REVISION"
                            ? ("NEEDS_REVISION" as MilestoneStatus)
                            : ("ESCALATED" as MilestoneStatus),
                          verificationResult: result,
                        }
                      : m
                  ),
                }
              : j
          ),
        })),

      releaseMilestonePayment: (jobId, milestoneId) =>
        set((s) => ({
          jobs: s.jobs.map((j) => {
            if (j.id !== jobId) return j;
            const milestone = j.milestones.find((m) => m.id === milestoneId);
            if (!milestone) return j;
            const newReleased = j.escrow.released + milestone.amount;
            const allApproved = j.milestones
              .filter((m) => m.id !== milestoneId)
              .every((m) => m.status === "APPROVED");
            
            // Unlock next milestone
            let nextUnlocked = false;
            const newMilestones = j.milestones.map((m) => {
              if (m.id === milestoneId) return { ...m, paidAt: new Date().toISOString() };
              if (!nextUnlocked && m.status === "LOCKED") {
                nextUnlocked = true;
                return { ...m, status: "IN_PROGRESS" as MilestoneStatus };
              }
              return m;
            });

            return {
              ...j,
              status: allApproved ? ("COMPLETED" as JobStatus) : j.status,
              milestones: newMilestones,
              escrow: {
                ...j.escrow,
                released: newReleased,
                status:
                  newReleased >= j.escrow.total
                    ? ("RELEASED" as EscrowStatus)
                    : ("PARTIAL_RELEASE" as EscrowStatus),
              },
            };
          }),
        })),

      unlockDownload: (jobId, files) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId
              ? { ...j, downloadUnlocked: true, finalFiles: files }
              : j
          ),
        })),

      getJobById: (id) => get().jobs.find((j) => j.id === id),
      getEmployerJobs: (employerId) => get().jobs.filter((j) => j.employerId === employerId),
      getFreelancerContracts: (freelancerId) =>
        get().jobs.filter((j) => j.freelancerId === freelancerId),
    }),
    { name: "Paylance-jobs" }
  )
);
