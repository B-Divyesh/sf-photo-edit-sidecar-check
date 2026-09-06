# Edit Sidecar Check

Check which photo edits and tags can survive a handoff.

This browser tool is for photographers moving edited RAW or DNG files between phone and desktop tools. It compares a source set with a handoff set before a batch move.

Live: https://photo-edit-sidecar-check.sociobot.in

Try the isolated sample: https://photo-edit-sidecar-check.sociobot.in/demo

## What it checks

- It compares visible edits, rating, keywords, and capture date.
- It accepts DNG, common camera RAW, XMP, JPEG, TIFF, PNG, WebP, HEIC/HEIF, and AVIF files.
- It distinguishes rendered pixels from app-specific edit instructions.
- It downloads the complete text report for free.
- It reads selected originals without changing them.

The checker does not develop RAW pixels or copy proprietary edit engines. Test one representative image in the destination app before moving a batch.

## Sample demo

Open `/demo` or click **Try it with sample data**. The sample uses an edited Lisbon DNG, XMP, JPEG, and handoff XMP.

The demo opens with a complete four-part report. **Reset demo** restores the sample, and **Start for real** clears demo state.

Demo history uses the `demo:sidecar-check:history` session key. The demo does not read or change real report history.

See [`.factory/demo.md`](.factory/demo.md) for the sandbox contract.

## Privacy and offline use

Selected content stays in the browser during the free check. The free checker does not save selected files or reports.

An open check works without a network. The site uses no analytics, advertising, tracking, or cookies.

License verification sends only the pasted token to the Sociobot billing API. No photo content is sent with that request.

## Pro

Pro costs $12 as a one-time purchase. It saves up to 25 handoff reports in browser storage.

The checker and complete text report remain free. Purchase and license checks use the hosted Sociobot billing API.

## Develop and verify

Use Node.js 20 or newer.

```sh
npm ci
npm test
npm run build
```

`npm test` runs unit checks, builds the production app, and runs desktop and mobile browser tests. The build writes `dist/index.html` and all static files under `dist/`.

Every public claim is listed in [`.factory/claims.json`](.factory/claims.json). Run one claim with its documented command, or run them together:

```sh
npm run test:claims
```

Check a running URL with:

```sh
bash scripts/verify-url.sh http://127.0.0.1:4173
```

## Deploy

Deploy `dist/` as an Azure Static Web App. `public/staticwebapp.config.json` defines supported routes, the HTTP 404 page, security headers, and cache rules.

The repository contains no infrastructure or credentials. It loads no third-party fonts or scripts.

## License

MIT © 2026 Sociobot (Param Factory).
