import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// scripts/build-test-report.mjs resolves its input/output paths relative to its own file
// location (the repo root), not process.cwd() — so this test runs it for real against the
// repo's actual test-results.json/test-output.log/test-results/, saving and restoring
// whatever was there beforehand rather than trying to sandbox it in a temp cwd.
const jsonPath = join(ROOT, 'test-results.json')
const logPath = join(ROOT, 'test-output.log')
const outDir = join(ROOT, 'test-results')
const versionFile = join(outDir, 'v0.0.0-ansi-test.html')
const indexPath = join(outDir, 'index.html')

let backupJson, backupLog, backupIndex

beforeAll(() => {
  backupJson = existsSync(jsonPath) ? readFileSync(jsonPath, 'utf8') : null
  backupLog = existsSync(logPath) ? readFileSync(logPath, 'utf8') : null
  backupIndex = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : null

  writeFileSync(jsonPath, JSON.stringify({
    numTotalTests: 2, numPassedTests: 2, numFailedTests: 0, numPendingTests: 0,
    success: true, startTime: 1000,
    testResults: [{ name: 'fixture.test.mjs', endTime: 1500 }],
  }))
  // Simulates vitest's colorized terminal reporter output, which is what CI actually captures
  // when it pipes `npm test` through `tee` — this is the exact class of input that produced
  // raw ANSI escape sequences in the published test-results pages.
  writeFileSync(logPath, '\x1b[1m\x1b[30m\x1b[46m RUN \x1b[49m\x1b[39m\x1b[22m \x1b[32m✓ fixture passed\x1b[39m\n')

  execSync('node scripts/build-test-report.mjs', {
    cwd: ROOT,
    env: { ...process.env, GITHUB_REF_NAME: 'v0.0.0-ansi-test', GITHUB_SHA: 'abc123' },
  })
})

afterAll(() => {
  if (backupJson !== null) writeFileSync(jsonPath, backupJson); else rmSync(jsonPath, { force: true })
  if (backupLog !== null) writeFileSync(logPath, backupLog); else rmSync(logPath, { force: true })
  rmSync(versionFile, { force: true })
  if (backupIndex !== null) writeFileSync(indexPath, backupIndex); else rmSync(indexPath, { force: true })
})

describe('scripts/build-test-report.mjs', () => {
  it('strips ANSI escape codes from the embedded log', () => {
    const html = readFileSync(versionFile, 'utf8')
    expect(html).not.toMatch(/\x1b\[/)
    expect(html).toContain('fixture passed')
  })

  it('writes a version index listing the generated page', () => {
    const indexHtml = readFileSync(join(outDir, 'index.html'), 'utf8')
    expect(indexHtml).toContain('v0.0.0-ansi-test.html')
  })
})
