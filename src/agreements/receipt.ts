import type { ReceiptEvent, ReceiptPacket, ReceiptVerification } from "./types";
import { MAX_RECEIPT_PACKET_BYTES, serializedBytes } from "./limits";
export const GENESIS = "0".repeat(64);
export const RECEIPT_LIMITATION = "A matching hash chain is not identity verification, a digital signature, proof of delivery, or PayPal settlement. Without a separately retained earlier anchor, a complete history can be rewritten and rehashed.";

export function canonical(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object" && value !== null) return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  throw new Error("Unsupported receipt value.");
}
export async function sha256(value: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map(n => n.toString(16).padStart(2, "0")).join("");
}
export async function appendEvent(events: ReceiptEvent[], event: Omit<ReceiptEvent, "hash" | "sequence" | "previousHash">): Promise<ReceiptEvent> {
  const entry = { sequence: events.length + 1, ...event, previousHash: events.at(-1)?.hash || GENESIS };
  return { ...entry, hash: await sha256(canonical(entry)) };
}

export async function verifyReceipt(packet: ReceiptPacket, retainedAnchor?: { sequence: number; hash: string }): Promise<ReceiptVerification> {
  const fail = (reason: string, checkedEvents = 0): ReceiptVerification => ({ valid: false, reason, checkedEvents, limitation: RECEIPT_LIMITATION });
  try {
    if (serializedBytes(packet) > MAX_RECEIPT_PACKET_BYTES) return fail("Receipt packet exceeds the supported 384KiB export limit.");
    if (packet.format !== "settleproof-receipt-v1" || !Array.isArray(packet.events) || !packet.events.length || packet.events.length > 140 ||
      !packet.room || typeof packet.room.id !== "string" || !packet.anchor) return fail("Invalid receipt packet.");
    let previous = GENESIS;
    for (let i = 0; i < packet.events.length; i++) {
      const entry = packet.events[i];
      if (!entry || Object.keys(entry).sort().join(",") !== "actor,at,data,hash,previousHash,sequence,type" || entry.sequence !== i + 1 ||
        entry.previousHash !== previous || !/^[a-f0-9]{64}$/.test(entry.hash) || !["buyer", "seller", "system"].includes(entry.actor) ||
        typeof entry.at !== "string" || typeof entry.type !== "string" || !entry.data || typeof entry.data !== "object" || Array.isArray(entry.data)) return fail("Event shape, sequence or previous hash is invalid.", i);
      const { hash, ...body } = entry;
      if (await sha256(canonical(body)) !== hash) return fail("An event was changed or its hash is invalid.", i);
      previous = hash;
    }
    const head = { sequence: packet.events.length, hash: previous };
    if (packet.anchor.sequence !== head.sequence || packet.anchor.hash !== head.hash) return fail("Exported head does not match this history.", packet.events.length);
    const first = packet.events[0];
    if (first.type !== "created" || first.data.roomId !== packet.room.id) return fail("Room identity is not bound to the first event.", packet.events.length);
    const termsEvent = [...packet.events].reverse().find(event => event.type === "terms-proposed" || event.type === "created")!;
    const terms = termsEvent.data.terms as { title?: unknown } | undefined;
    if (packet.room.title !== terms?.title || packet.room.version !== termsEvent.data.version || packet.room.currency !== first.data.currency ||
      packet.room.expiresAt !== first.data.expiresAt) return fail("Room summary differs from the hashed history.", packet.events.length);
    if (retainedAnchor) {
      if (!Number.isInteger(retainedAnchor.sequence) || retainedAnchor.sequence < 1 || retainedAnchor.sequence > packet.events.length ||
        packet.events[retainedAnchor.sequence - 1].hash !== retainedAnchor.hash) return fail("History does not contain the independently retained earlier anchor.", packet.events.length);
    }
    return { valid: true, reason: retainedAnchor ? "Chain and independently retained prefix anchor match." : "Internal hash chain matches; no independent earlier anchor was supplied.", checkedEvents: packet.events.length, head, limitation: RECEIPT_LIMITATION };
  } catch { return fail("Receipt contains unsupported or malformed values."); }
}
