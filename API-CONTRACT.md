# Shared UI / Worker contract

- GET /api/config -> {paypalConfigured:boolean, aiConfigured:boolean, paypalEnvironment:'sandbox', model:string}
- GET /api/scenarios -> {scenarios:[{id,title,note,expected:{invoiceId,amount,currency}}]}. Synthetic cases only.
- POST /api/reconcile body {mode:'fixture',scenarioId} OR {mode:'sandbox',orderId,expected:{invoiceId,amount,currency}} -> Analysis below.
- POST /api/explain same input (server recomputes; no trusted client facts) -> {analysis:Analysis,ai:{status:'generated'|'unavailable'|'invalid',text:string,evidenceIds:string[],draft:string,model?:string}}
- Errors -> {error:string,code:string}; normal non-2xx HTTP codes.

Analysis: {caseId, invoiceId, environment:'fixture'|'paypal-sandbox', observedAt, expected:{invoiceId,amount,currency}, order:{id,status}, captures:[{id,status,amount,currency}], totals:{paid:string|null,refunded:string|null,net:string|null,remaining:string|null}, outcome:'paid'|'partial'|'unpaid'|'review'|'unknown', findings:[{id,kind:'pass'|'warn'|'block',title,detail,evidenceIds:string[]}], evidence:[{id,label,source,path,value:string}]}

Amounts are decimal strings. Unknown is null, never fabricated zero. Support USD/EUR/GBP with 2 decimal places initially; reject unsupported currencies. Every reference must resolve to evidence. Worker owns src/shared.ts types. UI owns frontend files. Fixtures and sandbox observations must stay visibly different. Server keeps credentials and removes PayPal payer/merchant personal information from output.
