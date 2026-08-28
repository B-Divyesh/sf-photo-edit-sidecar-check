# Independent verification — PASS

**Work order:** `photo-edit-sidecar-check-verify-2`  
**Candidate:** `3af9e27f92957baef4be51f8f1844a55e3b14be4`  
**Live URL:** https://photo-edit-sidecar-check.sociobot.in  
**Verified:** 2026-08-28 UTC

## Verdict

**PASS.** Fresh evidence shows that the live static site is byte-for-byte the
candidate production build and that the two previous release defects are
resolved: the advertised production Pro checkout redirects to a hosted
checkout, and fingerprinted assets have immutable caching. The core local
photo-handoff check works on desktop and 390 px mobile without uploading photo
bytes.

No product source code was changed during this verification.

## Clean-checkout quality gates

A detached clean worktree at exactly the candidate was used:

```sh
git worktree add --detach /tmp/photo-sidecar-audit.sM7pzM 3af9e27f92957baef4be51f8f1844a55e3b14be4
cd /tmp/photo-sidecar-audit.sM7pzM
npm ci
npm test
npm audit --omit=dev --audit-level=high
```

- `npm ci`: installed 70 packages; audit reported **0 vulnerabilities**.
- `npm test`: Vitest **5/5**, `tsc -b && vite build`, and Playwright **10/10**
  (desktop Chromium and iPhone 13/390 px) passed. There is no separate lint
  script; TypeScript checking is part of the exact production build.
- Production output: JS 31,589 B / **11.77 kB gzip**; CSS 16,238 B /
  **4.37 kB gzip**; no webfont payload. The preferred AVIF hero is 130,152 B.
  These are within the 200 kB JS, 50 kB CSS, 120 kB font, and 300 kB mobile
  hero budgets.
- Fresh Lighthouse 12.8.2 mobile run against the live URL: **Performance 99**,
  **Accessibility 100**; FCP 0.9 s, LCP 1.7 s, TBT 130 ms, CLS 0, interactive
  1.7 s. (The initial Lighthouse invocation crashed its tab; rerunning with
  the installed Playwright Chromium plus `--disable-dev-shm-usage --disable-gpu`
  produced this completed report.)

## Independent functional evidence

- Normal handoff: source DNG plus XMP and JPEG plus matching XMP handoff,
  including boundary rating **0**, `night`/`Lisbon` keywords, capture date, and
  an Adobe Camera Raw signal, produced **“This handoff looks ready.”** Rating,
  keywords, and capture date were `Survives`; the JPEG was plainly marked
  `Flattened` rather than pretending its recipe is portable.
- Risk path: source DNG/XMP with rating 5 and a JPEG handoff without metadata
  produced **“This handoff can lose information”** and missing metadata
  evidence. The free **Download report** action produced the dated text file
  containing the source filename and handoff checklist.
- Invalid/recovery paths: Run with no source reports “Add a source photo in
  bay A”; `bad.exe` is rejected with “Skipped unsupported file: bad.exe.” An
  XMP-only source also correctly has no pixel baseline. Adding valid files
  after the rejected input recovers normally.
- A deliberately invalid restored license was saved locally, the `license`
  query parameter was removed from the address bar, exactly one documented
  `api.sociobot.in` verification request was made, and the quiet inactive
  license state rendered with no page/console error. No payment was submitted.

## Browser, accessibility, privacy, and PWA

- Fresh desktop and 390 px live-browser checks found no console errors or page
  errors, no horizontal overflow at 390 px, one `h1`, `lang="en"`, title,
  `main`, meaningful hero alt text, privacy/terms routes, and a visible first
  keyboard focus target: **Skip to checker**, with `rgb(21, 90, 120) solid
  3px` outline. Keyboard file controls and Run completed the real workflow.
- axe-core found **0 serious or critical** violations on the live desktop home
  and 390 px home. The passing product E2E suite additionally exercises axe
  on the rendered report and privacy route.
- Default animation transitions are 180 ms; under reduced motion the measured
  transition duration is `0.01ms`.
- During a free local inspection, request capture contained only the site
  origin. Static inspection and runtime capture found no analytics, tracking,
  remote fonts, or third-party scripts. Photo bytes are read through browser
  `File` APIs; only a voluntarily restored license token is sent to the
  documented billing API. Report history and license state use localStorage.
- PWA: first visit installed and controlled `/service-worker.js`; an explicit
  `registration.update()` completed with active worker scope `/` and cache
  `sidecar-check-v3`. Offline reload rendered **“Offline, not uploaded.”** and
  its **Try again** control. The worker uses `skipWaiting`, claims clients,
  removes old named caches, and is served `no-cache, must-revalidate`.

## Deployment, headers, and paid release checks

- Live `index.html` SHA-256 is exactly the candidate `dist/index.html`:
  `ef8e0ae2d7c93c4962294077296569c2ca184424d241ba32b40743fd0e304174`.
  Live candidate JS, CSS, AVIF hero, service worker, manifest, and offline
  page also matched their local `dist/` SHA-256 values.
- The live JS is `assets/index-D3gKfxJF.js`, matching the candidate build;
  its SHA-256 is
  `82cd65e3491d8bb3e14540709e91ee95973c9f470a97d384b7bb52251cfc39d2`.
- Shell caching is `public, max-age=0, must-revalidate`; hashed JS/CSS/AVIF
  return `public, max-age=31536000, immutable`; the worker returns
  `no-cache, must-revalidate`.
- Live response policies include HSTS, `Referrer-Policy: no-referrer`,
  `X-Content-Type-Options: nosniff`, camera/microphone/geolocation denial,
  and a restrictive CSP permitting only `self` plus the documented production
  billing host for connections/forms.
- The live Buy Pro endpoint is the required production URL. An unfollowed
  request to
  `https://api.sociobot.in/api/v1/products/photo-edit-sidecar-check/checkout`
  returned **HTTP 303** to a `checkout.dodopayments.com` hosted session. The
  invalid-token verify endpoint returned HTTP 200 JSON
  `{ "valid": false, "reason": "invalid" }` with `Cache-Control: no-store`.

## Defects

No open P0, P1, P2, or P3 defects found.

## Scope limits

The verifier did not complete a real payment or create a charge. Checkout
availability, production URL selection, redirect behavior, invalid-token
verification, and returned-token handling were verified without charging a
customer. As documented by the product, proprietary RAW development engines
cannot be proved compatible merely from recipe metadata; the product reports
that as review evidence rather than a guarantee.
