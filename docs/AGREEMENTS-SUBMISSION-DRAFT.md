# SettleProof Agreements: candidate submission copy

17 October 2026. **Draft only; not ready to submit.** The reviewed implementation is deployed at https://settleproof.ajnasnb.com/ with https://settleproof.ajnasnb.workers.dev/ as fallback. Real AI drafting and mocked SDK/Worker tests exist. Genuine PayPal approval/capture, the final product rehearsal and the new public video remain pending. Replace this status only with observed evidence. No award, customer traction or winning probability is claimed.

## Pitch

A shared receipt connecting service milestones, human acceptance and PayPal payment evidence.

## Problem and audience

Independent buyers and service sellers coordinate work across messages, files and payment records. A payment status does not explain which agreed version or accepted handoff it covers. SettleProof Agreements brings those separate facts into one inspectable record, starting with short fixed-price digital-service engagements.

## Product

Either role can propose a new milestone version before checkout. Both roles must accept that exact version. The seller submits a delivery assertion; the buyer requests changes or explicitly accepts a submitted handoff. AI can propose clearer acceptance criteria and ambiguity questions, but a person reviews and adopts its draft. The server preserves the amounts the person entered.

An accepted milestone is then eligible for ordinary PayPal Sandbox Checkout. The server creates an order using stored terms. Buyer approval is distinct from the separate human capture action. The application reads the order and fresh capture details and applies deterministic invoice, currency and amount checks. A callback, timeout or AI statement cannot mark it paid.

The history joins agreement versions, human decisions and provider observations in a hash-linked JSON receipt. A participant can retain an earlier sequence/hash and check that later history still contains that prefix. Altering an event breaks verification. Rewriting and rehashing everything can still pass an internal check without an independent anchor. This is application integrity checking, not blockchain consensus, verified identity or immutable storage.

## Implementation

React and TypeScript provide separate buyer and seller experiences. Cloudflare Workers and a SQLite Durable Object own the shared state, capability hashes, version checks, operation reservations, retry identifiers and bounded history. Official PayPal Server SDK 2.5.0 performs Sandbox operations through a restricted fetch transport. The official `@paypal/paypal-js` loader supplies JavaScript SDK v6 approval, explicitly in Sandbox mode. Credentials remain on the server.

Cloudflare Workers AI uses `@cf/meta/llama-3.3-70b-instruct-fp8-fast` for editable criteria proposals and cited explanations of deterministic reconciliation. A shared atomic budget bounds inference attempts. There are no model tools that create, capture, refund or contact a buyer. AG Grid Community remains a separate working evidence desk for filtering, sorting, selecting and exporting reconciliation cases.

## Engineering challenges

The important boundaries are stale agreement versions, wrong-role actions, double clicks, uncertain provider responses and the difference between approval and capture. Terms lock once a checkout attempt is reserved. Retries retain the original request identifier and stop after the supported safety window. Receipt capacity is reserved before a provider operation so its outcome can be recorded without pruning history. The local offline mode discards credentials inside the storage object as well as the outer Worker.

## Evidence and honest limits

The current review record and test results are in `PRODUCT-17.md` and `VALIDATION.md`. Real AI proposals were observed on invented service briefs with USD12/USD8 preserved. The SDK/Worker concurrency and payment fixtures are mocked; they must not be presented as actual PayPal transactions. The old reconciliation-only video is not this product's final demo.

The prototype uses one controlled Sandbox merchant, invented data and capability links that prove possession rather than personal identity. It provides no escrow, custody, legal signature, quality certification, arbitration, chargeback prevention or final settlement guarantee. No customer interviews, adoption, revenue uplift or production readiness are asserted. A future agreement-receipt API for marketplaces and human-supervised agents is a hypothesis to validate.

## Provenance and final materials

New work began on 17 October 2026. Earlier context/evidence projects informed the problem selection; unrelated private source, customer records and assets were not copied. Project source is MIT; dependency notices retain their respective licenses.

Development assistance: OpenAI Codex and cooperating coding agents for concept review, implementation, documentation and tests. Runtime AI: Cloudflare Workers AI model named above. Planned video assembly: HyperFrames, with genuine application captures. Ajnas N B is the project owner. Record actual final tools and results accurately.

At the final endpoint attach the reviewed public source, runnable instructions or hosted build, and a public YouTube demo under three minutes showing genuine Sandbox functioning. Verify entrant eligibility and obtain the required action-time contract approval. Do not submit this unfinished draft or duplicate an earlier grant application.
