# Edit Sidecar Check

Edit Sidecar Check is a local-first photo handoff preflight for photographers moving edited RAW/DNG files between phone and desktop tools. It compares a source photo plus XMP with the intended export/copy and reports whether visible edits, ratings, keywords, and capture date have evidence of surviving.

Live: https://photo-edit-sidecar-check.sociobot.in

## What it does

- Reads common EXIF/TIFF and XMP fields locally in the browser.
- Distinguishes rendered pixels from app-specific develop instructions.
- Compares ratings, keyword sets, capture dates, and visible-edit evidence.
- Generates a plain-language risk report and downloadable handoff checklist.
- Keeps an open inspection session working without a network and provides a clear offline reload state; it never modifies or uploads a photo.

It is not a RAW developer and cannot guarantee that one editor interprets another editor’s proprietary recipe. The report makes those limits explicit.

## Develop and verify

Requires Node.js 20 or newer.

```sh
npm ci
npm run dev
npm test
npm run build
```

`npm test` runs Vitest unit coverage, creates a production build, and runs desktop/mobile Playwright accessibility and workflow smoke tests. The exact deployment build command is `npm run build`; output lands in `dist/` with `dist/index.html` at its root.

## Deploy

Deploy `dist/` as an Azure Static Web App. `public/staticwebapp.config.json` supplies SPA navigation fallback and security headers. The repository contains no infrastructure, secrets, or third-party runtime scripts.

## Privacy and Pro

Photos and reports stay on the device. There are no analytics or tracking scripts. The optional $12 one-time Pro unlock stores local report history; checkout and license verification use the hosted Sociobot billing API. The full checker and report download remain free. See `/privacy` and `/terms` in the app.

The researched scope is in `.factory/brief.json`; the cassette-era visual system and original asset provenance are in `.factory/design.md`.

## License

MIT © 2026 Sociobot (Param Factory).
