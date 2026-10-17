---
format: 1920x1080
duration: 100s
message: "Check payment evidence, follow its sources, and keep a human in control."
arc: "Question → deterministic proof → bounded AI → human decision"
audience: hackathon judges and independent sellers
mode: autonomous
music: none
---

This video shows an actual prototype through real UI screenshot sequences. It is a silent, caption-first current-build review; it does not represent a continuous screen recording or a completed hackathon submission. All displayed payment cases are synthetic. The AI response was genuinely generated. PayPal sandbox credentials are not configured.

## Frame 1 — Check before following up

- scene: Real workspace, filtered paid case, then approved-but-unpaid case
- duration: 25s
- transition_in: cut
- status: animated
- src: compositions/frames/01-check.html
- type: hook
- persuasion: Show-don't-tell proof
- beat: clarity
- asset_candidates: assets/overview.png — actual workspace; assets/matched.png — actual filtered paid fixture; assets/unpaid.png — actual approved fixture

narrativeRole: Make the value clear before the mechanism. Check what was captured before calling an invoice paid.
keyMessage: Approval is not capture.
00–08: "Know what's paid. See the proof." SettleProof as a real seller review workspace. The actual overview fills a generous surface. Lower label "Actual UI screenshot sequence · synthetic examples".
08–16: "Filter the queue. Inspect the evidence." Show the actual one-result Matched queue, not a fake cursor or click. AG Grid Community supports the verified filtering/sorting workflow.
16–25: "Approved does not mean captured." The actual approved case shows expected USD120 and net USD0. Caption says this is a synthetic case, not a live payment observation.
Visual direction: restrained ivory/green, readable large captions; a whole actual screenshot first, then a materially larger inspector crop from real images. No fabricated interface. Use timed clips and clean cuts, not simulated interaction. All load-bearing captions at least28px. UI crops must retain their true pixels, never reconstruct them.

## Frame 2 — Follow the source

- scene: Partial capture, cited source value, then unavailable evidence
- duration: 25s
- transition_in: cut
- status: animated
- src: compositions/frames/02-source.html
- type: evidence
- persuasion: Traceable proof
- beat: trust
- asset_candidates: assets/partial.png — actual partial capture checks; assets/source-evidence.png — actual result.net source panel; assets/unknown.png — actual unavailable fixture

narrativeRole: Show why the conclusion is inspectable and how unknown evidence is preserved.
keyMessage: Every finding leads back to an exact source value.
00–09: "A partial capture needs a closer look." The actual inspector shows USD120 expected and USD45 captured. Overlay label "Synthetic fixture". No live-money implication.
09–18: "Follow a finding to its source." Show the actual Source records panel with result.net, analysis.totals.net and45.00USD. Caption "The deterministic result stays authoritative." Use a large actual right-panel crop, not the unreadably small full workspace alone.
18–25: "Unavailable stays unknown." Actual Unknown fixture, not zero or unpaid. Preserve the explicit source label through crop or a clear adjacent caption.
Visual direction: vary the composition with a broad source-panel crop and a concise left-side statement; no decorative statistics, cursor or connector animation. Timed clean cuts only.

## Frame 3 — AI explains; evidence decides

- scene: Actual missing sandbox configuration, then actual generated AI response
- duration: 25s
- transition_in: cut
- status: animated
- src: compositions/frames/03-ai.html
- type: mechanism
- persuasion: Transparent scope
- beat: clarity + control
- asset_candidates: assets/sandbox-pending.png — actual configuration dialog; assets/ai-generated.png — actual accepted Workers AI response

narrativeRole: Demonstrate the real AI output without overstating the unfinished PayPal integration.
keyMessage: AI explains cited records and drafts an internal note; it does not change payment facts.
00–10: "PayPal sandbox: setup pending." Show the actual dialog's "PayPal sandbox Not configured" and "AI explanations Configured". Explicit caption "No credentialed PayPal API read is shown in this demo." This is a material limitation, not a success shot.
10–25: "Real AI. Cited evidence. Editable draft." Show the genuine generated response, enlarged via CSS crop of the actual screenshot. Accepted text: "The invoice is partially captured with $45.00 paid. The remaining amount is $75.00." Actual refs expected.amount,result.net,result.outcome,capture.0.amount,result.remaining. Draft: "Review the capture details to determine the next steps." Caption "Workers AI response on a synthetic fixture · check its sources". Never imply the model observed live money. Actual model llama3.3-70b used, but product-value copy does not need technical jargon.
Visual direction: generous image surface with real AI panel legible. Use CSS crop only, never redraw or replace the actual response. Caption and image must not cover one another. Two hard-cut subshots. No inference during render.

## Frame 4 — A human decides

- scene: Actual saved human review, then a quiet public-demo end card
- duration: 25s
- transition_in: cut
- status: animated
- src: compositions/frames/04-review.html
- type: close
- persuasion: Human control
- beat: confidence
- asset_candidates: assets/human-review.png — actual saved browser-local review; assets/overview.png — actual workspace

narrativeRole: Close on the explicit human action and give judges usable project links.
keyMessage: A review note changes no payment state.
00–13: "Review it. Record your decision." Enlarge the real human note/saved-state region. Caption "Saved in this browser. Payment evidence is unchanged." Export controls may be visible, but do not claim downloaded contents were inspected. No transaction is sent.
13–25: "Evidence first. A human decides what's next." SettleProof name plus readable actual URLs: settleproof.ajnasnb.workers.dev and github.com/AjnasNB/settleproof. Label "MIT-licensed prototype · synthetic demo + real AI · PayPal setup pending". This is an honest current-build review video, not a final eligibility assertion. Do not add awards, testimonials, user counts or a win probability.
Visual direction: full scene begins with a real UI crop and ends with a calm typography card. Geist from local licensed font, ivory/green tokens from frame.md. Large legible URL lines, no fake buttons. Timed hard cut. End card holds long enough to read.
