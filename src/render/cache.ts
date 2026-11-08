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

const sceneCanvas = document.createElement('canvas');
let sceneSignature = '';

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
  const sig = sceneSig();
  if (sig === sceneSignature && sceneCanvas.width) return sceneCanvas;

  if (sceneCanvas.width !== p.mapWidth || sceneCanvas.height !== p.mapHeight) {
    sceneCanvas.width = p.mapWidth;
    sceneCanvas.height = p.mapHeight;
  }
  const ctx = sceneCanvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, p.mapWidth, p.mapHeight);

  if (state.layers.map && p.bgImage && p.bgImage.complete) {
    try { ctx.drawImage(p.bgImage, 0, 0, p.mapWidth, p.mapHeight); } catch { /* ignore */ }
  }
  if (state.layers.road) drawRoadInto(ctx);
  if (state.layers.grid) drawGridInto(ctx);

  sceneSignature = sig;
  return sceneCanvas;
}

export function invalidateScene(): void { sceneSignature = '\u0000'; }
/** Backwards-compatible aliases. */
export const invalidateAll = invalidateScene;
export const invalidateRoad = invalidateScene;
export const invalidateGrid = invalidateScene;

function drawGridInto(ctx: CanvasRenderingContext2D): void {
  const g = state.geom, t = g.mapType;
  const nw = g.nodeWidth, nh = g.nodeHeight;
  const pw = state.params!.mapWidth, ph = state.params!.mapHeight;
  const rows = state.road.length, cols = state.road[0]?.length ?? 0;

  if (t === MapType.angle90) {
    // 原版 draw90AngleGrid：半格间距，偶数条是格子边界、奇数条是辅助线
    const r = angle90Lines(pw, ph, nw, nh, state.showAuxLine);
    drawAuxLines(ctx, r.horizontal, false, pw);
    drawAuxLines(ctx, r.vertical, true, ph);
    return;
  }
  if (t === MapType.angle45) {
    // 原版 draw45AngleGrid：两族矩形辅助线（受开关控制）+ 两族斜线（始终画）
    const r = angle45Lines(pw, ph, nw, nh, state.showAuxLine);
    drawAuxLines(ctx, r.horizontal, false, pw);
    drawAuxLines(ctx, r.vertical, true, ph);
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
    drawAuxLines(ctx, aux.vertical, true, ph);
    drawAuxLines(ctx, aux.horizontal, false, pw);
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
    ctx.lineWidth = b.width;
    // A 1px stroke centred on an integer coordinate straddles two device rows at
    // half alpha, so the thin auxiliary lines came out dim and soft: the green
    // `#00550025` line measured (32,38,32) twice instead of one row at (29,41,29).
    // The original renders it as a single crisp row, so nudge by half a pixel.
    const snap = b.width === 1 ? 0.5 : 0;
    ctx.beginPath();
    for (const p of b.pos) {
      const q = p + snap;
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
