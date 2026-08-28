# Edit Sidecar Check — repair handoff

## Verification status: **PASS**

This repair resolves both findings in independent verification report
`.factory/verification.md` for candidate
`204136c58babeb279876f32b4c66902cff528923`. Runtime repair commit
`ba8f232` was pushed to `main` and deployed to
https://photo-edit-sidecar-check.sociobot.in on 2026-08-28 UTC via the
factory static deployment configuration (Azure deployment
`776ddfad-03b6-44ea-8174-f32c4220a813`).

## Repairs

- **P1 — released Pro checkout:** registered the live, one-time $12 product
  `Edit Sidecar Check Pro` with the Sociobot/Dodo billing catalog and its
  immutable `photo-edit-sidecar-check` product mapping. The product uses the
  required return URL `https://photo-edit-sidecar-check.sociobot.in/` and is
  enabled for production. `src/license.ts` now uses only
  `https://api.sociobot.in/api/v1`; the CSP permits that production host and
  no longer permits the pilot host.
- **P2 — immutable assets:** Azure Static Web Apps configuration now serves
  `/assets/*` with `Cache-Control: public, max-age=31536000, immutable`.
  The shell defaults to `public, max-age=0, must-revalidate`, and
  `/service-worker.js` uses `no-cache, must-revalidate`, so updates remain
  discoverable.

## Exact regression coverage

- `tests/release-config.test.ts` locks the live checkout URL, rejects the
  pilot host, validates production-only CSP, and validates the shell, worker,
  and hashed-asset cache rules.
- The Playwright production-license regression opens `?license=returned-license`,
  verifies token storage and URL cleanup, checks the Buy Pro link, then reloads
  and proves the cached daily verdict prevents a second verification request.
  It runs in both desktop Chromium and the iPhone-13/390 px project.

## Verification evidence

Ran from a clean dependency install:

```sh
npm ci
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

Results: 0 audit vulnerabilities; Vitest **5/5**; TypeScript production build
passed; Playwright **10/10** across desktop Chromium and 390 px mobile; output
is `dist/index.html`. Production payload is 31.59 kB JS (11.77 kB gzip) and
16.24 kB CSS (4.37 kB gzip), within the static budgets.

Post-deploy checks against the live custom domain:

- `verify-url.sh` returned HTTP 200 in 737 ms with no console/page errors;
  title, `lang=en`, one `h1`, `main`, and image alt coverage are present.
- Playwright desktop and 390 px checks found no console errors, no serious or
  critical axe violations, no horizontal overflow, a visible first-tab
  **Skip to checker** focus target, exactly one `h1`, and no third-party
  requests during the free flow. The live Buy Pro link is the production URL.
- A first live visit registered the worker; an offline reload rendered
  **“Offline, not uploaded.”** with **Try again**.
- Live response headers are `Referrer-Policy: no-referrer`,
  `X-Content-Type-Options: nosniff`, restrictive production-only CSP,
  `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and HSTS.
  Live index and hashed JS SHA-256 values exactly match `dist/`.
- Live asset header: `public, max-age=31536000, immutable`; live worker header:
  `no-cache, must-revalidate`; live shell header:
  `public, max-age=0, must-revalidate`.
- `GET https://api.sociobot.in/api/v1/products/photo-edit-sidecar-check/checkout`
  returns HTTP **303** to a hosted `checkout.dodopayments.com` session;
  invalid-license verification returns the expected HTTP 200 JSON
  `{ "valid": false, "reason": "invalid" }` without storing photo data.

Lighthouse’s current CLI crashed its tab in this container despite working
Playwright Chromium; this repair does not add runtime work, and the independent
live baseline recorded Performance **94** and Accessibility **100**. The
browser and axe checks above were completed against this deployment.

## Product behavior preserved

The local-only two-bay inspection workflow, free text report/checklist export,
metadata comparison, keyboard file controls, responsive cassette-era layout,
privacy/terms routes, privacy policy, and PWA recovery all remain unchanged.
Photo bytes never leave the browser. The checkout redirect was tested without
submitting a payment; returned-license behavior is covered by the production
URL regression without creating a customer charge.

## Known limits

- RAW develop recipes remain evidence rather than a promise that another
  editor will interpret proprietary settings identically.
- Metadata inspection is capped at the first 24 MB per file, and browser
  preview support for HEIC/HEIF/TIFF varies by codec.
- A future paid purchase should continue to be smoke-tested with its real
  callback token after any billing-provider or API change; do not create a
  charge merely for routine deploy verification.
