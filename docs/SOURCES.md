# Primary implementation references

Checked 17 October 2026. These inform protocol behavior; they do not prove that a credentialed integration has been executed.

- [PayPal OAuth authentication](https://developer.paypal.com/api/rest/authentication/) — client-credentials token exchange on the server.
- [Create order](https://developer.paypal.com/api/orders/v2/orders-create) — synthetic purchase unit, idempotency request header, payment-source experience context.
- [Show order details](https://developer.paypal.com/api/orders/v2/orders-get) — current order observation.
- [Capture approved order](https://developer.paypal.com/api/orders/v2/orders-capture) — separate operator-only sandbox helper operation.
- [Show captured payment details](https://developer.paypal.com/api/payments/v2/captures-get) — current capture observation used by reconciliation.
- [Sandbox testing overview](https://developer.paypal.com/sandbox-testing/overview) — virtual business/buyer accounts and simulated transactions.
- [Cloudflare Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/) — local and hosted server credential storage.
- [Workers AI llama-3.3-70b-instruct-fp8-fast](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/) — exact configured model and its documented `response_format` input. The current model catalog and JSON Mode supported-model list both identify this model; runtime evidence is recorded separately.
- [Durable Objects pricing and availability](https://developers.cloudflare.com/durable-objects/platform/pricing/) — SQLite Durable Objects used for the atomic application-wide daily inference reservation counter; available on the Workers Free plan. An attempt quota is not a dollar or neuron billing cap.
- [Worker rate-limit binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) — per-location protective limits, not a global billing cap.
- [Competition requirements](https://paypalaihackathon.devpost.com/) and [official rules](https://paypalaihackathon.devpost.com/rules) — final eligibility and delivery requirements take precedence over this project's checklist.

No third-party application source was copied from these references. The application's API contract is in `API-CONTRACT.md`.
