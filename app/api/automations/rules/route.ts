import { NextRequest, NextResponse } from "next/server";
import { db, logBackendAudit } from "@/lib/backend-service";
import { AutomationRule } from "@/lib/finance-store";

export async function GET() {
  return NextResponse.json({
    success: true,
    rules: db.rules,
    total: db.rules.length,
    activeCount: db.rules.filter((r) => r.status === "ACTIVE").length,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ruleId, ruleData } = body;

    // Toggle rule status
    if (action === "TOGGLE" && ruleId) {
      const rule = db.rules.find((r) => r.id === ruleId);
      if (!rule) {
        return NextResponse.json({ error: "Rule not found" }, { status: 404 });
      }
      rule.status = rule.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
      logBackendAudit(
        "RULE_STATUS_CHANGED",
        "RULE",
        ruleId,
        `Toggled rule "${rule.name}" status to ${rule.status}`
      );
      return NextResponse.json({ success: true, rule });
    }

    // Delete rule
    if (action === "DELETE" && ruleId) {
      const idx = db.rules.findIndex((r) => r.id === ruleId);
      if (idx !== -1) {
        const removed = db.rules.splice(idx, 1)[0];
        logBackendAudit("RULE_DELETED", "RULE", ruleId, `Deleted rule "${removed.name}"`, "WARNING");
      }
      return NextResponse.json({ success: true, message: "Rule deleted" });
    }

    // Create new rule
    if (ruleData) {
      const newRule: AutomationRule = {
        id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: ruleData.name || "Untitled Rule",
        description: ruleData.description || "Custom automation rule",
        triggerType: ruleData.triggerType || "INCOMING_PAYMENT",
        conditions: ruleData.conditions || { minAmount: 100000, currency: "NGN" },
        actions: ruleData.actions || [],
        frequency: ruleData.frequency || "ON_INFLOW",
        status: "ACTIVE",
        authorizationScope: ruleData.authorizationScope || "urn:paylance:openpayments:transfer:auto",
        createdAt: new Date().toISOString(),
        executionCount: 0,
      };

      db.rules.unshift(newRule);
      logBackendAudit(
        "RULE_CREATED",
        "RULE",
        newRule.id,
        `Created automation rule "${newRule.name}" [Trigger: ${newRule.triggerType}]`
      );

      return NextResponse.json({ success: true, rule: newRule });
    }

    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  } catch (err: any) {
    console.error("API /api/automations/rules error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

