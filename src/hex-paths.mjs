// Extracts each facet's path `d` attribute (and its base.svg opacity) out of the mark's
// raw SVG markup, keyed by facetGeometry's ids. Used to build the single-tone hexagon
// glyph that createTextLockup/createIconLockup embed (see lockup.mjs).
export function extractHexPaths(baseSvgString, facetGeometry) {
  return facetGeometry.map(g => {
    const path = baseSvgString.match(new RegExp(`id="${g.id}" d="([^"]+)"`))
    return { d: path[1], op: g.baseOpacity }
  })
}

// Extracts the pupil circle's radius out of base.svg (id="pupil"), so lockups built from
// the real facet geometry also carry the v6 eye/pupil concept instead of a bare ring.
export function extractPupilRadius(baseSvgString) {
  const m = baseSvgString.match(/<circle id="pupil"[^>]*\sr="([\d.]+)"/)
  return m ? parseFloat(m[1]) : null
}
