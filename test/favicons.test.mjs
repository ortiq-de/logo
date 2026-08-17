import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import { statSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function hasBinary(name) {
  try { execSync(`which ${name}`, { stdio: 'ignore' }); return true } catch { return false }
}

const hasRsvg = hasBinary('rsvg-convert')
const hasImageMagick = hasBinary('convert')

// scripts/bundle.mjs silently skips favicon rasterization when rsvg-convert/imagemagick
// aren't on PATH — so this only asserts real output where those binaries are actually
// available (CI installs them; local dev may not have them, and shouldn't be blocked).
describe.skipIf(!hasRsvg)('favicon rasterization (requires rsvg-convert)', () => {
  const sizes = [16, 32, 48, 96, 180, 192, 512]

  it.each(sizes)('produces a non-empty PNG for size %ipx', (size) => {
    const label = size === 180 ? 'apple-touch-icon' : `favicon-${size}x${size}`
    const stat = statSync(join(ROOT, 'dist', 'favicons', `${label}.png`))
    expect(stat.size).toBeGreaterThan(0)
  })

  it('produces favicon.svg', () => {
    const stat = statSync(join(ROOT, 'dist', 'favicons', 'favicon.svg'))
    expect(stat.size).toBeGreaterThan(0)
  })

  it.skipIf(!hasImageMagick)('produces a non-empty favicon.ico (requires imagemagick)', () => {
    const stat = statSync(join(ROOT, 'dist', 'favicons', 'favicon.ico'))
    expect(stat.size).toBeGreaterThan(0)
  })
})
