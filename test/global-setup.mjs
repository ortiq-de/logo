// Runs once before the whole suite so a fresh dist/ exists for the dist-smoke, exports-map,
// and pack-smoke tests — none of them should trigger their own build.
import { execSync } from 'child_process'

export default function setup() {
  execSync('node scripts/bundle.mjs', { stdio: 'inherit', cwd: new URL('..', import.meta.url) })
}
