export type Currency = "USD" | "EUR" | "GBP";
export type Expected = {
  invoiceId: string;
  amount: string;
  currency: Currency;
};
export type ReconcileInput =
  | { mode: "fixture"; scenarioId: string }
  | { mode: "sandbox"; orderId: string; expected: Expected };
export type Evidence = {
  id: string;
  label: string;
  source: string;
  path: string;
  value: string;
};
export type Finding = {
  id: string;
  kind: "pass" | "warn" | "block";
  title: string;
  detail: string;
  evidenceIds: string[];
};
export type Capture = {
  id: string;
  status: string;
  amount: string;
  currency: string;
};
export type Analysis = {
  caseId: string;
  invoiceId: string;
  environment: "fixture" | "paypal-sandbox";
  observedAt: string;
  expected: Expected;
  order: { id: string; status: string };
  captures: Capture[];
  totals: {
    paid: string | null;
    refunded: string | null;
    net: string | null;
    remaining: string | null;
  };
  outcome: "paid" | "partial" | "unpaid" | "review" | "unknown";
  findings: Finding[];
  evidence: Evidence[];
};
export type Scenario = {
  id: string;
  title: string;
  note: string;
  expected: Expected;
};
export type AiExplanation = {
  status: "generated" | "unavailable" | "invalid";
  text: string;
  evidenceIds: string[];
  draft: string;
  model?: string;
};
export type ExplainResponse = { analysis: Analysis; ai: AiExplanation };
export type ExplainResult = ExplainResponse;
// Verify this exact identifier against the current model catalog, not only the JSON Mode guide.
export const MODEL =
  "@cf/meta/llama-3.1-8b-instruct-fp8" as const satisfies keyof AiModels;
