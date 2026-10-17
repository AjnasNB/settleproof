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
