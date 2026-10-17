# SettleProof verification plan

Prepared 17 October 2026 from `AGENTS.md` and `API-CONTRACT.md`. These are sixteen distinct verification gates, not sixteen revisions. Statuses describe the exact extent observed; partial results leave remaining requirements open. The evidence log separates this reviewer's observations from parent-reported checks.

Scope: independent eligibility, product and UX review. UI interaction uses CUA only. Use synthetic fixtures and PayPal sandbox exclusively. No real-money actions, publishing, credential exposure or automatic final submission.

| # | Gate | Required verification and evidence | Status |
|---|---|---|---|
| 01 | Hackathon eligibility | Check current official rules, applicant eligibility, deadline/timezone, permitted prior work, team limits and required artifacts. Establish what is newly built. A planned entry is not an accepted or submitted entry. | Parent checked rules; final applicant/entry check pending |
| 02 | Required AI and PayPal functionality | Demonstrate an actual supported AI request and genuine sandbox order observation before claiming either works. Fixture-only operation must remain labelled synthetic. If credentials are unavailable, state the missing integration and its submission impact. | AI output observed by parent and inspected in screenshot; PayPal sandbox read blocked |
| 03 | Configuration and privacy | Verify configuration accurately reports sandbox/AI readiness. Check server-only secrets and outputs for payer/merchant PII, endpoint credentials and private documents. Public footage must exclude them. | Partial: honest setup labels observed; full security review not claimed |
| 04 | Paid reconciliation | Verify a completed capture produces the expected paid/net/remaining amounts with exact decimal arithmetic and traceable evidence IDs. Deterministic server findings remain authoritative. | Scoped fixture UI pass; core tests parent-reported |
| 05 | Partial and unpaid reconciliation | Run distinct partial and unpaid cases. Check amounts and outcome labels, including a genuine zero versus missing data. The interface must not present an outstanding balance as fully paid. | Scoped fixture UI pass |
| 06 | Unknown and review states | Verify missing/unavailable provider observations remain null/unknown. Contradictions, invoice/currency mismatch and unsupported data must expose review/unknown findings rather than invented success. | Unknown fixture UI pass; deeper provider coverage pending |
| 07 | Refund and duplicate handling | Verify actual supported refund data and repeated observations do not double count payments or refunds. Check net/remaining behavior and unsupported refund coverage limits against server implementation. | Partial presentation check; no live refund proof |
| 08 | Input and API validation | Test blank/malformed order IDs, scenario IDs, expected amounts and unsupported currencies. Distinguish validation errors from provider failure. Check the UI does not trust editable client facts as payment observations. | Native precision rejection observed; API tests parent-reported |
| 09 | AI grounding and failure | Confirm the server recomputes analysis; explanation evidence references resolve; drafts do not alter payment facts. Test unavailable/invalid AI output. No automatic financial action may follow an explanation. | Fallback independently observed; accepted generated text/source chips inspected in parent's real UI screenshot |
| 10 | Responsive layout and zoom | Inspect at narrow mobile widths (320 and 390), desktop and 200% zoom. Check text, monetary columns, evidence details and primary actions for clipping, accidental horizontal overflow and usable touch targets. | Initial narrow viewports passed; final mobile/zoom checks incomplete |
| 11 | Keyboard interaction | Complete the primary flow using keyboard only. Check logical tab order, visible focus, control activation, modal entry/escape/focus return if present, and absence of traps. | Partial pass: skip/dialog and keyboard sorting |
| 12 | Accessible structure and labels | Inspect form labels, headings, meaningful button names, status/error announcements and contrast. Identify any table/grid keyboard or screen-reader limitation. Do not claim full accessibility from screenshots alone. | Partial inspection; formal contrast/screen-reader coverage pending |
| 13 | Loading, errors and stale state | Exercise slow/rejected requests and changes during a request. Old results must not appear to belong to a newly selected case/order. Keep actionable errors and retries visible, with duplicate requests controlled. | Filter/selection fix passed; request-race coverage parent-reported |
| 14 | Evidence navigation and provenance | Trace every shown finding/citation to its evidence record. Keep fixture and sandbox observations visibly distinct with timestamps/source labels. Verify evidence controls work on mobile and keyboard. | Citation/local review pass; downloaded contents unverified |
| 15 | Release reproducibility | Before publishing, retain actual `npm run check`, `npm test` and `npm run build` outcomes. Check public repository instructions, MIT license and notices, sample configuration and exclusion of secrets. A successful export or video is not a substitute for these checks. | Parent reports check/build,50core+7helper tests passed and public MIT repo; not rerun here |
| 16 | Demo and final submission readiness | Use real product UI captures in an 80–110 second demo, within the hackathon's under-three-minute limit. Verify truthful AI/sandbox labels, readable captions and public playback. Review all required links and rules. The final contract acceptance needs the user's action-time approval after build and video are reviewable. | Local review video complete100s/1080p; credentialed PayPal read, public YouTube playback and final submission pending |

## Evidence log

At plan creation, no running UI, live sandbox integration, AI response, test execution, released artifact or final video had been inspected by this reviewer. The scoped observations below do not convert every gate into a pass.

### First CUA UI review, 17 October 2026

- Design read: a seller payment-reconciliation workspace. The job is to compare an expected invoice with capture evidence, investigate discrepancies and retain a human review note. It is an early sandbox/synthetic prototype. Financial truth and integration status require precise labels.
- Inspected `http://localhost:8797/` through an independently created Chrome tab. Only synthetic cases were used. No order was created, approved, captured, refunded or transmitted to a financial service by this reviewer.
- Gate 04, scoped fixture UI result: selecting Captured in full changes the inspection from $45.00 short payment to $120.00 Matched against $120.00 expected. This is synthetic UI evidence, not a live PayPal observation.
- Gates 05–07, scoped presentation result: the queue distinguishes approved/not captured ($0.00), partial ($45.00), duplicate evidence (Needs review), and currency/reference/refund/unavailable cases (Unknown/Needs review). Deeper server validation is not implied by reading these rows.
- Gate 10, partial pass: tested explicit 390 x 844 and 320 x 844 viewports. Document width equalled scroll width (375/375 and 305/305 after scrollbar), with no document-level horizontal overflow. The narrow hero, search and actions remained visible. Mobile inspector and 200% zoom still need review.
- Gate 11, partial pass: first Tab after reload reaches Skip to payment review. Enter then Tab reaches Connect sandbox. A visible focus ring appears. Keyboard activation opens the native setup dialog, and Escape returns focus to Connect sandbox. Full grid keyboard traversal and every action remain unverified.
- Gates 02/03/09: setup accurately displayed PayPal sandbox Not configured and AI explanations Not configured. Live AI and sandbox behavior are still pending; no video may describe them as demonstrated yet.
- Gate 14, partial pass: Matched filtering visually reduces the grid to one case. Evidence-chip navigation, column filtering/sorting and exports still need direct checks.
- Gate 15: the parent reports `npm run check`, `npm run build` and 36 core tests passed. This reviewer did not rerun them. A static scan produced 3 P1 and 19 P2 heuristic signals, mainly labels/autocomplete/button types; source inspection showed fixes in progress, so those counts are not confirmed defects.
- No additional critical UI defect was confirmed in this first pass. Initial screenshots under `artifacts/screens/` are provisional: the parent subsequently rebuilt typography/contrast/selection. Fresh screenshots are required before video use.
- Fresh reload for the revised build returned `ERR_CONNECTION_REFUSED`. Further UI testing is pending the restarted local server. This is an availability observation, not proof of an application defect.

### Restored/current build review

- Local service was restored, and the deployed UI at `https://settleproof.ajnasnb.workers.dev/` was inspected without creating a PayPal order or making another AI request.
- Exactly one authorized local Explain request on the synthetic partial case returned: "Workers AI did not produce an available response. No AI text or draft was generated; the deterministic result remains authoritative." Screenshot: `artifacts/screens/ai-unavailable.png`. This proves a truthful fallback, not functional generated AI. Parent is replacing the deprecated model and controls any further proof call.
- Public header now says AI enabled, separating configured capability from a demonstrated successful response. PayPal remains Setup required.
- Confirmed P2: Matched filtering could leave a hidden partial case in the inspector. Root fixed this with displayed-row selection/clear behavior. Retest on the latest local build passed: Matched gives 1 of 8 shown and the paid/$120 inspector; no-result search gives 0 of 8 and Select a case; clearing search restores the visible paid case. Screenshot: `final-filter-selection.png`.
- Actual AG Grid sorting passed: clicking Net captured announces ascending and renders unknowns, then $0.00, $45.00 and $120.00 in row-index order. Enter on that header toggles descending, placing a $120.00 case first. This was read from rendered DOM labels/positions, not application internals.
- A `result.net` finding citation switched to source records and showed the corresponding `45.00 USD` record. Screenshot: `final-source-records.png`.
- A synthetic human note plus explicit acknowledgement enabled Record review. Recording produced "Review saved in this browser. Payment evidence was not changed" and disabled the button again. Screenshot: `final-human-review.png`. The review is local; it is not a payment action.
- Expected amount `12.345` was rejected by native form validation: "Please match the requested format." No real order was queried. Test fields were restored afterward.
- CSV/JSON export buttons were activated, but actual downloaded file contents were not obtained. The download-event waiter timed out, the known Downloads folder held no matching artifact, and browser policy blocked `chrome://downloads`. No workaround or expanded browser/system access was attempted. Source inspection is not claimed as downloaded-file verification.
- The later attempt to apply a fresh 390px viewport did not change the active tab's measured 1425px document width. It is not a fresh mobile pass. Initial narrow screenshots remain historical/provisional; no browser or system workaround will be forced.
- Parent reports the hardened backend now has 41 passing tests, including actual SQLite concurrency quota checks. This reviewer did not run those tests.

## Video handoff

Wait for the functioning app and parent confirmation of what actually works. Prepare the video under this project's `video/` directory, using HyperFrames. Capture actual UI through CUA. A caption-first edit is acceptable. Do not imply a live PayPal/AI connection from a synthetic scenario. The final rendered demo needs sixteen distinct recorded video QA checks; those checks are not sixteen creative revisions of each frame. YouTube upload/publication remains with the parent/user.

### Accepted AI proof and final review scope

- Parent observed an accepted hosted Workers AI result with the current model `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. This reviewer inspected the actual screenshot `artifacts/screens/final-ai-generated.png` and the bounded observed-text record `artifacts/ai-ui-proof.json`. No additional inference was made by this reviewer.
- The generated explanation says the synthetic invoice has45.00USD captured and75.00USD remaining. Actual source chips are expected.amount,result.net,result.outcome,capture.0.amount,result.remaining. The draft remains editable and explicitly internal. This is AI proof on synthetic evidence, not a credentialed PayPal read.
- A fresh local setup dialog independently shows PayPal sandbox Not configured and AI explanations Configured. Captured under `artifacts/video/composition/assets/sandbox-pending.png`. The video must retain this limitation, and full hackathon submission readiness remains pending.
- Parent reports50core tests plus7helper tests, typecheck and build passed, and the public source is `https://github.com/AjnasNB/settleproof`. These are parent-reported release checks; this reviewer did not rerun them.

### Final local video verification

- `artifacts/video/settleproof-review.mp4` rendered successfully in one final encode after scoped visual QA fixes. Actual ffprobe:100.000seconds,1920x1080,H.264/yuv420p,24fps,2400frames,2,860,866bytes,noaudio.
- HyperFrames final audit ran its browser (browserSkipped=false):0lint/runtime/layout/motion/contrast errors,0runtime/layout/contrast warnings. The remaining3lint warnings describe intentional reuse of a real still for two different crops; the resulting pixels were inspected.
- Reviewed28midpoint/cut snapshots, actual Studio playback and decoded MP4 frames at4/55/67/94seconds. Corrected opening-heading overlap and replaced excessively large soft status/AI crops with smaller actual captures plus clearly marked sharp annotations. Synthetic/payment-scope labels and the PayPal Not configured limitation remain explicit.
- `artifacts/video/VIDEO-QA-16.md` records16distinct checks:15scoped local checks pass; external completion remains pending. No further model inference, public upload, Terms acceptance or hackathon submission was performed by this reviewer.
- Studio remains available at `http://localhost:3003/#project/composition`; `artifacts/video/studio-preview.png` records the actual loaded01:40timeline. The development app at8797 is no longer needed for this review.
