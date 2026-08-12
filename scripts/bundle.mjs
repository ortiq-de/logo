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
//
// createTextLockup: mark at x=0,y=4 (48×48), text starts at x=56.
// createIconLockup: mark at x=24,y=24 (48×48, extra margin on every side so
// any of the 8 placements fits without clipping). placement chooses where
// the icon sits: 'e'|'n'|'s'|'w' render inline just outside that edge of the
// mark with a small gap; 'ne'|'se'|'sw'|'nw' render as a small association
// badge (stroke ring, no fill) overlapping that corner of the mark. The mark
// itself never moves — only the icon moves around it.
const HEX_PATHS = paletteData.facetGeometry.map(g => {
  const path = svgMap.base.match(new RegExp(`id="${g.id}" d="([^"]+)"`))
  return { d: path[1], op: g.baseOpacity }
})
const MARK_INNER_PATHS = HEX_PATHS.map(p => `<path d="${p.d}" opacity="${p.op}"/>`).join('')

const _markInnerStr = JSON.stringify(MARK_INNER_PATHS)

const LOCKUP_FN_SRC = `
var _be_markInner=${_markInnerStr};
function _be_mark(x,y){return '<svg x="'+x+'" y="'+y+'" width="48" height="48" viewBox="0 0 540 540"><g fill="currentColor">'+_be_markInner+'</g></svg>';}
var _be_fonts={'space-grotesk':"'Space Grotesk',system-ui,sans-serif",'inter':"'Inter',system-ui,sans-serif",'system':'system-ui,sans-serif','serif':"Georgia,'Times New Roman',serif",'mono':"'Fira Code','SF Mono',monospace"};
function _be_esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _be_calcW(textX,text,fontSize){return Math.ceil(Math.max(220,textX+Math.max(60,String(text).length*fontSize*0.60+8)+12));}
function _be_extractIcon(iconSvg){
  var s=String(iconSvg).trim();
  if(s.slice(0,4)!=='<svg') return {inner:s,vb:'0 0 24 24'};
  var gt=s.indexOf('>');
  var openTag=s.slice(0,gt+1);
  var closeIdx=s.lastIndexOf('</svg>');
  var inner=closeIdx>-1?s.slice(gt+1,closeIdx):s.slice(gt+1);
  var vb='0 0 24 24';
  var vbIdx=openTag.indexOf('viewBox="');
  if(vbIdx>-1){
    var start=vbIdx+9;
    var end=openTag.indexOf('"',start);
    vb=openTag.slice(start,end);
  }
  return {inner:inner,vb:vb};
}
function createTextLockup(subBrand,options){
  options=options||{};
  var fontSize=options.fontSize||24;
  var ff=_be_fonts[options.fontFamily]||_be_fonts['space-grotesk'];
  var textX=56,naturalH=56;
  var naturalW=_be_calcW(textX,subBrand,fontSize);
  var W=options.width||naturalW, H=options.height||naturalH;
  var bl=(28+fontSize*0.35).toFixed(1);
  var text='<text x="'+textX+'" y="'+bl+'" font-family="'+ff+'" font-size="'+fontSize+'" font-weight="600" letter-spacing="-0.5" fill="currentColor">'+_be_esc(subBrand)+'</text>';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+naturalW+' '+naturalH+'" width="'+W+'" height="'+H+'">'+_be_mark(0,4)+text+'</svg>';
}
var _be_ilMarkX=24,_be_ilMarkY=24,_be_ilMarkRight=72,_be_ilMarkBottom=72,_be_ilMarkCx=48,_be_ilMarkCy=48,_be_ilCanvasH=96;
function _be_ilLayout(placement){
  var GAP=4,ICON=20,R=12,BICON=16;
  var corners={
    ne:{cx:_be_ilMarkRight-4,cy:_be_ilMarkY+4},
    se:{cx:_be_ilMarkRight-4,cy:_be_ilMarkBottom-4},
    sw:{cx:_be_ilMarkX+4,cy:_be_ilMarkBottom-4},
    nw:{cx:_be_ilMarkX+4,cy:_be_ilMarkY+4}
  };
  if(corners[placement]){
    var c=corners[placement];
    var east=placement==='ne'||placement==='se';
    return {kind:'badge',cx:c.cx,cy:c.cy,r:R,iconX:c.cx-BICON/2,iconY:c.cy-BICON/2,iconSize:BICON,textX:east?c.cx+R+8:_be_ilMarkRight+8};
  }
  var inline={
    n:{x:_be_ilMarkCx-ICON/2,y:_be_ilMarkY-GAP-ICON},
    s:{x:_be_ilMarkCx-ICON/2,y:_be_ilMarkBottom+GAP},
    e:{x:_be_ilMarkRight+GAP,y:_be_ilMarkCy-ICON/2},
    w:{x:_be_ilMarkX-GAP-ICON,y:_be_ilMarkCy-ICON/2}
  };
  var pos=inline[placement]||inline.e;
  return {kind:'inline',x:pos.x,y:pos.y,size:ICON,textX:placement==='e'?pos.x+ICON+GAP:_be_ilMarkRight+8};
}
function createIconLockup(subBrand,iconSvg,options){
  options=options||{};
  var placement=options.placement||'e';
  var fontSize=options.fontSize||24;
  var ff=_be_fonts[options.fontFamily]||_be_fonts['space-grotesk'];
  var icon=_be_extractIcon(iconSvg);
  var layout=_be_ilLayout(placement);
  var naturalW=_be_calcW(layout.textX,subBrand,fontSize), naturalH=_be_ilCanvasH;
  var W=options.width||naturalW, H=options.height||naturalH;
  var bl=(_be_ilMarkCy+fontSize*0.35).toFixed(1);
  var iconEl;
  if(layout.kind==='badge'){
    iconEl='<circle cx="'+layout.cx+'" cy="'+layout.cy+'" r="'+layout.r+'" fill="none" stroke="currentColor" stroke-width="1"/>'+
      '<svg x="'+layout.iconX+'" y="'+layout.iconY+'" width="'+layout.iconSize+'" height="'+layout.iconSize+'" viewBox="'+icon.vb+'" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" overflow="visible">'+icon.inner+'</svg>';
  } else {
    iconEl='<svg x="'+layout.x+'" y="'+layout.y+'" width="'+layout.size+'" height="'+layout.size+'" viewBox="'+icon.vb+'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" overflow="visible">'+icon.inner+'</svg>';
  }
  var text='<text x="'+layout.textX+'" y="'+bl+'" font-family="'+ff+'" font-size="'+fontSize+'" font-weight="600" letter-spacing="-0.5" fill="currentColor">'+_be_esc(subBrand)+'</text>';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+naturalW+' '+naturalH+'" width="'+W+'" height="'+H+'">'+_be_mark(_be_ilMarkX,_be_ilMarkY)+iconEl+text+'</svg>';
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
  LOCKUP_FN_SRC
    .replace(/^function createTextLockup/m, 'export function createTextLockup')
    .replace(/^function createIconLockup/m, 'export function createIconLockup'),
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
