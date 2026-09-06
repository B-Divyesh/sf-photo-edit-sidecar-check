# Edit Sidecar Check — repair 2 handoff

## Release status

**Ready for review.** All six review findings and all 16 previously untested-claim findings were repaired at their causes.

- Live URL: `https://photo-edit-sidecar-check.sociobot.in`
- Demo URL: `https://photo-edit-sidecar-check.sociobot.in/demo`
- Deployed implementation SHA: `27a116fa5b9436bb20a40e8e7a2b9901e71d0f16`
- Documentation SHA: the later commit containing this handoff; the exact SHA is reported with the work-order result.
- Deployed UTC: 2026-09-06

The live `index.html` SHA-256 is `e7ae4351f79c5ee027b58ea5d06d2f88543b11345dac99696c2bfb051db5786e`. It matches the candidate build.

## What changed

- Added a one-click **Try it with sample data** action on the first screen.
- Added `/demo` and `?demo=1` entry points with four realistic bundled files.
- The sample runs through the production parser and opens on a completed four-row report.
- Added the persistent demo label, reset action, real-mode exit, and isolated `demo:` session storage.
- Added `.factory/demo.md` and a browser test proving real history is neither read nor changed.
- An in-progress real file selection is kept in memory and restored after leaving Demo.
- Added `.factory/claims.json` with 12 public claims and one outcome test per claim.
- Rewrote the first screen with the job, audience, next action, and three plain facts.
- Added `.factory/copy-audit.md`; no landing sentence exceeds 22 words or uses a banned term.
- Added route-specific titles, descriptions, canonicals, Open Graph data, Twitter data, and touch icon.
- Added Demo, Checker, and Privacy header links plus the required footer identity and build label.
- Added a designed cassette-style HTTP 404 response with a route back to the checker.
- Added `frame-ancestors 'none'` as a response header and retained the existing security and cache rules.
- Added a 1200×630 social image derived from the product’s original cassette art.
- Kept the $12 one-time Pro history offer, restore flow, production checkout, and daily license cache.
- Removed the unsupported workflow-presets wording. Pro still saves up to 25 local reports.
- Added the worker-compatible URL checker under `scripts/`.

## Earlier findings

| Finding | Disposition | Evidence |
| --- | --- | --- |
| Missing one-click demo and sandbox | Resolved | `/demo`; `.factory/demo.md`; `@claim:sample-comparison`; `@claim:demo-isolation` |
| Missing claims register and claim tests | Resolved | `.factory/claims.json`; all 12 declared commands pass independently |
| Unknown URLs showed home | Resolved | A random live URL returns HTTP 404 and the exact `dist/404.html` body |
| First screen used slogan copy | Resolved | Live phone and desktop show “Check what survives a photo handoff” and the sample action before scrolling |
| Incomplete metadata and site skeleton | Resolved | Route metadata, social preview, touch icon, header, footer, CSP, sitemap, and route tests |
| Missing copy audit and URL checker | Resolved | `.factory/copy-audit.md`; `scripts/verify-url.sh`; worker checker also passed live |
| Pilot checkout URL | Remains resolved | The live production checkout endpoint returns HTTP 303 |
| Missing immutable asset caching | Remains resolved | Live hashed JS returns one-year immutable caching; the worker is revalidated |

## Clean verification

A detached worktree at deployed candidate `27a116f` was used for the final clean verification. From that clean checkout:

```sh
npm ci
npm test
# every `test` command in .factory/claims.json, one at a time
npm run build
```

Results:

- `npm ci`: 70 packages, 0 vulnerabilities.
- Vitest: 6/6 passed.
- Playwright: 40/40 passed across desktop Chromium and iPhone 13 settings.
- Declared claims: 12/12 commands passed individually.
- TypeScript and Vite production build passed.
- All 12 manifest commands passed again at the exact deployed SHA.
- Output: 38,950 B JS and 18,481 B CSS before gzip.
- Gzip: 13,548 B JS and 4,849 B CSS.
- Hero AVIF: 130,152 B.

Run the same gates with:

```sh
npm ci
npm test
npm run test:claims
npm run build
```

## Live verification

- The factory `verify-url.sh` passed the custom HTTPS origin with no console or page errors.
- Fresh 1440×1000 and 390×844 contexts showed the job and sample action before scrolling.
- Both contexts entered `/demo`, showed the persistent label, and rendered all four report rows.
- Demo save and reset left a real-history sentinel unchanged and removed the demo key.
- Both contexts had zero horizontal overflow and zero serious or critical axe findings.
- Keyboard focus began on **Skip to main content** with a 3 px blue outline and 4 px offset.
- Reduced motion changed the measured transition duration to `0.01ms`.
- `/privacy` and `/terms` returned HTTP 200 with correct titles and headings.
- A random unknown path returned HTTP 404 with the designed not-found title and heading.
- The browser reports the expected failed-document diagnostic for that deliberate 404 only.
- The live normal path handled rating `0`, matching keywords, dates, and a flattened JPEG.
- Empty, unsupported, and recovery paths produced clear messages, then completed normally.
- The live report downloaded with source names, all checks, and the handoff checklist.
- Free and demo flows made no cross-origin requests.
- The live checkout endpoint returned HTTP 303 without submitting a payment.
- Live hashed assets use `public, max-age=31536000, immutable`.
- The live service worker uses `no-cache, must-revalidate`.

Live Lighthouse 12.8.2 mobile results:

- Performance: **100**
- Accessibility: **100**
- Best practices: **100**
- SEO: **100**
- FCP: **0.9 s**
- LCP: **1.7 s**
- TBT: **0 ms**
- CLS: **0**

Evidence is under `/work/.evidence/`, including browser JSON, screenshots, Lighthouse JSON, response headers, catalog copy, and billing metadata.

## Known limits

- No purchase was charged. Checkout availability, URL selection, token restore, and fixture verification were tested.
- A proprietary RAW recipe remains evidence, not proof that another editor will render it identically.
- Metadata inspection reads at most the first 24 MB of each file.
- Browser preview support for HEIC, HEIF, and TIFF still depends on the installed codec.
- The public offline promise covers a check that is already open. A first visit still needs a network.

## Next steps

- Use representative files from each target phone-to-desktop workflow during beta testing.
- Measure whether photographers correctly predict the four field outcomes before a batch move.
- Smoke-test one real returned license after any billing-provider or billing-API change.
