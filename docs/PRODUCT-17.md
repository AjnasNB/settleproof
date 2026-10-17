# SettleProof Agreements — 17 independent product reviews

17 October 2026. Initial local UI reviewer: quality_review, at http://localhost:8797. Later hosted Sandbox rehearsal: parent agent. Runtime transport fix and read-only receipt verification: SDK agent. These are **17 distinct review focuses, not 17 passed releases or 17 creative rewrites**. The outcomes below retain the original local review and identify the new evidence separately.

## Evidence boundary

The initial reviewer used CUA for UI interaction, created **one invented room**, kept separate buyer/seller capability links private, and made exactly **one authorized real AI drafting request**. The parent made a separate real API AI request. That local review used PayPal Sandbox **not configured** and performed no financial actions. Its limitations remain historical evidence, not the current hosted payment result.

After the transport fix in commit `83a7bbd`, the SDK agent ran the typecheck, **93 npm tests**, and production build successfully. The original **7 helper tests** were reported passing earlier; they were not rerun for this documentation update. Worker/SQLite concurrency tests use synthetic providers. Parent HTTP evidence in artifacts/agreement-offline-proof.json separately verifies the offline workflow with provider configuration disabled, including fake credential sentinels at startup.

The parent subsequently performed a genuine hosted Sandbox rehearsal after deployment `e1e21a37…`. The same persisted create request produced order `4DS89752FA229423E` for USD 12.00. A closed v6 popup requested no capture. Fresh reads then recorded `PAYER_ACTION_REQUIRED` with net 0.00, and `APPROVED` with net 0.00 after approval through the stored Sandbox checkout link. An explicit human capture produced capture `8KC15056HN484411T`; fresh SDK reads recorded `COMPLETED`, net 12.00 and remaining 0.00. Milestone 2 remained pending for USD 8.00. This is Sandbox evidence, not real revenue or production certification.

Read-only independent checks of the saved 21-, 23-, and 25-event packets verified each against the separately retained event-5 prefix. The altered copy failed verification. All five create reservations retained the same request ID. These checks establish consistency of the saved receipt; the provider/browser observations are attributed to the parent, not a second independent payment run.

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

### 9. Payment gate and copy — VERIFIED locally and on the exercised hosted path

**Initial exercise:** Inspected before both consents, before delivery acceptance and after both milestone acceptances with configuration disabled. **Hosted result:** The parent used the accepted USD 12.00 milestone; approval alone retained unpaid/net 0.00 and capture required a separate human action. Milestone 2 was not paid. **Source:** Server requires buyer, current version, both consents and accepted milestone. **Fix:** No extra copy change needed. **Limit:** This does not constitute a fresh hosted browser exercise of every rejected gate or role. SettleProof holds no money.

### 10. Genuine SDK order creation — FIXED AND VERIFIED in Sandbox

**Criticism/fixes:** Approval links were restricted to exact HTTPS Sandbox origin and `/checkoutnow`, matching stored order token and no nonstandard port, userinfo or fragment. Initialization now reports its phase with a bounded timeout. Safe diagnostics isolated an OAuth transport failure before any HTTP response: a real local Worker rejected `redirect: 'error'` during Request construction. Commit `83a7bbd` changed both payment adapters to manual mode with redirect rejection. **Retest:** Real Worker synthetic tests construct actual requests; after deployment, the parent reused the persisted request and the official Server SDK created order `4DS89752FA229423E`, bound to the accepted USD 12.00 terms. **Limit:** One genuine order is demonstrated; other merchants, currencies and production are not.

### 11. Actual approval, capture and cancellation — VERIFIED on the documented Sandbox route

**Actual outcome:** The v6 SDK popup was closed and the UI reported cancellation/no capture. A fresh SDK read of the existing order remained `PAYER_ACTION_REQUIRED`, unpaid/net 0.00. The parent explicitly opened its validated stored Sandbox approval link in the normal browser and approved the same order. Another fresh SDK read returned `APPROVED`, still unpaid/net 0.00. Only the separate capture button initiated capture; fresh order/capture reads returned `COMPLETED` and net 12.00. **Evidence:** artifacts/agreements-video/pre-approval-receipt.json (21 events), approved-receipt.json (23), final-receipt.json (25), and the corresponding captured screens. **Limit:** A successful v6 `onApprove` callback was not demonstrated; the verified approval route is the stored checkout link. Closing a popup is not cancellation or voiding of the PayPal order. No production or actual refund run is claimed.

### 12. Retry, concurrency and history capacity — TEST VERIFIED; actual retry evidence bounded

**Source review:** Reservation before provider I/O, persistent request IDs, attempt-ID checks, CAS/transaction history writes, five-hour original retry deadline and existing-order reuse guard duplication/stale results. Unknown errors do not mark paid. **Finding/fix:** Repeated analyses could exhaust exports. Receipt 384 KiB, room 640 KiB and analysis 48 KiB limits now reserve capacity before provider I/O without dropping history. **Retest:** The real Worker/SQLite near-cap test and synthetic concurrent-capture check passed in the 93-test run. Saved actual receipts retain one request ID through five create reservations and one observed created order after earlier transport failures. **Limit:** This does not prove provider deduplication after an accepted POST with a lost response. Actual two-tab capture, a real interrupted capture and retry beyond the lease were not exercised against PayPal.

### 13. Evidence desk regression — VERIFIED selected fixtures

**Exercise/result:** Used visible Evidence desk link to /evidence; selected Unavailable is not unpaid, then Captured in full. Unavailable retained Unknown net/outcome and said a failed read is not non-payment. Matched fixture showed $120 observed versus $120 expected; synthetic labels stayed visible. Returned to private room. **Fix:** No regression found. **Limit:** No new AI/provider call; other mismatch/refund cases remain source/automated coverage, not a fresh exhaustive UI run.

**Later runtime fix:** Its REST adapter had the same unsupported redirect setting and was corrected in `83a7bbd`. A real Worker test constructs its OAuth/order requests with synthetic responses, and redirect rejection tests pass. No additional credentialed Evidence desk run is claimed by this SDK review.

### 14. Receipt integrity, retained prefix and stale results — FIXED AND RETESTED

**Exercise/result:** Export response populated the visible textarea. Inspected its real eight-event JSON, not downloaded-file contents. Valid packet plus independently retained event-1 anchor passed after appends. An altered term without rehash failed. A scratch fully rewritten/rehashed packet passed internal consistency without anchor, but failed original retained anchor. Server history was untouched. **Criticisms/fixes:** Old 250,000-character textarea could truncate valid formatted exports; now bounded raw input rejects excess explicitly and compacts/bounds actual 512 KiB UTF-8 request. Input edits clear badges; exact input snapshot guards late responses. **Current retest:** Valid prefix passed; editing hash removed old pass; restoration/reverification passed. **Evidence:** artifacts/screens/agreement-receipt-ui-observed.json, agreement-prefix-verified.png, agreement-tamper-rejected.png, agreement-rewrite-anchor-rejected.png, agreement-current-prefix-verified.jpg. **Limit:** Large ASCII/multibyte cases passed three helper tests reported by frontend/parent; no huge browser paste/timed response race claimed. Reorder/delete cases were not each browser-tested. Old valid export does not prove latest completeness.

**New genuine-payment evidence:** The parent verified the retained event-5 prefix against the final 25-event packet in the hosted UI, rejected an edited first-event title, then restored the packet and verified it again. Independent read-only file verification also passed the retained prefix for the 21-, 23-, and 25-event packets and rejected tampered-copy.json. No server history was edited.

### 15. Hostile text and exported privacy — VERIFIED observed cases; broader security PARTIAL

**Exercise/result:** Submitted literal <b>only-text</b> marker. Read-only DOM inspection confirmed literal text and no b child element. Actual UI packet had no credential-like keys. Creation invite panel was dismissed before screenshot capture; raw capability URLs stayed private. **Source:** Bounded allowlisted inputs and sanitized provider/AI facts; packet schema excludes capabilities. **Fix:** No new injection defect found. **Limit:** Not exhaustive XSS, prompt-injection, operational-log or penetration testing. No real private customer brief used.

### 16. Keyboard and narrow screens — FIXED AND RETESTED; scoped accessibility

**Finding/reproduction:** Skip link overwrote capability URL fragment and lost room access. **Fix/retest:** preventDefault plus main focus/scroll. First Tab then Enter retained exact private URL/room and focused main. **Responsive:** 390x844 and 320x844 DOM metrics showed no horizontal overflow; inspected actual narrow captures for readable criteria/amounts/controls. Viewport override reset. **Evidence:** artifacts/screens/agreement-keyboard-room.png, agreement-responsive-390.jpg, agreement-responsive-320.jpg. **Limit:** No formal screen-reader/contrast/200%-zoom/SDK-return audit. agreement-mobile-390.png was a desktop-native capture despite emulation and is NOT mobile evidence.

### 17. Reproducibility and final rehearsal — bounded Sandbox payment rehearsal VERIFIED

**Initial exercise:** A local invented room progressed through proposals, both roles/consents, changes/resubmission, both acceptances and prefix verification; payments were disabled. **Offline fix/retest:** The runner gained local-only room bindings and a subclass discarding provider secrets; parent HTTP proof exported a valid five-event packet and rejected order creation despite fake credential sentinels. **Hosted result:** One accepted USD 12.00 milestone now has a genuine Sandbox create → closed-popup/no-capture → fresh unapproved read → explicit stored-link approval → fresh approved read → explicit capture → fresh completed evidence sequence. The USD 8.00 second milestone remains pending, showing that one paid milestone does not pay the whole agreement. **Limit:** No second order or production payment was performed. Final updated film/playback and submission checks are separate work; the historical v1 MP4 cannot represent this workflow.

## Current decision

The exercised route supports an **honestly labelled Sandbox payment demonstration**. Genuine SDK order creation, stored-link approval, explicit capture and fresh evidence now replace the former payment-proof blockers in rounds 10/11/17. This review does not claim production readiness, a successful v6 approval callback, actual concurrent provider capture, final video completion or completed submission.

All 17 focuses received actual interaction, artifact inspection or explicitly labelled source review. They deliberately have different outcomes. Do not turn source checks and bounded provider evidence into 17 passed releases or a winning probability. Next: a film reflecting the observed route and final submission checks. This documentation update made no provider request, room mutation or video change; preserve artifacts/video/settleproof-review.mp4 as historical v1.
