import type { ReceiptPacket } from "./agreements/types";

export const RECEIPT_RAW_CHARACTER_LIMIT = 2 * 1024 * 1024;
export const RECEIPT_REQUEST_BYTE_LIMIT = 512 * 1024;

/** Bounds pasted formatting separately from the compact UTF-8 request body. */
export function prepareReceiptInput(raw: string, retainedAnchor?: { sequence: number; hash: string }): { packet: ReceiptPacket; body: string } {
  if (raw.length > RECEIPT_RAW_CHARACTER_LIMIT)
    throw new Error("Receipt text exceeds the 2 MiB character input limit. Use the original export with less formatting; do not truncate its events.");
  let packet: ReceiptPacket;
  try { packet = JSON.parse(raw) as ReceiptPacket; }
  catch { throw new Error("This is not complete receipt JSON. Paste the entire original export; do not truncate its events."); }
  if (!packet || typeof packet !== "object" || Array.isArray(packet))
    throw new Error("Paste a complete SettleProof receipt object.");
  const body = JSON.stringify({ packet, ...(retainedAnchor ? { retainedAnchor } : {}) });
  if (new TextEncoder().encode(body).byteLength > RECEIPT_REQUEST_BYTE_LIMIT)
    throw new Error("The compact receipt request exceeds the 512 KiB UTF-8 limit. This file cannot be sent in full; do not truncate its events. Use a supported original export.");
  return { packet, body };
}
