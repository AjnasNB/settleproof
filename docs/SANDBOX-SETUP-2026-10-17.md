# Dedicated Sandbox setup — 17 October 2026

The signed-in PayPal Developer dashboard showed only Default Application. Created the approved Merchant application **SettleProof Hackathon**, attached to the existing IN Sandbox business account. The dashboard confirmed the new app name and Sandbox mode.

Read the dedicated test credentials privately, stored them in ignored `.dev.vars` and an ignored private bulk file, and uploaded both keys through Wrangler to the existing Worker's encrypted secrets. Secret values were never printed or committed. Git confirms both local credential files are ignored. No production credential was used.

At the initial setup checkpoint no authenticated order, approval or capture had been exercised. The pre-existing authorization limits fictitious test orders to USD20 total.

Subsequent rehearsal completed one USD12 order and one USD12 capture with fictitious funds. A separate US Personal Sandbox fixture supplied the buyer; the merchant remained the dedicated IN Business fixture. Credentials and fixture account screens remain private. No live account, live payment source or real funds were used. See `LIVE-REHEARSAL-2026-10-17.md` for the genuine evidence and remaining limits.
