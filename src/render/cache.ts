/**
 * Off-screen scene compositing.
 *
 * Background + road points + grid change only when the document, the settings,
 * a paint stroke or a visibility toggle changes — never while panning and never
 * while the player walks. They are composited once into a world-sized canvas
 * and blitted with a single `drawImage` per frame.
 *
 * This is the same idea as the original Cocos build, which drew the grid into
 * per-chunk `cc.Graphics` nodes instead of rebuilding paths every frame.
 */
import { MapType } from '../core/types';
import { hexToRgba, roadRenderColor } from '../core/color';
import {
  honeycombAuxLines, angle90Lines, angle45Lines, GRID_BORDER, type AuxLine,
} from '../core/grid';
import { state } from '../app/state';
import { hexPath, cellPath } from './shapes';
import { logicalSize } from './context';

const sceneCanvas = document.createElement('canvas');
let sceneSignature = '';

/**
 * Device pixels per map unit, i.e. the same factor the main canvas uses.
 *
 * The layer used to be `mapWidth × mapHeight` at 1:1 map units and then blitted
 * into a canvas whose base transform is `fitScale × dpr` — so every frame the
 * browser resampled the *whole map* with bilinear filtering, which smeared the
 * 1px auxiliary lines (measured: the green line's effective alpha spread over
 * 0.03–0.18 instead of a single crisp 0.145). Building the layer at device scale
 * makes the blit 1:1 again.
 */
function sceneDeviceScale(): number {
  const cv = document.getElementById('mapCanvas') as HTMLCanvasElement | null;
  if (!cv || !cv.width) return 1;
  const L = logicalSize(cv);
  return cv.width / Math.max(1, L.w);
}

function sceneSig(): string {
  const p = state.params;
  if (!p) return '';
  return [
    p.mapType, p.mapWidth, p.mapHeight, p.ceilWidth, p.ceilHeight,
    p.bgSrc || '',
    state.layers.map ? 1 : 0,
    state.layers.road ? 1 : 0,
    state.layers.grid ? 1 : 0,
    state.showAuxLine ? 1 : 0,
    state.roadVersion,
    state.painted.size,
    state.setting.roadSetDatas.map(d => d.color).join(','),
  ].join('|');
}

/** Composited background + road + grid at 1:1 world coordinates. */
export function getSceneLayer(): HTMLCanvasElement | null {
  const p = state.params;
  if (!p) return null;
  const k = sceneDeviceScale();
  const sig = sceneSig() + '|' + k.toFixed(4);
  if (sig === sceneSignature && sceneCanvas.width) return sceneCanvas;

  const bw = Math.max(1, Math.round(p.mapWidth * k));
  const bh = Math.max(1, Math.round(p.mapHeight * k));
  if (sceneCanvas.width !== bw) sceneCanvas.width = bw;
  if (sceneCanvas.height !== bh) sceneCanvas.height = bh;
  const ctx = sceneCanvas.getContext('2d');
  if (!ctx) return null;
  // Draw in map units; the transform lands them on device pixels.
  ctx.setTransform(bw / p.mapWidth, 0, 0, bh / p.mapHeight, 0, 0);
  ctx.clearRect(0, 0, p.mapWidth, p.mapHeight);

  if (state.layers.map && p.bgImage && p.bgImage.complete) {
    try { ctx.drawImage(p.bgImage, 0, 0, p.mapWidth, p.mapHeight); } catch { /* ignore */ }
  }
  if (state.layers.road) drawRoadInto(ctx);
  if (state.layers.grid) drawGridInto(ctx, bw / p.mapWidth);

  sceneSignature = sig;
  return sceneCanvas;
}

export function invalidateScene(): void { sceneSignature = '\u0000'; }
/** Backwards-compatible aliases. */
export const invalidateAll = invalidateScene;
export const invalidateRoad = invalidateScene;
export const invalidateGrid = invalidateScene;

function drawGridInto(ctx: CanvasRenderingContext2D, k: number): void {
  const g = state.geom, t = g.mapType;
  const nw = g.nodeWidth, nh = g.nodeHeight;
  const pw = state.params!.mapWidth, ph = state.params!.mapHeight;
  const rows = state.road.length, cols = state.road[0]?.length ?? 0;

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

  ctx.lineWidth = 1.5; ctx.strokeStyle = hexToRgba('#bbbbbbaa');
  ctx.beginPath();
  for (let dy = 0; dy < rows; dy++) {
    for (let dx = 0; dx < cols; dx++) {
      const c = g.cellCenter(dx, dy);
      hexPath(ctx, c.x, c.y, nw, nh, t === MapType.honeycomb);
    }
  }
  ctx.stroke();
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

function drawRoadInto(ctx: CanvasRenderingContext2D): void {
  const sets = state.setting.roadSetDatas;
  const g = state.geom, t = g.mapType;
  const cols = state.road[0]?.length || 1;
  for (let v = 0; v < sets.length; v++) {
    const s = sets[v];
    if (!s) continue;
    ctx.fillStyle = roadRenderColor(v, s.color);
    ctx.beginPath();
    let any = false;
    for (const key of state.painted) {
      const dy = Math.floor(key / cols), dx = key % cols;
      if (state.road[dy]?.[dx] !== v) continue;
      const c = g.cellCenter(dx, dy);
      cellPath(ctx, c.x, c.y, g.nodeWidth, g.nodeHeight,
               g.halfNodeWidth, g.halfNodeHeight, t);
      any = true;
    }
    if (any) ctx.fill();
  }
}
