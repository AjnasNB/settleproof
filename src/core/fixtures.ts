import type { Scenario } from "../shared";
import type { Observation } from "./reconcile";
const expected = {
  invoiceId: "DEMO-1042",
  amount: "120.00",
  currency: "USD" as const,
};
const capture = (
  id: string,
  amount = "120.00",
  status = "COMPLETED",
  currency = "USD",
) => ({ id, amount, status, currency });
const cases: [string, string, string, Observation][] = [
  [
    "paid",
    "Captured in full",
    "Synthetic: one completed capture matches the invoice.",
    {
      id: "SYNTHETIC-ORDER-01",
      status: "COMPLETED",
      invoiceIds: [expected.invoiceId],
      captures: [capture("SYNTHETIC-CAP-01")],
    },
  ],
  [
    "approved",
    "Approved is not paid",
    "Synthetic: buyer approval without any captured payment.",
    {
      id: "SYNTHETIC-ORDER-02",
      status: "APPROVED",
      invoiceIds: [expected.invoiceId],
      captures: [],
    },
  ],
  [
    "partial",
    "Partial capture",
    "Synthetic: only part of the invoice was captured.",
    {
      id: "SYNTHETIC-ORDER-03",
      status: "COMPLETED",
      invoiceIds: [expected.invoiceId],
      captures: [capture("SYNTHETIC-CAP-03", "45.00")],
    },
  ],
  [
    "duplicate",
    "Duplicate evidence",
    "Synthetic: repeated capture IDs must not inflate the total.",
    {
      id: "SYNTHETIC-ORDER-04",
      status: "COMPLETED",
      invoiceIds: [expected.invoiceId],
      captures: [capture("SYNTHETIC-CAP-04"), capture("SYNTHETIC-CAP-04")],
    },
  ],
  [
    "currency",
    "Currency mismatch",
    "Synthetic: EUR capture against a USD invoice requires review.",
    {
      id: "SYNTHETIC-ORDER-05",
      status: "COMPLETED",
      invoiceIds: [expected.invoiceId],
      captures: [capture("SYNTHETIC-CAP-05", "120.00", "COMPLETED", "EUR")],
    },
  ],
  [
    "invoice",
    "Wrong invoice reference",
    "Synthetic: the captured order belongs to another invoice.",
    {
      id: "SYNTHETIC-ORDER-06",
      status: "COMPLETED",
      invoiceIds: ["DEMO-OTHER"],
      captures: [capture("SYNTHETIC-CAP-06")],
    },
  ],
  [
    "refund",
    "Partial refund unresolved",
    "Synthetic: an unknown refund amount must not become a confident net.",
    {
      id: "SYNTHETIC-ORDER-07",
      status: "COMPLETED",
      invoiceIds: [expected.invoiceId],
      captures: [capture("SYNTHETIC-CAP-07", "120.00", "PARTIALLY_REFUNDED")],
    },
  ],
  [
    "unavailable",
    "Unavailable is not unpaid",
    "Synthetic: missing provider data leaves the payment unknown.",
    {
      id: "SYNTHETIC-ORDER-08",
      status: "UNAVAILABLE",
      invoiceIds: [expected.invoiceId],
      captures: [],
      unavailable: true,
    },
  ],
];
export const scenarios: Scenario[] = cases.map(([id, title, note]) => ({
  id,
  title,
  note,
  expected,
}));
export function fixture(id: string) {
  const row = cases.find((c) => c[0] === id);
  return row ? { expected, observation: structuredClone(row[3]) } : undefined;
}
