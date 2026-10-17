# Observed browser SDK initialization limit

The initialization diagnostic build passed TypeScript, production build and all **79** main tests (five new focused mocked checkout-lifecycle tests). Deployed as `cc5a6ed4-7544-419e-b452-9d2526600331` on 17 October 2026.

The actual hosted buyer room still had nine human-workflow events and no order. Opening checkout loaded the official Sandbox core and paypal-payments component. The visible state reached **Initializing PayPal Sandbox**, then the new 20-second deadline produced an explicit timeout and retry control. It did not reach the payment-availability stage or create an order. Screenshot: `artifacts/screens/agreement-sdk-initialization-timeout.png`.

No browser security setting was weakened. The application did not treat the timeout as payment failure or payment success. Actual dedicated-app OAuth succeeded separately, and the app's v6 capability is enabled; those facts do not identify the provider-side cause of the pending initialization promise.

Subsequently implemented an explicit official Server SDK order/approval-link route, preserving role, accepted terms, amount, idempotency and separate-capture checks. The v6 SDK later reached its ready state and opened genuine Sandbox Checkout. The earlier timeout does not identify why that initialization was temporarily pending.

The first order attempts were unconfirmed. Sanitized owned-receipt diagnostics narrowed the failure to OAuth transport before a response. A real Worker Request probe with the deployed compatibility date reproduced a TypeError for `redirect: "error"`, although the current Cloudflare Request reference lists that mode. Commit `83a7bbd` changes both PayPal transports to manual mode and rejects every redirect without following it. Real Worker regression coverage exercises Request construction; 93 tests, TypeScript and build passed.

Deployment `e1e21a37-4819-4e6e-8a8b-bef21c04ffec` then created the order using the original persisted request ID. Closing the v6 window produced the cancellation notice without capture. Approval was completed through the stored PayPal link in a normal Chrome tab because computer input into the popup timed out. A fresh server read reported APPROVED and zero captured; an explicit separate capture returned fresh COMPLETED order/capture evidence for USD12. This establishes the stored-link approval path, not a successful v6 `onApprove` callback. The second USD8 milestone stayed pending and unpaid.
