// Extracts each facet's path `d` attribute (and its base.svg opacity) out of the mark's
// raw SVG markup, keyed by facetGeometry's ids. Used to build the single-tone hexagon
// glyph that createTextLockup/createIconLockup embed (see lockup.mjs).
export function extractHexPaths(baseSvgString, facetGeometry) {
  return facetGeometry.map(g => {
    const path = baseSvgString.match(new RegExp(`id="${g.id}" d="([^"]+)"`))
    return { d: path[1], op: g.baseOpacity }
  })
}
