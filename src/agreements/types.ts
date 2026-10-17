import type { Analysis } from "../shared";

export type AgreementRole = "buyer" | "seller";
export type MilestoneInput = { title: string; amount: string; acceptance: string };
export type AgreementTerms = { title: string; description: string; milestones: MilestoneInput[] };
export type AgreementAction =
  | { type: "propose"; version: number; terms: AgreementTerms }
  | { type: "consent"; version: number }
  | { type: "deliver"; version: number; milestoneId: string; note: string }
  | { type: "accept"; version: number; milestoneId: string }
  | { type: "request-changes"; version: number; milestoneId: string; note: string }
  | { type: "create-order" | "capture" | "refresh"; version: number; milestoneId: string };
export type ReceiptEvent = {
  sequence: number; at: string; type: string; actor: AgreementRole | "system";
  data: Record<string, unknown>; previousHash: string; hash: string;
};
export type AgreementMilestone = MilestoneInput & {
  id: string; invoiceId: string;
  delivery: { note: string; at: string } | null;
  acceptanceStatus: "pending" | "delivered" | "changes-requested" | "accepted";
  payment: {
    status: "not-started" | "creating" | "awaiting-approval" | "capturing" | "verified" | "review" | "error";
    orderId?: string; approvalUrl?: string; analysis?: Analysis; error?: string;
  };
};
export type AgreementRoom = {
  id: string; title: string; description: string; currency: "USD"; version: number;
  createdAt: string; updatedAt: string; expiresAt: string;
  consent: { buyer: number | null; seller: number | null };
  milestones: AgreementMilestone[];
  events: ReceiptEvent[]; head: { sequence: number; hash: string };
  disclaimer: string;
};
export type AgreementCreateResponse = {
  room: AgreementRoom; buyerCapability: string; sellerCapability: string;
};
export type AgreementResponse = { room: AgreementRoom; role: AgreementRole; approvalUrl?: string };
export type AgreementConfig = { environment: "sandbox"; configured: boolean; clientId?: string };
export type ReceiptPacket = {
  format: "settleproof-receipt-v1";
  room: { id: string; title: string; version: number; currency: "USD"; expiresAt: string };
  anchor: { sequence: number; hash: string };
  events: ReceiptEvent[];
};
export type ReceiptVerification = {
  valid: boolean; reason: string; checkedEvents: number;
  head?: { sequence: number; hash: string };
  limitation: string;
};
