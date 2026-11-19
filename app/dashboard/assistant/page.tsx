"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bot, Send, Mic, MicOff, Volume2, VolumeX, Sparkles,
  CheckCircle, ArrowRight, Shield, RefreshCw, AlertCircle,
  HelpCircle, Play, Layers, User, Zap, ThumbsUp
} from "lucide-react";
import { useFinanceStore } from "@/lib/finance-store";
import { processAssistantMessage, AssistantResponse } from "@/lib/gemini-assistant";
import { VoiceRecognitionService, speakText, stopSpeaking, playEarcon, announceToScreenReader } from "@/lib/voice-service";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  responsePayload?: AssistantResponse;
}

function AssistantPageContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const {
    currency,
    transactions,
    upcoming,
    rules,
    addAutomationRule,
    sendDirectPayment,
    logAudit,
  } = useFinanceStore();

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg_welcome",
      sender: "assistant",
      text: `Hello! I am your **Paylance AI Financial Assistant**. 
You can speak or type to:
• **Ask financial questions**: *"How much did I spend on food this month?"* or *"How much have I allocated to subscriptions?"*
• **Create automation rules**: *"Whenever I receive ₦100,000, allocate 20% to savings, 10% to subscriptions, and leave 70% in my main wallet."*
• **Initiate Open Payments**: *"Send ₦25,000 to sam@ilp.paylance.io for UI design."*

All financial calculations are grounded in verified database records. Sensitive actions require your explicit confirmation before execution.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [approvedActionIds, setApprovedActionIds] = useState<Record<string, boolean>>({});

  const voiceServiceRef = useRef<VoiceRecognitionService | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    voiceServiceRef.current = new VoiceRecognitionService();
  }, []);

  // Handle incoming query parameter if redirected from global mic
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      handleSendMessage(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function handleSendMessage(textToSend?: string) {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    if (!textToSend) setInput("");

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    announceToScreenReader(`Processing instruction: ${query}`);

    try {
      const response = await processAssistantMessage(query, transactions, upcoming, currency);

      const assistantMsg: ChatMessage = {
        id: `asst_${Date.now()}`,
        sender: "assistant",
        text: response.displayText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        responsePayload: response,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Speak answer if audio readout is enabled
      if (response.spokenText) {
        setIsSpeaking(true);
        announceToScreenReader(response.spokenText);
        speakText(response.spokenText, {
          onEnd: () => setIsSpeaking(false),
        });
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `asst_err_${Date.now()}`,
          sender: "assistant",
          text: `I encountered an issue processing that instruction: ${e.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  // Voice Microphone Toggle
  function toggleSpeechRecognition() {
    if (isListening) {
      voiceServiceRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    }

    setIsListening(true);
    announceToScreenReader("Microphone listening. Speak your command now.");

    voiceServiceRef.current?.start(
      (transcript, isFinal) => {
        if (isFinal) {
          setIsListening(false);
          setInput(transcript);
          handleSendMessage(transcript);
        } else {
          setInput(transcript);
        }
      },
      (err) => {
        setIsListening(false);
        announceToScreenReader(`Voice recognition error: ${err}`);
      },
      () => {
        setIsListening(false);
      }
    );
  }

  // Approve Proposed Automation Rule
  function handleApproveRule(msgId: string, rulePayload: any) {
    addAutomationRule({
      name: rulePayload.name,
      description: rulePayload.description,
      triggerType: rulePayload.triggerType,
      conditions: {
        minAmount: rulePayload.minAmount,
        currency: rulePayload.currency,
      },
      actions: rulePayload.allocations.map((a: any, i: number) => ({
        id: `act_${Date.now()}_${i}`,
        type: a.percentage ? "ALLOCATE_PERCENT" : "ALLOCATE_FIXED",
        percentage: a.percentage,
        amount: a.amount,
        destination: a.destination,
        destinationWalletAddress: a.destinationWalletAddress,
      })),
      frequency: rulePayload.frequency,
      status: "ACTIVE",
      authorizationScope: rulePayload.authorizationScope,
    });

    setApprovedActionIds((prev) => ({ ...prev, [msgId]: true }));
    playEarcon("SUCCESS");
    const confirmSpeech = `Automation rule ${rulePayload.name} has been approved and activated.`;
    announceToScreenReader(confirmSpeech);
    speakText(confirmSpeech);

    setMessages((prev) => [
      ...prev,
      {
        id: `sys_${Date.now()}`,
        sender: "assistant",
        text: `✅ **Rule Activated**: "${rulePayload.name}" is now active! Any incoming payment of ${formatCurrency(rulePayload.minAmount, currency)} or more will automatically execute these allocations via Open Payments.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }

  // Approve & Authorize Outgoing Payment
  async function handleApprovePayment(msgId: string, paymentPayload: any) {
    setIsLoading(true);
    const res = await sendDirectPayment(
      paymentPayload.recipient,
      paymentPayload.amount,
      paymentPayload.category,
      paymentPayload.note
    );
    setIsLoading(false);

    setApprovedActionIds((prev) => ({ ...prev, [msgId]: true }));

    if (res.success) {
      playEarcon("SUCCESS");
      const confirmSpeech = `Payment of ${formatCurrency(paymentPayload.amount, currency)} to ${paymentPayload.recipient} has been completed via Open Payments.`;
      announceToScreenReader(confirmSpeech);
      speakText(confirmSpeech);

      setMessages((prev) => [
        ...prev,
        {
          id: `sys_pay_${Date.now()}`,
          sender: "assistant",
          text: `✅ **Payment Executed**: Sent ${formatCurrency(paymentPayload.amount, currency)} to \`${paymentPayload.recipient}\` via Interledger Open Payments. [Reference: \`${res.tx?.providerReference}\`]`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } else {
      playEarcon("ALERT");
      setMessages((prev) => [
        ...prev,
        {
          id: `sys_pay_err_${Date.now()}`,
          sender: "assistant",
          text: `⚠️ **Payment Failed**: ${res.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  }

  // Demo shortcut prompts
  const DEMO_PRESETS = [
    {
      label: "Create Freelancer Inflow Rule (₦100,000 Demo)",
      query: "Whenever I receive ₦100,000, allocate 20% to savings, 10% to subscriptions, and leave the rest in my main wallet.",
    },
    {
      label: "Ask: Subscriptions Spending",
      query: "How much money have I allocated to subscriptions this month?",
    },
    {
      label: "Ask: Food & Groceries Spending",
      query: "How much did I spend on food this month?",
    },
    {
      label: "Ask: Upcoming Obligations",
      query: "What are my upcoming financial obligations?",
    },
    {
      label: "Initiate: Payment to Collaborator",
      query: "Send ₦25,000 to sam@ilp.paylance.io for mobile app design",
    },
  ];

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", flexDirection: "column", height: "calc(100vh - 110px)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "hsl(var(--primary) / 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bot size={16} color="hsl(var(--primary-light))" />
            </div>
            <h1 className="font-heading" style={{ fontSize: "1.4rem", fontWeight: 800, color: "hsl(var(--text))" }}>
              AI Financial Assistant
            </h1>
          </div>
          <p style={{ color: "hsl(var(--text-3))", fontSize: "0.8rem", marginTop: 2 }}>
            Natural language financial queries, rule creation, and WCAG 2.2 AA voice interaction.
          </p>
        </div>

        {isSpeaking && (
          <button
            onClick={() => {
              stopSpeaking();
              setIsSpeaking(false);
            }}
            className="btn btn-sm btn-ghost"
            style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "hsl(var(--primary-light))" }}
          >
            <VolumeX size={14} /> Stop Audio
          </button>
        )}
      </div>

      {/* Preset Quick Prompts for seamless demo presentation */}
      <div style={{ display: "flex", gap: "0.4rem", overflowX: "auto", paddingBottom: "0.5rem", marginBottom: "0.75rem" }}>
        {DEMO_PRESETS.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(preset.query)}
            className="btn btn-ghost btn-sm"
            style={{
              whiteSpace: "nowrap",
              fontSize: "0.75rem",
              background: "hsl(var(--surface-3) / 0.8)",
              borderColor: "hsl(var(--border))",
            }}
          >
            ✨ {preset.label}
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          background: "hsl(var(--surface-2))",
          border: "1px solid hsl(var(--border))",
          borderRadius: 16,
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          const pRule = msg.responsePayload?.proposedRule;
          const pPayment = msg.responsePayload?.proposedPayment;
          const supportingTxs = msg.responsePayload?.supportingTransactions;
          const isApproved = approvedActionIds[msg.id];

          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: isUser ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "0.6rem",
                  maxWidth: "85%",
                  flexDirection: isUser ? "row-reverse" : "row",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: isUser ? "hsl(var(--primary))" : "hsl(var(--surface-4))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {isUser ? <User size={16} color="white" /> : <Bot size={16} color="hsl(var(--primary-light))" />}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div
                    style={{
                      background: isUser ? "hsl(var(--primary) / 0.18)" : "hsl(var(--surface-3))",
                      border: isUser ? "1px solid hsl(var(--primary) / 0.35)" : "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      padding: "0.85rem 1rem",
                      color: "hsl(var(--text))",
                      fontSize: "0.88rem",
                      lineHeight: 1.5,
                    }}
                  >
                    <div style={{ whiteSpace: "pre-line" }}>{msg.text}</div>

                    {/* Grounded Transaction Evidence / Records */}
                    {supportingTxs && supportingTxs.length > 0 && (
                      <div style={{ marginTop: "0.75rem", borderTop: "1px solid hsl(var(--border) / 0.6)", paddingTop: "0.6rem" }}>
                        <div style={{ fontSize: "0.72rem", color: "hsl(var(--text-3))", fontWeight: 700, marginBottom: "0.4rem", textTransform: "uppercase" }}>
                          Verified Database Records ({supportingTxs.length})
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                          {supportingTxs.map((t) => (
                            <div
                              key={t.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "0.78rem",
                                background: "hsl(var(--surface-4) / 0.5)",
                                padding: "0.3rem 0.5rem",
                                borderRadius: 6,
                              }}
                            >
                              <span>{t.description} ({formatDate(t.date)})</span>
                              <strong style={{ color: t.amount > 0 ? "hsl(145 65% 50%)" : "hsl(var(--text))" }}>
                                {formatCurrency(Math.abs(t.amount), t.currency)}
                              </strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Proposed Rule Confirmation Card (Human-in-the-Loop) */}
                  {pRule && !isApproved && (
                    <div
                      style={{
                        background: "hsl(var(--surface-3))",
                        border: "2px solid hsl(var(--primary) / 0.5)",
                        borderRadius: 12,
                        padding: "1rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Shield size={16} color="hsl(var(--primary-light))" />
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "hsl(var(--text))" }}>
                          Proposed Automation Rule for Review
                        </span>
                      </div>

                      <div style={{ fontSize: "0.82rem", color: "hsl(var(--text-2))" }}>
                        <strong>Name:</strong> {pRule.name}
                      </div>

                      <div style={{ fontSize: "0.82rem", color: "hsl(var(--text-2))" }}>
                        <strong>Trigger:</strong> Inflow of {formatCurrency(pRule.minAmount || 100000, pRule.currency)} or more
                      </div>

                      <div style={{ background: "hsl(var(--surface-4))", borderRadius: 8, padding: "0.6rem 0.75rem" }}>
                        <div style={{ fontSize: "0.72rem", color: "hsl(var(--text-3))", fontWeight: 700, marginBottom: "0.3rem" }}>
                          PROPOSED ALLOCATIONS:
                        </div>
                        {pRule.allocations.map((a: any, idx: number) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 2 }}>
                            <span>👉 {a.destination}:</span>
                            <strong>{a.percentage ? `${a.percentage}%` : formatCurrency(a.amount, pRule.currency)}</strong>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.25rem" }}>
                        <button
                          onClick={() => handleApproveRule(msg.id, pRule)}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1 }}
                        >
                          <CheckCircle size={14} /> Approve & Activate Rule
                        </button>
                        <button
                          onClick={() => {
                            setMessages((prev) => [
                              ...prev,
                              {
                                id: `cancel_${Date.now()}`,
                                sender: "assistant",
                                text: "Rule proposal was cancelled.",
                                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                              },
                            ]);
                            setApprovedActionIds((prev) => ({ ...prev, [msg.id]: true }));
                          }}
                          className="btn btn-ghost btn-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Proposed Payment Quote Confirmation Card */}
                  {pPayment && !isApproved && (
                    <div
                      style={{
                        background: "hsl(var(--surface-3))",
                        border: "2px solid hsl(145 65% 50% / 0.5)",
                        borderRadius: 12,
                        padding: "1rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Zap size={16} color="hsl(145 65% 50%)" />
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "hsl(var(--text))" }}>
                          Open Payments Transfer Quote
                        </span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                        <span style={{ color: "hsl(var(--text-2))" }}>Recipient:</span>
                        <code style={{ color: "hsl(var(--primary-light))" }}>{pPayment.recipient}</code>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                        <span style={{ color: "hsl(var(--text-2))" }}>Amount:</span>
                        <strong>{formatCurrency(pPayment.amount, pPayment.currency)}</strong>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "hsl(var(--text-3))" }}>
                        <span>Network ILP Fee:</span>
                        <span>{formatCurrency(pPayment.estimatedFee, pPayment.currency)}</span>
                      </div>

                      <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.25rem" }}>
                        <button
                          onClick={() => handleApprovePayment(msg.id, pPayment)}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, background: "hsl(145 65% 42%)" }}
                        >
                          <CheckCircle size={14} /> Authorize & Send Payment
                        </button>
                        <button
                          onClick={() => setApprovedActionIds((prev) => ({ ...prev, [msg.id]: true }))}
                          className="btn btn-ghost btn-sm"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  <span style={{ fontSize: "0.68rem", color: "hsl(var(--text-3))", alignSelf: isUser ? "flex-end" : "flex-start" }}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "hsl(var(--surface-4))", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bot size={16} color="hsl(var(--primary-light))" />
            </div>
            <div style={{ display: "flex", gap: 4, padding: "0.6rem 1rem", background: "hsl(var(--surface-3))", borderRadius: 12 }}>
              <span className="voice-bar-anim" />
              <span className="voice-bar-anim" />
              <span className="voice-bar-anim" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar with Speech-to-Text */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        style={{
          marginTop: "0.75rem",
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={toggleSpeechRecognition}
          aria-label={isListening ? "Stop voice listening" : "Start voice listening"}
          className={`btn ${isListening ? "btn-primary pulse-blue" : "btn-ghost"}`}
          style={{ width: 44, height: 44, padding: 0, borderRadius: 12 }}
        >
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <input
          type="text"
          placeholder={isListening ? "Listening to your voice..." : "Type or speak your financial instruction..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="input"
          style={{ height: 44, fontSize: "0.88rem" }}
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="btn btn-primary"
          style={{ width: 44, height: 44, padding: 0, borderRadius: 12 }}
          aria-label="Send Message"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", color: "hsl(var(--text-3))" }}>Loading Assistant...</div>}>
      <AssistantPageContent />
    </Suspense>
  );
}
