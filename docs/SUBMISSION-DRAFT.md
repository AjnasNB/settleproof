# SettleProof — submission copy for review

Do not submit this document verbatim until the live walkthrough, screenshots and video are verified. This draft describes the intended delivered product; remove or revise any capability that does not pass the release checklist.

## One-line pitch

An evidence desk that turns PayPal payment records into a cited reconciliation decision and a careful AI-written next step.

## Inspiration

A seller's question is rarely just “what does this status say?” It is “does this payment cover the right invoice, in the right currency, for the right amount?” A confident explanation is harmful if it quietly ignores a pending capture, a refund or an invoice mismatch. We wanted the explanation to remain attached to the evidence behind it.

## What it does

SettleProof checks expected invoice details against fresh PayPal sandbox order and capture data. It shows a deterministic outcome, outstanding evidence and the individual facts behind each check. Synthetic examples make failure modes easy to inspect, while a separate live sandbox path prevents a fixture from masquerading as a provider observation.

AI turns the checked evidence into a concise explanation and draft internal review note. The server recomputes the analysis, validates evidence references and keeps the deterministic facts authoritative. The model cannot pay, refund, capture a payment, email a buyer or edit payment amounts.

The AG Grid Community queue is part of the working workflow: filter and sort case rows, select a case for evidence review, and export the queue as CSV. These features make the reconciliation desk usable beyond a single chat response. We use Community components, with no Enterprise-only capability or license purchase claimed.

## How we built it

React, TypeScript, Vite and AG Grid Community on the frontend; a Cloudflare Worker for provider access, deterministic checks and the AI explanation boundary. PayPal REST OAuth stays server-side. The integration reads Orders v2 and current Payments v2 capture details through sandbox endpoints. Cloudflare Workers AI supplies `@cf/meta/llama-3.1-8b-instruct-fp8` explanations when explicitly enabled. A SQLite Durable Object atomically reserves at most 20 inference attempts per UTC day, including failed attempts; this limits attempts rather than monetary charges.

SettleProof is new work begun on 17 October 2026. Earlier projects influenced the focus on payment evidence and cited context; this is not a claim that those projects were built during this event, nor a resubmission of their source or grant-funded deliverables. We claim no production customers or transaction volume.

## Challenges and boundaries

The difficult part is preserving uncertainty: an approved order is not itself a completed capture, a partial refund does not necessarily reveal a trustworthy net balance, and a provider timeout should not become a zero balance. Unsupported currencies and malformed expectations are rejected. Explanations must cite existing evidence and remain subordinate to the checked result.

This prototype is deliberately limited to sandbox observations, explicit synthetic cases and a narrow supported currency set. It is not a production bookkeeping service or a security audit. No third-party customer data is needed to reproduce it.

## AI and tools disclosure

Runtime AI: Cloudflare Workers AI, model `@cf/meta/llama-3.1-8b-instruct-fp8`, used to explain sanitized deterministic evidence and draft a proposed internal review note. An unavailable or invalid result is identified rather than presented as a successful model response. An accepted live inference has not yet been recorded in the current release evidence.

Development assistance: OpenAI Codex and cooperating coding agents assisted with planning, implementation, documentation and tests. Ajnas N B is the project owner and reviews the result. Do not claim the generated implementation was hand-written or that tests establish real-world adoption. The final release must name any additional model/tool actually used in its demo or development.

## Final materials to attach

Attach the verified public repository, runnable instructions or hosted build, and a public YouTube demo showing the real product. Use actual live footage of the sandbox read and enabled model explanation; charts, narration or synthetic screens alone do not prove integration. Final screenshot, repository and video URLs belong in the submission form only after they exist and are accessible.
