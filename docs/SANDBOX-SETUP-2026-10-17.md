# Dedicated Sandbox setup — 17 October 2026

The signed-in PayPal Developer dashboard showed only Default Application. Created the approved Merchant application **SettleProof Hackathon**, attached to the existing IN Sandbox business account. The dashboard confirmed the new app name and Sandbox mode.

Read the dedicated test credentials privately, stored them in ignored `.dev.vars` and an ignored private bulk file, and uploaded both keys through Wrangler to the existing Worker's encrypted secrets. Secret values were never printed or committed. Git confirms both local credential files are ignored. No production credential was used.

This completes app credential setup only. At this checkpoint no authenticated order, approval or capture has been exercised. Genuine provider validation and the new video remain pending. The pre-existing authorization limits fictitious test orders to USD20 total.
