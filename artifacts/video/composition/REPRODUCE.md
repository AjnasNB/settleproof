# Reproduce the SettleProof review video

This frozen HTML composition is100seconds at1920x1080. It uses genuine UI stills and local font/runtime files. No app credentials, live API calls or external media providers are needed to render it.

From this directory with Node.js/npm available:

```sh
npm run dev
npm run check
npm run render -- --fps 24 --quality high --workers 2 --output renders/settleproof-review.mp4
```

The package scripts pin HyperFrames0.8.168. HyperFrames requires its supported browser/FFmpeg runtime. The root `index.html` is already assembled; preview/render it directly. Four frame HTML files remain editable. `STORYBOARD.md` records the timing and factual scope. The parent site's MIT license applies to authored project source; retain the font's OFL file and original GSAP copyright/license header.

The video intentionally has no audio. Integrated editorial captions make the main claims readable. Payment examples are synthetic. The Workers AI explanation is real, but it explains a synthetic fixture. The PayPal sandbox setup is pending. This is a17October2026 prototype review, not a claim of completed competition eligibility or an accepted submission.

Use only files listed in `PUBLIC-SOURCE-FILES.txt` when packaging this source. Exclude tool caches, history, captured auth pages, package tarballs, vendor extraction folders and rejected/old screenshots. The rendered MP4 is a separate deliverable.
