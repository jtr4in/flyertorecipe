// Which Flipp flyer tiles to draw for a deal's clipping, and where (pure, for testing).
const TILE = 256
const SHARP = 800 // px of source width to aim for, so it stays crisp on phones

/** Tiles covering `clip.box` at a resolution that's sharp enough, positioned in % of the box. */
export function clipTiles(clip, sharp = SHARP) {
  const [l, t, r, b] = clip.box
  // clip.res lists zoom levels from smallest; level k shows the flyer at 1/res[k] scale.
  let k = clip.res.findIndex((z) => (r - l) / z >= sharp)
  if (k < 0) k = clip.res.length - 1
  const s = 1 / clip.res[k]
  const [L, T, R, B, H] = [l * s, t * s, r * s, b * s, clip.h * s]
  const W = R - L
  const Hh = B - T
  const tiles = []
  // Tile rows are counted up from the bottom edge of the flyer.
  for (let i = Math.floor(L / TILE); i <= Math.floor((R - 1) / TILE); i++) {
    for (let j = Math.floor((H - B) / TILE); j <= Math.floor((H - T - 1) / TILE); j++) {
      tiles.push({
        src: `${clip.base}${k}_${i}_${j}.jpg`,
        left: ((i * TILE - L) / W) * 100,
        top: ((H - (j + 1) * TILE - T) / Hh) * 100,
        width: (TILE / W) * 100,
        height: (TILE / Hh) * 100,
      })
    }
  }
  return { tiles, aspect: W / Hh }
}

