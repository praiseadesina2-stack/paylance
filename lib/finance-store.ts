import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TransactionRecord, UpcomingPayment } from "./financial-engine";
import { createOpenPaymentsQuote, executeOpenPaymentsOutgoing } from "./open-payments";

export interface AutomationAction {
  id: string;
  type: "ALLOCATE_PERCENT" | "ALLOCATE_FIXED" | "TRANSFER";
  percentage?: number;
  amount?: number;
  destination: string; // e.g. "Savings Wallet", "Subscriptions", "Tax Reserve"
  destinationWalletAddress?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  triggerType: "INCOMING_PAYMENT" | "BALANCE_THRESHOLD" | "RECURRING_SCHEDULE" | "CLIENT_SPECIFIC";
  conditions: {
    minAmount?: number;
    currency: "NGN" | "USD";
    balanceThreshold?: number;
    clientSender?: string;
  };
  actions: AutomationAction[];
  frequency: "ON_INFLOW" | "DAILY" | "WEEKLY" | "MONTHLY";
  status: "ACTIVE" | "PAUSED" | "DISABLED";
  authorizationScope: string;
  createdAt: string;
  lastExecuted?: string;
  executionCount: number;
}

export interface AutomationExecution {
  id: string;
  ruleId: string;
  ruleName: string;
  executionReference: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  triggerAmount: number;
  currency: "NGN" | "USD";
  allocations: {
    destination: string;
    amount: number;
    quoteId: string;
    txHash: string;
  }[];
  failureReason?: string;
  executedAt: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  action: 
    | "RULE_CREATED" 
    | "RULE_MODIFIED" 
    | "RULE_STATUS_CHANGED" 
    | "RULE_DELETED"
    | "PAYMENT_INITIATED" 
    | "PAYMENT_COMPLETED" 
    | "AUTOMATION_TRIGGERED"
    | "LIMIT_ENFORCED" 
    | "VOICE_AUTH_VERIFIED"
    | "CATEGORY_CORRECTED";
  resourceType: "RULE" | "TRANSACTION" | "WALLET" | "SECURITY";
  resourceId: string;
  details: string;
  status: "SUCCESS" | "WARNING" | "INFO" | "CRITICAL";
}

export interface SpendingLimits {
  maxPerTransaction: number;
  maxDailySpend: number;
  spentToday: number;
  approvedRecipients: string[];
}

export interface CategoryMeta {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export const DEFAULT_CATEGORIES: CategoryMeta[] = [
  { id: "food", name: "Food & Groceries", color: "hsl(38 92% 50%)", icon: "Utensils" },
  { id: "transport", name: "Transportation", color: "hsl(200 100% 60%)", icon: "Car" },
  { id: "housing", name: "Housing & Utilities", color: "hsl(280 80% 65%)", icon: "Home" },
  { id: "shopping", name: "Shopping", color: "hsl(330 80% 60%)", icon: "ShoppingBag" },
  { id: "entertainment", name: "Entertainment", color: "hsl(260 85% 65%)", icon: "Film" },
  { id: "healthcare", name: "Healthcare", color: "hsl(0 84% 60%)", icon: "HeartPulse" },
  { id: "subscriptions", name: "Subscriptions", color: "hsl(217 91% 60%)", icon: "RefreshCw" },
  { id: "education", name: "Education", color: "hsl(170 80% 45%)", icon: "GraduationCap" },
  { id: "transfers", name: "Transfers", color: "hsl(220 15% 65%)", icon: "ArrowLeftRight" },
  { id: "savings", name: "Savings", color: "hsl(145 65% 45%)", icon: "PiggyBank" },
  { id: "others", name: "Others", color: "hsl(220 15% 45%)", icon: "MoreHorizontal" },
];

export const CATEGORY_MAP: Record<string, { color: string; icon: string }> = DEFAULT_CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.name]: { color: c.color, icon: c.icon } }),
  {}
);

export const INITIAL_TRANSACTIONS: TransactionRecord[] = [
  {
    id: "tx_init_1",
    date: new Date(Date.now() - 1 * 86400000).toISOString(),
    amount: 100000,
    currency: "NGN",
    type: "INFLOW",
    categoryId: "income",
    categoryName: "Income",
    sender: "Acme Tech Global",
    recipient: "$ilp.paylance.io/alex",
    description: "Client Milestone Payout - Web App Build",
    status: "COMPLETED",
    providerReference: "ilp_0x8f4d1e9a2b3c4d5e",
  },
  {
    id: "tx_init_2",
    date: new Date(Date.now() - 1 * 86400000 + 1000).toISOString(),
    amount: -20000,
    currency: "NGN",
    type: "ALLOCATION",
    categoryId: "savings",
    categoryName: "Savings",
    sender: "$ilp.paylance.io/alex",
    recipient: "$ilp.paylance.io/alex/savings",
    description: "Automated Allocation (20%) to Savings",
    status: "COMPLETED",
    isSelfTransfer: true,
    providerReference: "op_quote_94812_alloc_sav",
  },
  {
    id: "tx_init_3",
    date: new Date(Date.now() - 1 * 86400000 + 2000).toISOString(),
    amount: -10000,
    currency: "NGN",
    type: "ALLOCATION",
    categoryId: "subscriptions",
    categoryName: "Subscriptions",
    sender: "$ilp.paylance.io/alex",
    recipient: "$ilp.paylance.io/alex/subscriptions",
    description: "Automated Allocation (10%) to Subscriptions Reserve",
    status: "COMPLETED",
    isSelfTransfer: false,
    providerReference: "op_quote_94813_alloc_sub",
  },
  {
    id: "tx_init_4",
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    amount: -12500,
    currency: "NGN",
    type: "EXPENSE",
    categoryId: "food",
    categoryName: "Food & Groceries",
    recipient: "Prime Supermarket",
    description: "Weekly Grocery Restock",
    status: "COMPLETED",
    providerReference: "ilp_0x7b2a991f4c",
  },
  {
    id: "tx_init_5",
    date: new Date(Date.now() - 3 * 86400000).toISOString(),
    amount: -4500,
    currency: "NGN",
    type: "EXPENSE",
    categoryId: "transport",
    categoryName: "Transportation",
    recipient: "RideHailing Direct",
    description: "Airport Commute",
    status: "COMPLETED",
    providerReference: "ilp_0x618fca201",
  },
  {
    id: "tx_init_6",
    date: new Date(Date.now() - 4 * 86400000).toISOString(),
    amount: -18000,
    currency: "NGN",
    type: "EXPENSE",
    categoryId: "subscriptions",
    categoryName: "Subscriptions",
    recipient: "Cloud Host & AI Tools",
    description: "Monthly Developer Stack Subscriptions",
    status: "COMPLETED",
    providerReference: "ilp_0x992cf4a",
  },
  {
    id: "tx_init_7",
    date: new Date(Date.now() - 6 * 86400000).toISOString(),
    amount: 150000,
    currency: "NGN",
    type: "INFLOW",
    categoryId: "income",
    categoryName: "Income",
    sender: "Apex Studio Ltd",
    recipient: "$ilp.paylance.io/alex",
    description: "Consulting Retainer Payment",
    status: "COMPLETED",
    providerReference: "ilp_0x3344aa77",
  },
];

export const INITIAL_RULES: AutomationRule[] = [
  {
    id: "rule_freelancer_inflow",
    name: "Inflow Split (Savings & Subscriptions)",
    description: "Whenever I receive ₦100,000 or more, allocate 20% to savings, 10% to subscriptions, and leave 70% in main wallet.",
    triggerType: "INCOMING_PAYMENT",
    conditions: {
      minAmount: 100000,
      currency: "NGN",
    },
    actions: [
      {
        id: "act_1",
        type: "ALLOCATE_PERCENT",
        percentage: 20,
        destination: "Savings",
        destinationWalletAddress: "$ilp.paylance.io/alex/savings",
      },
      {
        id: "act_2",
        type: "ALLOCATE_PERCENT",
        percentage: 10,
        destination: "Subscriptions",
        destinationWalletAddress: "$ilp.paylance.io/alex/subscriptions",
      },
      {
        id: "act_3",
        type: "ALLOCATE_PERCENT",
        percentage: 70,
        destination: "Main Wallet",
        destinationWalletAddress: "$ilp.paylance.io/alex",
      },
    ],
    frequency: "ON_INFLOW",
    status: "ACTIVE",
    authorizationScope: "urn:paylance:openpayments:transfer:auto",
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    lastExecuted: new Date(Date.now() - 1 * 86400000).toISOString(),
    executionCount: 1,
  },
  {
    id: "rule_rent_monthly",
    name: "Monthly Office & Cloud Server Obligation",
    description: "Pay ₦45,000 to Infrastructure Provider on the 1st of each month.",
    triggerType: "RECURRING_SCHEDULE",
    conditions: {
      currency: "NGN",
    },
    actions: [
      {
        id: "act_rent",
        type: "ALLOCATE_FIXED",
        amount: 45000,
        destination: "Cloud & Workspace",
        destinationWalletAddress: "$ilp.openpayments.dev/infra-ltd",
      },
    ],
    frequency: "MONTHLY",
    status: "ACTIVE",
    authorizationScope: "urn:paylance:openpayments:scheduled",
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    executionCount: 2,
  },
];

export const INITIAL_UPCOMING: UpcomingPayment[] = [
  {
    id: "up_1",
    name: "Office Space / Co-working Rent",
    amount: 45000,
    currency: "NGN",
    dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
    recipient: "$ilp.paylance.io/workspace",
    frequency: "MONTHLY",
    category: "Housing & Utilities",
    status: "SCHEDULED",
  },
  {
    id: "up_2",
    name: "AI & Software Subscriptions",
    amount: 15000,
    currency: "NGN",
    dueDate: new Date(Date.now() + 8 * 86400000).toISOString().split("T")[0],
    recipient: "$ilp.paylance.io/tools",
    frequency: "MONTHLY",
    category: "Subscriptions",
    status: "SCHEDULED",
  },
  {
    id: "up_3",
    name: "High-Speed Internet Fiber",
    amount: 22000,
    currency: "NGN",
    dueDate: new Date(Date.now() + 12 * 86400000).toISOString().split("T")[0],
    recipient: "$ilp.paylance.io/isp-telecom",
    frequency: "MONTHLY",
    category: "Housing & Utilities",
    status: "SCHEDULED",
  },
];

export const INITIAL_EXECUTIONS: AutomationExecution[] = [
  {
    id: "exec_init_1",
    ruleId: "rule_freelancer_inflow",
    ruleName: "Inflow Split (Savings & Subscriptions)",
    executionReference: "exec_op_941021",
    status: "SUCCESS",
    triggerAmount: 100000,
    currency: "NGN",
    allocations: [
      {
        destination: "Savings (20%)",
        amount: 20000,
        quoteId: "quote_sav_01",
        txHash: "ilp_0x8f4d1e9a2b3c4d5e",
      },
      {
        destination: "Subscriptions (10%)",
        amount: 10000,
        quoteId: "quote_sub_01",
        txHash: "ilp_0x7b2a991f4c",
      },
      {
        destination: "Main Wallet Retained (70%)",
        amount: 70000,
        quoteId: "quote_retained_01",
        txHash: "internal_balance_retain",
      },
    ],
    executedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: "audit_1",
    timestamp: new Date(Date.now() - 7 * 86400000).toISOString(),
    action: "RULE_CREATED",
    resourceType: "RULE",
    resourceId: "rule_freelancer_inflow",
    details: "Created automation rule: Inflow Split (20% Savings, 10% Subscriptions, 70% Wallet) for incoming payments >= ₦100,000",
    status: "SUCCESS",
  },
  {
    id: "audit_2",
    timestamp: new Date(Date.now() - 1 * 86400000).toISOString(),
    action: "AUTOMATION_TRIGGERED",
    resourceType: "TRANSACTION",
    resourceId: "tx_init_1",
    details: "Incoming payment of ₦100,000 triggered rule rule_freelancer_inflow. Open Payments quotes generated and executed.",
    status: "SUCCESS",
  },
  {
    id: "audit_3",
    timestamp: new Date(Date.now() - 1 * 86400000 + 1000).toISOString(),
    action: "PAYMENT_COMPLETED",
    resourceType: "WALLET",
    resourceId: "$ilp.paylance.io/alex/savings",
    details: "Allocated ₦20,000 to Savings Wallet via Open Payments quote quote_sav_01",
    status: "SUCCESS",
  },
];

interface FinanceState {
  // User info & Wallets
  userName: string;
  userRole: "freelancer" | "individual" | "employer" | "business";
  walletAddress: string;
  currency: "NGN" | "USD";
  balance: number;
  savingsBalance: number;
  subscriptionsBalance: number;

  // Preferences & Accessibility (WCAG 2.2 AA)
  highContrast: boolean;
  voiceEnabled: boolean;
  voiceSpeed: number;
  autoSpeak: boolean;

  // Limits
  limits: SpendingLimits;

  // Core Data
  categories: CategoryMeta[];
  transactions: TransactionRecord[];
  rules: AutomationRule[];
  executions: AutomationExecution[];
  upcoming: UpcomingPayment[];
  auditLogs: AuditLogItem[];

  // Actions
  setCurrency: (currency: "NGN" | "USD") => void;
  toggleHighContrast: () => void;
  toggleVoiceEnabled: () => void;
  setVoiceSpeed: (speed: number) => void;
  setAutoSpeak: (val: boolean) => void;
  updateLimits: (limits: Partial<SpendingLimits>) => void;

  addTransaction: (tx: Omit<TransactionRecord, "id">) => TransactionRecord;
  updateTransactionCategory: (txId: string, newCategoryId: string, newCategoryName: string) => void;

  addAutomationRule: (rule: Omit<AutomationRule, "id" | "createdAt" | "executionCount">) => AutomationRule;
  toggleRuleStatus: (ruleId: string) => void;
  deleteAutomationRule: (ruleId: string) => void;
  editAutomationRule: (ruleId: string, updates: Partial<AutomationRule>) => void;

  executeAutomationRuleForInflow: (amount: number, sender?: string) => Promise<{ success: boolean; message: string; execution?: AutomationExecution }>;
  simulateIncomingPayment: (amount?: number, sender?: string) => Promise<{ success: boolean; message: string; execution?: AutomationExecution }>;

  sendDirectPayment: (recipient: string, amount: number, category: string, note: string) => Promise<{ success: boolean; message: string; tx?: TransactionRecord }>;
  logAudit: (item: Omit<AuditLogItem, "id" | "timestamp">) => void;
  resetDemoData: () => void;
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      userName: "Alex Johnson",
      userRole: "freelancer",
      walletAddress: "$ilp.paylance.io/alex",
      currency: "NGN",
      balance: 315000,
      savingsBalance: 85000,
      subscriptionsBalance: 42000,

      highContrast: false,
      voiceEnabled: true,
      voiceSpeed: 1.0,
      autoSpeak: true,

      limits: {
        maxPerTransaction: 500000,
        maxDailySpend: 1000000,
        spentToday: 35000,
        approvedRecipients: ["$ilp.paylance.io/alex/savings", "$ilp.paylance.io/workspace", "$ilp.paylance.io/tools"],
      },

      categories: DEFAULT_CATEGORIES,
      transactions: INITIAL_TRANSACTIONS,
      rules: INITIAL_RULES,
      executions: INITIAL_EXECUTIONS,
      upcoming: INITIAL_UPCOMING,
      auditLogs: INITIAL_AUDIT_LOGS,

      setCurrency: (currency) => set({ currency }),
      toggleHighContrast: () => set((s) => ({ highContrast: !s.highContrast })),
      toggleVoiceEnabled: () => set((s) => ({ voiceEnabled: !s.voiceEnabled })),
      setVoiceSpeed: (voiceSpeed) => set({ voiceSpeed }),
      setAutoSpeak: (autoSpeak) => set({ autoSpeak }),

      updateLimits: (updates) =>
        set((s) => {
          const newLimits = { ...s.limits, ...updates };
          get().logAudit({
            action: "LIMIT_ENFORCED",
            resourceType: "SECURITY",
            resourceId: "user_limits",
            details: `Updated spending limits: Max/Tx=${newLimits.maxPerTransaction}, Max/Day=${newLimits.maxDailySpend}`,
            status: "INFO",
          });
          return { limits: newLimits };
        }),

      logAudit: (item) =>
        set((s) => ({
          auditLogs: [
            {
              ...item,
              id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              timestamp: new Date().toISOString(),
            },
            ...s.auditLogs,
          ],
        })),

      addTransaction: (txData) => {
        const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const record: TransactionRecord = { ...txData, id };
        set((s) => {
          const balanceDelta = record.amount;
          return {
            transactions: [record, ...s.transactions],
            balance: s.balance + balanceDelta,
          };
        });
        return record;
      },

      updateTransactionCategory: (txId, newCategoryId, newCategoryName) => {
        set((s) => {
          const updated = s.transactions.map((t) =>
            t.id === txId ? { ...t, categoryId: newCategoryId, categoryName: newCategoryName } : t
          );
          get().logAudit({
            action: "CATEGORY_CORRECTED",
            resourceType: "TRANSACTION",
            resourceId: txId,
            details: `Reclassified transaction to category: ${newCategoryName}`,
            status: "INFO",
          });
          return { transactions: updated };
        });
      },

      addAutomationRule: (ruleData) => {
        const id = `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const newRule: AutomationRule = {
          ...ruleData,
          id,
          createdAt: new Date().toISOString(),
          executionCount: 0,
        };
        set((s) => ({
          rules: [newRule, ...s.rules],
        }));
        get().logAudit({
          action: "RULE_CREATED",
          resourceType: "RULE",
          resourceId: id,
          details: `Created automation rule "${newRule.name}" [Trigger: ${newRule.triggerType}]`,
          status: "SUCCESS",
        });
        return newRule;
      },

      toggleRuleStatus: (ruleId) => {
        set((s) => {
          const updated = s.rules.map((r) => {
            if (r.id === ruleId) {
              const nextStatus = r.status === "ACTIVE" ? ("PAUSED" as const) : ("ACTIVE" as const);
              get().logAudit({
                action: "RULE_STATUS_CHANGED",
                resourceType: "RULE",
                resourceId: ruleId,
                details: `Rule "${r.name}" status changed to ${nextStatus}`,
                status: "INFO",
              });
              return { ...r, status: nextStatus };
            }
            return r;
          });
          return { rules: updated };
        });
      },

      deleteAutomationRule: (ruleId) => {
        set((s) => {
          const rule = s.rules.find((r) => r.id === ruleId);
          get().logAudit({
            action: "RULE_DELETED",
            resourceType: "RULE",
            resourceId: ruleId,
            details: `Deleted automation rule "${rule?.name || ruleId}"`,
            status: "WARNING",
          });
          return { rules: s.rules.filter((r) => r.id !== ruleId) };
        });
      },

      editAutomationRule: (ruleId, updates) => {
        set((s) => {
          const updated = s.rules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r));
          get().logAudit({
            action: "RULE_MODIFIED",
            resourceType: "RULE",
            resourceId: ruleId,
            details: `Modified automation rule configuration for ${ruleId}`,
            status: "INFO",
          });
          return { rules: updated };
        });
      },

      executeAutomationRuleForInflow: async (amount, sender = "Client Payer") => {
        const { rules, walletAddress, currency, limits } = get();

        // Find active matching rules
        const activeInflowRules = rules.filter(
          (r) =>
            r.status === "ACTIVE" &&
            (r.triggerType === "INCOMING_PAYMENT" || r.frequency === "ON_INFLOW") &&
            (!r.conditions.minAmount || amount >= r.conditions.minAmount)
        );

        if (activeInflowRules.length === 0) {
          return { success: false, message: "No active automation rule matches this inflow amount." };
        }

        const rule = activeInflowRules[0];
        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const allocationsExecuted: { destination: string; amount: number; quoteId: string; txHash: string }[] = [];

        let savingsAdd = 0;
        let subscriptionsAdd = 0;

        for (const action of rule.actions) {
          let actionAmount = 0;
          if (action.type === "ALLOCATE_PERCENT" && action.percentage) {
            actionAmount = (amount * action.percentage) / 100;
          } else if (action.type === "ALLOCATE_FIXED" && action.amount) {
            actionAmount = action.amount;
          }

          if (actionAmount > 0 && action.destination !== "Main Wallet") {
            // Check limits
            if (actionAmount > limits.maxPerTransaction) {
              get().logAudit({
                action: "LIMIT_ENFORCED",
                resourceType: "SECURITY",
                resourceId: rule.id,
                details: `Allocation of ${actionAmount} to ${action.destination} exceeded maxPerTransaction limit of ${limits.maxPerTransaction}. Blocked.`,
                status: "CRITICAL",
              });
              continue;
            }

            // Create and execute Open Payments quote
            const destPointer = action.destinationWalletAddress || `${walletAddress}/${action.destination.toLowerCase().replace(/\s+/g, "")}`;
            const quote = createOpenPaymentsQuote(walletAddress, destPointer, actionAmount, currency);
            const payment = executeOpenPaymentsOutgoing(quote, `idemp_${executionId}_${action.destination}`, rule.authorizationScope);

            allocationsExecuted.push({
              destination: `${action.destination} (${action.percentage ? action.percentage + "%" : "Fixed"})`,
              amount: actionAmount,
              quoteId: quote.id,
              txHash: payment.txHash,
            });

            if (action.destination.toLowerCase().includes("saving")) {
              savingsAdd += actionAmount;
            } else if (action.destination.toLowerCase().includes("subscription")) {
              subscriptionsAdd += actionAmount;
            }

            // Add allocation transaction record
            get().addTransaction({
              date: new Date().toISOString(),
              amount: -actionAmount,
              currency,
              type: "ALLOCATION",
              categoryId: action.destination.toLowerCase().includes("saving") ? "savings" : "subscriptions",
              categoryName: action.destination.toLowerCase().includes("saving") ? "Savings" : "Subscriptions",
              sender: walletAddress,
              recipient: destPointer,
              description: `Automated Allocation (${action.percentage || 0}%) to ${action.destination}`,
              status: "COMPLETED",
              isSelfTransfer: action.destination.toLowerCase().includes("saving"),
              providerReference: payment.txHash,
            });
          } else if (action.destination === "Main Wallet") {
            allocationsExecuted.push({
              destination: `Main Wallet (${action.percentage || 70}%)`,
              amount: actionAmount,
              quoteId: "quote_internal_retain",
              txHash: "internal_balance_retain",
            });
          }
        }

        const execution: AutomationExecution = {
          id: executionId,
          ruleId: rule.id,
          ruleName: rule.name,
          executionReference: `ref_${Date.now()}`,
          status: "SUCCESS",
          triggerAmount: amount,
          currency,
          allocations: allocationsExecuted,
          executedAt: new Date().toISOString(),
        };

        // Update state
        set((s) => ({
          executions: [execution, ...s.executions],
          savingsBalance: s.savingsBalance + savingsAdd,
          subscriptionsBalance: s.subscriptionsBalance + subscriptionsAdd,
          rules: s.rules.map((r) =>
            r.id === rule.id
              ? { ...r, lastExecuted: new Date().toISOString(), executionCount: r.executionCount + 1 }
              : r
          ),
        }));

        get().logAudit({
          action: "AUTOMATION_TRIGGERED",
          resourceType: "RULE",
          resourceId: rule.id,
          details: `Rule "${rule.name}" triggered on inflow of ${amount} ${currency}. Executed ${allocationsExecuted.length} allocations via Open Payments.`,
          status: "SUCCESS",
        });

        return {
          success: true,
          message: `Successfully executed rule "${rule.name}" on ${currency === "NGN" ? "₦" : "$"}${amount.toLocaleString()} inflow.`,
          execution,
        };
      },

      // The core demonstration scenario of PRD Section 10:
      // Freelancer receives ₦100,000 from client, triggers rule, validates funds/destinations, executes via Open Payments!
      simulateIncomingPayment: async (amount = 100000, sender = "Global Client Ltd") => {
        const { currency, walletAddress } = get();

        // 1. Inflow transaction
        const inflowTx = get().addTransaction({
          date: new Date().toISOString(),
          amount: amount,
          currency,
          type: "INFLOW",
          categoryId: "income",
          categoryName: "Income",
          sender,
          recipient: walletAddress,
          description: `Incoming Client Payment from ${sender}`,
          status: "COMPLETED",
          providerReference: `ilp_inflow_${Date.now()}`,
        });

        get().logAudit({
          action: "PAYMENT_COMPLETED",
          resourceType: "WALLET",
          resourceId: walletAddress,
          details: `Received verified incoming payment of ${currency === "NGN" ? "₦" : "$"}${amount.toLocaleString()} from ${sender} via Open Payments.`,
          status: "SUCCESS",
        });

        // 2. Evaluate and trigger automation rules
        const res = await get().executeAutomationRuleForInflow(amount, sender);
        return res;
      },

      sendDirectPayment: async (recipient, amount, category, note) => {
        const { walletAddress, currency, balance, limits } = get();

        if (amount > balance) {
          return { success: false, message: "Insufficient wallet balance." };
        }

        if (amount > limits.maxPerTransaction) {
          get().logAudit({
            action: "LIMIT_ENFORCED",
            resourceType: "SECURITY",
            resourceId: recipient,
            details: `Outgoing payment of ${amount} exceeded per-transaction limit (${limits.maxPerTransaction}).`,
            status: "CRITICAL",
          });
          return { success: false, message: `Amount exceeds maximum limit per transaction of ${limits.maxPerTransaction}.` };
        }

        const quote = createOpenPaymentsQuote(walletAddress, recipient, amount, currency);
        const payment = executeOpenPaymentsOutgoing(quote, undefined, "urn:paylance:openpayments:transfer");

        const tx = get().addTransaction({
          date: new Date().toISOString(),
          amount: -amount,
          currency,
          type: "PAYMENT",
          categoryId: category.toLowerCase().replace(/\s+/g, "_"),
          categoryName: category,
          sender: walletAddress,
          recipient,
          description: note || `Payment to ${recipient}`,
          status: "COMPLETED",
          providerReference: payment.txHash,
        });

        get().logAudit({
          action: "PAYMENT_COMPLETED",
          resourceType: "WALLET",
          resourceId: recipient,
          details: `Sent ${currency === "NGN" ? "₦" : "$"}${amount.toLocaleString()} to ${recipient} via Open Payments [Quote: ${quote.id}].`,
          status: "SUCCESS",
        });

        return { success: true, message: "Payment completed successfully.", tx };
      },

      resetDemoData: () => {
        set({
          balance: 315000,
          savingsBalance: 85000,
          subscriptionsBalance: 42000,
          transactions: INITIAL_TRANSACTIONS,
          rules: INITIAL_RULES,
          executions: INITIAL_EXECUTIONS,
          upcoming: INITIAL_UPCOMING,
          auditLogs: INITIAL_AUDIT_LOGS,
        });
      },
    }),
    {
      name: "paylance-finance-storage",
      partialize: (state) => ({
        currency: state.currency,
        highContrast: state.highContrast,
        voiceEnabled: state.voiceEnabled,
        voiceSpeed: state.voiceSpeed,
        autoSpeak: state.autoSpeak,
        balance: state.balance,
        savingsBalance: state.savingsBalance,
        subscriptionsBalance: state.subscriptionsBalance,
        transactions: state.transactions,
        rules: state.rules,
        executions: state.executions,
        upcoming: state.upcoming,
        auditLogs: state.auditLogs,
        limits: state.limits,
      }),
    }
  )
);

