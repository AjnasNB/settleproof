import { ApiError } from "../core/reconcile";
import type { AgreementAction, AgreementTerms } from "./types";
const invalid = (message: string): never => { throw new ApiError(400, "INVALID_INPUT", message); };
const obj = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : invalid("A JSON object is required.");
const exact = (value: Record<string, unknown>, keys: string[]) => { if (Object.keys(value).sort().join(",") !== keys.sort().join(",")) invalid("Unexpected or missing fields."); };
export const text = (value: unknown, limit: number, label: string) => {
  if (typeof value !== "string" || !value.trim() || value.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) invalid(`${label} must contain 1–${limit} characters without control codes.`);
  return (value as string).trim();
};
export function parseTerms(value: unknown): AgreementTerms {
  const data = obj(value); exact(data, ["title", "description", "milestones"]);
  if (!Array.isArray(data.milestones) || data.milestones.length < 1 || data.milestones.length > 3) invalid("Use one to three milestones.");
  let cents = 0;
  const milestones = (data.milestones as unknown[]).map(raw => {
    const item = obj(raw); exact(item, ["title", "amount", "acceptance"]);
    if (typeof item.amount !== "string" || !/^(0|[1-9]\d{0,2})\.\d{2}$/.test(item.amount)) invalid("Use exact USD amounts with two decimal places.");
    const [whole, decimal] = (item.amount as string).split(".");
    const amountCents = Number(whole) * 100 + Number(decimal);
    if (amountCents < 1 || amountCents > 20000) invalid("Each milestone must be USD0.01–200.00.");
    cents += amountCents;
    return { title: text(item.title, 100, "Milestone title"), amount: item.amount as string, acceptance: text(item.acceptance, 600, "Acceptance criteria") };
  });
  if (cents > 20000) invalid("The sandbox agreement total cannot exceed USD200.00.");
  return { title: text(data.title, 120, "Agreement title"), description: text(data.description, 1000, "Description"), milestones };
}
export function parseAction(value: unknown): AgreementAction {
  const data = obj(value);
  if (!Number.isInteger(data.version) || (data.version as number) < 1 || (data.version as number) > 30) invalid("A valid current terms version is required.");
  if (data.type === "propose") { exact(data, ["type", "version", "terms"]); return { type: "propose", version: data.version as number, terms: parseTerms(data.terms) }; }
  if (data.type === "consent") { exact(data, ["type", "version"]); return { type: "consent", version: data.version as number }; }
  if (!["deliver", "accept", "request-changes", "create-order", "capture", "refresh"].includes(String(data.type))) invalid("Unknown agreement action.");
  const needsNote = data.type === "deliver" || data.type === "request-changes";
  exact(data, needsNote ? ["type", "version", "milestoneId", "note"] : ["type", "version", "milestoneId"]);
  if (typeof data.milestoneId !== "string" || !/^m[1-3]$/.test(data.milestoneId)) invalid("Use a milestone from this agreement.");
  return { type: data.type, version: data.version, milestoneId: data.milestoneId, ...(needsNote ? { note: text(data.note, 1000, "Note") } : {}) } as AgreementAction;
}
