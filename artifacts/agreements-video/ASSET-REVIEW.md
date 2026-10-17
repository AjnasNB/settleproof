# Agreements capture review — first eleven shots

17 October 2026. Inspected all eleven supplied image files at native dimensions, including the replacement shot 11. Root confirms repository capture build `2c123c0`, deployed Worker build `7b1231`; later archival/preparation commits did not change that captured application. Exact UTC capture times were not recorded; file modification times are write-time only. These are genuine source-state captures supplied by root, **not completed film frames or provider integration proof**. No composition or render was made. The ledger contains eleven verified source images and no provider shots.

## Findings and continuity

| Asset | Actual dimensions | Observed state and production use |
|---|---|---|
| 01-landing.png | 1905 × 882 | Loaded landing headline and three stages; no opening/loading placeholder. Default title belongs to the editor example, not the later room. Suitable opening crop. |
| 03-ai-brief.png | 1905 × 2522 | Invented source brief, initial manual criteria, USD12/8 and USD20 total. Can supply shot 02's amounts crop too. |
| 04-ai-proposal.png | 1905 × 2980 | Actual generated panel, two unchanged amounts and three questions; nothing saved/accepted. Crop that panel. Source image does not independently prove a model identifier. |
| 05-human-edited-terms.png | 1905 × 2356 | Applied proposal plus manually revised measurable criteria; USD12/8 remain unchanged. Use before/after states, not a fabricated typing animation. |
| 06-seller-version-one.png | 1905 × 2597 | Seller role, version 1, neither accepted, pending milestones. No invite fields visible. |
| 07-buyer-counteroffer.png | 1905 × 3950 | Buyer edits version 1; seller accepted v1. The new Contact call-to-action criterion and Save as a new version control are visible. This is before saving v2. |
| 08-consents-reset.png | 1905 × 2932 | Saved version 2; both acceptances reset; new Contact criterion; three events. |
| 08-both-accepted.png | 1905 × 3450 | Both roles accepted version 2; five events; milestones still pending delivery. Label one operator demonstrating separate roles. |
| 09-seller-handoff.png | 1920 × 889 | Delivered first milestone, USD12, intentionally missing Contact call to action; six events. Seller role is known from root's flow, not a role badge inside this crop. |
| 10-changes-requested.png | 1905 × 882 | Explicit buyer request plus waiting state; no old acceptance control; seven events; second USD8 milestone pending. |
| 11-handoff-accepted.png | 1905 × 882 | **Replacement accepted:** revised assertion, Handoff accepted by the buyer, Pay with PayPal Sandbox button; nine events. Second milestone pending. Human acceptance only; no SDK/order/payment result. |

The initial shot 11 was rejected: it still showed Accept this handoff and eight events. Root replaced it; the replacement was independently inspected and its new SHA-256 is recorded in source-asset-ledger.json. Do not restore the rejected image or treat the earlier eight-event receipt as post-acceptance.

The two milestone names change from the manual example to the AI proposal (Wireframe Review / Design Delivery), then remain consistent through room creation and version 2. The counteroffer specifically adds the Contact call to action. The initial handoff omits it, the buyer requests it, and the revised assertion includes it. Amounts stay USD12 + USD8 = USD20 throughout.

## Privacy and image quality

No raw capability/invite URL, credentials, address bar, payer/account data or personal customer material was visible in these inspected files. Visible event hashes are integrity checkpoints, not access tokens. This is a bounded pixel review, not a guarantee about unreviewed future captures or operational logs.

All eleven files have **JPEG bytes despite .png suffixes**. Do not recompress them. When freezing final composition assets, copy bytes to accurate .jpg filenames, update paths and retain hashes/provenance. Originals remain untouched here.

Full-page files are 2356–3950 pixels tall. Fitting them wholesale inside a 1080p evidence band would make key text unreadable. Use native close crops: brief/proposal, criterion+amount, role+version+consent, and the relevant handoff/request. Focused Skip to agreement controls at the far left in some full-page captures can be excluded by a genuine evidence crop. Keep the caption outside the UI; never recreate a payment state to solve legibility.

## Receipt file readback

Independently opened the two local JSON files and recomputed each event's sorted-key compact UTF-8 SHA-256, sequence/previous-hash chain and final head. Both matched. The five early events exactly equal the first five events of the eight-event file; the retained sequence-5 hash matches its prefix.

| File | Scope | SHA-256 |
|---|---|---|
| early-receipt.json | Five events through dual consent at version 2; root reports UI-textarea export, not browser-download confirmation. | 945c22191b5ce4b0934b8131741804d777b6e8702c92830f5efc88c286f07a07 |
| downloaded-receipt.json | Eight events ending revised delivery-submitted, before buyer acceptance. Root reports an actual API export downloaded/written and read back; browser download-event confirmation remains absent. | 32f04d67c6a8d1236da4a10d33d9fa07543d01ada62959eb535ed0c9d38ef75c |

No credential-like keys were found in the readback. These checks establish consistency for these invented prepayment records, not identity, truth, latest completeness, immutable storage or PayPal settlement. Neither file can fill the final provider-linked receipt scene.

## Required recapture / handoff list

- **Shots 01–11:** No mandatory repeat room or AI call. Shot 11's necessary correction is now supplied. No separate shot-02 file is required: use an actual USD12/8/20 crop from 03 or 05. A tighter viewport capture is optional only if a final crop proves unreadable.
- **Before production:** Preserve the confirmed build provenance above. Do not invent exact UTC camera times from file modification times. JSON readback and all eleven ledger-to-file hashes were checked; no external schema-validation library was available, so full library-based schema validation is not claimed.
- **Shots 12–15:** Still absent. Need genuine official SDK/order, approval-before-capture, explicit capture and fresh matching provider evidence. A configured footer or Pay button is insufficient.
- **Shots 16–17:** Still absent. Need actual final provider-linked export bytes and successful retained-prefix UI verification, then a real altered-copy failure with original preserved. Existing prepayment exports do not complete these scenes.

All seventeen final-film reviews remain pending until actual composition frames exist. Root retains provider/account actions; this review performed no API call, AI request, room action or payment.
