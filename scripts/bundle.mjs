#!/usr/bin/env node
/**
 * Build script — bundles all logo assets into dist/
 * Outputs: CJS, ESM, TypeScript defs, CSS vars, favicon set, SVG copies, palette
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs'
import { execSync } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { extractHexPaths, extractPupilRadius } from '../src/hex-paths.mjs'

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
// plain.svg/gradient.svg/animated.svg are the legacy pre-hexagon triskelion mark — kept in
// the repo for reference (see CLAUDE.md) but deliberately not bundled into dist/, the npm
// package exports, or release archives, since they don't reflect the current six-facet
// hexagon/eye design at all.
const SVG_FILES = [
  { key: 'base',           path: 'base.svg' },
  { key: 'logoColored',    path: 'colored.svg' },
  { key: 'stateNeutral',   path: 'states/neutral.svg' },
  { key: 'stateLoading',   path: 'states/loading.svg' },
  { key: 'stateSuccess',   path: 'states/success.svg' },
  { key: 'stateWarning',   path: 'states/warning.svg' },
  { key: 'stateError',     path: 'states/error.svg' },
  { key: 'moodHappy',      path: 'moods/happy.svg' },
  { key: 'moodSad',        path: 'moods/sad.svg' },
  { key: 'moodAngry',      path: 'moods/angry.svg' },
  { key: 'moodSurprised',  path: 'moods/surprised.svg' },
  { key: 'moodSleepy',     path: 'moods/sleepy.svg' },
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
// createTextLockup/createIconLockup live as real source in src/lockup.mjs (built from
// src/hex-paths.mjs's extracted facet geometry) so they're directly unit-testable. Their
// text is read here and string-injected into both the CJS and ESM bundles, instantiated
// with the real hexagon path data — this is the one place that source gets duplicated as
// text, so both bundles stay self-contained with zero internal imports.
const HEX_PATHS = extractHexPaths(svgMap.base, paletteData.facetGeometry)
const PUPIL_R = extractPupilRadius(svgMap.base)
const LOCKUP_SRC_RAW = readFileSync(join(ROOT, 'src', 'lockup.mjs'), 'utf8')
const LOCKUP_FN_SRC = LOCKUP_SRC_RAW.replace(/^export function createLockupApi/m, 'function createLockupApi')
const LOCKUP_INSTANTIATE = `const __hexPaths = ${JSON.stringify(HEX_PATHS)};\nconst __pupilR = ${JSON.stringify(PUPIL_R)};\nconst __lockupApi = createLockupApi(__hexPaths, __pupilR);`

// ── CJS bundle ────────────────────────────────────────────────────────────
const cjsLines = [
  `'use strict';`,
  `const palette = ${JSON.stringify(paletteData, null, 2)};`,
  ...Object.entries(svgMap).map(([k, v]) => `const ${k} = ${JSON.stringify(v)};`),
  LOCKUP_FN_SRC,
  LOCKUP_INSTANTIATE,
  `const createTextLockup = __lockupApi.createTextLockup;`,
  `const createIconLockup = __lockupApi.createIconLockup;`,
  `module.exports = { palette, ${Object.keys(svgMap).join(', ')}, createTextLockup, createIconLockup };`,
]
writeFileSync(join(DIST, 'index.js'), cjsLines.join('\n'))
console.log('✓ index.js (CJS)')

// ── ESM bundle ────────────────────────────────────────────────────────────
const esmLines = [
  `export const palette = ${JSON.stringify(paletteData, null, 2)};`,
  ...Object.entries(svgMap).map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};`),
  LOCKUP_FN_SRC,
  LOCKUP_INSTANTIATE,
  `export const createTextLockup = __lockupApi.createTextLockup;`,
  `export const createIconLockup = __lockupApi.createIconLockup;`,
]
writeFileSync(join(DIST, 'index.mjs'), esmLines.join('\n'))
console.log('✓ index.mjs (ESM)')

// ── TypeScript definitions ────────────────────────────────────────────────
const dtsLines = [
  `// @ortiq-de/logo — TypeScript definitions`,
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
  `export type LockupFontFamily = 'space-grotesk' | 'inter' | 'system' | 'serif' | 'mono';`,
  `export interface TextLockupOptions { fontSize?: number; fontFamily?: LockupFontFamily; width?: number; height?: number; }`,
  `export type IconLockupPlacement = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';`,
  `export interface IconLockupOptions extends TextLockupOptions { placement?: IconLockupPlacement; }`,
  ``,
  `/** Generate a text-only lockup SVG string (mark + sub-brand name). Themed via currentColor. */`,
  `export declare function createTextLockup(subBrand: string, options?: TextLockupOptions): string;`,
  ``,
  `/**`,
  ` * Generate an icon+text lockup SVG string. iconSvg may be either the icon's inner`,
  ` * markup (e.g. Feather-style circle/path elements) or a full <svg viewBox="...">...</svg>`,
  ` * string — only its inner content and viewBox are used, since size and position are`,
  ` * always driven by options.`,
  ` * options.placement: 'e' (default) sits inline beside the mark; 'n'|'s'|'w' sit inline`,
  ` * on the other edges; the 4 corners ('ne'|'se'|'sw'|'nw') render as a small association`,
  ` * badge overlapping that corner of the mark. The mark itself never moves.`,
  ` */`,
  `export declare function createIconLockup(subBrand: string, iconSvg: string, options?: IconLockupOptions): string;`,
]
writeFileSync(join(DIST, 'index.d.ts'), dtsLines.join('\n'))
console.log('✓ index.d.ts (TypeScript)')

// ── CSS bundle ────────────────────────────────────────────────────────────
const toDataUri = svg => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`

const cssLines = [
  `/* @ortiq-de/logo — CSS custom properties */`,
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
  name: 'Ortiq',
  short_name: 'Ortiq',
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
  // index.js is genuine CommonJS (module.exports) and index.mjs is genuine ESM
  // (export function) — the .mjs extension makes the ESM build unambiguous
  // regardless of "type", so "commonjs" here is what makes index.js resolve
  // correctly for require() without also breaking the ESM import path.
  type: 'commonjs',
  main: './index.js',
  module: './index.mjs',
  types: './index.d.ts',
  exports: {
    '.':       { import: './index.mjs', require: './index.js', types: './index.d.ts' },
    './css':   './index.css',
    './states-css': './states.css',
    './palette': './palette.json',
  },
  keywords: rootPkg.keywords,
  license: rootPkg.license,
  repository: { type: 'git', url: 'https://github.com/ortiq-de/logo.git' },
}
writeFileSync(join(DIST, 'package.json'), JSON.stringify(distPkg, null, 2))
console.log('✓ dist/package.json')

console.log('\n✅ Bundle complete → dist/')
