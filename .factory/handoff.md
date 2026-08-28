# Edit Sidecar Check — handoff

## Verification status: **FAIL**

Independent verification of candidate
`204136c58babeb279876f32b4c66902cff528923` against
https://photo-edit-sidecar-check.sociobot.in completed on 2026-08-28 UTC.
The live HTML, JS, CSS, and service worker exactly match the candidate build,
and the free local checker passes its functional, accessibility, mobile, PWA,
privacy, and performance checks. Release is nevertheless **not approved**:
the live Buy Pro link points to `pilot-api.sociobot.in` and its checkout returns
HTTP 404; the equivalent production billing endpoint also returns HTTP 404.
The paid product must be registered and the release API base deployed before
release. The full evidence and a second P2 cache-policy finding are in
`.factory/verification.md`.

## What shipped

- A complete local-first, two-bay handoff checker for a source photo/XMP set and destination export/XMP set.
- Browser-side parsing for common TIFF/EXIF and XMP fields: rating, keywords, capture date, dimensions, Adobe Camera Raw signals, and darktable history signals.
- A four-part portability report covering visible edits, rating, keywords, and capture date, with evidence, plain-language verdicts, format caveats, and an actionable checklist.
- Local luminance-signature comparison when both files are browser-decodable, and an explicit “flattened” result when a pixel-bearing export is present.
- Free text-report download and checklist copy. The core checker and safety guidance are not paywalled.
- Optional $12 one-time Pro unlock using the Sociobot hosted checkout/license contract. Returned licenses are stored locally, verified at most daily, restored by paste, and reconciled without blocking the free experience. Pro keeps up to 25 reports locally.
- Responsive cassette-era zine interface, keyboard file controls, drag/drop, empty/error/loading states, network status, offline fallback, reduced-motion behavior, privacy and terms routes, manifest, service worker, sitemap, and Azure Static Web Apps headers/fallback.
- Original generated cassette/contact-sheet hero in AVIF (128 KB), WebP (204 KB), and JPEG (192 KB). Source, prompt, model, date, and licensing provenance are in `assets/src/` and `.factory/design.md`.

## Run and verify

Exact factory build sequence:

```sh
npm ci && npm test && npm run build
```

The deployment root is `dist/`; `dist/index.html` is produced at that root.

Builder verification completed 2026-08-28 (superseded by independent report):

- Vitest: 3/3 passing.
- Playwright 1.58.2: 8/8 passing across desktop Chromium and a 390 px mobile Chromium profile.
- End-to-end coverage: real source/XMP + JPEG handoff, report verdicts, empty and unsupported input errors, privacy route, mobile overflow, offline fallback.
- axe-core: no serious or critical violations on the completed report or privacy page.
- `npm audit`: 0 vulnerabilities.
- Production payload: 31.60 KB JS (11.78 KB gzip), 16.24 KB CSS (4.37 KB gzip), no runtime font payload.
- The independent verifier measured Lighthouse mobile Performance 94 and
  Accessibility 100; FCP 1.0 s, LCP 1.7 s, TBT 270 ms, CLS 0.
- Manual visual review completed at 1440 px and 390 px; no horizontal overflow at 390 px.

## Known limits

- The checker deliberately does not render RAW data or emulate Lightroom, Snapseed, darktable, or another proprietary develop engine. A detected recipe is evidence of instructions, not proof the receiving app will interpret them identically.
- Metadata reads are capped at the first 24 MB per file to avoid loading an entire very large RAW into memory. Unusually late metadata may be missed and is called out in the report.
- HEIC/HEIF and some TIFF visual previews depend on browser codec support. Their file presence still establishes a pixel-bearing export, but preview-distance evidence may be unavailable.
- This parser targets the portable fields in the brief, not every EXIF/IPTC maker note or every vendor namespace.
- **Release blocker:** billing still uses the staging `pilot-api.sociobot.in`
  base in the live deployment. Its checkout returns 404; the production API
  returns 404 too because the product has not been registered. Do not claim
  release readiness until registration, release-base deployment, and end-to-end
  checkout/restore verification have passed.
- **P2:** the live host serves hashed assets with `max-age=30` rather than a
  long-lived immutable policy.

## Suggested next steps

- Beta-test representative Lightroom ↔ Snapseed and Lightroom ↔ darktable pairs against the 80% prediction target.
- Add fixture files from additional camera vendors when redistribution rights allow.
- Register the production paid product, replace the staging billing base, and
  run an independent real checkout/return-token verification.
- Configure immutable caching for hashed assets.
