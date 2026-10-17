# Sandbox setup

## Private configuration

Create a fresh **Sandbox** REST application in [PayPal Developer](https://developer.paypal.com/). Use a fictitious Business sandbox account for the merchant and a different fictitious Personal sandbox account for the buyer. Do not reuse private application keys from another project.

In a clean checkout, copy `.dev.vars.example` to `.dev.vars`, then fill in `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` privately in your editor. `.dev.vars` must remain ignored by Git. Keep `AI_ENABLED="false"` until bounded model use is approved. Never put these credentials in a `VITE_*` variable, frontend source, video, screenshot, public issue or shell argument. Do not print the file to a terminal.

For a hosted Worker, store both PayPal values as encrypted Worker secrets, following [Cloudflare's secret configuration guide](https://developers.cloudflare.com/workers/configuration/secrets/). The deployed Worker must continue to target only PayPal sandbox. Keep secrets out of Wrangler `vars` and the checked-in configuration. `AI_ENABLED` is a non-secret feature flag; the `AI` binding is separate from PayPal credentials. Provider access is optional for offline fixture exploration, but a real enabled model demonstration is needed to demonstrate the AI integration.

## Bounded AI configuration

The configured model is `@cf/meta/llama-3.1-8b-instruct-fp8`; its [current model reference](https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct-fp8/) documents `response_format`. Keep the checked-in/local `AI_ENABLED="false"` default until provider use is deliberately enabled. Configure the `AI` Workers AI binding and the `AI_BUDGET` SQLite Durable Object binding and migration from `wrangler.jsonc` together; the app requires the budget service before inference.

`AI_DAILY_LIMIT="20"` is a global maximum of 20 reserved inference attempts per UTC day, enforced atomically by the SQLite object. Lower configured limits are allowed; values above 20 cannot increase the hard ceiling. A reservation remains consumed when inference times out, fails or produces rejected output. The local SQLite tests cover concurrent requests, persistence and UTC reset. Do not rename/reset the object namespace or its administrative state to evade the cap. This is an attempt quota, not a monetary or neuron billing cap; per-request token limits and separate burst protections still apply.

After configuring the bindings and encrypted secrets, a public deployment that intentionally enables AI must explicitly override the default:

```sh
npx wrangler deploy --var AI_ENABLED:true
```

Run that command only for the intended Cloudflare account and configured Worker. A default deployment without the override leaves AI disabled. The hosted prototype is [SettleProof](https://settleproof.ajnasnb.workers.dev); deployment alone does not prove that an explanation passed validation or that a real sandbox order was verified. Both proofs remain pending in the current release record; the PayPal walkthrough needs the operator's Developer sign-in. The hackathon entry is not submitted.

## Create a reproducible sandbox case

Start the local app using the README commands. The helper needs Node 22+ and reads only the server environment. First validate without network activity:

```sh
node scripts/paypal-sandbox.mjs create --invoice SP-DEMO-001 --amount 100.00 --currency USD --dry-run
```

Then, after configuring your own sandbox credentials, run:

```sh
node --env-file=.dev.vars scripts/paypal-sandbox.mjs create --invoice SP-DEMO-001 --amount 100.00 --currency USD --request-id seed-demo-0001
```

The output contains the order ID, status, expected values and a validated `www.sandbox.paypal.com` approval link. Open that link and approve using the separate **Personal sandbox** account. The callback returns to the local app; it does not capture the order automatically. Never enter live buyer credentials on this path.

Inspect the order, then explicitly capture the fictitious approved order:

```sh
node --env-file=.dev.vars scripts/paypal-sandbox.mjs status --order ORDER_ID
node --env-file=.dev.vars scripts/paypal-sandbox.mjs capture --order ORDER_ID --request-id capture-demo-0001
```

Replace `ORDER_ID` with the returned ID. Capture refuses any order that is not `APPROVED`. A rerun of the create command should reuse its request ID only for the same intended operation; use a new synthetic invoice/request ID for a distinct order. If a capture times out, inspect status before retrying and retain the same capture request ID for the same operation.

In SettleProof choose the live sandbox path and enter that order ID with invoice `SP-DEMO-001`, amount `100.00`, currency `USD`. Expected invoice identity must match exactly. The Worker independently reads current capture details, so the seed helper's console summary is not trusted payment evidence.

## Troubleshooting

- `401`: check that both values belong to the same **Sandbox** application. Never paste a secret into an issue.
- Approval cannot proceed: use a separate fictitious Personal account, not the merchant account.
- Capture refused: inspect status; an unapproved or already completed order must not be captured again.
- Duplicate invoice/request: reuse a request ID only for the same operation; choose a new demo invoice for another order.
- AI unavailable: verify the exact model, `AI` and `AI_BUDGET` bindings, deliberately enabled flag and remaining UTC daily quota; don't replace the error with a synthetic claim that a model ran.
- Unknown reconciliation: inspect the cited failed check. API/network failure is not evidence of an unpaid invoice.

The helper never prints access tokens, raw error bodies, payer names, email addresses or addresses. Its checked-in tests use mocked `fetch`; no credentialed API call is made by those tests. Official protocol references are listed in [SOURCES.md](SOURCES.md).
