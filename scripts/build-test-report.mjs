#!/usr/bin/env node
/**
 * Turns a vitest JSON report + raw log into a static, browsable per-version test-results
 * page, and regenerates the version index. Run by the `publish-test-report` job in
 * .github/workflows/release.yml after a successful, tests-passing tag release — never for a
 * failed run, so every page here corresponds to a real, published version.
 *
 * Inputs (env): GITHUB_REF_NAME (the tag, e.g. "v5.1.0"), GITHUB_SHA (commit).
 * Inputs (files, relative to cwd): test-results.json (vitest --reporter=json output),
 * test-output.log (raw --reporter=verbose text).
 * Outputs: test-results/<tag>.html, test-results/index.html.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'test-results')
mkdirSync(OUT_DIR, { recursive: true })

const tag = process.env.GITHUB_REF_NAME || 'dev'
const sha = process.env.GITHUB_SHA || ''
const date = new Date().toISOString()

const results = JSON.parse(readFileSync(join(ROOT, 'test-results.json'), 'utf8'))
const log = existsSync(join(ROOT, 'test-output.log')) ? readFileSync(join(ROOT, 'test-output.log'), 'utf8') : ''

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const stats = {
  total: results.numTotalTests,
  passed: results.numPassedTests,
  failed: results.numFailedTests,
  skipped: results.numPendingTests,
  success: results.success,
  durationMs: results.testResults.length
    ? Math.max(...results.testResults.map(r => r.endTime || 0)) - (results.startTime || 0)
    : 0,
}

const pageStyle = `
  body { font-family: ui-monospace, 'SF Mono', Menlo, monospace; background: #0a0e15; color: #edeff2; margin: 0; padding: 32px 24px 64px; }
  a { color: #4f8cee; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #a9b0bc; font-size: 13px; margin-bottom: 24px; }
  .stats { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
  .stat { background: #171d26; border: 1px solid #2d3543; border-radius: 8px; padding: 10px 16px; font-size: 13px; }
  .stat b { font-size: 18px; display: block; }
  .pass b { color: #2ecc71; } .fail b { color: #e74c3c; } .skip b { color: #f5a623; }
  pre { background: #171d26; border: 1px solid #2d3543; border-radius: 8px; padding: 16px; overflow-x: auto; font-size: 12px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
  table { border-collapse: collapse; width: 100%; margin-top: 12px; }
  td, th { text-align: left; padding: 6px 10px; border-bottom: 1px solid #2d3543; font-size: 13px; }
`

const versionPage = `<!doctype html>
<html><head><meta charset="utf-8"><title>Test results — ${esc(tag)}</title>
<style>${pageStyle}</style></head>
<body>
  <p><a href="index.html">&larr; all versions</a></p>
  <h1>Test results — ${esc(tag)}</h1>
  <div class="meta">commit ${esc(sha.slice(0, 12))} &middot; generated ${esc(date)}</div>
  <div class="stats">
    <div class="stat pass"><b>${stats.passed}</b>passed</div>
    <div class="stat fail"><b>${stats.failed}</b>failed</div>
    <div class="stat skip"><b>${stats.skipped}</b>skipped</div>
    <div class="stat"><b>${stats.total}</b>total</div>
    <div class="stat"><b>${(stats.durationMs / 1000).toFixed(2)}s</b>duration</div>
  </div>
  <pre>${esc(log || 'No raw log captured.')}</pre>
</body></html>
`
writeFileSync(join(OUT_DIR, `${tag}.html`), versionPage)
console.log(`✓ test-results/${tag}.html`)

const existingPages = readdirSync(OUT_DIR)
  .filter(f => f.endsWith('.html') && f !== 'index.html')
  .sort()
  .reverse()

const indexPage = `<!doctype html>
<html><head><meta charset="utf-8"><title>Test results by version</title>
<style>${pageStyle}</style></head>
<body>
  <h1>Test results by version</h1>
  <div class="meta">@ortiq-de/logo &middot; one page per tagged release</div>
  <table>
    <tr><th>Version</th></tr>
    ${existingPages.map(f => `<tr><td><a href="${esc(f)}">${esc(f.replace(/\.html$/, ''))}</a></td></tr>`).join('\n    ')}
  </table>
</body></html>
`
writeFileSync(join(OUT_DIR, 'index.html'), indexPage)
console.log(`✓ test-results/index.html (${existingPages.length} versions)`)
