import type { Analysis, Capture, Currency, Expected, Finding } from "../shared";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function cents(value: unknown): number {
  if (typeof value !== "string" || !/^(0|[1-9]\d{0,7})\.\d{2}$/.test(value))
    throw new ApiError(
      400,
      "INVALID_AMOUNT",
      "Use a bounded decimal amount with exactly two places.",
    );
  const [whole, fraction] = value.split(".");
  return Number(whole) * 100 + Number(fraction);
}
export const money = (value: number) =>
  `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
export function expectedValue(value: unknown): Expected {
  const data = record(value);
  if (
    Object.keys(data).sort().join(",") !== "amount,currency,invoiceId" ||
    typeof data.invoiceId !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(data.invoiceId)
  )
    throw new ApiError(
      400,
      "INVALID_EXPECTED",
      "Use an invoice reference of 1–64 letters, digits, dots, underscores or hyphens.",
    );
  if (!["USD", "EUR", "GBP"].includes(String(data.currency)))
    throw new ApiError(
      400,
      "UNSUPPORTED_CURRENCY",
      "Only USD, EUR and GBP are supported.",
    );
  if (cents(data.amount) <= 0)
    throw new ApiError(
      400,
      "INVALID_AMOUNT",
      "Expected amount must be greater than zero.",
    );
  return {
    invoiceId: data.invoiceId,
    amount: String(data.amount),
    currency: data.currency as Currency,
  };
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ApiError(400, "INVALID_INPUT", "Expected a JSON object.");
  return value as Record<string, unknown>;
}
export type Observation = {
  id: string;
  status: string;
  invoiceIds: string[];
  captures: Capture[];
  unavailable?: boolean;
  refundDataUnknown?: boolean;
};
export function reconcile(
  expected: Expected,
  observation: Observation,
  environment: Analysis["environment"],
  caseId: string,
  observedAt = new Date().toISOString(),
): Analysis {
  expected = expectedValue(expected);
  const evidence: Analysis["evidence"] = [];
  const findings: Finding[] = [];
  const source =
    environment === "fixture"
      ? "Synthetic fixture (not a real payment)"
      : "PayPal sandbox read API";
  const add = (id: string, label: string, path: string, value: string) => {
    const origin = id.startsWith("expected.")
      ? environment === "fixture"
        ? "Synthetic invoice expectation (not a real invoice)"
        : "User-entered invoice expectation (not verified by PayPal)"
      : id.startsWith("result.")
        ? "SettleProof deterministic rules"
        : source;
    evidence.push({ id, label, source: origin, path, value });
    return id;
  };
  const finding = (
    id: string,
    kind: Finding["kind"],
    title: string,
    detail: string,
    evidenceIds: string[],
  ) => findings.push({ id, kind, title, detail, evidenceIds });
  add(
    "expected.amount",
    "Expected amount",
    "input.expected.amount",
    expected.amount,
  );
  add(
    "expected.currency",
    "Expected currency",
    "input.expected.currency",
    expected.currency,
  );
  add(
    "expected.invoice",
    "Expected invoice",
    "input.expected.invoiceId",
    expected.invoiceId,
  );
  add(
    "order.status",
    "Observed order status",
    "order.status",
    observation.status,
  );
  add(
    "order.invoice",
    "Invoice references",
    "purchase_units[].invoice_id",
    observation.invoiceIds.join(", ") || "(missing)",
  );
  let review = Boolean(observation.refundDataUnknown),
    unknown = Boolean(observation.unavailable),
    paid = 0,
    refunded = 0,
    refundUnknown = Boolean(observation.refundDataUnknown);
  if (refundUnknown)
    add(
      "refund.observation",
      "Unresolved refund evidence",
      "purchase_units[].payments.refunds",
      "Refund records are present; amounts and final status have not been verified.",
    );
  if (unknown)
    finding(
      "unavailable",
      "block",
      "Payment data unavailable",
      "A failed read is not evidence of non-payment. Refresh the sandbox observation before acting.",
      ["order.status"],
    );
  if (
    ![
      "CREATED",
      "SAVED",
      "APPROVED",
      "COMPLETED",
      "VOIDED",
      "PAYER_ACTION_REQUIRED",
    ].includes(observation.status)
  ) {
    unknown = true;
    if (!observation.unavailable)
      finding(
        "unknown-order",
        "block",
        "Order status is unresolved",
        "This order status is not sufficient evidence for a payment conclusion.",
        ["order.status"],
      );
  }
  if (
    observation.invoiceIds.length !== 1 ||
    observation.invoiceIds[0] !== expected.invoiceId
  ) {
    review = true;
    unknown = true;
    finding(
      "invoice-mismatch",
      "block",
      "Invoice reference mismatch",
      "The order cannot be attributed to this invoice without a matching, unambiguous reference.",
      ["expected.invoice", "order.invoice"],
    );
  } else
    finding(
      "invoice-match",
      "pass",
      "Invoice reference matches",
      "The observed order references the expected invoice.",
      ["expected.invoice", "order.invoice"],
    );
  const unique = new Map<string, Capture>();
  for (const [rawIndex, item] of observation.captures.entries()) {
    const previous = unique.get(item.id);
    if (previous) {
      review = true;
      if (JSON.stringify(previous) !== JSON.stringify(item)) unknown = true;
      const duplicateId = add(
        `capture.duplicate.${rawIndex}`,
        "Repeated capture identifier",
        `captures[${rawIndex}].id`,
        item.id,
      );
      finding(
        `duplicate-${findings.length}`,
        "block",
        "Duplicate capture ID",
        "Each capture is counted once. Repeated or conflicting capture evidence needs review.",
        [`capture.${[...unique.keys()].indexOf(item.id)}.id`, duplicateId],
      );
      continue;
    }
    const index = unique.size;
    unique.set(item.id, item);
    add(
      `capture.${index}.id`,
      "Capture identifier",
      `captures[${index}].id`,
      item.id,
    );
    add(
      `capture.${index}.status`,
      "Fresh capture status",
      `captures[${index}].status`,
      item.status,
    );
    add(
      `capture.${index}.amount`,
      "Capture amount",
      `captures[${index}].amount`,
      `${item.amount} ${item.currency}`,
    );
    let amount = 0;
    try {
      amount = cents(item.amount);
    } catch {
      unknown = true;
      review = true;
      finding(
        `amount-${index}`,
        "block",
        "Capture amount is invalid",
        "An unsupported amount cannot contribute to a verified total.",
        [`capture.${index}.amount`],
      );
    }
    if (item.currency !== expected.currency) {
      unknown = true;
      review = true;
      finding(
        `currency-${index}`,
        "block",
        "Currency mismatch",
        "Different currencies cannot be added or reconciled as one invoice amount.",
        ["expected.currency", `capture.${index}.amount`],
      );
    }
    if (item.status === "COMPLETED") paid += amount;
    else if (item.status === "REFUNDED") {
      paid += amount;
      refunded += amount;
      review = true;
    } else if (item.status === "PARTIALLY_REFUNDED") {
      paid += amount;
      refundUnknown = true;
      review = true;
    } else if (item.status === "PENDING") {
      unknown = true;
      finding(
        `pending-${index}`,
        "warn",
        "Capture is pending",
        "A pending capture is not a completed payment.",
        [`capture.${index}.status`],
      );
    } else if (!["DECLINED", "FAILED"].includes(item.status)) {
      unknown = true;
      review = true;
      finding(
        `status-${index}`,
        "block",
        "Capture status is unresolved",
        "Unknown capture statuses cannot establish that money was paid.",
        [`capture.${index}.status`],
      );
    }
  }
  if (observation.status === "COMPLETED" && unique.size === 0) {
    unknown = true;
    review = true;
    finding(
      "missing-capture",
      "block",
      "Completed order lacks capture evidence",
      "Order status cannot substitute for a verified capture amount.",
      ["order.status"],
    );
  }
  if (observation.status === "APPROVED")
    finding(
      "approved-not-paid",
      "warn",
      "Approval is not capture",
      "Buyer approval alone does not establish that money was captured.",
      ["order.status"],
    );
  if (refunded || refundUnknown)
    finding(
      "refund",
      "block",
      refundUnknown ? "Refund amount unresolved" : "Capture was fully refunded",
      refundUnknown
        ? "Refund evidence does not expose an authoritative total here. Net and remaining stay unknown."
        : "The full capture amount was refunded. Review the invoice before any follow-up.",
      [
        ...(observation.refundDataUnknown ? ["refund.observation"] : []),
        ...[...unique.values()].map((_, i) => `capture.${i}.status`),
      ],
    );
  const net = paid - refunded,
    due = cents(expected.amount);
  if (!unknown && !refundUnknown && net > due) {
    review = true;
    finding(
      "overpaid",
      "block",
      "Captured amount exceeds invoice",
      "An overpayment requires human review; no automatic financial action is available.",
      [
        "expected.amount",
        ...[...unique.values()].map((_, i) => `capture.${i}.amount`),
      ],
    );
  }
  const totals = {
    paid: unknown ? null : money(paid),
    refunded: unknown || refundUnknown ? null : money(refunded),
    net: unknown || refundUnknown ? null : money(net),
    remaining: unknown || refundUnknown ? null : money(Math.max(0, due - net)),
  };
  const outcome = review
    ? "review"
    : unknown
      ? "unknown"
      : net === due
        ? "paid"
        : net > 0
          ? "partial"
          : "unpaid";
  add("result.outcome", "Deterministic outcome", "analysis.outcome", outcome);
  const totalLabels = {
    paid: "Completed capture total",
    refunded: "Verified refund total",
    net: "Verified net amount",
    remaining: "Remaining invoice amount",
  };
  for (const key of ["paid", "refunded", "net", "remaining"] as const)
    add(
      `result.${key}`,
      totalLabels[key],
      `analysis.totals.${key}`,
      totals[key] === null ? "unknown" : `${totals[key]} ${expected.currency}`,
    );
  if (!review && !unknown)
    finding(
      "capture-total",
      outcome === "paid" ? "pass" : "warn",
      outcome === "paid"
        ? "Captured amount matches"
        : "Invoice is not fully captured",
      "Only completed, unique captures in the invoice currency contribute to this result. This read-only tool does not send reminders or change payments.",
      ["expected.amount", "result.net", "result.outcome"],
    );
  return {
    caseId,
    invoiceId: expected.invoiceId,
    environment,
    observedAt,
    expected,
    order: { id: observation.id, status: observation.status },
    captures: [...unique.values()],
    totals,
    outcome,
    findings,
    evidence,
  };
}
