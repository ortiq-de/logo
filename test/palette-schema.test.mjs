import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const palette = JSON.parse(readFileSync(join(ROOT, 'palette.json'), 'utf8'))

const HEX_RE = /^#[0-9a-f]{6}$/i
const UI_TOKEN_KEYS = ['background', 'surface', 'primary', 'text', 'textMuted', 'border', 'accent', 'success', 'warning', 'error']

describe('palette.json schema', () => {
  it('has version 2 and a default preset id that resolves', () => {
    expect(palette.version).toBe(2)
    expect(palette.presets[palette.default]).toBeTruthy()
  })

  it('facetGeometry has exactly 6 unique p0-p5 entries with numeric deltas and a valid baseOpacity', () => {
    expect(palette.facetGeometry).toHaveLength(6)
    const ids = palette.facetGeometry.map(g => g.id)
    expect(new Set(ids)).toEqual(new Set(['p0', 'p1', 'p2', 'p3', 'p4', 'p5']))
    for (const g of palette.facetGeometry) {
      expect(typeof g.lightnessDelta).toBe('number')
      expect(typeof g.satDelta).toBe('number')
      expect(g.baseOpacity).toBeGreaterThanOrEqual(0)
      expect(g.baseOpacity).toBeLessThanOrEqual(1)
    }
  })

  const facetIds = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5']

  it.each(Object.entries(palette.presets))('preset "%s" has name/solid/6 valid facets/full ui tokens', (id, preset) => {
    expect(typeof preset.name).toBe('string')
    expect(preset.solid).toMatch(HEX_RE)

    expect(Object.keys(preset.facets).sort()).toEqual(facetIds.sort())
    for (const fid of facetIds) {
      expect(preset.facets[fid].light).toMatch(HEX_RE)
      expect(preset.facets[fid].dark).toMatch(HEX_RE)
    }

    for (const mode of ['dark', 'light']) {
      expect(Object.keys(preset.ui[mode]).sort()).toEqual([...UI_TOKEN_KEYS].sort())
      for (const key of UI_TOKEN_KEYS) {
        expect(preset.ui[mode][key]).toMatch(HEX_RE)
      }
    }
  })

  it('success/warning/error tokens are identical literals across every preset (documented invariant)', () => {
    const expected = { success: '#2ecc71', warning: '#f5a623', error: '#e74c3c' }
    for (const preset of Object.values(palette.presets)) {
      for (const mode of ['dark', 'light']) {
        expect(preset.ui[mode].success).toBe(expected.success)
        expect(preset.ui[mode].warning).toBe(expected.warning)
        expect(preset.ui[mode].error).toBe(expected.error)
      }
    }
  })
})
