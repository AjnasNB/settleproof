# Documentation and helper validation

17 October 2026, buildops subtask:

- `node --check scripts/paypal-sandbox.mjs`: passed.
- `node --test scripts/paypal-sandbox.test.mjs`: seven tests passed using injected mocked fetch. They cover no-network dry-run, invalid input/endpoint confinement, unapproved capture refusal, approved capture idempotency/redaction, private error suppression, production-link rejection and approval-URL query redaction.
- Documented no-network create dry-run: passed, with the expected synthetic invoice/body and sandbox-only endpoint.
- Public helper functions `parseArgs`, `orderBody`, `summary`, `run` are documented and covered through the mocked command path.
- No private credential file was read, no existing application's keys were copied, and no credentialed PayPal request or model request was run by this subtask.

Subsequent backend evidence, reported by the parent task on 17 October 2026: `npm run check` passed and the final backend suite has 47 tests passing. The quota tests use actual local SQLite: 37 concurrent reservations admit 20, the counter persists across reload, and the next UTC day resets the allowance. These checks are separate from the seven mocked helper tests above; this documentation update did not repeat the suites.

The parent task recorded deployment at [SettleProof](https://settleproof.ajnasnb.workers.dev). The runtime now targets `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, with AI disabled by default and an atomic `AI_BUDGET` quota of at most 20 reserved attempts per UTC day. Burst limiters are separate and eventually consistent; no monetary billing cap is claimed.

An accepted live AI response, a credentialed PayPal sandbox verification, public-source release and final hackathon submission are still pending. The PayPal walkthrough needs the operator to sign in to PayPal Developer. These local test and deployment records do not establish live-provider success, production readiness, adoption, a submission receipt or an award. Append subsequent dated evidence when those checks actually pass.

## Parent runtime verification, 17 October 2026

- `npm run check`, the production frontend build and 50 backend tests passed. Seven separate mocked sandbox-helper tests passed. The SQLite budget test exercises real local storage concurrency, persistence and UTC rollover.
- Public build: https://settleproof.ajnasnb.workers.dev/ . MIT source: https://github.com/AjnasNB/settleproof .
- An actual hosted Workers AI request using `@cf/meta/llama-3.3-70b-instruct-fp8-fast` produced an accepted explanation of the explicitly synthetic partial-capture case: 45.00 USD paid, 75.00 USD remaining. The editable internal note and validated source chips were inspected in the real UI. See `artifacts/ai-ui-proof.json` and `artifacts/screens/final-ai-generated.png`. Earlier rejected/unavailable requests were not counted as successful explanations.
- The UI displays source chips from validated model citation metadata; inline bracket formatting is optional. Reference validation and amount/currency/outcome heuristics are not a semantic truth guarantee.
- Responsive/keyboard, filter-selected-case consistency, sorting, citation navigation, local review save and fractional-cent form rejection have bounded UI observations in `artifacts/QUALITY-16.md`. Native browser download contents remain unverified in this automated environment.
- PayPal sign-in still requires the account owner's private password entry. No credentialed PayPal order/capture read or sandbox seed operation has been executed. Do not present the synthetic examples as PayPal API observations.
- This is a hosted review build, not a submitted hackathon entry. Final competition materials, real sandbox proof, applicant declarations and the submission contract still require completion.

- Offline judge access: `npm run dev:offline` started on port8798 with only local assets. The offline entry discards all environment values other than assets. Actual HTTP checks returned PayPal/AI configured=false, partial fixture net45.00/remaining75.00, and an explicit unavailable AI response. It requires no remote provider binding; this is fixture access, not an integration proof.

- Local review-video delivery: `artifacts/video/settleproof-review.mp4` completed at 100.000 seconds, 1920x1080, H.264/yuv420p, 24 fps, 2,400 frames, 2,860,866 bytes and no audio. The video reviewer inspected decoded frames at 4, 55, 67 and 94 seconds, following the composition checks and 28 midpoint/cut snapshots. Fifteen scoped local video checks passed; PayPal verification, public YouTube publication and final entry submission remain open. See `artifacts/video/VIDEO-QA-16.md`.

## Agreements implementation review, 17 October 2026

- Root ran the current release commands: `npm run check`, `npm test`, `node --test scripts/paypal-sandbox.test.mjs`, `npm run build`. All passed: 74 main tests, seven separate helper tests, zero test failures. SDK tests use mocked provider responses, including in the actual local Worker/SQLite runtime. This is compatibility/state evidence, not genuine PayPal approval/capture.
- New coverage includes hashed role capabilities, version-specific dual consent, delivery/change/acceptance, server-bound order amounts, persisted idempotency reservations, concurrent capture handling, five-hour write retry limits, retained receipt-prefix anchors, UTF-8 receipt capacity before provider calls, and full formatted receipt input without truncation.
- Actual remote Workers AI drafting returned two editable milestone proposals for an invented café-menu brief, preserving original USD12/USD8 amounts. Root's API evidence is `artifacts/agreement-ai-proof.json`; the reviewer independently observed one new generated proposal through the real UI in `artifacts/screens/agreement-ai-draft.png`. A person must adopt/edit the proposal; it accepts nothing and has no payment tools.
- The root independently ran offline mode with deliberately invalid PayPal credential sentinels injected at startup. The normal config and agreement config reported PayPal disabled; AI was disabled. A local room completed both consents, delivery and buyer acceptance; checkout returned 503 `PAYPAL_NOT_CONFIGURED`, and the five-event exported receipt verified. The offline object's constructor strips provider credentials as well as the outer Worker. Evidence: `artifacts/agreement-offline-proof.json`.
- Independent UI review found and retested concrete fixes, including inline amount errors, buyer counteroffers, visible change-request feedback, skip-link capability preservation, and receipt verifier input bounds. Exact observed and incomplete scopes belong in `PRODUCT-17.md`. Do not treat source-only race guards, mocked SDK calls or a storyboard as a complete end-to-end demo.
- The user approved dedicated Sandbox setup/storage and at most USD20 of fictitious test orders. The Create App attempt redirected to private sign-in; no dedicated credentials have been read/stored and no PayPal test transaction has run. Check whether the app already exists after authentication before retrying creation.
- The new film is planned as 17 shots/140 seconds in `VIDEO-AGREEMENTS-STORYBOARD.md`; its actual captures, film review rounds and provider-dependent shots remain pending. The older MP4 is historical reconciliation-only evidence. No new upload or submission occurred.

# Hosted Agreements release — 17 October 2026

Cloudflare deployment `7b1231bd-be07-4f33-8ddd-5369416135c5` attached `settleproof.ajnasnb.com` to the existing Worker. Public DNS through resolver 1.1.1.1 returned Cloudflare addresses. A direct request to that observed address using curl's `--resolve` verified the normal HTTPS hostname/certificate and returned the Agreements HTML plus `{"environment":"sandbox","configured":false}`. No certificate checks were disabled. The local default resolver temporarily retained an earlier NXDOMAIN response; the workers.dev fallback returned HTTP 200 and the new title, and the actual deployed interface was inspected in Chrome. Screenshot: `artifacts/screens/agreement-deployed-review.png`.

Dedicated PayPal credentials, real SDK order/approval/capture, the new film and the final entry are still pending. Domain attachment or a mocked SDK test is not provider proof.

## Genuine hosted Sandbox proof — subsequent 17 October checkpoint

Earlier pending statements above describe their dated checkpoints. They are superseded for provider verification by this result:

- Main suite **93/93**, TypeScript and production build passed at `83a7bbd`. The real Worker regression constructs actual Requests, catching an unsupported redirect mode missed by earlier fake-fetch tests. Both PayPal transports now use manual mode and reject redirects. Receipt diagnostics retain only four revalidated safe entries; secret-bearing errors remain excluded.
- Deployment `e1e21a37-4819-4e6e-8a8b-bef21c04ffec` completed genuine Sandbox order creation, cancellation without capture, same-order stored-link approval, fresh APPROVED/unpaid0 read, explicit capture, and fresh COMPLETED order/capture reads. USD12 was captured once; the second USD8 milestone stayed pending and unpaid. No successful v6 approval callback or live funds are claimed.
- `artifacts/agreements-provider-proof.json` identifies the sanitized evidence. Genuine exports preserve21/23/25-event observations. The final25-event file was downloaded through the owned API and parsed from disk; native browser-download completion was not confirmed.
- The actual UI matched the final packet to the independently retained event-5 prefix, rejected a copy with the first event changed, and revalidated the restored original. These checks do not prove identity, actual design delivery or irreversible settlement.
- The custom domain now returns HTTP200 using the normal local resolver and loads in Chrome. No certificate validation or browser security setting was disabled.
- The new film and final PayPal submission remain pending at this checkpoint. The historical100-second film continues to describe the older evidence desk, not this completed Sandbox rehearsal.

## Completed local Agreements film — subsequent checkpoint

Film source and QA commit `65ea8d6` records the 140.000-second, 1920×1080 H.264/yuv420p export at 24fps: 3360 frames, 7,139,871 bytes, no audio. Full FFmpeg decoding passed. Review covered all 17 scene midpoints and cuts, 56 snapshots plus 4 crop retests, 20 decoded samples, and 17 scoped outcomes. Root independently inspected encoded capture/end frames and confirmed SHA256 `e847c2b7e7dc0171c7b4549472f876f2196cb3ea56e240195d493bfe581dca0a`. Studio playback advanced and scene/endcard positions were checked; later Studio screenshots timed out, which is documented rather than claimed as a continuous playback pass. New public YouTube playback and final Devpost entry are still pending entrant approval.
