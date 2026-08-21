# CLAUDE.md — ortiq-de/logo

Brand asset repository for Ortiq. Six-facet hexagon mark with full state animation system, HTTP error states, lockup templates, favicon set, and CI release pipeline.

**Current version:** v6.0.0
**GH Pages:** https://ortiq-de.github.io/logo/ (interactive facet + UI theme customizer, sub-logo builder)
**npm:** `@ortiq-de/logo` on GitHub Packages

## File tree

```
base.svg                    clean mark, currentColor fill, six facets at fixed opacity, no animation
plain.svg                   black stroke variant (legacy — pre-hexagon triskelion, untouched)
colored.svg                 flagship gradient hexagon (Cobalt palette by default)
gradient.svg                gradient + CSS rotation (legacy — pre-hexagon triskelion, untouched)
animated.svg                legacy CSS rotation (legacy — pre-hexagon triskelion, untouched)

states/
  neutral.svg               double heartbeat pulse — alive, 2.5s loop
  loading.svg               spinning gem: glint chases the six facets + slow turn — patient, 1.8s/6s loop
  success.svg                spring joy bounce + light burst at peak — happy, 2.5s loop
  warning.svg                alert flare chases fast around all six facets — alert, 0.8s loop
  error.svg                  frustrated shake ×3, pause — angry, 2.2s loop

http/
  404.svg                   confused tilt oscillation ±6°, three facets lose focus — lost, 2.4s loop
  500.svg                   glitch → dim (desaturating) → death rattle → flicker — dying, 4s loop
  503.svg                   slow breathe + Zzz floats — asleep, 2s loop
  403.svg                   appears → tries (flushes) → refused → collapses to nothing — 2.8s loop

lockup/
  template.svg              mark (48×48) + 8px gap + dashed text slot guide
  icon-template.svg         mark + 20×20 icon slot (x=56,y=18) + text slot (x=80)
  blog.svg                  worked example: "blog" sub-brand

index.html                  GH Pages site — facet + UI theme customizer, states, sub-logo builder
preview.html                static offline snapshot (Cobalt palette, no JS)
states.css                  class-driven Option B stylesheet (.state-loading etc.) + light/dark glow/shadow
palette.json                facet geometry + named presets (facets + light/dark UI tokens) + legacy token map
```

## The mark

A regular hexagon (viewBox `0 0 540 540`, centered at `270,270`) with a transparent hexagonal core, split into six quadrilateral facets (`p0`–`p5`, clockwise from upper-right):

```
p0 Upper right   p1 Right   p2 Lower right
p3 Lower left    p4 Left    p5 Upper left
```

- `base.svg` — single-tone: all six facets filled `currentColor`, each at a fixed opacity (0.35–0.74, calibrated from the gradient version's relative lightness) to preserve the facet/bevel look in one color.
- `colored.svg` — each facet is its own two-stop linear gradient (`grad-p0`..`grad-p5`).

These static asset files are the pre-v6 "gem" look and are unchanged. **v6's pupil + eye redesign lives in the interactive customizer only** (`index.html`'s live rendering, `buildMarkSVG`/`coloredFacetsMarkup`) — see below.

### v6 — pupil + eye concept (interactive customizer)

The ring reads as an eye: the hexagon is the iris, a centered circle is the pupil. Facets are
rounded-corner shapes (filleted to a 16-unit radius, `roundedFacetPath()`) with a thin same-hue
divider stroke (`facetStrokeAttr()`) — this rounded+stroked treatment applies identically whether
Monochrome is on or off, so toggling Monochrome only ever changes color, never shape.

- **Ring thickness** — slider, 10–50%, default **36%** (inner edge sits at 64% of the outer
  radius). Same `computeHexGeometry(thicknessPct, marginPx)` formula as before, just a new
  default/range.
- **Pupil** — a plain filled circle, `cx=cy=270`, radius = `pupilPct/100 * outerRadius()`.
  Slider 10–60%, default **36%**. Color is always `shade(markSolidColor, -35)` (the same shade as
  the darkest ring facet), so it's derived from the live primary color in both Monochrome states.
  At the defaults (thickness 36%, margin 22 ⇒ `rOuter=248`), the inner hexagon's apothem is
  `rInner·cos(30°) ≈ 137.5`, comfortably clear of the pupil's `≈89.3` radius (~48-unit margin) —
  verified, no collision. Extreme slider combinations (e.g. pupil 60% + thickness 50%) can
  overlap the ring's inner edge; that's an accepted consequence of two independent sliders, not
  clamped against each other.
- **Facet coloring — gradient derived from primary color, not mood-based.** `gradientFacetColors(primaryHex)`
  assigns each of the 6 facets one flat shade — `FACET_LIGHTNESS_OFFSETS = [35, 21, 7, -7, -21, -35]`
  applied to p0..p5 (already sequential clockwise from 12 o'clock) — lightest at p0 (just
  clockwise of 12 o'clock), darkest at p5. No per-facet internal gradient anymore; each facet is
  a single flat fill. This is the **Monochrome-off reference state**. Monochrome-on flat-fills
  every facet to `markSolidColor` (`fillFacetsFlat()`) — same geometry, gradient collapses to one
  color.
- Presets (`renderPresetRow()`'s click handler) now derive their facet colors live via
  `gradientFacetColors(preset.solid)` instead of reading palette.json's per-preset `facets`
  table — that table (and `facetGeometry.lightnessDelta`/`satDelta`, the old asymmetric tint
  deltas) is no longer read by the customizer, kept only for the public `palette.json` schema /
  `dist/index.css`'s per-preset CSS custom properties (`scripts/bundle.mjs`, untouched by v6 —
  those still reflect the old hand-authored table, a known divergence from the live customizer).

## Palette system

`palette.json` (`version: 2`) holds:
- `facetGeometry` — per-facet `label`, `lightnessDelta`/`satDelta` (legacy — no longer read by
  the v6 customizer, see above), and `baseOpacity` (for the single-tone mark).
- `presets` — six named presets (`cobalt` *default*, `violet`, `teal`, `ember`, `graphite`, `legacy-brand`). Each carries:
  - `facets` — six `{ light, dark }` pairs (legacy per-preset table; the live customizer now derives facet colors from `solid` at runtime instead — see v6 above)
  - `solid` — one representative hex (favicon coloring, wordmark, lockup mark color, webmanifest theme color, and v6's gradient/pupil seed)
  - `ui.dark` / `ui.light` — a **complete UI palette** (`background`, `surface`, `primary`, `text`, `textMuted`, `border`, `accent`, `success`, `warning`, `error`) that themes the whole page, independent of the mark's own colors
- `tokens` — legacy flat 6-key brand token map, kept for backward compatibility

## Animation design principle

Every animation uses **physical metaphor** — the motion IS the meaning, no label needed:
- heartbeat = alive, spinning glint = working (light catching a turning gem), spring+flash = happy
- alert flare = urgent, shake = frustrated, tilt+drift = confused
- dim+desaturate+rattle = dying, breathe+Zzz = asleep, appear+flush+collapse = refused

All animations loop infinitely so they can be observed continuously. Filled facets (not stroked petals) mean most effects use `opacity`/`filter:brightness()`/`filter:saturate()` sweeps rather than `stroke-width`.

**Light/dark creative treatment:** in dark mode the mark gets a soft glow (`drop-shadow`, as if it emits its own light); in light mode it gets a soft downward shadow (as if it sits on a lit surface). One CSS layer in `states.css`, composited on top of every state's own animation, driven by `[data-theme]` (or `prefers-color-scheme` as a fallback for standalone files).

## Theming via currentColor

`base.svg`, the lockup marks, and the mark grid all use `fill="currentColor"`. Set `color` on the SVG or any parent:

```html
<svg src="base.svg" style="color: #206de9">
```

## Using state SVGs

**Option A — drop-in (self-contained per file):**
```html
<img src="states/loading.svg" width="48" height="48" style="color:#206de9">
```

**Option B — class-driven (one CSS file):**
```html
<link rel="stylesheet" href="states.css">
<svg class="state-loading" ...> <!-- base mark, id="mark" wrapping id="p0".."p5" --> </svg>
```

Available classes: `state-neutral` `state-loading` `state-success` `state-warning`
`state-error` `state-404` `state-500` `state-503` `state-403`

## Install in other projects

```
# .npmrc
@ortiq-de:registry=https://npm.pkg.github.com

npm install @ortiq-de/logo
```

```js
import { base, stateLoading, http404, palette } from '@ortiq-de/logo'
import '@ortiq-de/logo/css'

// Programmatic lockup generation (v2.4.0+; options added in v5.0.0)
import { createTextLockup, createIconLockup } from '@ortiq-de/logo'

const blogSvg = createTextLockup('blog')  // returns SVG string
const gitSvg  = createIconLockup('git', iconInnerSvg, {
  placement: 'se',        // 'n'|'ne'|'e'|'se'|'s'|'sw'|'w'|'nw' — corners render as a badge, edges sit inline
  width: 320, height: 96, // optional explicit output size (defaults to auto-computed)
  fontSize: 24,           // optional
  fontFamily: 'inter',    // 'space-grotesk' (default) | 'inter' | 'system' | 'serif' | 'mono'
})
// iconInnerSvg = inner markup only, e.g. '<circle cx="6" cy="6" r="3"/>...' (viewBox defaults to
// "0 0 24 24"; a full <svg viewBox="...">...</svg> string also works — only its inner content
// and viewBox are read, since createIconLockup always positions/sizes the icon itself).
```

## Lockup system

The fixed geometry below is the convention baked into the static template files
(`lockup/template.svg`, `lockup/icon-template.svg`, `lockup/blog.svg`). The
`createIconLockup()` JS/npm API (see Install, above) is more flexible — it takes
`options.placement` (8 directions) and `options.width`/`height` instead of this
one fixed east/8px-gap layout, so its output won't exactly match these templates.

```
Mark area:   x=0,  y=0,  w=48, h=56   (mark at y+4, 48×48)
Gap:         8px   (x=48 to x=56)
Text slot:   x=56, baseline y=37, Space Grotesk 600 24px, letter-spacing -0.5
Icon slot:   x=56, y=18, w=20, h=20   (vertically centred in 56px container)
Text+icon:   icon at x=56,y=18; text x=80,y=37
```

Text-only lockup:
```xml
<text x="56" y="37"
      font-family="'Space Grotesk', system-ui, sans-serif"
      font-size="24" font-weight="600" letter-spacing="-0.5"
      fill="currentColor">sub-brand</text>
```

Icon + text lockup (icon slot is 20×20 at x=56,y=18, text starts at x=80):
```xml
<svg x="56" y="18" width="20" height="20" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round">
  <!-- icon paths -->
</svg>
<text x="80" y="37" font-family="'Space Grotesk',system-ui,sans-serif"
      font-size="24" font-weight="600" letter-spacing="-0.5"
      fill="currentColor">sub-brand</text>
```

## GH Pages — Sub-brand logo generator

The interactive generator at https://ortiq-de.github.io/logo/ lets designers:
- Type a sub-brand name, tune font size, toggle a background fill
- Add an icon: pick one of 8 presets (git/globe/home/code/star/mail/rss/docs), upload an SVG file, or paste custom SVG code
- Apply any of the six mark presets, or set an explicit mark/background color
- Live preview updates instantly; download as SVG or PNG at ½×/1×/2×/4× scale, or copy the SVG source

## Favicon artifacts (in dist/ after build)

```
dist/favicons/favicon.svg          scalable, for modern browsers
dist/favicons/favicon.ico          multi-size: 16, 32, 48
dist/favicons/favicon-16x16.png
dist/favicons/favicon-32x32.png
dist/favicons/apple-touch-icon.png (180×180)
dist/favicons/favicon-192x192.png
dist/favicons/favicon-512x512.png
dist/site.webmanifest
```

Favicon HTML:
```html
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">
```

## CI / versioning

- **Every push to main:** SVG validation (xmllint) + GH Pages deploy
- **Tag push (`v*.*.*`):** full release bundle + npm publish

```bash
git tag v6.0.0 && git push origin v6.0.0
```

Release artifacts: zip/tarball with all SVGs, PNGs at 7 sizes, favicon.ico, webmanifest, CJS/ESM/CSS bundles, TypeScript defs, palette.json.

## Adding a new state

1. Copy `states/neutral.svg` as template (six `<path id="p0">`..`<path id="p5">` facets, fixed opacity)
2. Write the `@keyframes` with a physical metaphor, set `animation: ... infinite`
3. Add `.state-<name>` rule to `states.css`
4. Add the file to `SVG_FILES` in `scripts/bundle.mjs`
5. Add inline version to `index.html` states grid (`renderStateCells()` in its `<script>`)
6. Document here and bump the version
