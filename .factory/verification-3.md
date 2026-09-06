# Check photo handoffs — verification 3

**Work order:** `photo-edit-sidecar-check-verify-3`  
**Verified:** 2026-09-06 UTC  
**Live URL:** https://photo-edit-sidecar-check.sociobot.in  
**Implementation reviewed:** `27a116fa5b9436bb20a40e8e7a2b9901e71d0f16`  
**Documentation reviewed:** `1dcb46d83b14a031b51c4bc94ca09edd4faefe7e`

## Verdict: FAIL

**FAIL — 2 findings, 0 untested declared claims.** The checker, demo, local
processing, routes, and deployment identity work, but the clean browser suite
fails and the populated report has accessibility defects. A PASS requires zero
findings at every severity and a passing quality gate.

## First screen before scrolling

- **Job:** Check what survives a photo handoff.
- **Audience:** Photographers moving edited RAW or DNG files between phone and
  desktop tools.
- **First action:** **Try it with sample data**. It says it loads a filled
  report with one safe transfer and clear evidence.

Fresh 1440 × 1000 desktop and iPhone 13 contexts showed all three before
scrolling. The sample action ended at y=641 on desktop and y=573 in the 664 px
phone viewport.

## Findings

### P1 — Report-entry animation fails mobile contrast checks and the clean browser suite

The report rows use a staggered `row-in` animation that fades each row from
`opacity: 0` to `1`. While those rows are visible at partial opacity, their
text and verdict colors blend with the paper background and fall below 4.5:1.

From the clean candidate, the required `npm test` browser component finished
with **39 passed, 1 failed**. The failing test was:

```text
[mobile] runs the real handoff check and exposes an accessible report
```

Its axe result reports serious `color-contrast` violations on the risk report,
including a `× Missing` verdict at 4.12:1 and explanatory text below 4.5:1.
Fresh live iPhone testing reproduced serious `color-contrast` findings when
axe ran immediately after the demo report appeared. After one second, the
animation had settled and those serious findings disappeared, which confirms
the fade is the cause rather than the final palette.

**Impact:** a populated report can briefly be below the required contrast when
it first appears, and the documented clean `npm test` gate does not pass.

**Repair:** do not animate report text with opacity, or keep it at full opacity
throughout the animation. Re-run the full desktop and mobile browser suite and
axe on an immediately rendered report.

### P3 — The report contains a nested complementary landmark

Fresh axe on the settled mobile demo report reports
`landmark-complementary-is-top-level` (moderate). The report places its
`<aside>` “Limits” landmark inside the page `<main>` landmark.

**Impact:** the landmark outline is invalid for screen-reader navigation.

**Repair:** use a non-landmark `<div>`/`section` for report limits, or move a
true complementary landmark outside the main landmark.

## Checks that passed

- Clean candidate setup: `npm ci` installed 70 packages with 0 reported
  vulnerabilities; unit tests passed **6/6**; `npm run build` passed and wrote
  `dist/`. Output was 38,950 B JavaScript (13,578 B gzip) and 18,481 B CSS
  (4,844 B gzip).
- Every command declared in `.factory/claims.json` was run separately from the
  clean candidate. All **12/12** passed: `sample-comparison`,
  `metadata-comparison`, `demo-isolation`, `local-processing`,
  `originals-unchanged`, `report-download`, `offline-open-check`,
  `accepted-formats`, `pro-history-limit`, `license-token-only`,
  `no-tracking`, and `pro-price`.
- The live page matches the implementation candidate byte-for-byte for
  `index.html`, JavaScript, CSS, AVIF hero, service worker, manifest, offline
  page, and 404 page. The live `index.html` SHA-256 is
  `e7ae4351f79c5ee027b58ea5d06d2f88543b11345dac99696c2bfb051db5786e`.
- `scripts/verify-url.sh` passed live: HTTP 200, correct title and `lang`, one
  `<h1>`, one `<main>`, image alt text, and no console/page errors on home.
- The desktop and phone sample both loaded the four bundled files and a
  completed four-row report. The persistent banner is present as
  **Demo — sample data, nothing is saved**. Saving demo history left a seeded
  real-history sentinel unchanged; Reset demo cleared only
  `demo:sidecar-check:history`. Start for real restores real mode.
- Normal live files produced **This handoff looks ready** with a boundary
  rating of 0, matching keywords and capture date, and a flattened JPEG
  visible-edits result. Empty Run says to add a source photo; `bad.exe` is
  rejected with a next step; valid files then recover normally.
- A sample check continued after the browser context was taken offline: Reset
  demo rebuilt four rows and displayed `Local / offline`. The service worker
  is registered. Reduced motion sets transition duration to `0.00001s`.
- Keyboard focus starts at **Skip to main content**. Desktop and phone have no
  horizontal overflow. Privacy route navigation moves focus to its heading.
- The normal demo path made requests only to the product origin and set no
  cookies. The free checker did not send selected-file content. The license
  verification claim uses the documented production API and checks only the
  token in its declared fixture test.
- `/privacy` and `/terms` return 200 with their own titles and headings. All
  discovered internal links returned 200. The production checkout endpoint
  returned HTTP 303 to hosted checkout; no purchase was submitted.
- A random unknown route deliberately returned HTTP 404 and rendered the
  designed page titled **Page not found — Edit Sidecar Check** with an
  **Open the checker** recovery link. The browser’s failed-resource diagnostic
  for that 404 is expected, not a defect.
- Static policies are present: CSP includes response-header
  `frame-ancestors 'none'`; hashed JavaScript is immutable for one year; the
  service worker is `no-cache, must-revalidate`; `robots.txt` and
  `sitemap.xml` list the public routes.

## Earlier findings

| Earlier finding | Disposition in this verification |
| --- | --- |
| Missing one-click isolated demo | Resolved; live demo is populated, labelled, resettable, and isolated. |
| Missing claims register/tests | Resolved; 12 declared commands all passed independently. |
| Unknown route returned home | Resolved; unknown live route is designed HTTP 404. |
| First screen was not plain | Resolved; job, audience, and sample action are present before scrolling. |
| Incomplete metadata, shell, copy audit, and URL checker | Resolved; routes, header/footer, metadata, copy audit, and URL checker are present. |
| Pilot checkout and immutable-cache failures | Resolved; production checkout is HTTP 303 and hashed assets are immutable. |

## Scope note

No real purchase was submitted. Checkout redirect behavior, fixture license
handling, and production URL selection were verified without a charge.
