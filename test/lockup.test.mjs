import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import { extractHexPaths } from '../src/hex-paths.mjs'
import { createLockupApi } from '../src/lockup.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const baseSvg = readFileSync(join(ROOT, 'base.svg'), 'utf8')
const palette = JSON.parse(readFileSync(join(ROOT, 'palette.json'), 'utf8'))
const hexPaths = extractHexPaths(baseSvg, palette.facetGeometry)
const { createTextLockup, createIconLockup } = createLockupApi(hexPaths)

// Lightweight tag-balance check — no xmllint dependency, so `npm test` needs no system binaries.
function isWellFormedXml(str) {
  const tagRe = /<\/?[a-zA-Z][^>]*?>/g
  const stack = []
  let m
  while ((m = tagRe.exec(str))) {
    const tag = m[0]
    if (tag.endsWith('/>')) continue
    if (tag.startsWith('</')) {
      const name = tag.slice(2, -1).trim()
      if (stack.pop() !== name) return false
    } else {
      const name = tag.slice(1).replace('>', '').split(/\s/)[0]
      stack.push(name)
    }
  }
  return stack.length === 0
}

describe('createTextLockup', () => {
  it('produces a well-formed SVG with the sub-brand name in a <text> node', () => {
    const svg = createTextLockup('blog')
    expect(isWellFormedXml(svg)).toBe(true)
    expect(svg).toContain('<svg')
    expect(svg).toMatch(/<text[^>]*>blog<\/text>/)
  })

  it('defaults to viewBox height 56 and a width matching the calcW formula', () => {
    const svg = createTextLockup('blog')
    const vb = svg.match(/viewBox="0 0 (\d+) (\d+)"/)
    expect(vb[2]).toBe('56')
    const expectedW = Math.ceil(Math.max(220, 56 + Math.max(60, 'blog'.length * 24 * 0.60 + 8) + 12))
    expect(Number(vb[1])).toBe(expectedW)
  })

  it('honors fontSize/fontFamily/explicit width+height overrides', () => {
    const svg = createTextLockup('acme corp', { fontSize: 32, fontFamily: 'inter', width: 400, height: 100 })
    expect(svg).toContain('width="400" height="100"')
    expect(svg).toContain('font-size="32"')
    expect(svg).toContain("'Inter',system-ui,sans-serif")
  })

  it('escapes special characters in the sub-brand name', () => {
    const svg = createTextLockup('a & b <c>')
    expect(svg).toContain('a &amp; b &lt;c&gt;')
    expect(isWellFormedXml(svg)).toBe(true)
  })
})

describe('createIconLockup', () => {
  const placements = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
  const cornerPlacements = ['ne', 'se', 'sw', 'nw']
  const edgePlacements = ['n', 'e', 's', 'w']
  const icon = '<circle cx="6" cy="6" r="3"/>'

  it.each(placements)('produces well-formed output for placement "%s"', (placement) => {
    const svg = createIconLockup('git', icon, { placement })
    expect(isWellFormedXml(svg)).toBe(true)
    expect(svg).toContain('<svg')
  })

  // Corner placements overlap the mark's corner directly — icon only, no ring/backdrop circle.
  const BADGE_RING_RE = /fill="none"[^>]*stroke="currentColor"[^>]*stroke-width="1"\/>/

  it.each([...cornerPlacements, ...edgePlacements])('placement "%s" renders no badge ring', (placement) => {
    const svg = createIconLockup('git', icon, { placement })
    expect(svg).not.toMatch(BADGE_RING_RE)
  })

  it('defaults viewBox height to 96', () => {
    const svg = createIconLockup('git', icon, {})
    const vb = svg.match(/viewBox="0 0 (\d+) (\d+)"/)
    expect(vb[2]).toBe('96')
  })

  it('extracts inner markup + viewBox from a full <svg viewBox="..."> icon string', () => {
    const fullIcon = '<svg viewBox="0 0 32 32"><path d="M1 1"/></svg>'
    const svg = createIconLockup('git', fullIcon, { placement: 'e' })
    expect(svg).toContain('viewBox="0 0 32 32"')
    expect(svg).toContain('<path d="M1 1"/>')
  })

  it('treats bare inner markup as-is with a default 0 0 24 24 viewBox', () => {
    const svg = createIconLockup('git', icon, { placement: 'e' })
    expect(svg).toContain(icon)
    expect(svg).toContain('viewBox="0 0 24 24"')
  })
})
