# SettleProof Agreements — 17 independent product reviews

17 October 2026. Reviewer: quality_review. Reviewed the current local development build at http://localhost:8797, including the final verifier-input guard. These are **17 distinct review focuses, not 17 passed releases or 17 creative rewrites**. Fixes were requested when warranted; unchanged behavior was verified within the stated scope.

## Evidence boundary

The reviewer used CUA for UI interaction, created **one invented room**, kept separate buyer/seller capability links private, and made exactly **one authorized real AI drafting request**. The parent made a separate real API AI request. No PayPal creation, approval, capture, cancellation or financial action was performed by this reviewer. The reviewed local UI reports PayPal Sandbox **not configured**.

The parent reported the final typecheck, **74 npm tests**, **7 helper tests**, and production build passing. These are parent-run checks, not an independent rerun or actual provider proof. Worker/SQLite concurrency tests mock providers. Parent HTTP evidence in artifacts/agreement-offline-proof.json separately verifies the offline workflow with provider configuration disabled, including when fake credential sentinels were present at startup.

All UI data was invented. No raw role URL/capability is included in this record or screenshots. A packet observed in a rendered textarea is distinguished from inspecting the requested file download. Evidence paths below are relative to this repository. The v1 video remains historical and intact.

## Ordered review rounds

### 1. First-use journey — VERIFIED within local scope

**Exercise/result:** Read the three stages and limits, then created a two-milestone $12 + $8 room after the invented-data acknowledgement. USD, three-milestone/$200 limits, sandbox scope and separate human/provider evidence were visible. **Criticism/fix:** No further change needed: the next actor is understandable and the page does not claim escrow, verified identity or a legal contract. **Limit:** Room creation is not provider or production readiness.

### 2. AI proposal and human correction — VERIFIED; failure UI source-covered

**Exercise/result:** One real UI Draft criteria with AI request returned two milestones preserving $12/$8 and three questions. Working disabled relevant controls. The result said nothing was saved or accepted; Use proposed draft copied editable text into the editor. **Criticism:** Generic responsive-design criteria were not observable acceptance tests. **Fix/retest:** Manually changed criteria to named sections, desktop/mobile outputs and a handoff note; those terms persisted in the created room. **Evidence:** artifacts/screens/agreement-ai-draft.png; parent API proof artifacts/agreement-ai-proof.json. **Limit:** No extra calls/retries. Invalid/unavailable proposal UI was source-reviewed, not intentionally triggered. AI cannot consent or pay.

### 3. Validation and corrective feedback — FIXED AND RETESTED; bounded cases

**Exercise/result:** Zero, 12.345 and 201.00 initially blocked creation but lacked corrective explanations. **Fix:** Associated amount errors, aria-invalid/describedby and overall live draft-issue list. **Retest:** Over-precision and zero displayed specific reasons and disabled saving; restored $12/$8. Oversized amount initially blocked creation; its new copy was source-reviewed rather than independently retested. Server USD/decimal/total bounds have source and Worker-test evidence. **Limit:** Not an exhaustive browser matrix of every invalid field/currency.

### 4. Version ownership and stale consent — VERIFIED

**Exercise/result:** Seller consented to v1, proposed revised criteria as v2; buyer tried accepting from stale v1. Fresh terms reset both consents; old events remained. Stale acceptance failed with Terms changed / review current version. **Fix:** No extra change needed. **Retest:** v3 history retained prior proposal/consent events without a stale acceptance. **Evidence:** UI-observed receipt below. **Limit:** Hash linkage does not establish external immutability.

### 5. Dual consent and role separation — VERIFIED in exercised sequence

**Exercise/result:** Separate buyer/seller private views; single seller consent did not enable delivery. Buyer and seller both accepted exact v3; delivery unlocked and events 5/6 recorded each role. Seller had handoff controls; buyer had review controls. **Fix:** No additional change required. **Limit:** Both roles and two ordering contexts were exercised, not every duplicate/reload timing. Capability possession is not verified identity.

### 6. Invalid capability and wrong role — VERIFIED negatives; broader scope PARTIAL

**Exercise/result:** A one-character capability change could not open the room. Relabelling an unchanged buyer capability as seller produced an explicit role/token mismatch; no prior room data appeared as fallback. Restored original private link. **Source:** Random capabilities stored hashed; role binding, same-origin mutations and seven-day expiry. **Fix:** No new defect. **Limit:** Cross-room isolation, expiry/alarm execution and operational logs were not independently UI-tested. No claim of arbitrary revocation or security certification.

### 7. Buyer proposal and stale editor — FIXED AND RETESTED; payment freeze PARTIAL

**Criticism/fix:** Server allowed either party to propose but initial UI offered only seller. Both roles now have pre-checkout proposal controls and fresh dual-consent copy. Editor retains its opening version. **Retest:** Buyer created v3 while seller's editor was based on v2. Seller refreshed room then saved the old editor; server rejected it rather than overwriting v3. Both consents reset. **Source:** stored.frozen blocks terms after first payment attempt. **Limit:** Freeze during actual checkout/unknown capture awaits provider exercise.

### 8. Delivery, changes, resubmission and acceptance — FIXED AND RETESTED

**Exercise:** Seller submitted an intentionally incomplete handoff; buyer requested a labelled contact section. **Criticism/fixes:** Old handoff acceptance is no longer offered after a change request. Buyer feedback, initially hidden in event JSON, is now visible near the handoff with version/time and assertion wording. **Retest:** Buyer saw waiting/no acceptance until resubmission; seller saw exact feedback without opening event details. Revised m1 acceptance became event 10. Submitted/accepted m2 as events 11/12. **Evidence:** artifacts/screens/agreement-changes-requested.png and agreement-accepted-payment-pending.jpg. **Limit:** Invented assertions, not attached designs or certified quality.

### 9. Payment gate and copy — VERIFIED configured-off; enabled gate PARTIAL

**Exercise/result:** Inspected before both consents, before delivery acceptance and after both milestone acceptances. Human acceptance remained distinct from payment; buyer saw Checkout is unavailable until PayPal Sandbox is configured. Approval and capture are described separately; SettleProof holds no money. **Source:** Server requires buyer, current version, both consents and accepted milestone. **Fix:** No additional copy change needed. **Limit:** No enabled checkout action was exercised.

### 10. Genuine SDK order creation — BLOCKED for actual provider proof

**Source critique:** Inspected SDK transport/router/store: stored terms derive amount/USD/invoice, sandbox-only bounded transport, secrets server-side. **Finding/fix:** Approval URL validation was tightened to exact HTTPS sandbox origin, /checkoutnow, no port/userinfo/fragment and matching stored order token; frontend aligned. **Retest evidence:** Source and parent automated checks. **Required:** Configured app, actual SDK browser loading, server-created order and sanitized provider observation. No genuine order ID exists in this review. Sign-in/SDK compilation is insufficient.

### 11. Actual approval, capture and cancellation — BLOCKED for actual provider proof

**Source review:** Browser SDK uses commit:false; callback refreshes existing order and exposes separate capture. Cancel says no capture requested. Server validates order/capture binding before reconciliation. **Fix:** Explicit approval/capture separation is implemented. **Actual outcome:** No SDK approval, capture, cancellation or PayPal read performed here. **Required:** Genuine approved/captured milestone plus separate cancel/return path with matching sanitized provider facts; fixtures cannot substitute.

### 12. Retry, concurrency and history capacity — SOURCE/TEST VERIFIED; provider PARTIAL

**Source review:** Pending reservation before provider I/O, persistent request IDs, attempt-ID checks, CAS/transaction history writes, five-hour original retry deadline and existing-order reuse guard duplication/stale results. Unknown errors do not mark paid. **Finding/fix:** Root found repeated analyses could exhaust exports. Limits now bound receipt 384 KiB, stored room 640 KiB and analysis 48 KiB; pending headroom blocks new provider work before I/O without dropping/re-writing history. **Retest evidence:** SDK agent's actual Worker/SQLite near-cap Unicode-history test, included in parent's 74-test run. **Limit:** No independent rerun or actual provider interruption/idempotency/two-tab capture proof.

### 13. Evidence desk regression — VERIFIED selected fixtures

**Exercise/result:** Used visible Evidence desk link to /evidence; selected Unavailable is not unpaid, then Captured in full. Unavailable retained Unknown net/outcome and said a failed read is not non-payment. Matched fixture showed $120 observed versus $120 expected; synthetic labels stayed visible. Returned to private room. **Fix:** No regression found. **Limit:** No new AI/provider call; other mismatch/refund cases remain source/automated coverage, not a fresh exhaustive UI run.

### 14. Receipt integrity, retained prefix and stale results — FIXED AND RETESTED

**Exercise/result:** Export response populated the visible textarea. Inspected its real eight-event JSON, not downloaded-file contents. Valid packet plus independently retained event-1 anchor passed after appends. An altered term without rehash failed. A scratch fully rewritten/rehashed packet passed internal consistency without anchor, but failed original retained anchor. Server history was untouched. **Criticisms/fixes:** Old 250,000-character textarea could truncate valid formatted exports; now bounded raw input rejects excess explicitly and compacts/bounds actual 512 KiB UTF-8 request. Input edits clear badges; exact input snapshot guards late responses. **Current retest:** Valid prefix passed; editing hash removed old pass; restoration/reverification passed. **Evidence:** artifacts/screens/agreement-receipt-ui-observed.json, agreement-prefix-verified.png, agreement-tamper-rejected.png, agreement-rewrite-anchor-rejected.png, agreement-current-prefix-verified.jpg. **Limit:** Large ASCII/multibyte cases passed three helper tests reported by frontend/parent; no huge browser paste/timed response race claimed. Reorder/delete cases were not each browser-tested. Old valid export does not prove latest completeness.

### 15. Hostile text and exported privacy — VERIFIED observed cases; broader security PARTIAL

**Exercise/result:** Submitted literal <b>only-text</b> marker. Read-only DOM inspection confirmed literal text and no b child element. Actual UI packet had no credential-like keys. Creation invite panel was dismissed before screenshot capture; raw capability URLs stayed private. **Source:** Bounded allowlisted inputs and sanitized provider/AI facts; packet schema excludes capabilities. **Fix:** No new injection defect found. **Limit:** Not exhaustive XSS, prompt-injection, operational-log or penetration testing. No real private customer brief used.

### 16. Keyboard and narrow screens — FIXED AND RETESTED; scoped accessibility

**Finding/reproduction:** Skip link overwrote capability URL fragment and lost room access. **Fix/retest:** preventDefault plus main focus/scroll. First Tab then Enter retained exact private URL/room and focused main. **Responsive:** 390x844 and 320x844 DOM metrics showed no horizontal overflow; inspected actual narrow captures for readable criteria/amounts/controls. Viewport override reset. **Evidence:** artifacts/screens/agreement-keyboard-room.png, agreement-responsive-390.jpg, agreement-responsive-320.jpg. **Limit:** No formal screen-reader/contrast/200%-zoom/SDK-return audit. agreement-mobile-390.png was a desktop-native capture despite emulation and is NOT mobile evidence.

### 17. Reproducibility and final rehearsal — LOCAL journey VERIFIED; release BLOCKED

**Exercise/result:** One fresh invented room progressed through proposals, both roles/consents, changes/resubmission, both milestone acceptances and retained-prefix verification; twelve real human-workflow events. Payments remained unavailable. **Finding/fix:** Root found the documented offline runner lacked new room routes; added local-only bindings and an offline subclass discarding provider secrets. **Retest evidence:** Parent actual HTTP offline proof created/consented/delivered/accepted a room, exported a valid five-event packet and rejected order creation with PAYPAL_NOT_CONFIGURED despite injected fake sentinels. **Limit:** Reviewer did not independently replay that HTTP run. Fresh two-order genuine SDK/provider rehearsal, public updated deployment, final docs, new video/playback and final submission remain required. V1 MP4 must not represent this new workflow.

## Current decision

The bounded local human workflow supports an **honestly labelled review build**. No newly observed critical source bypass remains awaiting a fix in this review. It is **not ready for a final payment demonstration or submission**: real provider portions of 10/11/17 are pending. Authentication/app-setup approval is not proof of payment integration.

All 17 focuses received actual interaction, artifact inspection or explicitly labelled source review. They deliberately have different outcomes. Do not turn source checks, helper tests or pending provider checks into 17 passes or a winning probability. Next: genuine bounded sandbox rehearsal, then truthful updated video and final submission checks. No new video or public/account action was performed by this reviewer; preserve artifacts/video/settleproof-review.mp4 as historical v1.
