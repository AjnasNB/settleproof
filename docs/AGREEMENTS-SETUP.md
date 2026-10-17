# Run SettleProof Agreements

This is a sandbox demonstration of a service agreement, human review and payment evidence. It is not escrow, identity verification, a legal-signature service or a production marketplace.

## Local review with no provider access

```sh
npm ci
npm run check
npm test
node --test scripts/paypal-sandbox.test.mjs
npm run build
npm run dev:offline
```

Open `http://localhost:8798/`. The agreement editor, separate role links, consent, delivery decisions, receipt export and verification run against local SQLite Durable Object storage. The original synthetic reconciliation desk remains at `/evidence`.

Offline mode has no remote provider binding. Both the outer Worker and the offline object's constructor discard provider credentials. Existing `.dev.vars` values cannot enable PayPal or AI. An attempted checkout returns `PAYPAL_NOT_CONFIGURED` before reserving a payment attempt. Actual HTTP checks with deliberately invalid credential sentinels are recorded in `artifacts/agreement-offline-proof.json`.

## Normal sandbox integration

Use `npm run dev` and open `http://localhost:8797/`. A dedicated PayPal **Sandbox merchant** application is needed for real test payments. Never reuse a production app or put a secret in frontend code, a URL, the repository, screenshots, a video or chat.

Create an ignored local `.dev.vars` file from the example and supply the dedicated test application's `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`. The server SDK explicitly selects `Environment.Sandbox`; its transport also enforces sandbox OAuth, Orders and capture-read endpoints. The browser loader explicitly uses the sandbox v6 script. Only the documented public client ID is returned to the browser; the secret and server OAuth bearer remain server-side.

For a hosted Worker, supply secrets through Wrangler's interactive `secret put` flow or an approved private bulk file. Do not paste secret values into command arguments. Never print them. This repository contains neither credentials nor a claim that merely signing into PayPal completes the integration.

1. Create a room using invented project details. The default test has two milestones: USD12 and USD8. Creating version 1 freezes those terms for review; it does not accept them for either role.
2. Save both role links privately. They are issued together only in that creation session. Links contain capabilities in the URL fragment, which the app sends to its API in a role-capability header. Link possession permits that role's actions; it does not identify a real person. There is no account recovery or identity claim.
3. Open seller and buyer views separately. Either role can propose revised terms before checkout. Every new version requires fresh acceptance from both roles. A stale editor cannot overwrite a later version.
4. Have the seller submit an invented delivery note. The buyer may request changes or explicitly accept a submitted handoff. After changes are requested, the seller must submit again before acceptance.
5. From the buyer view, open PayPal Sandbox approval. The server derives the order amount and invoice reference from stored accepted terms. The SDK callback only refreshes the existing order. Approval alone does not mark a milestone paid.
6. Use the separate human capture action for an approved test order. The server rechecks the order binding before capture and reads the order plus fresh capture details afterward. Only matching deterministic evidence can produce a verified capture state. No model executes this action.
7. Export the receipt and independently retain its sequence and head hash. After later legitimate events, verify the earlier anchor against that prefix. Editing an event fails verification. Rewriting and rehashing the entire history can pass an internal check, but fails comparison with an independently retained earlier anchor. Hashes do not prove identity, delivery quality, operator honesty or final settlement.

If an order/capture response is uncertain, refresh the **existing** order. Stable request IDs and stored reservations protect retries within a bounded window. The app blocks an uncertain write retry after five hours; it does not blindly create a replacement. Terms and delivery cannot change after checkout has begun. A separate room is required for new terms.

## AI drafting

AI is optional. The manual editor always remains available. Normal mode needs the Workers AI binding, configured rate limiters, the durable budget and explicit `AI_ENABLED=true`. All explanation and drafting calls share the same maximum of 20 reserved attempts per UTC day in that deployed budget namespace. Failures consume an attempt. Local and deployed namespaces have separate counters; this is not an account-wide spending cap.

`POST /api/agreement-draft` accepts an invented brief and one to three fixed USD amounts. The model returns only milestone titles, criteria and ambiguity questions. Server validation rejects unsupported output and restores the original amounts by index. A person must explicitly adopt, edit and review the proposal before creating terms. It cannot accept an agreement, alter payment facts or call financial tools. Drafting requests ask for at most 700 output tokens; the existing evidence explanation requests at most 450. There is one inference call and no automatic retry per request.

## Demo bounds and evidence

The public prototype allows at most five new rooms per UTC day globally, at most three milestones and USD200 total per room, seven days of room access and at most 140 receipt events. It retains at most 100 rooms. Exported receipts are capped at 384 KiB, verification requests at 512 KiB and stored rooms at 640 KiB. Pending provider operations reserve space for their result or failure before network calls. Existing receipt events are never pruned to make a payment fit.

The current concept is documented in `CONCEPT-17.md`. Actual product review outcomes belong in `PRODUCT-17.md`; a planned test is not a pass. `PAYPAL-SDK-FEASIBILITY.md` distinguishes source evidence, mocked SDK/Worker tests and genuine provider verification. The earlier `artifacts/video/settleproof-review.mp4` demonstrates the original reconciliation build and must not be used as proof of this new Agreements journey.
