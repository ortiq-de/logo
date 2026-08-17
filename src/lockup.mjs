// Lockup generation — the real, testable source for createTextLockup/createIconLockup.
// scripts/bundle.mjs reads this file's text verbatim and string-injects it into the built
// CJS/ESM bundles (stripping the `export` keyword and instantiating with the real hexagon
// path data), so this file must stay self-contained: no imports, and createLockupApi must
// be the only top-level declaration.
//
// The hexagon mark is single-tone (six facets at fixed opacity, matching base.svg) since a
// lockup needs one flat color — themed via currentColor, same contract as
// createTextLockup/createIconLockup always had.
//
// createTextLockup: mark at x=0,y=4 (48×48), text starts at x=56.
// createIconLockup: mark at x=24,y=24 (48×48, extra margin on every side so any of the 8
// placements fits without clipping). placement chooses where the icon sits: 'e'|'n'|'s'|'w'
// render inline just outside that edge of the mark with a small gap; 'ne'|'se'|'sw'|'nw'
// render the icon alone, overlapping that corner of the mark (no ring/backdrop). The mark
// itself never moves — only the icon moves around it.
export function createLockupApi(hexPaths) {
  const markInner = hexPaths.map(p => `<path d="${p.d}" opacity="${p.op}"/>`).join('')

  function mark(x, y) {
    return `<svg x="${x}" y="${y}" width="48" height="48" viewBox="0 0 540 540"><g fill="currentColor">${markInner}</g></svg>`
  }

  const fonts = {
    'space-grotesk': "'Space Grotesk',system-ui,sans-serif",
    'inter': "'Inter',system-ui,sans-serif",
    'system': 'system-ui,sans-serif',
    'serif': "Georgia,'Times New Roman',serif",
    'mono': "'Fira Code','SF Mono',monospace",
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  function calcW(textX, text, fontSize) {
    return Math.ceil(Math.max(220, textX + Math.max(60, String(text).length * fontSize * 0.60 + 8) + 12))
  }

  function extractIcon(iconSvg) {
    const s = String(iconSvg).trim()
    if (s.slice(0, 4) !== '<svg') return { inner: s, vb: '0 0 24 24' }
    const gt = s.indexOf('>')
    const openTag = s.slice(0, gt + 1)
    const closeIdx = s.lastIndexOf('</svg>')
    const inner = closeIdx > -1 ? s.slice(gt + 1, closeIdx) : s.slice(gt + 1)
    let vb = '0 0 24 24'
    const vbIdx = openTag.indexOf('viewBox="')
    if (vbIdx > -1) {
      const start = vbIdx + 9
      const end = openTag.indexOf('"', start)
      vb = openTag.slice(start, end)
    }
    return { inner, vb }
  }

  function createTextLockup(subBrand, options) {
    options = options || {}
    const fontSize = options.fontSize || 24
    const ff = fonts[options.fontFamily] || fonts['space-grotesk']
    const textX = 56, naturalH = 56
    const naturalW = calcW(textX, subBrand, fontSize)
    const W = options.width || naturalW, H = options.height || naturalH
    const bl = (28 + fontSize * 0.35).toFixed(1)
    const text = `<text x="${textX}" y="${bl}" font-family="${ff}" font-size="${fontSize}" font-weight="600" letter-spacing="-0.5" fill="currentColor">${esc(subBrand)}</text>`
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${naturalW} ${naturalH}" width="${W}" height="${H}">${mark(0, 4)}${text}</svg>`
  }

  const ilMarkX = 24, ilMarkY = 24, ilMarkRight = 72, ilMarkBottom = 72, ilMarkCx = 48, ilMarkCy = 48, ilCanvasH = 96

  function ilLayout(placement) {
    const GAP = 4, ICON = 20, R = 12, BICON = 16
    const corners = {
      ne: { cx: ilMarkRight - 4, cy: ilMarkY + 4 },
      se: { cx: ilMarkRight - 4, cy: ilMarkBottom - 4 },
      sw: { cx: ilMarkX + 4, cy: ilMarkBottom - 4 },
      nw: { cx: ilMarkX + 4, cy: ilMarkY + 4 },
    }
    if (corners[placement]) {
      const c = corners[placement]
      const east = placement === 'ne' || placement === 'se'
      return { kind: 'badge', cx: c.cx, cy: c.cy, r: R, iconX: c.cx - BICON / 2, iconY: c.cy - BICON / 2, iconSize: BICON, textX: east ? c.cx + R + 8 : ilMarkRight + 8 }
    }
    const inline = {
      n: { x: ilMarkCx - ICON / 2, y: ilMarkY - GAP - ICON },
      s: { x: ilMarkCx - ICON / 2, y: ilMarkBottom + GAP },
      e: { x: ilMarkRight + GAP, y: ilMarkCy - ICON / 2 },
      w: { x: ilMarkX - GAP - ICON, y: ilMarkCy - ICON / 2 },
    }
    const pos = inline[placement] || inline.e
    return { kind: 'inline', x: pos.x, y: pos.y, size: ICON, textX: placement === 'e' ? pos.x + ICON + GAP : ilMarkRight + 8 }
  }

  function createIconLockup(subBrand, iconSvg, options) {
    options = options || {}
    const placement = options.placement || 'e'
    const fontSize = options.fontSize || 24
    const ff = fonts[options.fontFamily] || fonts['space-grotesk']
    const icon = extractIcon(iconSvg)
    const layout = ilLayout(placement)
    const naturalW = calcW(layout.textX, subBrand, fontSize), naturalH = ilCanvasH
    const W = options.width || naturalW, H = options.height || naturalH
    const bl = (ilMarkCy + fontSize * 0.35).toFixed(1)
    let iconEl
    if (layout.kind === 'badge') {
      iconEl = `<svg x="${layout.iconX}" y="${layout.iconY}" width="${layout.iconSize}" height="${layout.iconSize}" viewBox="${icon.vb}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" overflow="visible">${icon.inner}</svg>`
    } else {
      iconEl = `<svg x="${layout.x}" y="${layout.y}" width="${layout.size}" height="${layout.size}" viewBox="${icon.vb}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" overflow="visible">${icon.inner}</svg>`
    }
    const text = `<text x="${layout.textX}" y="${bl}" font-family="${ff}" font-size="${fontSize}" font-weight="600" letter-spacing="-0.5" fill="currentColor">${esc(subBrand)}</text>`
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${naturalW} ${naturalH}" width="${W}" height="${H}">${mark(ilMarkX, ilMarkY)}${iconEl}${text}</svg>`
  }

  return { createTextLockup, createIconLockup }
}
