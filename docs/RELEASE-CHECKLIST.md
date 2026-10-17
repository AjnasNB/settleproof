# Sixteen release gates

These are verification gates, not a claim that sixteen iterations or successful live checks have occurred. Record evidence beside each gate before the final release.

1. **New work:** Git history records the SettleProof build beginning 17 October 2026 and distinguishes conceptual inspiration from reused source. No unrelated private project code or data is imported.
2. **Entrant:** applicant confirms age, eligibility, original-work rights, representation and relevant prior sponsor support accurately.
3. **Sandbox confinement:** provider requests are confined to `api-m.sandbox.paypal.com`; no production URL or real-money action appears in the app/helper.
4. **Secrets:** fresh sandbox credentials remain in the ignored local file or encrypted Worker secrets. Inspect staged files and built assets for accidental credentials without printing them.
5. **Seed and approval:** helper creates a fictitious order, an operator approves with a separate personal sandbox account, and capture is allowed only after `APPROVED`. Record the sanitized result.
6. **Fresh evidence:** the UI loads the seeded order and the Worker independently fetches current capture details. Record a successful credentialed walkthrough, not a mocked response.
7. **Money math:** compare expected/observed amounts using the server's exact minor-unit rules; unsupported currency/precision and malformed values fail explicitly.
8. **Identity checks:** exercise mismatched invoice, currency and duplicate capture identity. Confirm the evidence panel points to the relevant facts.
9. **Payment states:** review completed, partial, unpaid/pending and refund cases with labelled synthetic inputs. A top-level order status alone does not establish net payment.
10. **Unknowns:** failed provider reads and incomplete refund evidence remain unknown. No fake zero or success appears in API output, UI or CSV.
11. **Real AI:** after authorized bounded provider use, record one actual accepted explanation from `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. Verify that the atomic `AI_BUDGET` SQLite quota allows at most 20 reserved attempts per UTC day, including failed attempts. Disabled/unavailable AI stays visible as such; no canned fallback is advertised as a model response.
12. **AI boundary:** fabricated evidence references and unacceptable model output are rejected; a model cannot alter deterministic facts or execute a financial action.
13. **AG Grid:** demonstrate Community filtering, sorting, selection and CSV export on the actual evidence queue; do not claim Enterprise features. Explain its practical workflow role.
14. **UI:** test narrow/mobile and desktop layouts, keyboard focus, labelled controls, loading/errors, row selection and disclosure of synthetic versus sandbox records.
15. **Reproduce:** run `npm run check`, `npm test`, `node --test scripts/paypal-sandbox.test.mjs`, `npm run build`; verify fresh-checkout setup, MIT source, bundled license notices and no PII in public artifacts.
16. **Submission:** public repository, runnable build, English materials and a public YouTube demonstration under three minutes are accessible. Obtain action-time consent for the submission contract; retain the actual confirmation receipt.

## Competition facts

[Official rules](https://paypalaihackathon.devpost.com/rules), checked 17 October 2026: deadline **12 November, noon PST** (**13 November, 01:30 IST**); judging 1–15 December; winners around 21 December. Prize delivery can take up to **60 days after completed required forms are received**; the forms' return window is ten business days. This is a judged competition, not immediate or guaranteed income.

The [prize overview](https://paypalaihackathon.devpost.com/) advertises $67,500 cash; overall awards are $12,000/$8,000/$5,000. AG Grid awards are $5,000, $2,000, and three $1,000 prizes. An entry may win one overall or honorable-mention award plus one sponsor award, subject to judging and verification. Render credits are not cash. No purchase is necessary; use the free PayPal sandbox.
