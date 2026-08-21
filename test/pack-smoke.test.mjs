import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import { mkdtempSync, rmSync, readdirSync, statSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let extractDir

// The highest-value "works in the real world" check: builds the actual tarball npm publish
// would produce (governed by package.json's `files` allowlist), extracts it into a directory
// with no relation to the repo, and requires/imports it exactly as a real consumer would after
// `npm install`. dist-smoke reads the repo's own (always-complete) dist/ directly, so it can't
// catch a `files`-field omission the way this test can.
beforeAll(() => {
  const workDir = mkdtempSync(join(tmpdir(), 'ortiq-logo-pack-'))
  const packOutput = execSync(`npm pack --pack-destination "${workDir}" --json`, { cwd: ROOT }).toString()
  const [{ filename }] = JSON.parse(packOutput)
  const tarballPath = join(workDir, filename)
  extractDir = join(workDir, 'extracted')
  execSync(`mkdir -p "${extractDir}" && tar -xzf "${tarballPath}" -C "${extractDir}"`)
}, 30000)

afterAll(() => {
  if (extractDir) rmSync(dirname(extractDir), { recursive: true, force: true })
})

describe('npm pack tarball — real consumer install simulation', () => {
  it('extracted tarball contains dist/, palette.json, and the other files-listed paths', () => {
    const pkgRoot = join(extractDir, 'package')
    const entries = readdirSync(pkgRoot)
    for (const expected of ['dist', 'base.svg', 'states', 'moods', 'http', 'lockup', 'palette.json', 'states.css', 'package.json']) {
      expect(entries).toContain(expected)
    }
  })

  it('require()s the extracted CJS build and gets working exports', () => {
    const pkgRoot = join(extractDir, 'package')
    const require = createRequire(import.meta.url)
    const build = require(join(pkgRoot, 'dist', 'index.js'))
    expect(build.palette).toBeTruthy()
    expect(typeof build.createTextLockup).toBe('function')
    const svg = build.createTextLockup('blog')
    expect(svg).toContain('<svg')
  })

  it('import()s the extracted ESM build and gets working exports', async () => {
    const pkgRoot = join(extractDir, 'package')
    const build = await import(join(pkgRoot, 'dist', 'index.mjs'))
    expect(build.palette).toBeTruthy()
    expect(typeof build.createIconLockup).toBe('function')
    const svg = build.createIconLockup('git', '<circle cx="6" cy="6" r="3"/>', { placement: 'e' })
    expect(svg).toContain('<svg')
  })

  it('extracted dist/palette.json matches the repo palette.json', () => {
    const pkgRoot = join(extractDir, 'package')
    const stat = statSync(join(pkgRoot, 'dist', 'palette.json'))
    expect(stat.size).toBeGreaterThan(0)
  })
})
