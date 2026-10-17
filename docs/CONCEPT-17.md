# SettleProof Agreements: concept decision and 17 critique–fix rounds

17 October 2026 · Design specification, not a claim of implemented features. No submission authorized by this document.

**Decision:** extend the tested SettleProof reconciliation engine into a shared milestone agreement room for independent service buyers and sellers. **Agree what done means. Pay what a person accepted. Keep a receipt you can verify.** PayPal moves the payment; SettleProof connects the agreement, human decisions and observed payment evidence. This is a product hypothesis, not a predicted valuation or winning probability.

## Three ideas compared

| Candidate | Useful wedge | Existing PayPal capability / weakness | Decision |
|---|---|---|---|
| Shared milestone agreement and evidence room | Small service engagements lose the connection between scope, approval and payment. One inspectable packet can connect them. | Checkout supplies payment, not our proposed bounded agreement workflow. We have a tested reconciliation core to reuse. Delivery quality and participant identity remain human matters. | **Build this.** Strongest feasible end-to-end demonstration. |
| Collective purchasing / group commitments | Friends or small groups coordinate a shared purchase. | PayPal already offers money pools. Separate contributions cannot truthfully be presented as an atomic all-or-nothing purchase; custody, payouts and refunds expand scope. | Reject for this entry. |
| Agent intent receipts | Record exactly what an agent was permitted to buy and compare the resulting payment. | PayPal already offers an Agent Toolkit and agentic commerce services. A generic payment chatbot is weak differentiation; robust delegated authorization adds substantial work. | Future API direction after proving human agreement receipts. |

P2P transfers themselves are already available through PayPal. Novelty must come from a specific workflow rather than claiming to invent P2P. [PayPal sending](https://www.paypal.com/us/cshelp/article/how-do-i-send-money-help293), [Pools](https://www.paypal.com/us/digital-wallet/send-receive-money/pool-money?locale.x=en_US), [Agent Toolkit](https://developer.paypal.com/community/blog/paypal-agentic-ai-toolkit/), [Agentic commerce](https://developer.paypal.com/agentic-commerce-services/about/).

## Sequential concept review

Each round carries the previous fix forward. These are **17 distinct written design reviews**, not invented customer interviews, product test passes or repeated model votes. The remaining-evidence column is a release obligation.

| Round | Criticism of the current concept | Substantive fix carried forward | Remaining evidence |
|---|---|---|---|
| 1 | “Reinvent P2P” duplicates PayPal and has no clear audience. | Select independent service engagements: a buyer paying one seller for a small design, development or tutoring deliverable. | Interview at least three people in that audience; no demand claim yet. |
| 2 | An invoice checker only helps after uncertainty has occurred. | Move upstream: one room connects a fixed agreement version, acceptance criteria, delivery claim, human decision and payment observation. Preserve the existing evidence inspector. | Demonstrate the complete lifecycle, not disconnected screens. |
| 3 | “Blockchain without blockchain” implies guarantees we cannot provide. | Use a hash-linked event packet with a standalone verifier. Explain its actual property: edits are detectable against a previously retained sequence-and-head-hash anchor. | Alter an exported event and show verification fail; show retained-head comparison. |
| 4 | Hashes cannot establish identity, truth, consensus or fairness. | Separate **claimed actor**, **access role**, **human assertion** and **PayPal observation**. Seller/buyer capability links prove link possession only. | Cross-role access tests; UI must state identity is not verified. |
| 5 | An “AI trust score” would disguise subjective judgement as fact. | AI drafts editable milestones and flags ambiguous acceptance criteria; it never scores people, certifies delivery or changes payment results. | Missing-criteria and adversarial-brief examples; invalid/unavailable AI states. |
| 6 | AI-generated scope can silently change the deal. | Show the source brief and proposed structured terms side by side. A person edits and explicitly freezes a numbered version before either participant accepts. | Editing after freeze creates a new version and invalidates prior acceptance. |
| 7 | A seller can mark their own work accepted. | Distinct buyer/seller links and permitted transitions: seller submits evidence reference; buyer accepts or requests changes. No acceptance inferred from silence. | Wrong-role, duplicate action, stale-version and replay tests. |
| 8 | “Release milestone funds” falsely suggests escrow or conditional custody. | Create a normal PayPal Checkout payment only after buyer acceptance. The buyer deliberately approves that payment. No pre-funded balance or automatic release. | Actual sandbox approval/capture; all copy says pay, not release escrow. |
| 9 | Authorizations or one giant order introduce expiry and partial-capture complexity. | Use one CAPTURE-intent order per accepted milestone, one currency and one seller per room. Server derives amount/invoice reference from frozen terms. | Client amount tampering rejected; second milestone has distinct order/reference. |
| 10 | A checkout success callback could be mistaken for payment evidence. | Reuse authoritative order plus fresh capture reads. Bind order to room/version/milestone; compare invoice reference, amount, currency and capture state. | Real captured case, cancellation, mismatch, unknown/provider failure. |
| 11 | Double clicks and retries could create duplicate payment attempts. | Reserve one payment attempt per milestone server-side; stable request IDs for create/capture; fetch existing state after uncertainty instead of blindly creating again. | Concurrent request/retry tests; PayPal sandbox request evidence. |
| 12 | A hash chain lets its operator rewrite the entire history. | Offer participants an export with the sequence and head hash at each meaningful decision. Verification distinguishes internally consistent history from consistency with a retained anchor. Do not claim immutable storage. | Rewrite-all example passes internal check but fails retained-anchor check. |
| 13 | Public rooms could leak briefs, contact details or keys. | Demo uses invented data only. Store capability-token hashes, bound inputs, redact provider payloads, exclude secrets from exports and AI, allow no arbitrary provider URL. | Negative authorization tests and exported-packet inspection. |
| 14 | AI prose can contradict the provider or invent evidence. | Keep deterministic status authoritative; validate cited evidence IDs and structured AI output. Label human assertions separately. Unavailable AI leaves payment facts usable. | Contradictory/unknown citations rejected; actual inference observed. |
| 15 | A technically clever room may be confusing on a phone. | Three clear stages: **Agreement → Delivery decision → Payment receipt**. Show next permitted action, separate role badges, visible sandbox labels and accessible error/recovery states. | Narrow/mobile, keyboard, empty, cancellation and slow-provider checks. |
| 16 | “Everyone will use it” is no business case. | Start with short fixed-price digital-service engagements. Test whether a clear agreement receipt reduces reconciliation time and repeated clarification. Future paid team workspaces/API are hypotheses. | Baseline vs product task time; willingness-to-pay interviews; no fabricated conversion numbers. |
| 17 | More features would hide an incomplete PayPal integration and weaken judging. | Freeze the MVP below. Keep synthetic walkthroughs and real sandbox runs separate. Finish 17 concrete product review rounds, then actual end-to-end video under three minutes; submit only at the final approval endpoint. | Acceptance checklist, real provider proof, source, final demo, eligibility and action-time contract approval. |

## Frozen MVP

**Persona and example:** a buyer commissions a small landing-page design from an independent seller. An invented USD120 engagement has two milestones: USD45 wireframe and USD75 final handoff. Neither figure is real revenue. The familiar partial-payment fixture remains a separate reconciliation example; it must not be relabelled as this new real transaction.

**User flow:**

1. Seller creates a sandbox agreement from an invented brief. AI proposes at most three milestones, observable criteria and open questions. A manual editor remains available.
2. Seller reviews amounts and criteria, freezes version 1, and receives a separate buyer invite. Both roles accept the exact version. Either role may propose revised terms before checkout; every revision requires a fresh version and fresh acceptances. Terms freeze after any checkout attempt.
3. Seller records a short delivery note/reference. Buyer explicitly accepts that milestone or asks for changes. Acceptance is a human assertion, not AI certification.
4. Buyer selects **Pay this milestone**. The backend reads its stored amount; PayPal SDK opens sandbox Checkout. The test buyer approves. The backend captures using the recorded order and idempotency identifier.
5. SettleProof refetches provider facts and displays “capture observed” only when the exact milestone reference, amount and currency match. Approval alone, pending, cancellation, timeout and unknown are visibly distinct.
6. Each side can inspect the chronological receipt and export its sanitized JSON/head hash. A verifier reports internal-chain integrity and, when supplied, equality with the event hash at the participant's earlier saved sequence. Changing a term demonstrates failure against that saved anchor.

**Required build boundary:** authenticated commercial onboarding is not being claimed. Capability links are access controls for a sandbox demonstration, not legal signatures or verified identities. A single controlled seller sandbox is sufficient; arbitrary real merchants are not onboarded. No public production payment endpoint.

**Non-goals:** escrow, lending, custody, pooling, token/coin, consensus, autonomous spending, automatic refunds/payouts, chargeback prevention, legal arbitration, fraud detection, proof of delivery quality, identity verification, immutable/public ledger, exchange-rate handling or guaranteed finality. Later refunds/reversals can change payment observations. No production readiness or customers claimed.

## Architecture and SDK plan

Reuse React/AG Grid, Worker reconciliation, sanitized AI evidence and the existing quota controller. Add one server-owned room state machine, isolated per room, with append-only application events. Store token hashes and minimal invented terms. Each canonical event includes schema version, sequence, previous hash, frozen-terms hash, actor role, event kind and bounded payload. SHA-256 over defined UTF-8 canonical encoding is an integrity tool; an administrator can still rewrite storage. Document/export schema and verifier must use the same encoding.

Add state transitions for draft, frozen, both-accepted, delivery-submitted, changes-requested/accepted, checkout-created, capture-observed/unknown. Enforce transitions on the server with version/revision checks and serialized writes. “Paid” is not a mutable checkbox. Event time is a server observation, not a trusted external timestamp. AI proposals stay drafts until a human accepts them.

Use PayPal's current **JavaScript SDK v6** for new Checkout integration. Use the current SDK client-ID initialization verified during implementation, with the sandbox environment, eligibility checks and payment-session callbacks. The public client ID is not a server OAuth bearer token or client secret. Test runtime compatibility before committing to a server-SDK package; direct documented Orders v2 REST calls in the Worker are a valid alternative. The app must genuinely use the browser SDK, not merely list it in the pitch. [SDK setup](https://developer.paypal.com/sdk/js/set-up/), [v6 upgrade guide](https://developer.paypal.com/upgrade/ec/guide/Web%20SDK%20v6/).

Server endpoints create/capture Orders v2 and fetch order/capture facts with credentials confined to the Worker. Supported idempotency calls use a stable `PayPal-Request-Id`; persist attempt state because provider retention is finite and simultaneous requests can still fail. A timeout yields “checking/unknown,” not a fabricated success or an immediate fresh payment. [Checkout quick start](https://developer.paypal.com/checkout/integrate), [Orders v2](https://developer.paypal.com/api/orders/v2/), [Idempotency](https://developer.paypal.com/api/rest/reference/idempotency/).

**Webhooks are optional stretch work**, not a prerequisite to the first honest demo. If added, subscribe the actual sandbox app, verify signatures and deduplicate events; a simulator event is not evidence of a real test transaction. Reconcile provider state after notification. [Webhook verification](https://developer.paypal.com/api/rest/webhooks/rest/).

## Business hypothesis and judging map

The initial claim is a testable workflow improvement: fewer disconnected messages and less time identifying which accepted deliverable a payment covers. Potential expansion is an agreement-receipt API for marketplaces and human-supervised agents, with merchant onboarding and stronger identity added only after validation. PayPal could gain completed, better-contextualized service payments; no volume, revenue uplift or valuation is assumed.

| Official criterion | Concrete evidence planned |
|---|---|
| Technological implementation | Real SDK Checkout, server-derived milestone amount, capture reconciliation, AI drafting/citation validation and export verification. |
| Design | One coherent buyer/seller journey, clear permissions, mobile/error recovery and receipt inspector. |
| Potential impact | Specific independent-service audience and a measured task-time experiment; interviews remain pending. |
| Innovation/idea | A versioned agreement–human decision–provider receipt link, rather than another transfer button or generic chatbot. No global novelty claim. |
| Presentation | Real sandbox end-to-end flow plus a mutation-detection example; visible limitations; under-three-minute final video. |

The rules require central PayPal sandbox plus AI, runnable access, public licensed source and a public YouTube demo. Criteria are equally weighted; scoring remains judges' discretion. A retained anchor must contain both sequence and headHash. After legitimate appends, compare that anchor to its exact prefix event, not to the latest head; later events do not invalidate an earlier retained prefix. Retain judge access through the judging period. Do not submit the older reconciliation video as evidence of new functionality. [Official hackathon rules](https://paypalaihackathon.devpost.com/rules).

**Release order:** concept freeze → implementation → 17 documented product critique/fix/verification rounds → final frame-by-frame storyboard and demonstrated video → final eligibility/terms review → user-approved submission. New defects reopen only the affected checks. A written review count is not a guarantee of security, novelty, profit or winning.
