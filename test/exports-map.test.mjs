import { describe, it, expect } from 'vitest'
import { readFileSync, statSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))

function collectTargets(node, acc = []) {
  if (typeof node === 'string') { acc.push(node); return acc }
  for (const v of Object.values(node)) collectTargets(v, acc)
  return acc
}

describe('package.json exports map', () => {
  const targets = collectTargets(pkg.exports)

  it('resolved at least one target per export path', () => {
    expect(targets.length).toBeGreaterThan(0)
  })

  it.each(targets)('%s exists in the built dist/ and is non-empty', (target) => {
    const full = join(ROOT, target)
    const stat = statSync(full)
    expect(stat.isFile()).toBe(true)
    expect(stat.size).toBeGreaterThan(0)
  })

  it('main/module/types fields also resolve to existing, non-empty files', () => {
    for (const field of ['main', 'module', 'types']) {
      const full = join(ROOT, pkg[field])
      const stat = statSync(full)
      expect(stat.isFile()).toBe(true)
      expect(stat.size).toBeGreaterThan(0)
    }
  })
})
