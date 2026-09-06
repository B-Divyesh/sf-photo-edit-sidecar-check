# Demo sandbox

## Entry points

- Live: `https://photo-edit-sidecar-check.sociobot.in/demo`
- Local: `http://127.0.0.1:4173/demo`
- Alias: `/?demo=1` changes the address to `/demo` before loading the sample.
- Home action: **Try it with sample data** opens the same demo in one click.

## Sample files

The app builds four bundled `File` objects and sends them through the production parser:

- `Lisbon-Night-042.dng`: source DNG pixel container.
- `Lisbon-Night-042.xmp`: rating 4, three keywords, capture date, exposure, and crop instructions.
- `Lisbon-Night-042-print.jpg`: flattened handoff image.
- `Lisbon-Night-042-print.xmp`: matching rating, keywords, and capture date in a different order.

The first demo screen contains a completed report. It marks visible edits as flattened and the three portable fields as surviving.

## Isolation and reset

The persistent banner reads **Demo — sample data, nothing is saved**. Demo file state stays in memory.

Trying report history uses only `sessionStorage` key `demo:sidecar-check:history`. Demo code does not read these real keys:

- `sidecar-check:history`
- `sb_license:photo-edit-sidecar-check`
- `sb_license_verdict:photo-edit-sidecar-check`

**Reset demo** deletes the demo key and rebuilds the four files and report. **Start for real** deletes the demo key and opens an empty checker.

The claim test `@claim:demo-isolation` places a sentinel in real history. It proves save and reset leave that sentinel unchanged.
