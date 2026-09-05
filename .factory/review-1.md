# Review 1 — compare photo handoffs before export

**Work order:** `photo-edit-sidecar-check-review-1`  
**Reviewed:** 2026-09-05 UTC  
**Live URL:** https://photo-edit-sidecar-check.sociobot.in  
**Implementation candidate:** `ba8f2324ba01575b1e955393e5f8c7df46e85289`  
**Documentation HEAD:** `33c4ddbe057ba688f0c29f425b1b8fda0d690676`  

## Verdict: **FAIL**

There are **6 findings** and **16 untested public claims**. This is not a
strict PASS. The core local checker works, but the required one-click,
isolated sample workflow and the claims evidence system do not exist.

## First screen, before scrolling

- **Job:** compare an original photo/sidecar with a handoff and identify
  whether visible edits, ratings, keywords, and capture date survive.
- **Audience:** photographers moving edited RAW or DNG files between phone and
  desktop photo tools.
- **First action offered:** `Check a handoff`, which jumps to empty file
  controls. There is no `Try it with sample data` action or explanation of a
  result it will load.

Fresh desktop (1440 px) and iPhone 13 (390 px) contexts showed the same
landing screen: `Know what survives before you export.`, followed by a
28-word comparison sentence and `Check a handoff`. Neither context contained
`demo` or `sample data` text before or after scrolling.

## Findings

### P1 — The required demo sandbox is absent

The landing screen has no one-click sample action. `/demo` returns the normal
empty home page, not an isolated sample session. There is no `?demo=1` state,
sample fixture, persistent `Demo — sample data, nothing is saved` label,
`Reset demo`, `Start for real`, separate demo storage namespace, or
`.factory/demo.md`.

**Impact:** a cold visitor cannot see a realistic populated report without
supplying personal files. The required sample, reset, and proof that the demo
does not change real data cannot be exercised.

**Evidence:** fresh desktop and phone browser DOM checks found no demo text;
live `/demo` was HTTP 200 with the normal home title and home `<h1>`.

### P1 — Public claims have no required claim register or claim tests

`.factory/claims.json` is missing. Therefore there are no declared claim
commands to run and no tests tagged `@claim:<id>`. The existing general
Vitest/Playwright tests are useful regressions but do not satisfy the claims
contract's manifest-to-observable-outcome requirement.

**Untested public claims: 16.** The unique claims identified across the
landing page, legal pages, and README are: local/device-only processing;
comparison of source/handoff; detection of visible-edit, rating, keyword, and
capture-date survival; report download; no upload; no account; originals are
untouched; the listed format support; offline open-session/reload behaviour;
no analytics/tracking; browser-only storage of photos/reports; local Pro
history; a 25-report history limit; free checker/report download; $12
one-time Pro purchase; and license verification sending only the token.

**Impact:** visitors are asked to rely on privacy, offline, storage, format,
export, and paid-feature promises without the required fresh-demo proof.

### P2 — Unknown URLs do not show a designed HTTP 404 page

`/no-such-page` and `/404` both returned HTTP 200 and rendered the normal home
page (`Know what survives before you export.`). The checked
`public/staticwebapp.config.json` supplies only navigation fallback and has
no 404 response override; there is no `404.html`.

**Impact:** a broken or mistyped link is indistinguishable from the home page,
and the required recovery route is absent.

### P2 — The first screen does not meet the plain-words entry contract

The headline `Know what survives before you export.` is a slogan, not the
plain job in the user's words. It does not name photo handoff comparison or
photographers. The 28-word lede exceeds the 22-word limit. The action is an
empty-state jump rather than the required sample action and does not say what
will happen after it is clicked.

**Impact:** the job, audience, and first action are not stated plainly enough
for a cold mobile visitor.

### P2 — Required metadata and standard site structure are incomplete

The live rendered head has a title, description, canonical link, and favicon,
but no Open Graph tags, Twitter card tags, or Apple touch icon. The canonical
is also the home URL on `/privacy` and `/terms`. The header omits the required
Demo and Privacy navigation links. The footer omits `Built by Param Factory`
and a version/build identifier. The CSP does not include a response-header
`frame-ancestors` directive.

**Impact:** shared previews, device bookmarking, route identity, and the
required consistent site skeleton are incomplete.

### P3 — Required review-support artifacts are missing

There is no `.factory/copy-audit.md`, so the required sentence word-count,
banned-word, and terminology audit was not supplied. The accessibility
instruction's `verify-url.sh` is also absent, so that required checker could
not be run from the documented clean setup.

## Passing evidence

- In a clean detached checkout at documentation HEAD, `npm ci`, `npm test`,
  and `npm run build` passed. `npm test` reported Vitest 5/5 and Playwright
  10/10; the build produced `dist/index.html`, 31.59 kB JS (11.77 kB gzip),
  and 16.24 kB CSS (4.37 kB gzip).
- Fresh live desktop and iPhone 13 browser sessions had one `<h1>`, one
  `<main>`, no horizontal overflow, no console/page errors, only same-origin
  requests during the free path, and zero axe serious/critical findings.
  Reduced-motion transition duration was `0.00001s`; the focused control had
  a visible `rgb(21, 90, 120) solid 3px` outline.
- Normal, boundary, invalid, and recovery paths were exercised live. A source
  DNG/XMP and a JPEG/XMP handoff with rating `0`, `night`/`Lisbon` keywords,
  capture date, and an Adobe Camera Raw signal produced `THIS HANDOFF LOOKS
  READY`; all four checks had positive evidence and the report downloaded as
  `sidecar-check-2026-09-05.txt`. Empty Run said to add a source photo; an
  unsupported `bad.exe` was rejected; then valid inputs recovered normally.
- Live `/privacy` and `/terms` render their respective titles and `<h1>`s.
  The free flow did not make third-party requests. The checkout endpoint
  returned HTTP 303 to hosted checkout without submitting a payment.
- The live index and `assets/index-D3gKfxJF.js` SHA-256 values exactly match
  the candidate build: `ef8e0ae2d7c93c4962294077296569c2ca184424d241ba32b40743fd0e304174`
  and `82cd65e3491d8bb3e14540709e91ee95973c9f470a97d384b7bb52251cfc39d2`.

## Earlier findings and their disposition

| Earlier finding | Current disposition | Current evidence |
| --- | --- | --- |
| P1: released Pro checkout used pilot/404 endpoint | **Resolved** | The production endpoint returned HTTP 303 to hosted checkout. No purchase was submitted. |
| P2: fingerprinted assets lacked immutable caching | **Resolved** | Live hashed JS returned `Cache-Control: public, max-age=31536000, immutable`; the worker returned `no-cache, must-revalidate`. |

The prior release repairs remain correct. They do not resolve the current demo,
claims, 404, first-screen, metadata, and review-artifact findings.

## Commands and scope notes

Executed from a fresh detached checkout after the documented Node prerequisite:

```sh
npm ci
npm test
npm run build
```

No `.factory/claims.json` existed, so there were no declared claim commands to
execute. `verify-url.sh` was also absent. The reviewed implementation is
`ba8f232`; the later `3af9e27` and `33c4ddb` commits are verification/handoff
documentation only and do not change the product image.
