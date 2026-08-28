# Verification report — FAIL

**Work order:** `photo-edit-sidecar-check-verify-1`  
**Candidate:** `204136c58babeb279876f32b4c66902cff528923`  
**Live URL:** https://photo-edit-sidecar-check.sociobot.in  
**Verified:** 2026-08-28 UTC

## Decision

**FAIL.** The local-first checker satisfies its core photo-handoff job and the
live deployment is exactly the candidate build, but the released $12 Pro
purchase action is non-functional. It points to the pilot billing host and
that product's checkout endpoint returns HTTP 404. The production endpoint
also returns HTTP 404, so release registration is required as well as the
base-URL switch. A visitor is offered a paid upgrade that cannot be bought.

No product source code was changed during verification.

## Reproducible local evidence

Fresh clean checkout at the candidate:

```sh
npm ci
npm test
npm run build
npx playwright test --reporter=list
```

Results:

- `npm ci`: 70 packages installed; `npm audit` reported 0 vulnerabilities.
- `npm test`: Vitest 3/3 passed; TypeScript production build passed; Playwright
  8/8 passed (desktop Chromium and iPhone-13/390 px Chromium projects).
- Exact production build: `tsc -b && vite build` succeeded and produced
  `dist/`.
- Bundle sizes: JS 31,595 B / 11.78 kB gzip; CSS 16,238 B / 4.37 kB gzip;
  no webfont payload. Both are below the 200 kB JS and 50 kB CSS budgets.
  The AVIF hero is 130,152 B (below the 300 kB mobile-image budget).

Independent browser checks against the production build exercised:

- Normal path: source DNG + XMP and JPEG + XMP handoff, with rating **0**
  (lower boundary), two keywords, capture date, and an ACR edit signal. The
  result was “This handoff looks ready”; all portable fields survived and the
  JPEG was explicitly labelled flattened. The text report downloaded as
  `sidecar-check-2026-08-28.txt`.
- Risk path: the shipped E2E fixture (source DNG + XMP to JPEG with no
  metadata) reports “This handoff can lose information,” a flattened visual
  export, and missing metadata.
- Recovery: pressing Run with no source reports “Add a source photo in bay A”;
  `bad.exe` is rejected with “Skipped unsupported file: bad.exe.” Restoring an
  invalid license ends in a quiet inactive-license state with no page error.
- Keyboard: Tab order reaches skip link, navigation, both file controls, Run,
  purchase/restore controls, and legal links. The skip link received a visible
  `rgb(21, 90, 120) solid 3px` focus outline.
- Responsive/motion: no horizontal overflow at 390 px (`scrollWidth -
  innerWidth = 0`), body text is 16 px, and reduced motion reduces transitions
  to `0.01ms`.
- Browser instrumentation recorded no console errors, page errors, or
  non-local requests during the free inspection flow.

## Accessibility, PWA, performance

- axe-core on the deployed home page: no violations at desktop or 390 px;
  specifically, **0 serious/critical** findings. The normal workflow report
  and privacy route are also covered by the passing E2E axe tests.
- Semantics confirmed on live: `lang=en`, one `h1`, a `main` landmark, title,
  skip link, meaningful hero alt text, legal routes, and visible focus.
- PWA: the live site registers and controls `/service-worker.js`; the passing
  browser test performs a first visit, waits for control, goes offline, reloads,
  and receives the intentional offline recovery page with “Try again.” Static
  inspection confirms cache version `sidecar-check-v3`, `skipWaiting`, client
  claim, and old-cache deletion on activation.
- Lighthouse 12.8.2 against live (mobile defaults): Performance **94**,
  Accessibility **100**; FCP 1.0 s, LCP 1.7 s, Speed Index 1.0 s, TBT 270 ms,
  CLS 0. (The builder's earlier Lighthouse numbers were not used as evidence.)

## Privacy, security, and deployment identity

- File inspection uses browser `File` bytes only. On a normal free-flow load,
  request capture found only same-origin app assets; no analytics, trackers,
  remote fonts, or third-party scripts were requested. Local storage remained
  empty unless a user restores a license; report history is local-only.
- Live response headers include HSTS, `Referrer-Policy: no-referrer`,
  `X-Content-Type-Options: nosniff`, restrictive CSP (`default-src 'self'`),
  and camera/microphone/geolocation disabled by Permissions-Policy.
- `/privacy` and `/terms` both resolve through the SPA and render their correct
  pages. Live CSP permits only the documented billing hosts as connections.
- The live `index.html` SHA-256 is identical to `dist/index.html`
  (`fe73aff224e6e1d8192c8d94c368e1672b0ba61c00612c126e7d9341745d63b5`).
  The live hashed JS, CSS, and service worker also exactly match `dist/`:
  `63164dc2395eb4730880d67aa4f593ad187b93a3db316e39828f7e04a3e6e044`,
  `40cedd14d5f3f86b3a5d025126b4eb702bcdd96096ac2dfffb5585a436834777`, and
  `c882989fb6b82db81efca57c6852cfc90975e142fd9c89d49efd1d7f017f28c4`.
  The deployment is therefore the tested candidate, not a stale/deployment-only
  failure.

## Defects

### P1 — released Pro checkout is unusable (release blocker)

**Evidence:** The live Buy Pro link is
`https://pilot-api.sociobot.in/api/v1/products/photo-edit-sidecar-check/checkout`.
An unfollowed GET on 2026-08-28 returned **HTTP 404**. The release billing host,
`https://api.sociobot.in/api/v1/products/photo-edit-sidecar-check/checkout`,
also returned **HTTP 404**. Source `src/license.ts` hard-codes the pilot base.

**Impact:** A real user cannot make the advertised one-time purchase or unlock
the paid workflow-log feature. This violates the paid-unlock release contract.

**Required resolution:** Register the release product with Sociobot billing,
deploy a release build using `https://api.sociobot.in/api/v1`, then independently
verify checkout, returned-token storage/URL cleanup, and daily verification.

### P2 — hashed assets lack immutable cache policy

**Evidence:** Live `/assets/index-Cz7-X5hn.js` and the immutable-name AVIF both
return `Cache-Control: public, must-revalidate, max-age=30`.

**Impact:** It does not break correctness, but misses the stated static/PWA
long-lived immutable-cache policy and causes needless revalidation.

**Required resolution:** Configure the static host/cache rules so hashed
`/assets/*` receive long-lived immutable caching while HTML and the service
worker remain short-lived/revalidated.

## Acceptance status by area

| Area | Result |
| --- | --- |
| Core local comparison and handoff report | PASS |
| Empty/invalid/recovery paths | PASS |
| Desktop, 390 px mobile, keyboard, focus, reduced motion | PASS |
| axe serious/critical, console/page errors | PASS |
| Privacy and outbound-request behavior | PASS for free flow |
| PWA offline fallback and update design | PASS |
| Build/tests/type checking/bundle budget | PASS |
| Live deployment equals candidate | PASS |
| Paid unlock/check-out end to end | **FAIL (P1)** |
| Immutable hashed-asset caching | **FAIL (P2)** |

