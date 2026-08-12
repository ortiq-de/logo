#!/usr/bin/env node
/**
 * Build script — bundles all logo assets into dist/
 * Outputs: CJS, ESM, TypeScript defs, CSS vars, favicon set, SVG copies, palette
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs'
import { execSync } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DIST = join(ROOT, 'dist')

mkdirSync(join(DIST, 'favicons'), { recursive: true })
mkdirSync(join(DIST, 'svgs', 'states'), { recursive: true })
mkdirSync(join(DIST, 'svgs', 'http'), { recursive: true })
mkdirSync(join(DIST, 'svgs', 'lockup'), { recursive: true })

// ── HSL helpers (no dependencies — keeps the package at zero npm deps) ─────
function hexToRgb(hex) { const n = parseInt(hex.replace('#', ''), 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 } }
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  if (max === min) { h = s = 0 } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(100, s)) / 100; l = Math.max(0, Math.min(100, l)) / 100
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2
  let r, g, b
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const toHex = v => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
function shade(hex, deltaL) {
  const { r, g, b } = hexToRgb(hex)
  const hsl = rgbToHsl(r, g, b)
  return hslToHex(hsl.h, hsl.s, clamp(hsl.l + deltaL, 0, 100))
}

// ── Palette ───────────────────────────────────────────────────────────────
const paletteData = JSON.parse(readFileSync(join(ROOT, 'palette.json'), 'utf8'))
writeFileSync(join(DIST, 'palette.json'), JSON.stringify(paletteData, null, 2))
console.log('✓ palette.json')

const DEFAULT_PALETTE = paletteData.presets[paletteData.default]

// ── SVG sources ───────────────────────────────────────────────────────────
const SVG_FILES = [
  { key: 'base',           path: 'base.svg' },
  { key: 'logoPlain',      path: 'plain.svg' },
  { key: 'logoColored',    path: 'colored.svg' },
  { key: 'logoGradient',   path: 'gradient.svg' },
  { key: 'logoAnimated',   path: 'animated.svg' },
  { key: 'stateNeutral',   path: 'states/neutral.svg' },
  { key: 'stateLoading',   path: 'states/loading.svg' },
  { key: 'stateSuccess',   path: 'states/success.svg' },
  { key: 'stateWarning',   path: 'states/warning.svg' },
  { key: 'stateError',     path: 'states/error.svg' },
  { key: 'http404',        path: 'http/404.svg' },
  { key: 'http500',        path: 'http/500.svg' },
  { key: 'http503',        path: 'http/503.svg' },
  { key: 'http403',        path: 'http/403.svg' },
  { key: 'lockupTemplate',     path: 'lockup/template.svg' },
  { key: 'lockupBlog',         path: 'lockup/blog.svg' },
  { key: 'lockupIconTemplate', path: 'lockup/icon-template.svg' },
]

const svgMap = {}
for (const { key, path } of SVG_FILES) {
  const full = join(ROOT, path)
  const content = readFileSync(full, 'utf8').trim()
  svgMap[key] = content
  // copy to dist/svgs/
  const dest = join(DIST, 'svgs', path)
  mkdirSync(dirname(dest), { recursive: true })
  copyFileSync(full, dest)
  console.log(`✓ loaded ${path}`)
}

// ── Lockup utility source ─────────────────────────────────────────────────
// Shared implementation injected into both CJS and ESM bundles.
// The hexagon mark is single-tone (six facets at fixed opacity, matching
// base.svg) since a lockup needs one flat color — themed via currentColor,
// same contract as createTextLockup/createIconLockup always had.
// Slot layout: mark 0-48, 8px gap, icon 56-76 (20×20 @ y=18), 4px gap, text.
const HEX_PATHS = paletteData.facetGeometry.map(g => {
  const path = svgMap.base.match(new RegExp(`id="${g.id}" d="([^"]+)"`))
  return { d: path[1], op: g.baseOpacity }
})
const MARK_INNER = `<svg x="0" y="4" width="48" height="48" viewBox="0 0 540 540"><g fill="currentColor">${
  HEX_PATHS.map(p => `<path d="${p.d}" opacity="${p.op}"/>`).join('')
}</g></svg>`

// Use JSON.stringify for string literals so quoting is always correct
const _svgOpen  = JSON.stringify('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 56">')
const _svgClose = JSON.stringify('</svg>')
const _markStr  = JSON.stringify(MARK_INNER)
const _tx56     = JSON.stringify('<text x="56" y="37" font-family="\'Space Grotesk\',system-ui,sans-serif" font-size="24" font-weight="600" letter-spacing="-0.5" fill="currentColor">')
const _tx80     = JSON.stringify('<text x="80" y="37" font-family="\'Space Grotesk\',system-ui,sans-serif" font-size="24" font-weight="600" letter-spacing="-0.5" fill="currentColor">')
const _txClose  = JSON.stringify('</text>')

const LOCKUP_FN_SRC = `
var _be_mark=${_markStr};
var _be_svgo=${_svgOpen};
var _be_svgc=${_svgClose};
var _be_tx56=${_tx56};
var _be_tx80=${_tx80};
var _be_txc=${_txClose};
function createTextLockup(subBrand) {
  return _be_svgo + _be_mark + _be_tx56 + subBrand + _be_txc + _be_svgc;
}
function createIconLockup(subBrand, iconSvg) {
  return _be_svgo + _be_mark + iconSvg + _be_tx80 + subBrand + _be_txc + _be_svgc;
}`

// ── CJS bundle ────────────────────────────────────────────────────────────
const cjsLines = [
  `'use strict';`,
  `const palette = ${JSON.stringify(paletteData, null, 2)};`,
  ...Object.entries(svgMap).map(([k, v]) => `const ${k} = ${JSON.stringify(v)};`),
  LOCKUP_FN_SRC,
  `module.exports = { palette, ${Object.keys(svgMap).join(', ')}, createTextLockup, createIconLockup };`,
]
writeFileSync(join(DIST, 'index.js'), cjsLines.join('\n'))
console.log('✓ index.js (CJS)')

// ── ESM bundle ────────────────────────────────────────────────────────────
const esmLines = [
  `export const palette = ${JSON.stringify(paletteData, null, 2)};`,
  ...Object.entries(svgMap).map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};`),
  LOCKUP_FN_SRC.replace(/^function /gm, 'export function '),
]
writeFileSync(join(DIST, 'index.esm.js'), esmLines.join('\n'))
console.log('✓ index.esm.js (ESM)')

// ── TypeScript definitions ────────────────────────────────────────────────
const dtsLines = [
  `// @byehsan/logo — TypeScript definitions`,
  ``,
  `export interface FacetGeometry { id: string; label: string; lightnessDelta: number; satDelta: number; baseOpacity: number; }`,
  `export interface FacetPair { light: string; dark: string; }`,
  `export interface UiTokens { background: string; surface: string; primary: string; text: string; textMuted: string; border: string; accent: string; success: string; warning: string; error: string; }`,
  `export interface Preset { name: string; hue?: number; saturation?: number; lightness?: number; solid: string; facets: Record<string, FacetPair>; ui: { dark: UiTokens; light: UiTokens }; }`,
  `export interface PaletteTokens { ${Object.keys(paletteData.tokens).map(k => `${k}: string`).join('; ')}; }`,
  `export interface Palette { version: number; default: string; facetGeometry: FacetGeometry[]; presets: Record<string, Preset>; tokens: PaletteTokens; }`,
  ``,
  `/** Full palette data including facet geometry, named presets and the legacy flat token map */`,
  `export declare const palette: Palette;`,
  ``,
  ...Object.entries(svgMap).map(([k]) => `/** SVG markup string: ${k} */\nexport declare const ${k}: string;`),
  ``,
  `/** Generate a text-only lockup SVG string. Themed via currentColor. */`,
  `export declare function createTextLockup(subBrand: string): string;`,
  ``,
  `/** Generate an icon+text lockup SVG string. iconSvg should be a <svg> element string */`,
  `/** positioned at x=56, y=18, width=20, height=20 in the 220×56 viewBox. */`,
  `export declare function createIconLockup(subBrand: string, iconSvg: string): string;`,
]
writeFileSync(join(DIST, 'index.d.ts'), dtsLines.join('\n'))
console.log('✓ index.d.ts (TypeScript)')

// ── CSS bundle ────────────────────────────────────────────────────────────
const toDataUri = svg => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`

const cssLines = [
  `/* @byehsan/logo — CSS custom properties */`,
  `:root {`,
  `  /* Legacy flat brand tokens */`,
  ...Object.entries(paletteData.tokens).map(([k, v]) => `  --color-${k}: ${v};`),
  ``,
  `  /* Default preset (${paletteData.default}) — facet gradients + UI tokens (dark mode) */`,
  ...paletteData.facetGeometry.map(g => `  --be-facet-${g.id}: ${DEFAULT_PALETTE.facets[g.id].light};`),
  ...Object.entries(DEFAULT_PALETTE.ui.dark).map(([k, v]) => `  --be-ui-dark-${k}: ${v};`),
  ...Object.entries(DEFAULT_PALETTE.ui.light).map(([k, v]) => `  --be-ui-light-${k}: ${v};`),
  `}`,
  ``,
  `/* Named preset classes — facet gradients + light/dark UI token sets */`,
  ...Object.entries(paletteData.presets).map(([id, p]) => {
    const facetVars = paletteData.facetGeometry.map(g => `  --be-facet-${g.id}: ${p.facets[g.id].light};`).join('\n')
    const darkVars = Object.entries(p.ui.dark).map(([k, v]) => `  --be-ui-dark-${k}: ${v};`).join('\n')
    const lightVars = Object.entries(p.ui.light).map(([k, v]) => `  --be-ui-light-${k}: ${v};`).join('\n')
    return `.be-preset-${id} {\n${facetVars}\n${darkVars}\n${lightVars}\n}`
  }),
]
writeFileSync(join(DIST, 'index.css'), cssLines.join('\n'))
console.log('✓ index.css')

// ── states.css (copy) ─────────────────────────────────────────────────────
copyFileSync(join(ROOT, 'states.css'), join(DIST, 'states.css'))
console.log('✓ states.css')

// ── Favicon generation ────────────────────────────────────────────────────
// Colour the currentColor SVG with the default preset's solid colour before rasterising
const faviconSrc = svgMap.base.replace(/currentColor/g, DEFAULT_PALETTE.solid)
const tmpSvg = join(DIST, '_favicon-src.svg')
writeFileSync(tmpSvg, faviconSrc)

const FAVICON_SIZES = [16, 32, 48, 96, 180, 192, 512]
const rsvgOk = (() => { try { execSync('which rsvg-convert', { stdio: 'ignore' }); return true } catch { return false } })()
const convertOk = (() => { try { execSync('which convert', { stdio: 'ignore' }); return true } catch { return false } })()

if (rsvgOk) {
  for (const size of FAVICON_SIZES) {
    const label = size === 180 ? 'apple-touch-icon' : `favicon-${size}x${size}`
    const out = join(DIST, 'favicons', `${label}.png`)
    execSync(`rsvg-convert -w ${size} -h ${size} "${tmpSvg}" -o "${out}"`)
    console.log(`✓ favicons/${label}.png`)
  }

  // Copy apple-touch-icon to dist root
  copyFileSync(join(DIST, 'favicons', 'apple-touch-icon.png'), join(DIST, 'apple-touch-icon.png'))

  // favicon.svg (coloured, for modern browsers)
  writeFileSync(join(DIST, 'favicons', 'favicon.svg'), faviconSrc)
  copyFileSync(join(DIST, 'favicons', 'favicon.svg'), join(DIST, 'favicon.svg'))
  console.log('✓ favicons/favicon.svg')

  if (convertOk) {
    // Multi-size ICO: 16, 32, 48
    const pngs = [16, 32, 48].map(s => join(DIST, 'favicons', `favicon-${s}x${s}.png`)).join(' ')
    execSync(`convert ${pngs} "${join(DIST, 'favicons', 'favicon.ico')}"`)
    copyFileSync(join(DIST, 'favicons', 'favicon.ico'), join(DIST, 'favicon.ico'))
    console.log('✓ favicons/favicon.ico')
  } else {
    console.warn('⚠ imagemagick not available — skipping favicon.ico')
  }
} else {
  console.warn('⚠ rsvg-convert not available — skipping favicon rasterisation')
}

// Clean up temp file
try { execSync(`rm "${tmpSvg}"`) } catch {}

// ── PWA webmanifest ───────────────────────────────────────────────────────
const manifest = {
  name: 'byEhsan',
  short_name: 'byEhsan',
  icons: [
    { src: 'favicons/favicon-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: 'favicons/favicon-512x512.png', sizes: '512x512', type: 'image/png' },
  ],
  theme_color: DEFAULT_PALETTE.ui.dark.background,
  background_color: DEFAULT_PALETTE.ui.dark.background,
  display: 'standalone',
}
writeFileSync(join(DIST, 'site.webmanifest'), JSON.stringify(manifest, null, 2))
console.log('✓ site.webmanifest')

// ── dist/package.json (for npm consumers) ────────────────────────────────
const rootPkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const distPkg = {
  name: rootPkg.name,
  version: rootPkg.version,
  description: rootPkg.description,
  type: 'module',
  main: './index.js',
  module: './index.esm.js',
  types: './index.d.ts',
  exports: {
    '.':       { import: './index.esm.js', require: './index.js', types: './index.d.ts' },
    './css':   './index.css',
    './states-css': './states.css',
    './palette': './palette.json',
  },
  keywords: rootPkg.keywords,
  license: rootPkg.license,
  repository: { type: 'git', url: 'https://github.com/byehsan/logo.git' },
}
writeFileSync(join(DIST, 'package.json'), JSON.stringify(distPkg, null, 2))
console.log('✓ dist/package.json')

console.log('\n✅ Bundle complete → dist/')
