# Reproduce the Agreements film

This source package is a140second,1920×1080,24fps silent film with17 shots. Genuine UI screenshots are frozen locally. No inference, product API, PayPal request, credential, paid asset or remote font is needed to rebuild it. Historical v1 lives separately under artifacts/video.

Use Node.js and HyperFrames0.8.168. Normal scripts are in package.json. A locally installed CLI may be invoked directly to avoid npm download/cache activity. On a constrained system, set TEMP/TMP and the frame-cache directory to an appropriate workspace volume before running the CLI.

```powershell
node build-video.mjs
node audit-assets.mjs
npx --yes hyperframes@0.8.168 check --at 3,9.5,17,25,33,41,49,57,65.5,73.5,81.5,90,99,108.5,117.5,126.5,135.5
npx --yes hyperframes@0.8.168 preview --background --port 3004 --no-open
# Inspect Studio at http://localhost:3004/#project/agreements-video first.
npx --yes hyperframes@0.8.168 render --fps 24 --quality delivery --output settleproof-agreements.mp4 --skill product-launch-video
```

Minimal reproducible public source:

- index.html; build-video.mjs; audit-assets.mjs; hyperframes.json; package.json; .gitattributes.
- compositions/frames/01-scene.html through17-scene.html.
- Exactly16 JPEGs under assets/frozen, listed in source-asset-ledger.json. No original .png capture is needed for playback; the generator accepts an existing frozen file when the original is absent. Original filenames and equal SHA-256 hashes remain in the ledger.
- assets/fonts/Geist-Variable.woff2 and LICENSE-Geist.txt; assets/vendor/gsap.min.js with original copyright/license header intact. Third-party licenses are retained, not replaced by the app MIT license.
- BRIEF.md; frame.md; STORYBOARD.md; shot-status.json; source-asset-ledger.json and its schema; FILM-REVIEW-17.md; REVIEW-A.md; REVIEW-B.md; ASSET-REVIEW.md; REPRODUCE.md; DELIVERY.json after successful encode.

verify-receipts.mjs and RECEIPT-VERIFICATION.json are optional evidence audit source. Running that audit also needs the six root-owned sanitized receipt JSON files named in the script; they are not rendering dependencies. It checks local byte hashes, event chain and retained prefix, not provider authentication.

Exclude MP4, .hyperframes, .media, .thumbnails, node_modules, package tarballs, CLI scaffolding, runtime logs/temp files, any auth/account screenshot and all private capability links/credentials. The final MP4 is a local delivery artifact, not a Git source dependency. Public upload/playback and entry are separately handled by root/user.
