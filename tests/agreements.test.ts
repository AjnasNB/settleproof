import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTerms, parseAction } from "../src/agreements/validation";
import { appendEvent, verifyReceipt, GENESIS, canonical } from "../src/agreements/receipt";
import { sandboxAdapter, sdkCreateOrder, sdkReadOrder, sdkCaptureOrder } from "../src/agreements/paypal-sdk";
import type { ReceiptPacket } from "../src/agreements/types";

const terms = { title: "Logo commission", description: "Fictitious sandbox design agreement", milestones: [{ title: "First design", amount: "12.00", acceptance: "Three concepts as a PDF" }, { title: "Final artwork", amount: "8.00", acceptance: "One approved SVG" }] };
const env = { PAYPAL_CLIENT_ID: "synthetic-client", PAYPAL_CLIENT_SECRET: "synthetic-secret" };
const invoiceId = "SP-SYNTHETIC-v1-m1", orderId = "ORDERTEST12345678", captureId = "CAPTURETEST123456";
const rawOrder = (status = "APPROVED", withCapture = false) => ({ id: orderId, status, purchase_units: [{ invoice_id: invoiceId, amount: { currency_code: "USD", value: "12.00" }, ...(withCapture ? { payments: { captures: [{ id: captureId, status: "COMPLETED", amount: { currency_code: "USD", value: "12.00" } }] } } : {}) }] });
const respond = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });

test("agreement exact USD validation accepts the server-bound 12+8 example", () => assert.deepEqual(parseTerms(terms), terms));
test("agreement rejects floating-point, over-limit and noncanonical amounts", () => {
  for (const amount of ["0.00", "200.01", "01.00", "1e2", "0.001", "12", "-1.00", 12]) assert.throws(() => parseTerms({ ...terms, milestones: [{ ...terms.milestones[0], amount }] }));
  assert.throws(() => parseTerms({ ...terms, milestones: [{ ...terms.milestones[0], amount: "150.00" }, { ...terms.milestones[1], amount: "100.00" }] }));
});
test("agreement rejects too many milestones, unknown fields and oversized text", () => {
  assert.throws(() => parseTerms({ ...terms, milestones: Array(4).fill(terms.milestones[0]) }));
  assert.throws(() => parseTerms({ ...terms, currency: "EUR" }));
  assert.throws(() => parseTerms({ ...terms, description: "x".repeat(1001) }));
  assert.throws(() => parseTerms({ ...terms, description: "bad\u0000data" }));
});
test("actions reject arbitrary amount/order/capability fields", () => {
  assert.deepEqual(parseAction({ type: "capture", version: 1, milestoneId: "m1" }), { type: "capture", version: 1, milestoneId: "m1" });
  for (const extra of [{ amount: "1.00" }, { orderId }, { capability: "secret" }]) assert.throws(() => parseAction({ type: "capture", version: 1, milestoneId: "m1", ...extra }));
});

async function packet(): Promise<ReceiptPacket> {
  const room = { id: "a".repeat(32), title: terms.title, version: 1, currency: "USD" as const, expiresAt: "2026-10-24T00:00:00.000Z" };
  const first = await appendEvent([], { at: "2026-10-17T00:00:00.000Z", type: "created", actor: "system", data: { roomId: room.id, version: 1, currency: "USD", expiresAt: room.expiresAt, terms } });
  return { format: "settleproof-receipt-v1", room, events: [first], anchor: { sequence: 1, hash: first.hash } };
}
test("canonical receipt serialization does not depend on object insertion order", () => assert.equal(canonical({ b: [2, 1], a: "value" }), canonical({ a: "value", b: [2, 1] })));
test("receipt hash verifies but clearly distinguishes absent independent anchor", async () => { const result = await verifyReceipt(await packet()); assert.equal(result.valid, true); assert.match(result.reason, /no independent/); });
test("receipt catches edited body, summary, ordering and head", async () => {
  const original = await packet();
  for (const edit of [(p: ReceiptPacket) => p.events[0].data.version = 2, (p: ReceiptPacket) => p.room.title = "Changed", (p: ReceiptPacket) => p.room.version = 2, (p: ReceiptPacket) => p.room.currency = "EUR" as "USD", (p: ReceiptPacket) => p.events[0].sequence = 2, (p: ReceiptPacket) => p.anchor.hash = GENESIS]) {
    const changed = structuredClone(original); edit(changed); assert.equal((await verifyReceipt(changed)).valid, false);
  }
});
test("earlier retained receipt anchor remains valid after a legitimate append", async () => {
  const value = await packet(), earlier = { ...value.anchor };
  const appended = await appendEvent(value.events, { at: "2026-10-17T00:01:00.000Z", type: "consented", actor: "buyer", data: { version: 1 } });
  value.events.push(appended); value.anchor = { sequence: 2, hash: appended.hash };
  assert.equal((await verifyReceipt(value, earlier)).valid, true);
  assert.equal((await verifyReceipt(value, { sequence: 1, hash: GENESIS })).valid, false);
});
test("rewritten and rehashed history cannot pass a separately retained original anchor", async () => {
  const value = await packet(), earlier = { ...value.anchor };
  const replacement = await appendEvent([], { at: value.events[0].at, type: "created", actor: "system", data: { ...value.events[0].data, terms: { ...terms, description: "rewritten" } } });
  value.events = [replacement]; value.anchor = { sequence: 1, hash: replacement.hash };
  assert.equal((await verifyReceipt(value)).valid, true);
  assert.equal((await verifyReceipt(value, earlier)).valid, false);
});

test("SDK custom transport forbids production, redirects, arbitrary paths and query parameters", async () => {
  let calls = 0;
  const adapter = sandboxAdapter((async () => { calls++; return respond({}); }) as typeof fetch);
  for (const url of ["https://api-m.paypal.com/v2/checkout/orders", "https://evil.test/v1/oauth2/token", "https://api-m.sandbox.paypal.com/v1/payments/payouts", "https://api-m.sandbox.paypal.com/v2/checkout/orders?foo=bar"]) await assert.rejects(adapter({ url, method: "POST" }));
  assert.equal(calls, 0);
});
test("official SDK create order uses sandbox OAuth, typed payload and stable idempotency", async () => {
  const seen: { url: string; init?: RequestInit }[] = [];
  const fake = (async (input, init) => {
    seen.push({ url: String(input), init });
    return String(input).endsWith("/oauth2/token") ? respond({ access_token: "synthetic-token", token_type: "Bearer", expires_in: 300 }) : respond({ ...rawOrder("CREATED"), links: [{ rel: "payer-action", href: `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`, method: "GET" }] }, 201);
  }) as typeof fetch;
  const result = await sdkCreateOrder(env, invoiceId, "12.00", "stable-request-123", "https://settleproof.test", fake);
  assert.equal(result.orderId, orderId); assert.match(result.approvalUrl || "", /^https:\/\/www.sandbox.paypal.com\//);
  assert.equal(seen.length, 2); assert.ok(seen.every(item => item.url.startsWith("https://api-m.sandbox.paypal.com/")));
  const create = seen[1]; assert.equal(new Headers(create.init?.headers).get("paypal-request-id"), "stable-request-123");
  const body = JSON.parse(String(create.init?.body)); assert.equal(body.purchase_units[0].amount.value, "12.00"); assert.equal(body.purchase_units[0].invoice_id, invoiceId);
  assert.ok(seen.every(item => item.init?.redirect === "error"));
});
test("SDK fallback approval links require the exact sandbox origin and documented checkout path", async () => {
  for (const href of [`https://www.sandbox.paypal.com:444/checkoutnow?token=${orderId}`, `https://www.sandbox.paypal.com/other?token=${orderId}`, `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}#unexpected`, `https://www.paypal.com/checkoutnow?token=${orderId}`]) {
    const fake = (async (input: RequestInfo | URL) => String(input).endsWith("/oauth2/token") ? respond({ access_token: "synthetic-token", token_type: "Bearer", expires_in: 300 }) : respond({ ...rawOrder("CREATED"), links: [{ rel: "payer-action", href }] }, 201)) as typeof fetch;
    assert.equal((await sdkCreateOrder(env, invoiceId, "12.00", "test-request", "https://settleproof.test", fake)).approvalUrl, undefined);
  }
});
test("official SDK reads each capture afresh and rejects mismatched order associations", async () => {
  let freshReads = 0;
  const fake = (mismatch: boolean) => (async (input: RequestInfo | URL) => {
    const path = new URL(String(input)).pathname;
    if (path === "/v1/oauth2/token") return respond({ access_token: "synthetic-token", token_type: "Bearer", expires_in: 300 });
    if (path.includes("/captures/")) { freshReads++; return respond({ id: captureId, status: "COMPLETED", invoice_id: invoiceId, amount: { currency_code: "USD", value: "12.00" }, supplementary_data: { related_ids: { order_id: mismatch ? "DIFFERENTORDER123" : orderId } } }); }
    return respond(rawOrder("COMPLETED", true));
  }) as typeof fetch;
  const result = await sdkReadOrder(env, orderId, fake(false)); assert.equal(result.captures[0].amount, "12.00"); assert.equal(freshReads, 1);
  await assert.rejects(sdkReadOrder(env, orderId, fake(true)));
});
test("official SDK capture refuses missing approval and invoice binding mismatch before POST", async () => {
  let captures = 0;
  const fake = (status: string) => (async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(String(input)).pathname;
    if (path === "/v1/oauth2/token") return respond({ access_token: "synthetic-token", token_type: "Bearer", expires_in: 300 });
    if (init?.method === "POST") captures++;
    return respond(rawOrder(status));
  }) as typeof fetch;
  await assert.rejects(sdkCaptureOrder(env, orderId, "idempotent", { invoiceId, amount: "12.00" }, fake("CREATED")));
  await assert.rejects(sdkCaptureOrder(env, orderId, "idempotent", { invoiceId: "OTHER", amount: "12.00" }, fake("APPROVED")));
  assert.equal(captures, 0);
});
test("SDK transport caps large responses and does not print provider errors", async () => {
  const adapter = sandboxAdapter((async () => new Response("x".repeat(128 * 1024 + 1))) as typeof fetch);
  await assert.rejects(adapter({ url: "https://api-m.sandbox.paypal.com/v1/oauth2/token", method: "POST", data: "grant_type=client_credentials" }), error => !String(error).includes("xxxxxxxx"));
});
