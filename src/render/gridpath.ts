import type { MapRoadUtils } from '../core/geometry';
import { MapType } from '../core/types';
import { hexVertsInto } from '../core/grid';

/**
 * Cached `Path2D` for the honeycomb outline.
 *
 * Two things made the honeycomb grid expensive to rebuild, and both are about the
 * *path*, not the rasterisation:
 *
 * 1. **The path was rebuilt every time**, even though it only depends on the map
 *    type / cell size / row-col count — not on the device scale (it lives in map
 *    units, so a window resize can reuse it as-is). Caching it here.
 * 2. **`moveTo`/`lineTo` are slow when you call them 18,480 times** — measured
 *    ~45 ms for a 1920×1440 map (2640 hexagons). Building one SVG path string and
 *    letting `new Path2D(str)` parse it in native code takes **~6 ms** and
 *    produces a byte-identical raster (verified: 0 differing pixels).
 *
 * Combined, a honeycomb grid rebuild went from ~131 ms to ~54 ms, and the ~54 ms
 * that is left is pure rasterisation (Skia stroking 2640 closed hexagons) which
 * happens once per geometry change.
 */
let cache: { sig: string; path: Path2D } | null = null;
const buf = new Float64Array(12);

/** 2 decimals ≈ 0.008 device px at the usual scale — below rasterisation noise. */
const r2 = (v: number): number => Math.round(v * 100) / 100;

export function hexOutlinePath(g: MapRoadUtils, cols: number, rows: number): Path2D {
  const flatTop = g.mapType === MapType.honeycomb;
  const sig = [g.mapType, cols, rows, g.nodeWidth, g.nodeHeight].join('|');
  if (cache && cache.sig === sig) return cache.path;

  const nw = g.nodeWidth, nh = g.nodeHeight;
  const parts: string[] = [];
  for (let dy = 0; dy < rows; dy++) {
    for (let dx = 0; dx < cols; dx++) {
      const c = g.cellCenter(dx, dy);
      hexVertsInto(buf, c.x, c.y, nw, nh, flatTop);
      let s = 'M' + r2(buf[0]) + ' ' + r2(buf[1]);
      for (let i = 2; i < 12; i += 2) s += 'L' + r2(buf[i]) + ' ' + r2(buf[i + 1]);
      parts.push(s + 'Z');
    }
  }
  const path = new Path2D(parts.join(''));
  cache = { sig, path };
  return path;
}

/** Drop the cached path (tests, or a geometry change we could not see). */
export function invalidateHexPath(): void { cache = null; }
