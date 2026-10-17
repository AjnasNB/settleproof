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
