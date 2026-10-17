---
workflow: product-launch-video
flow: automation
storyboard: no
message: "Payment evidence stays authoritative. AI explains cited findings. A human reviews what happens next."
destination: youtube
aspect: 1920x1080
language: en
audience: hackathon judges and independent sellers
length: 100s
angle: actual product demonstration
narration: no
---

## Intent

Create an 80–110 second SettleProof hackathon demo using real product UI captures. The user asked to finish the work autonomously and use multiple agents. The parent explicitly chose an actual-UI screenshot sequence and allowed a caption-first edit. Target 100 seconds and a landscape YouTube upload, within the hackathon's under-three-minute requirement. The telling follows one invoice from queue to findings, source evidence, AI explanation and human review.

## Assets

- ../../screens/ — actual CUA screenshots. Initial captures are provisional until the current build is stable. Stage only final, inspected captures.
- ../STORYBOARD.md — initial editorial plan and unresolved integration shots.

## Customizations

- Use the app's own green/ivory palette and readable captions. No generated interface, fake cursor, invented network response, image generation, paid media or music purchase.
- Keep synthetic fixture labels visible. Show actual sandbox or generated AI results only after they are independently observed.
- Caption-first, silent demo is an explicit parent-approved option. Choose silence to prioritize judge readability and minimize production overhead.

## Notes

- Source UI: http://localhost:8797/ during development. All computer interactions/captures must use CUA. Do not run an independent browser crawler.
- PayPal is not configured. One initial authorized AI request returned unavailable; the parent subsequently observed an accepted hosted70b-model response, retained in artifacts/ai-ui-proof.json and final-ai-generated.png. This final edit may show that real AI response on the synthetic partial fixture. No credentialed PayPal observation exists.
- Screenshot sequences may demonstrate real states but must not masquerade as a continuous screen recording.
- No public uploads or submission by this agent. Final Studio preview and quality evidence precede the local render. The user explicitly authorized autonomous finish/create-video, and the parent confirmed that the persistent user authorization overrides the skill's additional render question. Local rendering is authorized; public upload and contract acceptance are separate actions.
- No personal defaults or recipes were found. Destination, aspect and language were derived from the hackathon context; do not record them as user-confirmed personal preferences.
