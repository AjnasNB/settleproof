# Observed browser SDK initialization limit

The initialization diagnostic build passed TypeScript, production build and all **79** main tests (five new focused mocked checkout-lifecycle tests). Deployed as `cc5a6ed4-7544-419e-b452-9d2526600331` on 17 October 2026.

The actual hosted buyer room still had nine human-workflow events and no order. Opening checkout loaded the official Sandbox core and paypal-payments component. The visible state reached **Initializing PayPal Sandbox**, then the new 20-second deadline produced an explicit timeout and retry control. It did not reach the payment-availability stage or create an order. Screenshot: `artifacts/screens/agreement-sdk-initialization-timeout.png`.

No browser security setting was weakened. The application did not treat the timeout as payment failure or payment success. Actual dedicated-app OAuth succeeded separately, and the app's v6 capability is enabled; those facts do not identify the provider-side cause of the pending initialization promise.

Next implementation: an explicit official Server SDK order/approval-link route, preserving the existing role, accepted-terms, amount, idempotency and separate-capture checks. It is not yet a completed payment proof or a successful v6 session.
