# CLAUDE.md — byehsan/logo

Brand asset repository for byEhsan. Six-facet hexagon mark with full state animation system, HTTP error states, lockup templates, favicon set, and CI release pipeline.

**Current version:** v3.0.0
**GH Pages:** https://byehsan.github.io/logo/ (interactive palette + UI theme customizer)
**npm:** `@byehsan/logo` on GitHub Packages

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
  template.svg              mark (48×48) + 16px gap + dashed slot guide
  blog.svg                  worked example: "blog" sub-brand

index.html                  GH Pages site — interactive facet + UI theme customizer, all states live
preview.html                static offline snapshot (Cobalt palette, no JS)
states.css                  class-driven Option B stylesheet (.state-loading etc.) + light/dark glow/shadow
palette.json                facet geometry + named presets (facets + light/dark UI tokens) + legacy token map
```

## The mark

A regular hexagon (viewBox `0 0 540 540`, centered at `270,270`) with a transparent hexagonal core, split into six quadrilateral facets (`p0`–`p5`, clockwise from upper-right) that give it a 3D beveled-gem look:

```
p0 Upper right   p1 Right   p2 Lower right
p3 Lower left    p4 Left    p5 Upper left
```

- `base.svg` — single-tone: all six facets filled `currentColor`, each at a fixed opacity (0.35–0.74, calibrated from the gradient version's relative lightness) to preserve the facet/bevel look in one color.
- `colored.svg` — each facet is its own two-stop linear gradient (`grad-p0`..`grad-p5`).

## Palette system

`palette.json` (`version: 2`) holds:
- `facetGeometry` — per-facet `label`, `lightnessDelta`/`satDelta` (relative to a base hue/sat/lightness), and `baseOpacity` (for the single-tone mark). These deltas were reverse-engineered from the original supplied hexagon so that plugging Cobalt's hue/sat/lightness back through the tint algorithm reproduces it.
- `presets` — six named presets (`cobalt` *default*, `violet`, `teal`, `ember`, `graphite`, `legacy-brand`). Each carries:
  - `facets` — six `{ light, dark }` gradient stop pairs for the mark
  - `solid` — one representative hex (favicon coloring, wordmark, lockup mark color, webmanifest theme color)
  - `ui.dark` / `ui.light` — a **complete UI palette** (`background`, `surface`, `primary`, `text`, `textMuted`, `border`, `accent`, `success`, `warning`, `error`) that themes the whole page, independent of the mark's own colors
- `tokens` — legacy flat 6-key brand token map, kept for backward compatibility

**Tint-all-facets algorithm** (rebuilds all six facets from one hue): for each facet, `facetL = clamp(baseLightness + lightnessDelta, 8, 92)`, `facetS = clamp(baseSaturation + satDelta, 0, 100)`, gradient stops = `hsl(hue, facetS, facetL±12)`.

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
@byehsan:registry=https://npm.pkg.github.com

npm install @byehsan/logo
```

```js
import { base, stateLoading, http404, palette } from '@byehsan/logo'
import '@byehsan/logo/css'
```

## Lockup system

```
Mark area:  x=0,  y=0, w=48, h=56  (mark at y+4, 48×48)
Gap:        16px  (x=48 to x=64)
Slot:       x=64, baseline y=37, Space Grotesk 600 24px, letter-spacing -0.5
```

Add a sub-brand:
```xml
<text x="64" y="37"
      font-family="'Space Grotesk', system-ui, sans-serif"
      font-size="24" font-weight="600" letter-spacing="-0.5"
      fill="currentColor">sub-brand</text>
```

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
git tag v3.0.0 && git push origin v3.0.0
```

Release artifacts: zip/tarball with all SVGs, PNGs at 7 sizes, favicon.ico, webmanifest, CJS/ESM/CSS bundles, TypeScript defs, palette.json.

## Adding a new state

1. Copy `states/neutral.svg` as template (six `<path id="p0">`..`<path id="p5">` facets, fixed opacity)
2. Write the `@keyframes` with a physical metaphor, set `animation: ... infinite`
3. Add `.state-<name>` rule to `states.css`
4. Add the file to `SVG_FILES` in `scripts/bundle.mjs`
5. Add inline version to `index.html` states grid (`renderStateCells()` in its `<script>`)
6. Document here and bump the version
