# Shared UI / Worker contract

The endpoints below describe the original evidence desk. The new agreement-room types are in `src/agreements/types.ts`; setup and bounds are in `docs/AGREEMENTS-SETUP.md`.

## Agreements

- GET `/api/agreements/config` → `{environment:'sandbox',configured,clientId?}`. The client ID is public SDK configuration, never the secret or OAuth bearer.
- POST `/api/agreements` with `AgreementTerms` → `{room,buyerCapability,sellerCapability}`. The new capabilities are returned only here. Public creation is globally quota-limited.
- GET `/api/agreements/:id` with `X-Role-Capability` → `{room,role}`. The role comes from the stored capability hash, not the URL's role label.
- POST `/api/agreements/:id/actions` with that header and an `AgreementAction` → `{room,role,approvalUrl?}`. Every action names the expected terms version. The server derives payment amount/reference from the stored milestone; amounts or callback payment results are not accepted in this body.
- GET `/api/agreements/:id/export` with that header → `ReceiptPacket`.
- POST `/api/agreements/verify` with a packet or `{packet,retainedAnchor?:{sequence,hash}}` → `ReceiptVerification`. The retained anchor is checked at its earlier prefix; internal consistency alone does not prove truth or identity.
- POST `/api/agreement-draft` with `{brief,amounts:string[]}` → `{status:'generated'|'unavailable'|'invalid',milestones:[{title,amount,criteria}],questions,message,model?}`. Fixed amounts are restored by server code, never taken from model output. This endpoint uses the core error envelope below.

Agreement-route errors use `{error:{code,message}}` and non-2xx HTTP status. The evidence/draft endpoints use `{error:string,code:string}`. API query parameters are rejected; capabilities belong in headers, with private invite access in the browser fragment. The prototype's only payment writes are explicit human-triggered Sandbox create/capture actions. AI has no financial tools.

## Evidence desk

- GET /api/config -> {paypalConfigured:boolean, aiConfigured:boolean, paypalEnvironment:'sandbox', model:string}
- GET /api/scenarios -> {scenarios:[{id,title,note,expected:{invoiceId,amount,currency}}]}. Synthetic cases only.
- POST /api/reconcile body {mode:'fixture',scenarioId} OR {mode:'sandbox',orderId,expected:{invoiceId,amount,currency}} -> Analysis below.
- POST /api/explain same input (server recomputes; no trusted client facts) -> {analysis:Analysis,ai:{status:'generated'|'unavailable'|'invalid',text:string,evidenceIds:string[],draft:string,model?:string}}
- Errors -> {error:string,code:string}; normal non-2xx HTTP codes.

Analysis: {caseId, invoiceId, environment:'fixture'|'paypal-sandbox', observedAt, expected:{invoiceId,amount,currency}, order:{id,status}, captures:[{id,status,amount,currency}], totals:{paid:string|null,refunded:string|null,net:string|null,remaining:string|null}, outcome:'paid'|'partial'|'unpaid'|'review'|'unknown', findings:[{id,kind:'pass'|'warn'|'block',title,detail,evidenceIds:string[]}], evidence:[{id,label,source,path,value:string}]}

Amounts are decimal strings. Unknown is null, never fabricated zero. Support USD/EUR/GBP with 2 decimal places initially; reject unsupported currencies. Every reference must resolve to evidence. Worker owns src/shared.ts types. UI owns frontend files. Fixtures and sandbox observations must stay visibly different. Server keeps credentials and removes PayPal payer/merchant personal information from output.
