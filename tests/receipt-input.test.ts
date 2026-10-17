import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareReceiptInput, RECEIPT_RAW_CHARACTER_LIMIT, RECEIPT_REQUEST_BYTE_LIMIT } from "../src/receipt-input";
import { appendEvent, verifyReceipt } from "../src/agreements/receipt";
import { parseTerms } from "../src/agreements/validation";
import type { ReceiptEvent, ReceiptPacket } from "../src/agreements/types";

async function largeLegitimateReceipt(): Promise<ReceiptPacket> {
  const terms = parseTerms({ title: "Invented design agreement", description: "d".repeat(1000), milestones: [
    { title: "Wireframe", amount: "12.00", acceptance: "a".repeat(600) },
    { title: "Final handoff", amount: "8.00", acceptance: "b".repeat(600) },
    { title: "Extra notes", amount: "1.00", acceptance: "c".repeat(600) },
  ] });
  const room = { id: "a".repeat(32), title: terms.title, version: 30, currency: "USD" as const, expiresAt: "2026-10-24T00:00:00.000Z" };
  const events: ReceiptEvent[] = [];
  const add = async (type: string, actor: ReceiptEvent["actor"], data: Record<string, unknown>) => events.push(await appendEvent(events, { type, actor, at: "2026-10-17T00:00:00.000Z", data }));
  await add("created", "system", { roomId: room.id, version: 1, currency: "USD", expiresAt: room.expiresAt, terms });
  for (let version = 2; version <= 30; version++) await add("terms-proposed", version % 2 ? "seller" : "buyer", { version, terms });
  await add("consented", "buyer", { version: 30 });
  await add("consented", "seller", { version: 30 });
  while (events.length < 140) await add("delivery-submitted", "seller", { version: 30, milestoneId: "m1", note: "n".repeat(1000) });
  return { format: "settleproof-receipt-v1", room, events, anchor: { sequence: events.length, hash: events.at(-1)!.hash } };
}

test("a formatted ASCII receipt over the old 250k input ceiling keeps every event and compacts below the export limit", async () => {
  const packet = await largeLegitimateReceipt();
  const pretty = JSON.stringify(packet, null, 10);
  assert.ok(pretty.length > 250_000, `fixture needs to cross the former limit: ${pretty.length}`);
  assert.ok(new TextEncoder().encode(JSON.stringify(packet)).byteLength < 384 * 1024);
  assert.equal((await verifyReceipt(packet)).valid, true);
  const result = prepareReceiptInput(pretty, { sequence: 1, hash: packet.events[0].hash });
  assert.deepEqual(result.packet, packet);
  assert.equal(JSON.parse(result.body).packet.events.length, 140);
  assert.ok(new TextEncoder().encode(result.body).byteLength < RECEIPT_REQUEST_BYTE_LIMIT);
});

test("compact UTF-8 payload is rejected by bytes even when its character count is well within raw and request limits", () => {
  const raw = JSON.stringify({ format: "settleproof-receipt-v1", room: {}, events: [{ data: { note: "€".repeat(180_000) } }], anchor: {} });
  assert.ok(raw.length < RECEIPT_REQUEST_BYTE_LIMIT);
  assert.ok(raw.length < RECEIPT_RAW_CHARACTER_LIMIT);
  assert.ok(new TextEncoder().encode(raw).byteLength > RECEIPT_REQUEST_BYTE_LIMIT);
  assert.throws(() => prepareReceiptInput(raw), /512 KiB UTF-8/);
});

test("oversized raw formatting and truncated JSON get explicit recovery guidance instead of silent truncation", () => {
  assert.throws(() => prepareReceiptInput(" ".repeat(RECEIPT_RAW_CHARACTER_LIMIT + 1) + "{}"), /2 MiB character/);
  assert.throws(() => prepareReceiptInput('{"events":['), /entire original export/);
  assert.throws(() => prepareReceiptInput("null"), /receipt object/);
});
