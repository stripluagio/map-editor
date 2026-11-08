/**
 * Off-screen layers.
 *
 * Background, grid and road points change for completely different reasons, so
 * they live in **three independent caches** instead of one composite:
 *
 *   bg    — the background image                 (map / bg / device scale)
 *   grid  — grid lines; honeycomb outlines are  (map type, cell size, aux toggle,
 *           rasterised once into their own       device scale)
 *           layer first
 *   road  — the painted road cells               (a paint stroke, settings)
 *
 * Why it matters: with a single composite, painting one road cell invalidated
 * everything and re-rasterised all 2640 hexagons — measured **894 ms for a
 * 30-cell drag** on a 1920×1440 honeycomb map, i.e. the brush lagged ~30 ms
 * behind the cursor per step. Split this way a paint stroke only touches `road`
 * (~2 ms) and never re-runs the grid.
 *
 * Visibility toggles (`layers.map/road/grid`) do not invalidate anything either:
 * a hidden layer is simply not blitted.
 *
 * This is the same idea as the original Cocos build, which drew the grid into
 * per-chunk `cc.Graphics` nodes once instead of rebuilding paths every frame.
 */
import { MapType } from '../core/types';
import type { MapParams } from '../core/types';
import { hexToRgba, roadRenderColor } from '../core/color';
import {
  honeycombAuxLines, angle90Lines, angle45Lines, GRID_BORDER, type AuxLine,
} from '../core/grid';
import { state } from '../app/state';
import { cellPath } from './shapes';
import { hexOutlinePath, invalidateHexPath } from './gridpath';
import { logicalSize } from './context';

interface Layer { cv: HTMLCanvasElement; sig: string }

const bgLayer: Layer = { cv: document.createElement('canvas'), sig: '' };
const hexLayer: Layer = { cv: document.createElement('canvas'), sig: '' };
const gridLayer: Layer = { cv: document.createElement('canvas'), sig: '' };
const roadLayer: Layer = { cv: document.createElement('canvas'), sig: '' };

/**
 * Rebuild counters, one per layer.
 *
 * Exposed to the e2e suite (`WMLayerStats`) so the "layers are independent"
 * property can be asserted directly instead of inferred from timings: painting a
 * road point must bump `road` and nothing else.
 */
export const layerStats = { bg: 0, hex: 0, grid: 0, road: 0 };

/**
 * Device pixels per map unit, i.e. the same factor the main canvas uses.
 *
 * The layers used to be `mapWidth × mapHeight` at 1:1 map units and then blitted
 * into a canvas whose base transform is `fitScale × dpr` — so every frame the
 * browser resampled the *whole map* with bilinear filtering, which smeared the
 * 1px auxiliary lines (measured: the green line's effective alpha spread over
 * 0.03–0.18 instead of a single crisp 0.145). Building the layers at device scale
 * makes the blit 1:1 again.
 */
function sceneDeviceScale(): number {
  const cv = document.getElementById('mapCanvas') as HTMLCanvasElement | null;
  if (!cv || !cv.width) return 1;
  const L = logicalSize(cv);
  return cv.width / Math.max(1, L.w);
}

interface Prepared {
  ctx: CanvasRenderingContext2D | null;
  /** True when the layer is already up to date — skip drawing. */
  hit: boolean;
}

/** Resize + clear a layer if its signature changed; otherwise report a hit. */
function begin(L: Layer, sig: string, bw: number, bh: number): Prepared {
  if (L.sig === sig && L.cv.width === bw && L.cv.height === bh) return { ctx: null, hit: true };
  if (L.cv.width !== bw) L.cv.width = bw;
  if (L.cv.height !== bh) L.cv.height = bh;
  const ctx = L.cv.getContext('2d');
  if (!ctx) return { ctx: null, hit: false };
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, bw, bh);
  L.sig = sig;
  return { ctx, hit: false };
}

function geoKey(p: MapParams): string {
  return [p.mapType, p.mapWidth, p.mapHeight, p.ceilWidth, p.ceilHeight].join('|');
}

function layerSize(p: MapParams, k: number): { bw: number; bh: number } {
  return {
    bw: Math.max(1, Math.round(p.mapWidth * k)),
    bh: Math.max(1, Math.round(p.mapHeight * k)),
  };
}

/**
 * Blit background → road → grid into the current context (map-unit coordinates).
 *
 * Three `drawImage` calls instead of one, but each is 1:1 and clipped to the
 * viewport: measured 0.05 ms for all three versus 0.015 ms for the old single
 * composite, and it is what lets every layer be rebuilt on its own.
 */
export function blitScene(ctx: CanvasRenderingContext2D): void {
  const p = state.params;
  if (!p) return;
  const k = sceneDeviceScale();
  const { bw, bh } = layerSize(p, k);
  const bg = getBgLayer(p, bw, bh);
  if (bg) ctx.drawImage(bg, 0, 0, p.mapWidth, p.mapHeight);
  const road = getRoadLayer(p, bw, bh);
  if (road) ctx.drawImage(road, 0, 0, p.mapWidth, p.mapHeight);
  const grid = getGridLayer(p, bw, bh);
  if (grid) ctx.drawImage(grid, 0, 0, p.mapWidth, p.mapHeight);
}

export function invalidateScene(): void {
  bgLayer.sig = hexLayer.sig = gridLayer.sig = roadLayer.sig = '\u0000';
  invalidateHexPath();
}
/** Backwards-compatible aliases. */
export const invalidateAll = invalidateScene;
export const invalidateRoad = invalidateScene;
export const invalidateGrid = invalidateScene;

function getBgLayer(p: MapParams, bw: number, bh: number): HTMLCanvasElement | null {
  if (!state.layers.map) return null;
  const img = p.bgImage;
  if (!img || !img.complete || !img.naturalWidth) return null;
  const r = begin(bgLayer, 'bg|' + (p.bgSrc || '') + '|' + bw + 'x' + bh, bw, bh);
  if (!r.hit) {
    layerStats.bg++;
    if (!r.ctx) return null;
    r.ctx.setTransform(bw / p.mapWidth, 0, 0, bh / p.mapHeight, 0, 0);
    try { r.ctx.drawImage(img, 0, 0, p.mapWidth, p.mapHeight); } catch { /* ignore */ }
  }
  return bgLayer.cv;
}

/** Honeycomb outlines only — the expensive part, rasterised once per geometry. */
function getHexLayer(p: MapParams, bw: number, bh: number): HTMLCanvasElement | null {
  if (p.mapType !== MapType.honeycomb && p.mapType !== MapType.honeycomb2) return null;
  const g = state.geom;
  const rows = state.road.length, cols = state.road[0]?.length ?? 0;
  if (!rows || !cols) return null;
  const sig = 'hex|' + geoKey(p) + '|' + cols + 'x' + rows + '|' + bw + 'x' + bh;
  const r = begin(hexLayer, sig, bw, bh);
  if (!r.hit) {
    layerStats.hex++;
    if (!r.ctx) return null;
    r.ctx.setTransform(bw / p.mapWidth, 0, 0, bh / p.mapHeight, 0, 0);
    r.ctx.lineWidth = 1.5;
    r.ctx.strokeStyle = hexToRgba(GRID_BORDER);
    r.ctx.stroke(hexOutlinePath(g, cols, rows));
  }
  return hexLayer.cv;
}

function getGridLayer(p: MapParams, bw: number, bh: number): HTMLCanvasElement | null {
  if (!state.layers.grid) return null;
  const hex = getHexLayer(p, bw, bh);
  // Auxiliary lines off + honeycomb → the hexagon layer *is* the grid layer.
  if (hex && !state.showAuxLine) return hex;

  const sig = 'grid|' + geoKey(p) + '|' + (state.showAuxLine ? 1 : 0) + '|' + bw + 'x' + bh;
  const r = begin(gridLayer, sig, bw, bh);
  if (!r.hit) {
    layerStats.grid++;
    if (!r.ctx) return null;
    r.ctx.setTransform(bw / p.mapWidth, 0, 0, bh / p.mapHeight, 0, 0);
    drawGridInto(r.ctx, bw / p.mapWidth, hex);
  }
  return gridLayer.cv;
}

function drawGridInto(
  ctx: CanvasRenderingContext2D, k: number, hex: HTMLCanvasElement | null,
): void {
  const g = state.geom, t = g.mapType;
  const nw = g.nodeWidth, nh = g.nodeHeight;
  const pw = state.params!.mapWidth, ph = state.params!.mapHeight;

  if (t === MapType.angle90) {
    // 原版 draw90AngleGrid：半格间距，偶数条是格子边界、奇数条是辅助线
    const r = angle90Lines(pw, ph, nw, nh, state.showAuxLine);
    drawAuxLines(ctx, r.horizontal, false, pw, k);
    drawAuxLines(ctx, r.vertical, true, ph, k);
    return;
  }
  if (t === MapType.angle45) {
    // 原版 draw45AngleGrid：两族矩形辅助线（受开关控制）+ 两族斜线（始终画）
    const r = angle45Lines(pw, ph, nw, nh, state.showAuxLine);
    drawAuxLines(ctx, r.horizontal, false, pw, k);
    drawAuxLines(ctx, r.vertical, true, ph, k);
    ctx.strokeStyle = hexToRgba(GRID_BORDER);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const s of r.diagonals) { ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); }
    ctx.stroke();
    return;
  }
  // honeycomb / honeycomb2: 原版那两族辅助线 + 六边形描边
  // 原版 `drawGrid(..., false)` 就是这个开关：关掉后只剩六边形描边。
  if (state.showAuxLine) {
    const aux = honeycombAuxLines(nw, nh, pw, ph, t);
    drawAuxLines(ctx, aux.vertical, true, ph, k);
    drawAuxLines(ctx, aux.horizontal, false, pw, k);
  }
  // 六边形是单独一层，按地图单位 1:1 贴回来（ctx 已经是 k 倍变换）。
  if (hex && hex.width) ctx.drawImage(hex, 0, 0, pw, ph);
}

/**
 * Draw one family of auxiliary lines, batched by (colour, width) so a big map
 * costs a handful of `stroke()` calls instead of one per line.
 */
function drawAuxLines(
  ctx: CanvasRenderingContext2D, lines: AuxLine[], vertical: boolean, span: number,
  k: number,
): void {
  const buckets = new Map<string, { color: string; width: number; pos: number[] }>();
  for (const l of lines) {
    const key = l.color + '|' + l.width;
    let b = buckets.get(key);
    if (!b) { b = { color: l.color, width: l.width, pos: [] }; buckets.set(key, b); }
    b.pos.push(l.pos);
  }
  for (const b of buckets.values()) {
    ctx.strokeStyle = hexToRgba(b.color);
    // 一条线必须是**整数个设备像素**，并且中心落在某个设备像素的中心上。
    //
    // 之前直接写 `lineWidth = 1`（地图单位）再加 0.5 偏移 —— 那只有在
    // 「1 地图单位 = 1 设备像素」时才成立。现在画布按 fitScale×dpr 放大，
    // 1 地图单位 = k 个设备像素（k≈0.99），于是 1px 线被 Canvas2D 分摊到两列、
    // 每列只有 ~0.6 的覆盖率，绿线实测有效 alpha 摊在 0.03~0.12 之间，
    // 比原版的 0.141 暗了三成，看起来就是「发虚、偏淡」。
    //
    // 原版是 WebGL 光栅化，细线固定占满一行，所以照样很实。这里按设备像素
    // 取整（宽度 round(width*k) 个设备像素、中心对齐到像素中心）复现同样的观感。
    const dw = Math.max(1, Math.round(b.width * k));
    ctx.lineWidth = dw / k;
    const snap = (v: number) => (Math.floor(v * k) + dw / 2) / k;
    ctx.beginPath();
    for (const p of b.pos) {
      const q = snap(p);
      if (vertical) { ctx.moveTo(q, 0); ctx.lineTo(q, span); }
      else { ctx.moveTo(0, q); ctx.lineTo(span, q); }
    }
    ctx.stroke();
  }
}

function getRoadLayer(p: MapParams, bw: number, bh: number): HTMLCanvasElement | null {
  if (!state.layers.road) return null;
  const sets = state.setting.roadSetDatas;
  const sig = 'road|' + geoKey(p) + '|' + bw + 'x' + bh + '|' + state.roadVersion
            + '|' + state.painted.size + '|' + sets.map(d => d && d.color).join(',');
  const r = begin(roadLayer, sig, bw, bh);
  if (!r.hit) {
    layerStats.road++;
    if (!r.ctx) return null;
    r.ctx.setTransform(bw / p.mapWidth, 0, 0, bh / p.mapHeight, 0, 0);
    drawRoadInto(r.ctx);
  }
  return roadLayer.cv;
}

function drawRoadInto(ctx: CanvasRenderingContext2D): void {
  const sets = state.setting.roadSetDatas;
  const g = state.geom, t = g.mapType;
  const cols = state.road[0]?.length || 1;

  // One pass over the painted set, bucketed by road value. The previous version
  // walked the whole set once per road value (4 passes), which is 4× the work on
  // a densely painted map.
  const buckets: number[][] = sets.map(() => []);
  for (const key of state.painted) {
    const dy = Math.floor(key / cols), dx = key % cols;
    const v = state.road[dy]?.[dx];
    if (v === undefined || v < 0 || v >= buckets.length) continue;
    buckets[v].push(key);
  }

  for (let v = 0; v < buckets.length; v++) {
    const s = sets[v];
    if (!s || !buckets[v].length) continue;
    ctx.fillStyle = roadRenderColor(v, s.color);
    ctx.beginPath();
    for (const key of buckets[v]) {
      const dy = Math.floor(key / cols), dx = key % cols;
      const c = g.cellCenter(dx, dy);
      cellPath(ctx, c.x, c.y, g.nodeWidth, g.nodeHeight,
               g.halfNodeWidth, g.halfNodeHeight, t);
    }
    ctx.fill();
  }
}
