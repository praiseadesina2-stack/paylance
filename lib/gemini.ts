// ─── Paylance Gemini AI Service ──────────────────────────────────────────────
// Powers: milestone generation, delivery verification, AI matching


const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

async function callGemini(prompt: string, systemPrompt?: string): Promise<string> {
  const contents = [];
  if (systemPrompt) {
    contents.push({ role: "user", parts: [{ text: systemPrompt }] });
    contents.push({ role: "model", parts: [{ text: "Understood. I will follow these instructions precisely." }] });
  }
  contents.push({ role: "user", parts: [{ text: prompt }] });

  const res = await fetch(`${GEMINI_BASE}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
}

// ─── 1. MILESTONE GENERATOR ─────────────────────────────────────────────────
export interface Milestone {
  id: string;
  title: string;
  description: string;
  deliverables: string[];
  amount: number;
  durationDays: number;
  acceptanceCriteria: string;
}

export interface GeneratedJobPlan {
  milestones: Milestone[];
  totalBudget: number;
  estimatedDays: number;
  aiSummary: string;
  riskFlags: string[];
}

export async function generateMilestones(
  jobTitle: string,
  jobDescription: string,
  budget: number,
  skills: string[]
): Promise<GeneratedJobPlan> {
  const system = `You are Paylance's AI Project Architect. Your job is to break freelance projects into clear, verifiable milestones.
Rules:
- Always return valid JSON matching the schema exactly
- Milestones must be independently verifiable 
- Amounts must sum to totalBudget exactly
- Each milestone must have concrete, checkable deliverables
- riskFlags should warn about vague requirements, scope creep risks, or unclear success criteria`;

  const prompt = `Break this freelance project into 3-5 milestones:

Title: ${jobTitle}
Description: ${jobDescription}
Total Budget: $${budget} USD
Required Skills: ${skills.join(", ")}

Return this exact JSON structure:
{
  "milestones": [
    {
      "id": "m1",
      "title": "string (short, action-oriented)",
      "description": "string (what will be built/done)",
      "deliverables": ["string", "string"],
      "amount": number,
      "durationDays": number,
      "acceptanceCriteria": "string (specific, measurable criteria for AI verification)"
    }
  ],
  "totalBudget": number,
  "estimatedDays": number,
  "aiSummary": "string (2-3 sentences explaining the project breakdown)",
  "riskFlags": ["string"] 
}`;

  const raw = await callGemini(prompt, system);
  const parsed = JSON.parse(raw);

  // Ensure amounts sum correctly
  const total = parsed.milestones.reduce((s: number, m: Milestone) => s + m.amount, 0);
  if (Math.abs(total - budget) > 1) {
    // Adjust last milestone
    const diff = budget - (total - parsed.milestones[parsed.milestones.length - 1].amount);
    parsed.milestones[parsed.milestones.length - 1].amount = Math.max(0, diff);
    parsed.totalBudget = budget;
  }

  return parsed;
}

// ─── 2. DELIVERY VERIFIER ────────────────────────────────────────────────────
export type VerdictStatus = "APPROVED" | "NEEDS_REVISION" | "ESCALATED";

export interface VerificationResult {
  verdict: VerdictStatus;
  confidence: number; // 0-100
  summary: string;
  checklist: { criterion: string; passed: boolean; note: string }[];
  approvedAmount: number;
  escalationReason?: string;
  suggestedRevisions?: string[];
}

export async function verifyDeliverable(
  milestoneTitle: string,
  milestoneDescription: string,
  acceptanceCriteria: string,
  deliverables: string[],
  submissionNotes: string,
  submittedFiles: string[], // file names/descriptions
  milestoneAmount: number
): Promise<VerificationResult> {
  const system = `You are Paylance's AI Delivery Verifier. You determine if submitted work meets milestone acceptance criteria.
You protect BOTH parties — freelancers from non-payment, employers from substandard work.
Be thorough but fair. Escalate to humans only for genuinely ambiguous cases.
Always return valid JSON matching the schema exactly.`;

  const prompt = `Verify this milestone submission:

MILESTONE: ${milestoneTitle}
DESCRIPTION: ${milestoneDescription}
ACCEPTANCE CRITERIA: ${acceptanceCriteria}
EXPECTED DELIVERABLES: ${deliverables.join(", ")}

SUBMISSION:
Notes from freelancer: "${submissionNotes}"
Files submitted: ${submittedFiles.join(", ") || "No files attached"}
Amount at stake: $${milestoneAmount}

Return this exact JSON:
{
  "verdict": "APPROVED" | "NEEDS_REVISION" | "ESCALATED",
  "confidence": number (0-100),
  "summary": "string (2-3 sentence verdict explanation)",
  "checklist": [
    {
      "criterion": "string (specific criteria being checked)",
      "passed": boolean,
      "note": "string (explanation)"
    }
  ],
  "approvedAmount": number (full amount if APPROVED, 0 if not),
  "escalationReason": "string (only if ESCALATED)",
  "suggestedRevisions": ["string"] (only if NEEDS_REVISION, specific action items)
}

Rules:
- APPROVE if >75% criteria clearly met and no critical issues
- NEEDS_REVISION if work exists but specific gaps present
- ESCALATE only if genuinely impossible to determine without human context
- confidence < 60 should trigger ESCALATED`;

  const raw = await callGemini(prompt, system);
  return JSON.parse(raw);
}

// ─── 3. AI TALENT MATCHER ────────────────────────────────────────────────────
export interface MatchResult {
  freelancerId: string;
  matchScore: number; // 0-100
  reasoning: string;
  strengthHighlights: string[];
  concerns: string[];
}

export interface MatchReport {
  matches: MatchResult[];
  totalCandidates: number;
  matchingSummary: string;
  recommendedId: string;
}

export async function matchFreelancers(
  jobTitle: string,
  jobDescription: string,
  requiredSkills: string[],
  milestones: { title: string; description: string }[],
  freelancers: {
    id: string;
    name: string;
    skills: string[];
    bio: string;
    trustScore: number;
    completedJobs: number;
  }[]
): Promise<MatchReport> {
  const system = `You are Paylance's AI Talent Matcher. Rank freelancers for a specific job.
Consider: skill alignment, trust score, experience depth, and bio relevance.
Be precise — your scores directly affect who gets hired.`;

  const prompt = `Rank these freelancers for this job:

JOB: ${jobTitle}
DESCRIPTION: ${jobDescription}
SKILLS NEEDED: ${requiredSkills.join(", ")}
MILESTONES: ${milestones.map(m => m.title).join(", ")}

CANDIDATES:
${freelancers.map(f => `
ID: ${f.id}
Name: ${f.name}
Skills: ${f.skills.join(", ")}
Bio: ${f.bio}
Trust Score: ${f.trustScore}/5
Completed Jobs: ${f.completedJobs}
`).join("\n---")}

Return this exact JSON:
{
  "matches": [
    {
      "freelancerId": "string",
      "matchScore": number (0-100),
      "reasoning": "string (2 sentences)",
      "strengthHighlights": ["string"],
      "concerns": ["string"]
    }
  ],
  "totalCandidates": number,
  "matchingSummary": "string (overall summary of talent pool quality)",
  "recommendedId": "string (ID of top recommendation)"
}`;

  const raw = await callGemini(prompt, system);
  const result = JSON.parse(raw);
  result.matches.sort((a: MatchResult, b: MatchResult) => b.matchScore - a.matchScore);
  return result;
}
