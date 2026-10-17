import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { Miniflare } from "miniflare";
import type { AgreementCreateResponse, AgreementResponse, ReceiptPacket } from "../src/agreements/types";
import type { StoreCommand, StoreReply } from "../src/agreements/store";
import { verifyReceipt } from "../src/agreements/receipt";
import { MAX_RECEIPT_PACKET_BYTES, MAX_VERIFY_REQUEST_BYTES, PENDING_RECEIPT_HEADROOM_BYTES, serializedBytes } from "../src/agreements/limits";

test("real Worker SQLite room store preserves consent, role checks, checkout reservations, SDK evidence and global quota", { timeout: 30000 }, async () => {
  const bundle = await build({ entryPoints: ["src/agreements/store.ts"], bundle: true, write: false, format: "esm", platform: "browser", external: ["cloudflare:workers"], logLevel: "silent" });
  // Test-only provider transport: all PayPal calls stay in this isolate and use fictitious values.
  const script = `
    const orders = new Map(); let capturePosts = 0; let failNext = false; let now = '2026-10-17T12:00:00Z';
    const RealDate = Date; globalThis.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return new RealDate(now).getTime(); } };
    globalThis.fetch = async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.origin !== 'https://api-m.sandbox.paypal.com') throw new Error('Unexpected test network target');
      const json = (value, status = 200) => Response.json(value, {status});
      if (failNext) { failNext=false; return json({name:'UNPROCESSABLE_ENTITY',message:'PRIVATE-SERVER-SECRET customer@example.invalid',debug_id:'90957fca61718',details:[{issue:'MISSING_REQUIRED_PARAMETER',description:'PRIVATE-SERVER-SECRET',value:'customer@example.invalid'}]},422); }
      if (url.pathname === '/v1/oauth2/token') return json({access_token:'SYNTHETIC-TOKEN',token_type:'Bearer',expires_in:300});
      if (url.pathname === '/v2/checkout/orders' && init.method === 'POST') {
        const body = JSON.parse(init.body); const id = 'ORDERTEST' + String(orders.size + 1).padStart(8, '0');
        const order = {id,status:'CREATED',purchase_units:body.purchase_units,links:[{rel:'payer-action',href:'https://www.sandbox.paypal.com/checkoutnow?token=' + id}]};
        orders.set(id,order); return json(order,201);
      }
      if (url.pathname.startsWith('/v2/payments/captures/')) {
        const order = [...orders.values()].find(item => item.status === 'COMPLETED');
        return json({id:url.pathname.split('/').at(-1),status:'COMPLETED',invoice_id:order.purchase_units[0].invoice_id,amount:order.purchase_units[0].amount,supplementary_data:{related_ids:{order_id:order.id}}});
      }
      const parts = url.pathname.split('/'); const order = orders.get(parts[4]);
      if (!order) return json({message:'not found'},404);
      if (parts[5] === 'capture' && init.method === 'POST') {
        capturePosts++; await new Promise(resolve => setTimeout(resolve,30));
        order.status = 'COMPLETED'; order.purchase_units[0].payments = {captures:[{id:'CAPTURETEST000001',status:'COMPLETED',amount:order.purchase_units[0].amount}]};
      }
      return json(order);
    };
    ${bundle.outputFiles[0].text}
    export default { async fetch(request,env) {
      const input = await request.json();
      if (input.test === 'approve') { for (const order of orders.values()) order.status='APPROVED'; return Response.json({ok:true}); }
      if (input.test === 'clock') { now=input.now; return Response.json({ok:true}); }
      if (input.test === 'fail-next') { failNext=true; return Response.json({ok:true}); }
      if (input.test === 'counts') return Response.json({capturePosts,createPosts:orders.size});
      return Response.json(await env.AGREEMENTS.getByName('global-bounded-agreements-v1').dispatch(input));
    } };
  `;
  const config = {
    name: "agreements-test", compatibilityDate: "2026-10-17", compatibilityFlags: ["nodejs_compat"],
    manifest: { mainModule: "index.js", modules: { "index.js": { type: "esm" as const, contents: script } } },
    env: {
      PAYPAL_CLIENT_ID: { type: "json" as const, value: "SYNTHETIC-CLIENT" }, PAYPAL_CLIENT_SECRET: { type: "json" as const, value: "SYNTHETIC-SECRET" },
      AGREEMENTS: { type: "durable-object" as const, worker: "agreements-test", exportName: "AgreementStore" },
    },
    exports: { AgreementStore: { type: "durable-object" as const, storage: "sqlite" as const }, default: { type: "worker" as const } },
  };
  const mf = new Miniflare({ cf: false, workers: [{ config }] });
  const send = async (value: unknown) => (await (await mf.dispatchFetch("https://agreements.test/", { method: "POST", body: JSON.stringify(value) })).json()) as StoreReply;
  const success = <T>(reply: StoreReply): T => { assert.equal(reply.ok, true, JSON.stringify(reply)); return (reply as { ok: true; value: T }).value; };
  const terms = { title: "Sandbox milestone example", description: "Two fictitious design deliverables", milestones: [{ title: "Concept", amount: "12.00", acceptance: "Three concepts" }, { title: "Artwork", amount: "8.00", acceptance: "Final SVG" }] };
  try {
    const created = success<AgreementCreateResponse>(await send({ operation: "create", value: terms }));
    assert.match(created.buyerCapability, /^[A-Za-z0-9_-]{43}$/); assert.notEqual(created.buyerCapability, created.sellerCapability);
    const call = (capability: string, value: unknown) => send({ operation: "action", id: created.room.id, capability, value, returnOrigin: "https://agreements.test" } satisfies StoreCommand);
    const buyer = created.buyerCapability, seller = created.sellerCapability;
    const unauthorized = await send({ operation: "read", id: created.room.id, capability: "x".repeat(43) }); assert.equal(unauthorized.ok, false);
    const role = success<AgreementResponse>(await send({ operation: "read", id: created.room.id, capability: buyer })); assert.equal(role.role, "buyer");
    assert.equal(JSON.stringify(role).includes(buyer), false); assert.equal(JSON.stringify(role).includes("capabilityHashes"), false);
    const wrongRole = await call(buyer, { type: "deliver", version: 1, milestoneId: "m1", note: "fake" }); assert.equal(wrongRole.ok, false);
    await Promise.all([call(buyer, { type: "consent", version: 1 }), call(seller, { type: "consent", version: 1 })]).then(replies => replies.forEach(reply => success(reply)));
    const both = success<AgreementResponse>(await send({ operation: "read", id: created.room.id, capability: buyer })); assert.deepEqual(both.room.consent, { buyer: 1, seller: 1 });
    const beforeDelivery = await call(buyer, { type: "create-order", version: 1, milestoneId: "m1" }); assert.equal(beforeDelivery.ok, false);
    success(await call(seller, { type: "deliver", version: 1, milestoneId: "m1", note: "Synthetic artifact submitted for testing" }));
    success(await call(buyer, { type: "request-changes", version: 1, milestoneId: "m1", note: "Please provide SVG" }));
    const premature = await call(buyer, { type: "accept", version: 1, milestoneId: "m1" }); assert.equal(premature.ok, false);
    success(await call(seller, { type: "deliver", version: 1, milestoneId: "m1", note: "Synthetic revised artifact" }));
    const accepted = success<AgreementResponse>(await call(buyer, { type: "accept", version: 1, milestoneId: "m1" }));
    const earlier = { ...accepted.room.head };
    const checkout = success<AgreementResponse>(await call(buyer, { type: "create-order", version: 1, milestoneId: "m1" })); assert.equal(checkout.room.milestones[0].payment.status, "awaiting-approval");
    const revise = await call(buyer, { type: "propose", version: 1, terms: { ...terms, title: "Tampered later terms" } }); assert.equal(revise.ok, false);
    const denied = await call(seller, { type: "capture", version: 1, milestoneId: "m1" }); assert.equal(denied.ok, false);
    const notApproved = success<AgreementResponse>(await call(buyer, { type: "capture", version: 1, milestoneId: "m1" })); assert.equal(notApproved.room.milestones[0].payment.status, "awaiting-approval");
    await send({ test: "approve" });
    const captureReplies = await Promise.all([call(buyer, { type: "capture", version: 1, milestoneId: "m1" }), call(buyer, { type: "capture", version: 1, milestoneId: "m1" })]);
    assert.equal(captureReplies.filter(reply => reply.ok).length, 1);
    const final = success<AgreementResponse>(captureReplies.find(reply => reply.ok)!); assert.equal(final.room.milestones[0].payment.status, "verified"); assert.equal(final.room.milestones[0].payment.analysis?.totals.net, "12.00");
    success(await call(buyer, { type: "capture", version: 1, milestoneId: "m1" }));
    const counts = await (await mf.dispatchFetch("https://agreements.test/", { method: "POST", body: JSON.stringify({ test: "counts" }) })).json() as { capturePosts: number }; assert.equal(counts.capturePosts, 1);
    const packet = success<ReceiptPacket>(await send({ operation: "export", id: created.room.id, capability: buyer })); assert.equal((await verifyReceipt(packet, earlier)).valid, true);
    success(await call(seller, { type: "deliver", version: 1, milestoneId: "m2", note: "Synthetic second milestone" }));
    success(await call(buyer, { type: "accept", version: 1, milestoneId: "m2" }));
    await send({ test: "fail-next" });
    const uncertain = success<AgreementResponse>(await call(buyer, { type: "create-order", version: 1, milestoneId: "m2" }));
    assert.equal(uncertain.room.milestones[1].payment.status, "error");
    assert.equal(uncertain.room.milestones[1].payment.orderId, undefined);
    const failure = uncertain.room.events.at(-1)!;
    assert.equal(failure.type, "sandbox-operation-unconfirmed"); assert.equal(failure.data.stage, "create"); assert.equal(failure.data.code, "PAYPAL_UNAVAILABLE");
    const safeDiagnostics = failure.data.diagnostics as { httpStatus?: number; providerName?: string; issues?: string[] }[];
    assert.ok(safeDiagnostics.length >= 1 && safeDiagnostics.length <= 4);
    assert.ok(safeDiagnostics.some(value => value.httpStatus === 422 && value.providerName === "UNPROCESSABLE_ENTITY" && value.issues?.[0] === "MISSING_REQUIRED_PARAMETER"));
    assert.equal(JSON.stringify(failure).includes("PRIVATE-SERVER-SECRET"), false); assert.equal(JSON.stringify(failure).includes("customer@"), false);
    success(await call(buyer, { type: "create-order", version: 1, milestoneId: "m2" }));
    const afterRetry = success<AgreementResponse>(await send({ operation: "read", id: created.room.id, capability: buyer }));
    const retryReservation = [...afterRetry.room.events].reverse().find(event => event.type === "sandbox-operation-reserved" && event.data.milestoneId === "m2");
    assert.equal(retryReservation?.data.requestId, failure.data.requestId, "Failure telemetry must preserve the existing write idempotency identity.");
    success(await call(buyer, { type: "capture", version: 1, milestoneId: "m2" }));
    await send({ test: "clock", now: "2026-10-17T17:01:00Z" });
    await send({ test: "approve" });
    success(await call(buyer, { type: "refresh", version: 1, milestoneId: "m2" }));
    const tooOld = await call(buyer, { type: "capture", version: 1, milestoneId: "m2" });
    assert.equal(tooOld.ok, false); assert.match(!tooOld.ok ? tooOld.error.message : "", /too old/);
    // Fill a second real room through legitimate, bounded seller delivery assertions.
    // This reaches the byte boundary before the independent 140-event boundary.
    const full = success<AgreementCreateResponse>(await send({ operation: "create", value: terms }));
    const fullAction = (capability: string, value: unknown) => send({ operation: "action", id: full.room.id, capability, value, returnOrigin: "https://agreements.test" });
    success(await fullAction(full.buyerCapability, { type: "consent", version: 1 }));
    success(await fullAction(full.sellerCapability, { type: "consent", version: 1 }));
    let growing = full.room;
    const asPacket = (room: typeof growing): ReceiptPacket => ({ format: "settleproof-receipt-v1", room: { id: room.id, title: room.title, version: room.version, currency: "USD", expiresAt: room.expiresAt }, anchor: room.head, events: room.events });
    while (serializedBytes(asPacket(growing)) < MAX_RECEIPT_PACKET_BYTES - PENDING_RECEIPT_HEADROOM_BYTES + 2048) {
      growing = success<AgreementResponse>(await fullAction(full.sellerCapability, { type: "deliver", version: 1, milestoneId: "m1", note: "界".repeat(1000) })).room;
      assert.ok(growing.events.length < 130, "Test must exercise bytes, not the event limit.");
    }
    success(await fullAction(full.buyerCapability, { type: "accept", version: 1, milestoneId: "m1" }));
    const providerCounts = async () => (await (await mf.dispatchFetch("https://agreements.test/", { method: "POST", body: JSON.stringify({ test: "counts" }) })).json()) as { createPosts: number; capturePosts: number };
    const beforeCapacity = await providerCounts();
    const fullCheckout = await fullAction(full.buyerCapability, { type: "create-order", version: 1, milestoneId: "m1" });
    assert.equal(fullCheckout.ok, false); assert.equal(!fullCheckout.ok && fullCheckout.error.code, "RECEIPT_CAPACITY");
    assert.deepEqual(await providerCounts(), beforeCapacity, "Capacity rejection must happen before any provider write.");
    const retained = success<ReceiptPacket>(await send({ operation: "export", id: full.room.id, capability: full.buyerCapability }));
    assert.equal((await verifyReceipt(retained, full.room.head)).valid, true);
    assert.ok(serializedBytes(retained) <= MAX_RECEIPT_PACKET_BYTES);
    assert.ok(serializedBytes({ packet: retained, retainedAnchor: full.room.head }) < MAX_VERIFY_REQUEST_BYTES);
    assert.equal(retained.events.length, growing.events.length + 1, "No prior event was removed to make space.");
    const quota = await Promise.all(Array.from({ length: 10 }, () => send({ operation: "create", value: terms })));
    assert.equal(quota.filter(reply => reply.ok).length, 3); assert.equal(quota.filter(reply => !reply.ok && reply.error.code === "ROOM_LIMIT").length, 7);
    await send({ test: "clock", now: "2026-10-25T00:00:00Z" });
    const expired = await send({ operation: "read", id: created.room.id, capability: buyer }); assert.equal(expired.ok, false); assert.equal(!expired.ok && expired.error.code, "EXPIRED");
    success(await send({ operation: "create", value: terms }));
  } finally { await mf.dispose(); }
});
