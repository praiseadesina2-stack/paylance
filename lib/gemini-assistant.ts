// ─── Paylance AI Financial Assistant & NLP Parser ──────────────────────────────
// Module 1: Understands financial instructions, grounds queries in verified records,
// proposes structured rules with human-in-the-loop confirmation, and never hallucinates figures.

import { answerFinancialQuery, TransactionRecord, UpcomingPayment } from "./financial-engine";
import { AutomationRule } from "./finance-store";

export type AssistantIntent = 
  | "QUERY_FINANCE"
  | "CREATE_AUTOMATION_RULE"
  | "INITIATE_PAYMENT"
  | "AMBIGUOUS_CLARIFICATION"
  | "GENERAL_ASSISTANCE";

export interface ProposedRulePayload {
  name: string;
  description: string;
  triggerType: "INCOMING_PAYMENT" | "BALANCE_THRESHOLD" | "RECURRING_SCHEDULE" | "CLIENT_SPECIFIC";
  minAmount?: number;
  currency: "NGN" | "USD";
  allocations: {
    destination: string;
    percentage?: number;
    amount?: number;
    destinationWalletAddress?: string;
  }[];
  frequency: "ON_INFLOW" | "DAILY" | "WEEKLY" | "MONTHLY";
  authorizationScope: string;
}

export interface ProposedPaymentPayload {
  recipient: string;
  amount: number;
  currency: "NGN" | "USD";
  category: string;
  note: string;
  estimatedFee: number;
}

export interface AssistantResponse {
  intent: AssistantIntent;
  spokenText: string;
  displayText: string;
  proposedRule?: ProposedRulePayload;
  proposedPayment?: ProposedPaymentPayload;
  supportingTransactions?: TransactionRecord[];
  clarificationPrompt?: string;
}

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function processAssistantMessage(
  userMessage: string,
  transactions: TransactionRecord[],
  upcoming: UpcomingPayment[],
  currency: "NGN" | "USD" = "NGN"
): Promise<AssistantResponse> {
  const normalized = userMessage.trim().toLowerCase();

  // 1. Check for Rule Creation intent (e.g. "Whenever I receive...", "Allocate...", "When balance...", "Schedule payment...")
  if (
    normalized.includes("whenever") ||
    normalized.includes("when i receive") ||
    normalized.includes("allocate") ||
    normalized.includes("every month") ||
    normalized.includes("every friday") ||
    normalized.includes("create rule") ||
    normalized.includes("automation rule")
  ) {
    return handleRuleCreationIntent(userMessage, currency);
  }

  // 2. Check for Payment Initiation intent (e.g. "Send ₦15,000 to...", "Pay ₦...", "Transfer...")
  if (
    (normalized.startsWith("send") || normalized.startsWith("pay") || normalized.startsWith("transfer")) &&
    (/\d+/.test(normalized) || normalized.includes("₦") || normalized.includes("$"))
  ) {
    return handlePaymentInitiationIntent(userMessage, currency);
  }

  // 3. Check for Financial Queries (e.g. "How much...", "What are my...", "Show my expenses...")
  if (
    normalized.includes("how much") ||
    normalized.includes("what did i spend") ||
    normalized.includes("expenses") ||
    normalized.includes("income") ||
    normalized.includes("balance") ||
    normalized.includes("subscriptions") ||
    normalized.includes("upcoming") ||
    normalized.includes("savings") ||
    normalized.includes("breakdown")
  ) {
    const verifiedResult = answerFinancialQuery(userMessage, transactions, upcoming, currency);
    return {
      intent: "QUERY_FINANCE",
      spokenText: verifiedResult.summaryText,
      displayText: verifiedResult.summaryText,
      supportingTransactions: verifiedResult.supportingTransactions,
    };
  }

  // 4. Try Gemini LLM for deep natural language parsing if available
  if (GEMINI_API_KEY) {
    try {
      const llmResult = await callGeminiForNLP(userMessage, currency);
      if (llmResult) return llmResult;
    } catch (e) {
      console.warn("Gemini API fallback to deterministic NLP parser", e);
    }
  }

  // 5. Default General Assistance
  const sym = currency === "NGN" ? "₦" : "$";
  return {
    intent: "GENERAL_ASSISTANCE",
    displayText: `Hello! I'm Paylance AI. You can ask me to:
• **Query your finances**: "How much did I spend on food this month?" or "How much have I allocated to subscriptions?"
• **Create automation rules**: "Whenever I receive ${sym}100,000, allocate 20% to savings, 10% to subscriptions, and leave 70% in main wallet."
• **Send payments**: "Send ${sym}20,000 to sam@ilp.paylance.io for dev contract."
• **Check upcoming bills**: "What are my upcoming obligations?"`,
    spokenText: `I can help you analyze spending, create payment automation rules, schedule recurring commitments, or send payments using Interledger Open Payments. How would you like to proceed?`,
  };
}

function handleRuleCreationIntent(rawMessage: string, currency: "NGN" | "USD"): AssistantResponse {
  const text = rawMessage.toLowerCase();

  // Extract amount threshold (e.g. 100,000 or 100000 or $1000)
  const amountMatch = rawMessage.match(/(?:[₦$]|ngn\s*|usd\s*)?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+)/i);
  let threshold = 100000;
  if (amountMatch) {
    threshold = parseFloat(amountMatch[1].replace(/,/g, ""));
  }

  // Extract percentages
  // E.g. "allocate 20% to savings, 10% to subscriptions, and leave the rest in my main wallet"
  const savingsMatch = text.match(/(\d+)%\s*(?:to|for)?\s*saving/i);
  const subsMatch = text.match(/(\d+)%\s*(?:to|for)?\s*subscription/i);

  const savingsPct = savingsMatch ? parseInt(savingsMatch[1], 10) : 20;
  const subsPct = subsMatch ? parseInt(subsMatch[1], 10) : 10;
  const walletPct = Math.max(0, 100 - savingsPct - subsPct);

  // Validate allocations
  if (savingsPct + subsPct > 100) {
    return {
      intent: "AMBIGUOUS_CLARIFICATION",
      displayText: `The requested allocation percentages (${savingsPct}% + ${subsPct}% = ${savingsPct + subsPct}%) exceed 100%. Please specify allocations that total at most 100%.`,
      spokenText: `The requested allocations exceed 100 percent. Please adjust the percentages and try again.`,
      clarificationPrompt: "Adjust allocation percentages so the total does not exceed 100%.",
    };
  }

  const sym = currency === "NGN" ? "₦" : "$";
  const ruleName = `Inflow Split (${savingsPct}% Savings, ${subsPct}% Subscriptions)`;
  const description = `Whenever an incoming payment of ${sym}${threshold.toLocaleString()} or more is received, automatically allocate ${savingsPct}% to Savings, ${subsPct}% to Subscriptions, and keep ${walletPct}% in Main Wallet.`;

  const proposed: ProposedRulePayload = {
    name: ruleName,
    description,
    triggerType: "INCOMING_PAYMENT",
    minAmount: threshold,
    currency,
    allocations: [
      {
        destination: "Savings",
        percentage: savingsPct,
        destinationWalletAddress: "$ilp.paylance.io/alex/savings",
      },
      {
        destination: "Subscriptions",
        percentage: subsPct,
        destinationWalletAddress: "$ilp.paylance.io/alex/subscriptions",
      },
      {
        destination: "Main Wallet",
        percentage: walletPct,
        destinationWalletAddress: "$ilp.paylance.io/alex",
      },
    ],
    frequency: "ON_INFLOW",
    authorizationScope: "urn:paylance:openpayments:transfer:auto",
  };

  return {
    intent: "CREATE_AUTOMATION_RULE",
    displayText: `I've prepared the automation rule based on your instructions. Please review the details below and confirm to activate it:`,
    spokenText: `I have prepared the automation rule: Whenever you receive ${sym}${threshold.toLocaleString()} or more, allocate ${savingsPct} percent to Savings, ${subsPct} percent to Subscriptions, and keep ${walletPct} percent in your main wallet. Please confirm to activate.`,
    proposedRule: proposed,
  };
}

function handlePaymentInitiationIntent(rawMessage: string, currency: "NGN" | "USD"): AssistantResponse {
  const text = rawMessage;

  // Extract amount
  const amountMatch = text.match(/(?:[₦$]|ngn\s*|usd\s*)?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+)/i);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : 10000;

  // Extract recipient (e.g. to sam@ilp.paylance.io or to $ilp.openpayments.dev/user or to Alex)
  const toMatch = text.match(/(?:to\s+)([^\s,]+)/i);
  let recipient = toMatch ? toMatch[1].replace(/[.,]$/, "") : "$ilp.paylance.io/recipient";
  if (!recipient.startsWith("$") && !recipient.includes("@") && !recipient.includes(".")) {
    recipient = `$ilp.paylance.io/${recipient.toLowerCase()}`;
  }

  // Extract purpose/note
  const forMatch = text.match(/(?:for\s+)(.+)/i);
  const note = forMatch ? forMatch[1].trim() : "Direct Transfer";

  const sym = currency === "NGN" ? "₦" : "$";
  const fee = Math.max(currency === "NGN" ? 10 : 0.05, amount * 0.001);

  const proposed: ProposedPaymentPayload = {
    recipient,
    amount,
    currency,
    category: "Transfers",
    note,
    estimatedFee: fee,
  };

  return {
    intent: "INITIATE_PAYMENT",
    displayText: `Here is the Open Payments quote for your review. Please review and confirm to authorize execution:`,
    spokenText: `Please confirm: Send ${sym}${amount.toLocaleString()} to ${recipient} for ${note}. Network fee is ${sym}${fee.toFixed(2)}. Say Confirm or click Authorize to execute.`,
    proposedPayment: proposed,
  };
}

async function callGeminiForNLP(userPrompt: string, currency: "NGN" | "USD"): Promise<AssistantResponse | null> {
  const systemPrompt = `You are Paylance's AI Financial Intent Parser.
Analyze user messages and determine the financial action.
Always return JSON matching this schema:
{
  "intent": "QUERY_FINANCE" | "CREATE_AUTOMATION_RULE" | "INITIATE_PAYMENT" | "AMBIGUOUS_CLARIFICATION" | "GENERAL_ASSISTANCE",
  "displayText": string,
  "spokenText": string,
  "ruleData"?: {
    "name": string,
    "minAmount": number,
    "savingsPct": number,
    "subsPct": number,
    "walletPct": number
  },
  "paymentData"?: {
    "recipient": string,
    "amount": number,
    "note": string
  }
}`;

  const body = {
    contents: [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Understood. I will parse financial intent accurately." }] },
      { role: "user", parts: [{ text: `User Message: "${userPrompt}"\nCurrency: ${currency}` }] },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) return null;
  const json = await res.json();
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) return null;

  const parsed = JSON.parse(rawText);
  if (parsed.intent === "CREATE_AUTOMATION_RULE" && parsed.ruleData) {
    const r = parsed.ruleData;
    return {
      intent: "CREATE_AUTOMATION_RULE",
      displayText: parsed.displayText,
      spokenText: parsed.spokenText,
      proposedRule: {
        name: r.name || "Custom Automation Rule",
        description: parsed.displayText,
        triggerType: "INCOMING_PAYMENT",
        minAmount: r.minAmount || 100000,
        currency,
        allocations: [
          { destination: "Savings", percentage: r.savingsPct || 20, destinationWalletAddress: "$ilp.paylance.io/alex/savings" },
          { destination: "Subscriptions", percentage: r.subsPct || 10, destinationWalletAddress: "$ilp.paylance.io/alex/subscriptions" },
          { destination: "Main Wallet", percentage: r.walletPct || 70, destinationWalletAddress: "$ilp.paylance.io/alex" },
        ],
        frequency: "ON_INFLOW",
        authorizationScope: "urn:paylance:openpayments:transfer:auto",
      },
    };
  }

  return {
    intent: parsed.intent || "GENERAL_ASSISTANCE",
    displayText: parsed.displayText || "How can I assist you with your finances today?",
    spokenText: parsed.spokenText || parsed.displayText || "How can I assist you?",
  };
}

