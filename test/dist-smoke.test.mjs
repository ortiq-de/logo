import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { extractHexPaths } from '../src/hex-paths.mjs'
import { createLockupApi } from '../src/lockup.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)

const cjs = require(join(ROOT, 'dist', 'index.js'))
const esm = await import(join(ROOT, 'dist', 'index.mjs') + `?t=${Date.now()}`)

const SVG_KEYS = [
  'base', 'logoPlain', 'logoColored', 'logoGradient', 'logoAnimated',
  'stateNeutral', 'stateLoading', 'stateSuccess', 'stateWarning', 'stateError',
  'http404', 'http500', 'http503', 'http403',
  'lockupTemplate', 'lockupBlog', 'lockupIconTemplate',
]

describe('dist/index.js (CJS) and dist/index.mjs (ESM) — real-world build smoke test', () => {
  it('both expose palette, every svgMap key, and the lockup functions', () => {
    for (const build of [cjs, esm]) {
      expect(build.palette).toBeTruthy()
      for (const key of SVG_KEYS) {
        expect(typeof build[key]).toBe('string')
        expect(build[key].length).toBeGreaterThan(0)
      }
      expect(typeof build.createTextLockup).toBe('function')
      expect(typeof build.createIconLockup).toBe('function')
    }
  })

  it('CJS output, ESM output, and src/lockup.mjs direct output are identical (drift guard)', () => {
    const baseSvg = readFileSync(join(ROOT, 'base.svg'), 'utf8')
    const palette = JSON.parse(readFileSync(join(ROOT, 'palette.json'), 'utf8'))
    const hexPaths = extractHexPaths(baseSvg, palette.facetGeometry)
    const src = createLockupApi(hexPaths)

    const textArgs = ['blog', { fontSize: 28 }]
    const iconArgs = ['git', '<circle cx="6" cy="6" r="3"/>', { placement: 'se' }]

    const cjsText = cjs.createTextLockup(...textArgs)
    const esmText = esm.createTextLockup(...textArgs)
    const srcText = src.createTextLockup(...textArgs)
    expect(cjsText).toBe(esmText)
    expect(cjsText).toBe(srcText)

    const cjsIcon = cjs.createIconLockup(...iconArgs)
    const esmIcon = esm.createIconLockup(...iconArgs)
    const srcIcon = src.createIconLockup(...iconArgs)
    expect(cjsIcon).toBe(esmIcon)
    expect(cjsIcon).toBe(srcIcon)
  })
})
