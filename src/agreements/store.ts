import { DurableObject } from "cloudflare:workers";
import { ApiError, reconcile } from "../core/reconcile";
import type { PaypalSecrets } from "../core/paypal";
import { appendEvent, sha256, GENESIS } from "./receipt";
import { sdkCreateOrder, sdkCaptureOrder, sdkReadOrder } from "./paypal-sdk";
import { parseTerms, parseAction } from "./validation";
import { MAX_RECEIPT_PACKET_BYTES, MAX_STORED_ROOM_BYTES, MAX_PAYMENT_ANALYSIS_BYTES, PENDING_RECEIPT_HEADROOM_BYTES, PENDING_ROOM_HEADROOM_BYTES, serializedBytes } from "./limits";
import type { AgreementAction, AgreementCreateResponse, AgreementMilestone, AgreementResponse, AgreementRole, AgreementRoom, AgreementTerms, ReceiptPacket } from "./types";

const TTL = 7 * 24 * 60 * 60 * 1000;
const MAX_EVENTS = 140;
const DISCLAIMER = "Sandbox merchant checkout only. Capability possession represents a demo role; it does not verify identity. No escrow, custody, arbitration, autonomous payment or immutable settlement is provided.";
type Operation = { requestId: string; attemptId: string; kind: "create-order" | "capture" | "refresh"; startedAt: number; firstAttemptAt: number; pending: boolean };
type StoredRoom = { room: AgreementRoom; capabilityHashes: Record<AgreementRole, string>; frozen: boolean; operations: Record<string, Operation>; createIds: Record<string, string>; captureIds: Record<string, string>; requestStartedAt: Record<string, number> };
type Saved = { value: string };
export type StoreCommand = { operation: "create" | "read" | "action" | "export"; id?: string; capability?: string; value?: unknown; returnOrigin?: string };
export type StoreReply = { ok: true; value: unknown } | { ok: false; error: { status: number; code: string; message: string } };
const conflict = (message: string): never => { throw new ApiError(409, "CONFLICT", message); };
const forbidden = (): never => { throw new ApiError(403, "FORBIDDEN", "This capability does not authorize this action."); };
const uid = () => crypto.randomUUID().replaceAll("-", "");
const token = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};
const milestones = (terms: AgreementTerms, id: string, version: number): AgreementMilestone[] => terms.milestones.map((item, i) => ({ ...item,
  id: `m${i + 1}`, invoiceId: `SP-${id.slice(0, 16)}-v${version}-m${i + 1}`, delivery: null, acceptanceStatus: "pending", payment: { status: "not-started" } }));
const receiptPacket = (room: AgreementRoom): ReceiptPacket => ({ format: "settleproof-receipt-v1", room: { id: room.id, title: room.title, version: room.version, currency: "USD", expiresAt: room.expiresAt }, anchor: room.head, events: room.events });
const capacityError = () => new ApiError(409, "RECEIPT_CAPACITY", "This room has insufficient receipt capacity for another sandbox operation. Export the existing history. No new provider request was started.");

/** One bounded global demo store. SQL transactions reserve state before external I/O. */
export class AgreementStore extends DurableObject<PaypalSecrets> {
  constructor(ctx: DurableObjectState, env: PaypalSecrets) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS agreement_rooms (id TEXT PRIMARY KEY, value TEXT NOT NULL, expires INTEGER NOT NULL)");
      ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS agreement_quota (day TEXT PRIMARY KEY, rooms INTEGER NOT NULL)");
    });
  }
  async dispatch(command: StoreCommand): Promise<StoreReply> {
    try {
      const value = command.operation === "create" ? await this.create(command.value)
        : command.operation === "read" ? await this.read(command.id || "", command.capability || "")
        : command.operation === "export" ? await this.export(command.id || "", command.capability || "")
        : command.operation === "action" ? await this.action(command.id || "", command.capability || "", command.value, command.returnOrigin || "")
        : conflict("Unknown room operation.");
      return { ok: true, value };
    } catch (error) {
      if (error instanceof ApiError) return { ok: false, error: { status: error.status, code: error.code, message: error.message } };
      return { ok: false, error: { status: 500, code: "AGREEMENT_ERROR", message: "The room operation could not complete. Refresh before retrying; no payment status is inferred." } };
    }
  }
  private async scheduleExpiry() {
    const next = this.ctx.storage.sql.exec<{ expires: number | null }>("SELECT MIN(expires) AS expires FROM agreement_rooms").toArray()[0]?.expires;
    if (next) await this.ctx.storage.setAlarm(Math.max(next, Date.now() + 1000));
    else await this.ctx.storage.deleteAlarm();
  }
  async alarm() {
    this.ctx.storage.sql.exec("DELETE FROM agreement_rooms WHERE expires <= ?", Date.now());
    this.ctx.storage.sql.exec("DELETE FROM agreement_quota WHERE day <> ?", new Date().toISOString().slice(0, 10));
    await this.scheduleExpiry();
  }
  private load(id: string): StoredRoom {
    if (!/^[a-f0-9]{32}$/.test(id)) throw new ApiError(404, "NOT_FOUND", "Agreement room not found.");
    const row = this.ctx.storage.sql.exec<Saved>("SELECT value FROM agreement_rooms WHERE id = ?", id).toArray()[0];
    if (!row) throw new ApiError(404, "NOT_FOUND", "Agreement room not found or expired.");
    const stored = JSON.parse(row.value) as StoredRoom;
    if (Date.parse(stored.room.expiresAt) <= Date.now()) throw new ApiError(410, "EXPIRED", "This seven-day sandbox room has expired. Retained receipts can still be verified locally.");
    return stored;
  }
  private save(stored: StoredRoom) {
    const pending = Object.values(stored.operations).filter(operation => operation.pending).length;
    if (serializedBytes(receiptPacket(stored.room)) + pending * PENDING_RECEIPT_HEADROOM_BYTES > MAX_RECEIPT_PACKET_BYTES ||
      serializedBytes(stored) + pending * PENDING_ROOM_HEADROOM_BYTES > MAX_STORED_ROOM_BYTES) throw capacityError();
    this.ctx.storage.sql.exec("INSERT INTO agreement_rooms(id,value,expires) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value, expires=excluded.expires",
      stored.room.id, JSON.stringify(stored), Date.parse(stored.room.expiresAt));
  }
  private async role(stored: StoredRoom, capability: string): Promise<AgreementRole> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(capability)) forbidden();
    const hash = await sha256(capability);
    if (hash === stored.capabilityHashes.buyer) return "buyer";
    if (hash === stored.capabilityHashes.seller) return "seller";
    return forbidden();
  }
  private async event(stored: StoredRoom, type: string, actor: AgreementRole | "system", data: Record<string, unknown>) {
    if (stored.room.events.length >= MAX_EVENTS) conflict("This demo room has reached its receipt event limit. Export the history.");
    const at = new Date().toISOString();
    const entry = await appendEvent(stored.room.events, { at, type, actor, data });
    stored.room.events.push(entry); stored.room.head = { sequence: entry.sequence, hash: entry.hash }; stored.room.updatedAt = at;
  }
  /** Hashing yields; CAS keeps each resulting commit serializable across interleaved requests. */
  private async change(id: string, capability: string, mutate: (stored: StoredRoom, role: AgreementRole) => Promise<void>): Promise<AgreementResponse> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const stored = this.load(id), prior = stored.room.head.hash;
      const role = await this.role(stored, capability);
      await mutate(stored, role);
      const committed = this.ctx.storage.transactionSync(() => {
        if (this.load(id).room.head.hash !== prior) return false;
        this.save(stored); return true;
      });
      if (committed) return { room: stored.room, role };
    }
    return conflict("The room changed concurrently. Refresh and try again.");
  }
  async create(value: unknown): Promise<AgreementCreateResponse> {
    const terms = parseTerms(value), id = uid(), buyerCapability = token(), sellerCapability = token();
    const createdAt = new Date().toISOString();
    const room: AgreementRoom = { id, title: terms.title, description: terms.description, currency: "USD", version: 1,
      createdAt, updatedAt: createdAt, expiresAt: new Date(Date.now() + TTL).toISOString(), consent: { buyer: null, seller: null },
      milestones: milestones(terms, id, 1), events: [], head: { sequence: 0, hash: GENESIS }, disclaimer: DISCLAIMER };
    const stored: StoredRoom = { room, capabilityHashes: { buyer: await sha256(buyerCapability), seller: await sha256(sellerCapability) }, frozen: false,
      operations: {}, createIds: {}, captureIds: {}, requestStartedAt: {} };
    await this.event(stored, "created", "system", { roomId: id, version: 1, currency: "USD", expiresAt: room.expiresAt, terms });
    this.ctx.storage.transactionSync(() => {
      const day = createdAt.slice(0, 10);
      this.ctx.storage.sql.exec("DELETE FROM agreement_rooms WHERE expires <= ?", Date.now());
      this.ctx.storage.sql.exec("DELETE FROM agreement_quota WHERE day <> ?", day);
      const used = this.ctx.storage.sql.exec<{ rooms: number }>("SELECT rooms FROM agreement_quota WHERE day = ?", day).toArray()[0]?.rooms || 0;
      const count = this.ctx.storage.sql.exec<{ count: number }>("SELECT COUNT(*) AS count FROM agreement_rooms").toArray()[0]?.count || 0;
      if (used >= 5 || count >= 100) throw new ApiError(429, "ROOM_LIMIT", "The public sandbox demo has reached its global room allowance. Try an existing room or return after the UTC daily reset.");
      this.ctx.storage.sql.exec("INSERT INTO agreement_quota(day,rooms) VALUES(?,?) ON CONFLICT(day) DO UPDATE SET rooms=excluded.rooms", day, used + 1);
      this.save(stored);
    });
    await this.scheduleExpiry();
    return { room, buyerCapability, sellerCapability };
  }
  async read(id: string, capability: string): Promise<AgreementResponse> {
    const stored = this.load(id); return { room: stored.room, role: await this.role(stored, capability) };
  }
  async export(id: string, capability: string): Promise<ReceiptPacket> {
    const { room } = await this.read(id, capability);
    return receiptPacket(room);
  }
  async action(id: string, capability: string, raw: unknown, returnOrigin: string): Promise<AgreementResponse> {
    const action = parseAction(raw);
    if (["create-order", "capture", "refresh"].includes(action.type)) return this.payment(id, capability, action as Extract<AgreementAction, { milestoneId: string }>, returnOrigin);
    return this.change(id, capability, async (stored, role) => {
      const room = stored.room;
      if (action.version !== room.version) conflict("Terms changed. Review the current version before acting.");
      if (action.type === "propose") {
        if (stored.frozen) conflict("Terms are frozen after a checkout attempt, including an uncertain attempt. Create a new room for different terms.");
        if (room.version >= 30) conflict("The demo revision limit has been reached.");
        room.version++; room.title = action.terms.title; room.description = action.terms.description;
        room.consent = { buyer: null, seller: null }; room.milestones = milestones(action.terms, id, room.version);
        await this.event(stored, "terms-proposed", role, { version: room.version, terms: action.terms }); return;
      }
      if (action.type === "consent") {
        if (room.consent[role] === room.version) return;
        room.consent[role] = room.version;
        await this.event(stored, "consented", role, { version: room.version }); return;
      }
      if (room.consent.buyer !== room.version || room.consent.seller !== room.version) conflict("Both roles must consent to this terms version first.");
      const milestone = room.milestones.find(item => item.id === action.milestoneId);
      if (!milestone) conflict("Milestone not found.");
      if (milestone!.payment.status !== "not-started") conflict("Delivery cannot change after checkout starts.");
      if (action.type === "deliver") {
        if (role !== "seller") forbidden();
        if (milestone!.acceptanceStatus === "accepted") conflict("The buyer already accepted this delivery.");
        milestone!.delivery = { note: action.note, at: new Date().toISOString() }; milestone!.acceptanceStatus = "delivered";
        await this.event(stored, "delivery-submitted", role, { version: room.version, milestoneId: milestone!.id, note: action.note });
      } else if (action.type === "accept") {
        if (role !== "buyer") forbidden();
        if (milestone!.acceptanceStatus === "accepted") return;
        if (milestone!.acceptanceStatus !== "delivered") conflict("A seller delivery is required before acceptance.");
        milestone!.acceptanceStatus = "accepted";
        await this.event(stored, "delivery-accepted", role, { version: room.version, milestoneId: milestone!.id });
      } else if (action.type === "request-changes") {
        if (role !== "buyer") forbidden();
        if (!["delivered", "accepted"].includes(milestone!.acceptanceStatus)) conflict("Review a delivery before requesting changes.");
        milestone!.acceptanceStatus = "changes-requested";
        await this.event(stored, "changes-requested", role, { version: room.version, milestoneId: milestone!.id, note: action.note });
      }
    });
  }
  private async payment(id: string, capability: string, action: Extract<AgreementAction, { milestoneId: string }>, returnOrigin: string): Promise<AgreementResponse> {
    const kind = action.type as Operation["kind"];
    let operation: Operation | undefined, expected: { invoiceId: string; amount: string; currency: "USD" } | undefined, orderId: string | undefined;
    const reserved = await this.change(id, capability, async (stored, role) => {
      operation = undefined; expected = undefined; orderId = undefined;
      const room = stored.room;
      if (action.version !== room.version) conflict("Terms changed. Review the current version first.");
      if (role !== "buyer" && kind !== "refresh") forbidden();
      if (room.consent.buyer !== room.version || room.consent.seller !== room.version) conflict("Both roles must consent before checkout.");
      const milestone = room.milestones.find(item => item.id === action.milestoneId);
      if (!milestone || milestone.acceptanceStatus !== "accepted") conflict("The buyer must accept the delivery before checkout.");
      const item = milestone!;
      const current = stored.operations[item.id];
      if (current?.pending && Date.now() - current.startedAt < 30000) conflict("A sandbox operation is already in progress. Wait, then refresh.");
      if (kind === "create-order" && item.payment.orderId) { orderId = item.payment.orderId; return; }
      if (kind !== "create-order" && !item.payment.orderId) conflict("Create this milestone's sandbox checkout first.");
      if (kind === "capture" && item.payment.status === "verified") { orderId = item.payment.orderId; return; }
      if (room.events.length > MAX_EVENTS - 3) conflict("Export this room before further checkout attempts.");
      if (!this.env.PAYPAL_CLIENT_ID || !this.env.PAYPAL_CLIENT_SECRET) throw new ApiError(503, "PAYPAL_NOT_CONFIGURED", "PayPal sandbox is not configured. No checkout attempt was reserved.");
      expected = { invoiceId: item.invoiceId, amount: item.amount, currency: "USD" }; orderId = item.payment.orderId;
      const ids = kind === "capture" ? stored.captureIds : stored.createIds;
      const requestId = kind === "refresh" ? uid() : (ids[item.id] ||= uid());
      stored.requestStartedAt ||= {};
      const firstAttemptAt = kind === "refresh" ? Date.now() : (stored.requestStartedAt[requestId] ||= Date.now());
      // Orders idempotency is time-bounded. Never blindly retry an uncertain write beyond its window.
      if (kind !== "refresh" && Date.now() - firstAttemptAt > 5 * 60 * 60 * 1000) conflict("This checkout attempt is too old for a safe automatic retry. Inspect PayPal's sandbox record; do not create a replacement payment blindly.");
      operation = { kind, requestId, attemptId: uid(), startedAt: Date.now(), firstAttemptAt, pending: true };
      stored.operations[item.id] = operation; stored.frozen = true;
      if (kind === "create-order") item.payment.status = "creating";
      if (kind === "capture") item.payment.status = "capturing";
      delete item.payment.error;
      await this.event(stored, "sandbox-operation-reserved", role, { version: room.version, milestoneId: item.id, kind, requestId, amount: item.amount, currency: "USD", invoiceId: item.invoiceId });
    });
    if (!operation || !expected) return { ...reserved, approvalUrl: reserved.room.milestones.find(item => item.id === action.milestoneId)?.payment.approvalUrl };
    const active = operation as Operation, binding = expected;
    try {
      const created = kind === "create-order" ? await sdkCreateOrder(this.env, binding.invoiceId, binding.amount, active.requestId, returnOrigin) : undefined;
      const observation = kind === "capture" ? await sdkCaptureOrder(this.env, orderId!, active.requestId, binding) : kind === "refresh" ? await sdkReadOrder(this.env, orderId!) : undefined;
      const analysis = observation ? reconcile(binding, observation, "paypal-sandbox", `sandbox-${orderId}`) : undefined;
      if (analysis && serializedBytes(analysis) > MAX_PAYMENT_ANALYSIS_BYTES) throw new ApiError(502, "PAYPAL_UNAVAILABLE", "Sandbox evidence exceeded the supported result size; the reserved failure record will be retained.");
      const completed = await this.change(id, capability, async stored => {
        if (stored.operations[action.milestoneId]?.attemptId !== active.attemptId) conflict("A newer observation superseded this result. Refresh the room.");
        stored.operations[action.milestoneId].pending = false;
        const item = stored.room.milestones.find(item => item.id === action.milestoneId)!;
        if (created) {
          item.payment = { status: "awaiting-approval", orderId: created.orderId, ...(created.approvalUrl ? { approvalUrl: created.approvalUrl } : {}) };
          await this.event(stored, "sandbox-order-created", "system", { version: stored.room.version, milestoneId: item.id, orderId: created.orderId, invoiceId: item.invoiceId, amount: item.amount, currency: "USD" });
        } else if (analysis) {
          item.payment.analysis = analysis;
          item.payment.status = analysis.outcome === "paid" ? "verified" : analysis.order.status === "APPROVED" || analysis.order.status === "CREATED" || analysis.order.status === "PAYER_ACTION_REQUIRED" ? "awaiting-approval" : "review";
          await this.event(stored, "sandbox-evidence-refreshed", "system", { version: stored.room.version, milestoneId: item.id, analysis });
        }
      });
      return { ...completed, ...(created?.approvalUrl ? { approvalUrl: created.approvalUrl } : {}) };
    } catch (error) {
      const approvalRequired = error instanceof ApiError && error.code === "APPROVAL_REQUIRED";
      return this.change(id, capability, async stored => {
        if (stored.operations[action.milestoneId]?.attemptId !== active.attemptId) conflict("A newer operation superseded this result. Refresh the room.");
        stored.operations[action.milestoneId].pending = false;
        const item = stored.room.milestones.find(item => item.id === action.milestoneId)!;
        item.payment.status = approvalRequired ? "awaiting-approval" : "error";
        item.payment.error = approvalRequired ? "Buyer approval is required in the PayPal sandbox before capture." : "Sandbox result is unavailable or uncertain. Refresh this existing order before retrying. No payment status is inferred.";
        delete item.payment.analysis;
        await this.event(stored, "sandbox-operation-unconfirmed", "system", { version: stored.room.version, milestoneId: item.id, kind, requestId: active.requestId, reason: approvalRequired ? "approval-required" : "unavailable-or-uncertain" });
      });
    }
  }
}
