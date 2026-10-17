// Export is intentionally smaller than the verification HTTP envelope allowance.
export const MAX_RECEIPT_PACKET_BYTES = 384 * 1024;
export const MAX_STORED_ROOM_BYTES = 640 * 1024;
export const MAX_VERIFY_REQUEST_BYTES = 512 * 1024;
export const MAX_PAYMENT_ANALYSIS_BYTES = 48 * 1024;
// Each pending call owns this space until either its result or failure is recorded.
export const PENDING_RECEIPT_HEADROOM_BYTES = 64 * 1024;
export const PENDING_ROOM_HEADROOM_BYTES = 112 * 1024;
export const serializedBytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).byteLength;
