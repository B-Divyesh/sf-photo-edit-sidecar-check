# Edit Sidecar Check — visual thesis

## Direction: cassette-era field zine

The product is a neutral preflight bench for fragile photo handoffs. Its visual language borrows the usefulness of a hand-labelled cassette case and the urgency of a photocopied darkroom zine: physical, annotated, and a little imperfect, but never nostalgic decoration for its own sake. A split cassette window is the central metaphor—source on one reel, export on the other, sidecar data travelling through the tape path. Ruled marks, registration crosses, torn-paper edges, and stamped outcomes explain inspection and transfer.

This is an explicitly light, ink-on-stock interface. It does not provide a dark theme: the warm paper ground is part of the product metaphor, and every surface is painted explicitly.

## Palette

| Token | Value | Use |
| --- | --- | --- |
| Paper | `#F2E9D8` | Page background, warm archival stock |
| Label | `#FFF9EC` | Raised controls and report sheets |
| Carbon | `#171612` | Body and display text |
| Graphite | `#575248` | Secondary text |
| Oxide red | `#B62B24` | Primary action, registration marks |
| Signal blue | `#155A78` | Links, focus, informational status |
| Moss | `#376044` | Survives / good status |
| Amber | `#8A5200` | Review / uncertain status |
| Danger | `#9B1C1C` | Missing / loss status |

All text/background pairings target WCAG AA (4.5:1). Statuses always pair color with icons and literal words.

## Type

- Display: `Arial Narrow`, `Roboto Condensed`, `Franklin Gothic Medium`, system sans-serif. Condensed, uppercase titles recall cassette spine labels without downloading a font.
- Working copy: `Courier New`, `Courier`, monospace. It makes metadata fields and diagnostic values read like a contact-sheet annotation. Minimum body size is 16px.
- Numeric comparisons use tabular figures. Text measures stay under 72 characters.

No remote fonts or third-party scripts.

## Spacing and composition

- Base rhythm: 4px; primary steps: 8, 12, 16, 24, 32, 48, 64.
- A 12-column max-width bench (1180px) collapses to a single stacked rail below 760px.
- Inputs are two clearly numbered tape bays, not generic cards. The report becomes a full-width paper ledger.
- Rules and shadows have deliberate registration offsets (2–5px), creating depth without soft SaaS cards.
- At 390px, the hero art becomes a shallow header strip, controls stack, and the comparison table becomes labelled blocks. Nothing essential is dropped.

## Interaction grammar

- The primary flow is literal: load the source in bay A, load the handoff files in bay B, then run the check.
- Drag state uses a bold dashed inset and `DROP FILES` stamp; the same controls are fully keyboard-operable file inputs.
- Results enter as one report sheet. “Survives”, “missing”, and “review” are printed as plain-language stamps beside evidence.
- All actions give an immediate status in an `aria-live` region. Removing files is reversible only by selecting them again, so removal is explicit and scoped to one filename.
- Pro report history is secondary; the core check and report download remain free.

## Motion

- 180–240ms transform/opacity transitions only: pressed buttons shift like a mechanical key; result rows settle downward from the report header.
- No loops, parallax, flashing, or ornamental motion.
- `prefers-reduced-motion: reduce` disables translations and uses immediate opacity/state changes.

## Asset plan and provenance

The hero is an original landscape illustration of a transparent cassette/photo contact sheet hybrid. It clarifies the product’s model: pixels on one reel, portable metadata on the other, with a questionable handoff in between. It is used as atmosphere beside the core promise, not as evidence of an unsupported capability.

Generation prompt (factory image model, `factory-image`, 2026-08-27):

> Use case: stylized-concept. Asset type: landing-page hero illustration. Primary request: a cassette-era editorial still life explaining a digital photo handoff inspection. Scene: an open translucent audio cassette on a warm cream photocopied contact sheet; the left reel contains a tiny landscape negative, the right reel contains abstract metadata marks and rating dots; a strip of magnetic tape crosses a red grease-pencil registration mark. Style: tactile 1980s darkroom zine collage, screenprint grain, cut-paper edges, slightly misregistered two-color ink, sophisticated museum-publication composition. Wide landscape, hero subject weighted right with calm negative space, no people. Palette: warm paper cream, carbon black, oxide red, faded cyan, muted olive. Lighting: flat scanner-bed light with crisp physical shadows. Materials: scratched acetate, paper fibers, graphite, rubber stamp ink. Constraints: no readable text, no letters, no brands, no logos, no watermark, no UI mockup, no modern phone, no extra cassettes. Avoid: neon gradients, glossy 3D, cyberpunk, photorealistic branded products, illegible fake typography.

Source PNG and JSON prompt live in `assets/src/`. Optimized WebP is generated locally for `public/assets/` and capped below 300 KB. The image is AI-generated and original for this product; this is disclosed in the footer.
