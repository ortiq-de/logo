# Ortiq logo system

Six-facet hexagon mark with full state + lockup system. All assets theme via CSS `currentColor` (single-tone) or per-facet gradients (colored).

## File tree

```
base.svg                    clean mark, currentColor fill, six facets at fixed opacity
states/
  neutral.svg               double heartbeat, alive, 2.5s loop
  loading.svg                spinning gem: glint chases the six facets + slow turn, 1.8s/6s loop
  success.svg                 spring bloom with light burst at the peak, loops
  warning.svg                  alert flare chases fast around all six facets, 0.8s loop
  error.svg                    horizontal shake ×3, then pause, loops
http/
  404.svg                   tilt oscillation ±6°, three facets lose focus
  500.svg                    glitch → dims and desaturates → death rattle → flicker
  503.svg                     slow breathe + Zzz floats up-right, 2s loop
  403.svg                      appears → tries (flushes) → refused → collapses, loops
lockup/
  template.svg              mark + gap + dashed slot guide
  blog.svg                  worked example: "blog" sub-brand
preview.html               static offline snapshot of all marks + states (Cobalt palette)
states.css                 all @keyframes as class-driven selectors (Option B) + light/dark glow/shadow
palette.json                facet geometry + named presets (mark facets + light/dark UI tokens)
```

## Theming via currentColor

Set `color` on the SVG element (or any parent) to change the mark color:

```html
<!-- cobalt blue on dark bg -->
<img src="base.svg" style="color: #206de9">

<!-- or inline -->
<svg ... style="color: #206de9"> ... </svg>
```

For React/Vue components, pass a `color` prop and bind it to the SVG's `style.color`.

## Using state SVGs

Drop-in (Option A — self-contained, each file has its own `<style>`):

```html
<img src="states/loading.svg" width="48" height="48">
```

Class-driven (Option B — one base SVG + `states.css`):

```html
<link rel="stylesheet" href="states.css">
<svg class="state-loading" ...> <!-- base mark: id="mark" wrapping id="p0".."p5" --> </svg>
```

Available classes: `state-neutral` `state-loading` `state-success` `state-warning`
`state-error` `state-404` `state-500` `state-503` `state-403`

## Adding a sub-brand lockup

1. Open `lockup/template.svg`
2. Replace the dashed slot guide with a `<text>` element at `x="64" y="37"`
3. Font: Space Grotesk 600, font-size 24, letter-spacing -0.5
4. The mark never moves — only the text slot changes

```xml
<text x="64" y="37"
      font-family="'Space Grotesk', system-ui, sans-serif"
      font-size="24" font-weight="600" letter-spacing="-0.5"
      fill="currentColor">your-sub-brand</text>
```

## Adding a new state

1. Copy `states/neutral.svg` as a starting point (six `<path id="p0">`..`<path id="p5">` facets)
2. Add/replace the `<style>` block with your `@keyframes` and selectors
3. Add the corresponding `@keyframes be-*` and `.state-*` rules to `states.css`
4. Add the state to `preview.html`
5. Add the new file to `scripts/bundle.mjs` SVG_FILES array
6. Bump version and push a tag

## Versioning

```bash
git tag v4.0.1
git push origin v4.0.1
```

CI builds and publishes a release with PNG exports (16–512px), JS/ESM/CSS bundles, and `palette.json`.

## Palette

Six named presets in `palette.json` — `cobalt` (default), `violet`, `teal`, `ember`, `graphite`, `legacy-brand` — each with six facet gradients plus a complete `ui.dark`/`ui.light` token set (`background`, `surface`, `primary`, `text`, `textMuted`, `border`, `accent`, `success`, `warning`, `error`).

| Legacy token | Hex       |
|--------------|-----------|
| dark         | `#0a0514` |
| orange       | `#f07828` |
| indigo       | `#5901d8` |
| light        | `#eeeef4` |
| success      | `#2ecc71` |
| error        | `#e74c3c` |

The legacy orange/indigo brand palette survives as the `legacy-brand` preset for continuity.
