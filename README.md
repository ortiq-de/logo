# Ortiq logo system

[![Deploy Pages](https://img.shields.io/github/actions/workflow/status/ortiq-de/logo/pages.yml?branch=main&label=pages)](https://github.com/ortiq-de/logo/actions/workflows/pages.yml)
[![Release Bundle](https://img.shields.io/github/actions/workflow/status/ortiq-de/logo/release.yml?label=release)](https://github.com/ortiq-de/logo/actions/workflows/release.yml)
[![Latest release](https://img.shields.io/github/v/release/ortiq-de/logo)](https://github.com/ortiq-de/logo/releases/latest)
[![npm package](https://img.shields.io/badge/npm-%40ortiq--de%2Flogo-cb3837)](https://github.com/ortiq-de/logo/pkgs/npm/logo)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/ortiq-de/logo/blob/main/package.json)
[![GH Pages demo](https://img.shields.io/badge/demo-ortiq--de.github.io%2Flogo-206de9)](https://ortiq-de.github.io/logo/)

Six-facet hexagon mark with full state + lockup system. All assets theme via CSS `currentColor` (single-tone) or per-facet gradients (colored).

**Live demo / sub-brand generator:** https://ortiq-de.github.io/logo/

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

## Usage

Theming (`currentColor`), the state SVGs (drop-in vs class-driven), and sub-brand lockup
generation are all covered live, interactively, with copy-to-clipboard snippets and a working
generator, at **https://ortiq-de.github.io/logo/** — that page is the up-to-date reference; it
isn't duplicated here to avoid the two drifting out of sync.

## Adding a new state

1. Copy `states/neutral.svg` as a starting point (six `<path id="p0">`..`<path id="p5">` facets)
2. Add/replace the `<style>` block with your `@keyframes` and selectors
3. Add the corresponding `@keyframes be-*` and `.state-*` rules to `states.css`
4. Add the state to `preview.html`
5. Add the new file to `scripts/bundle.mjs` SVG_FILES array
6. Bump version and push a tag

## Versioning

```bash
git tag v5.0.0
git push origin v5.0.0
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
