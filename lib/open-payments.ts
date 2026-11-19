// ─── Interledger Open Payments Protocol Layer ─────────────────────────────
// Implements wallet discovery, quote generation, incoming/outgoing payments,
// idempotency tokens, and status tracking per the Open Payments specification.

export interface OpenPaymentsWallet {
  id: string;
  name: string;
  walletAddress: string; // e.g. "$ilp.paylance.io/alex"
  assetCode: "NGN" | "USD";
  assetScale: number;
  authServer: string;
  resourceServer: string;
  isDefault?: boolean;
}

export interface OpenPaymentsQuote {
  id: string;
  walletAddress: string;
  receiver: string;
  debitAmount: {
    value: string;
    assetCode: string;
    assetScale: number;
  };
  receiveAmount: {
    value: string;
    assetCode: string;
    assetScale: number;
  };
  exchangeRate?: number;
  estimatedFee: number;
  expiresAt: string;
  createdAt: string;
}

export interface OpenPaymentsPayment {
  id: string;
  quoteId: string;
  walletAddress: string;
  receiver: string;
  debitAmount: {
    value: string;
    assetCode: string;
    assetScale: number;
  };
  receiveAmount: {
    value: string;
    assetCode: string;
    assetScale: number;
  };
  status: "COMPLETED" | "PENDING" | "FAILED";
  idempotencyKey: string;
  txHash: string;
  authorizationScope: string;
  createdAt: string;
  completedAt?: string;
}

export interface IncomingPaymentRequest {
  id: string;
  walletAddress: string;
  incomingAmount?: {
    value: string;
    assetCode: string;
    assetScale: number;
  };
  description?: string;
  paymentUrl: string;
  expiresAt: string;
  status: "PENDING" | "COMPLETED" | "EXPIRED";
}

// Convert payment pointer ($ilp.paylance.io/user) to Open Payments URL (https://ilp.paylance.io/user)
export function normalizePaymentPointer(pointer: string): string {
  if (pointer.startsWith("$")) {
    return `https://${pointer.slice(1)}`;
  }
  return pointer;
}

// Simulated Open Payments Wallet Discovery
export async function discoverWallet(walletAddress: string): Promise<OpenPaymentsWallet> {
  const normalized = normalizePaymentPointer(walletAddress);
  const isNGN = !walletAddress.includes("usd");
  return {
    id: `wallet_${Math.random().toString(36).substring(2, 9)}`,
    name: walletAddress.split("/").pop() || "Wallet",
    walletAddress,
    assetCode: isNGN ? "NGN" : "USD",
    assetScale: 2,
    authServer: `${normalized}/auth`,
    resourceServer: normalized,
  };
}

// Create an Open Payments Quote
export function createOpenPaymentsQuote(
  senderWallet: string,
  receiverWallet: string,
  amount: number,
  currency: "NGN" | "USD" = "NGN"
): OpenPaymentsQuote {
  const quoteId = `quote_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fee = Math.max(currency === "NGN" ? 10 : 0.05, amount * 0.001); // 0.1% network fee

  return {
    id: quoteId,
    walletAddress: senderWallet,
    receiver: receiverWallet,
    debitAmount: {
      value: (amount + fee).toFixed(2),
      assetCode: currency,
      assetScale: 2,
    },
    receiveAmount: {
      value: amount.toFixed(2),
      assetCode: currency,
      assetScale: 2,
    },
    exchangeRate: 1.0,
    estimatedFee: fee,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes expiry
    createdAt: new Date().toISOString(),
  };
}

// Execute an authorized Outgoing Payment using the quote
export function executeOpenPaymentsOutgoing(
  quote: OpenPaymentsQuote,
  idempotencyKey?: string,
  authScope: string = "urn:paylance:openpayments:transfer"
): OpenPaymentsPayment {
  const paymentId = `op_pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const generatedIdempotency = idempotencyKey || `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const txHash = `ilp_0x${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

  return {
    id: paymentId,
    quoteId: quote.id,
    walletAddress: quote.walletAddress,
    receiver: quote.receiver,
    debitAmount: quote.debitAmount,
    receiveAmount: quote.receiveAmount,
    status: "COMPLETED",
    idempotencyKey: generatedIdempotency,
    txHash,
    authorizationScope: authScope,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
}

// Create an Incoming Payment resource
export function createIncomingPaymentResource(
  walletAddress: string,
  amount?: number,
  currency: "NGN" | "USD" = "NGN",
  description?: string
): IncomingPaymentRequest {
  const id = `inc_pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const normalized = normalizePaymentPointer(walletAddress);
  return {
    id,
    walletAddress,
    incomingAmount: amount ? {
      value: amount.toFixed(2),
      assetCode: currency,
      assetScale: 2,
    } : undefined,
    description: description || "Paylance Incoming Payment Request",
    paymentUrl: `${normalized}/incoming-payments/${id}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: "PENDING",
  };
}

