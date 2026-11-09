import { MapType } from '../core/types';
import type { MapItem } from '../core/types';
import { hexToRgba, roadRenderColor, entityColor } from '../core/color';
import { TYPE_LABEL, ENTITY_SKINS, entityRing } from '../core/constants';
import { state } from '../app/state';
import { blitScene } from './cache';
import { context2d, inView, sizeCanvas } from './context';
import { cellPath } from './shapes';
import { drawMiniMap } from './minimap';

const el = (id: string) => document.getElementById(id) as HTMLElement;
const canvas = () => document.getElementById('mapCanvas') as HTMLCanvasElement;

/** cc.Node.color equivalent: multiply-tint a sprite while keeping its alpha. */
const tintCache = new Map<string, HTMLCanvasElement>();
function tintedSprite(img: HTMLImageElement, hex: string): HTMLCanvasElement | null {
  const key = img.src + '|' + hex;
  const hit = tintCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d');
  if (!x) return null;
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = 'multiply';
  x.fillStyle = hex; x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'destination-in';
  x.drawImage(img, 0, 0);
  tintCache.set(key, c);
  return c;
}

/**
 * On-map name label.
 *
 * `EditorSpawnPoint.refeshName()` replaces the base format entirely:
 * `【detailName】【默认】.本地图出生点Id：N` — the default spawn point also tints
 * its icon `#ffff00` (see `drawEntities`).
 */
function entityLabel(e: MapItem): string {
  const detail = String(e.detailName ?? '').trim();
  const prefix = detail ? '【' + detail + '】' : '';
  if (e.type === 'spawnPoint') {
    return prefix + (e.defaultSpawn ? '【默认】' : '')
         + '.本地图出生点Id：' + (Number(e.spawnId) || 0);
  }
  return String(e.objName || TYPE_LABEL[e.type] || '');
}

export function resizeCanvas(): void {
  const stage = el('editAreaView');
  const cv = canvas();
  // Bitmap = layout × fitScale × dpr so the browser never has to resample it.
  sizeCanvas(cv, stage.clientWidth, stage.clientHeight);
  render();
}

export function render(): void {
  const cv = canvas();
  if (!cv.width) return;
  const { ctx, W, H } = context2d(cv);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#222'; ctx.fillRect(0, 0, W, H);
  const p = state.params;
  if (!p) return;

  const z = state.view.zoom;
  ctx.save();
  ctx.translate(state.view.offsetX, state.view.offsetY);
  ctx.scale(z, z);
  // Background / road / grid are three separately cached layers; each is a
  // device-resolution bitmap blitted 1:1 in map units (see render/cache.ts).
  blitScene(ctx);
  if (state.layers.entity) drawEntities(ctx);
  if (state.pathPreview && state.pathPreview.length) drawPathPreview(ctx);
  if (state.cursorNode && state.mode === 'edit') drawBrushFocus(ctx);
  ctx.restore();
  updateScrollBars(W, H, p.mapWidth, p.mapHeight, z);
  // 小地图打开时白框跟随当前视口（原版 EditArea.update 每帧 refreshViewRect）。
  if (state.activeView === 'miniMap') drawMiniMap();
}

export function drawEntities(ctx: CanvasRenderingContext2D): void {
  if (!state.entities.length && !state.brushEntity) return;
  const now = Date.now();
  // Original EntityLayer.setDepthRand: sort by y descending so lower entities
  // are drawn on top.
  const list = state.entities.slice().sort((a, b) => (Number(b.y) || 0) - (Number(a.y) || 0));
  if (state.brushEntity) list.push(state.brushEntity);
  for (const e of list) {
    const isGhost = e === state.brushEntity;
    const x = Number(e.x) || 0, y = Number(e.y) || 0;
    const skin = Number(e.skin) || 0;
    const defs = ENTITY_SKINS[e.type as 'npc'];
    const def = defs ? defs[skin % defs.length] : undefined;
    const sets = state.sprites[e.type] || [];
    const frames = sets[skin % Math.max(1, sets.length)] || [];
    // AnimationController: cycle frames at frameTime (0.1s), looping.
    const ft = def?.frameTime || 0.1;
    const frame = frames.length > 1 ? Math.floor(now / (ft * 1000)) % frames.length : 0;
    const img = frames.length ? frames[frame] : null;
    ctx.save(); ctx.translate(x, y);
    if (isGhost) ctx.globalAlpha = 0.75;
    // Original Skin node sits slightly above the anchor; draw bottom-centred so
    // the sprite "stands" on the entity point.
    let drew = false;
    if (img && img.complete && img.naturalWidth) {
      const dw = def?.w || img.naturalWidth;
      const dh = def?.h || img.naturalHeight;
      // 默认出生点：图标染成 #ffff00（原版 EditorSpawnPoint.refeshName → setColor）
      const src = e.type === 'spawnPoint' && e.defaultSpawn ? tintedSprite(img, '#ffff00') : img;
      try { ctx.drawImage(src || img, -dw / 2, -dh, dw, dh); drew = true; } catch { /* ignore */ }
    }
    if (!drew) {
      ctx.fillStyle = entityColor(e.type, skin);
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-22, -72, 44, 72, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f5d8a8';
      ctx.beginPath(); ctx.arc(0, -78, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,.30)';
    ctx.beginPath(); ctx.ellipse(0, 3, 24, 8, 0, 0, Math.PI * 2); ctx.fill();
    if (!drew) {
      ctx.fillStyle = entityColor(e.type, skin);
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-22, -72, 44, 72, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f5d8a8';
      ctx.beginPath(); ctx.arc(0, -78, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    // name label above the sprite (original NameLabel). v2.0.2 toolBar2 has a
    // 「隐藏物体标题」switch, so the label is conditional.
    if (state.showEntityTitle) {
      const topY = -((def?.h) || 99) - 10;
      const label = entityLabel(e);
      ctx.fillStyle = e.type === 'npc' ? '#ff3535' : e.type === 'monster' ? '#5599ff'
                    : e.type === 'transfer' ? '#40e0e0' : '#ffd040';
      ctx.font = 'bold 20px "Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center'; ctx.strokeStyle = '#2e2e2e';
      ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.strokeText(label, 0, topY); ctx.fillText(label, 0, topY);
    }
    if (state.selectedEntity === e) {
      const ring = entityRing(String(e.type), skin);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.6;
      ctx.beginPath(); ctx.arc(ring.cx, ring.cy, ring.r, 0, Math.PI * 2); ctx.stroke();
    }
    if (state.showAnchor) { ctx.fillStyle = '#fff'; ctx.fillRect(-3, -3, 6, 6); }
    ctx.restore();
  }
}

function drawPathPreview(ctx: CanvasRenderingContext2D): void {
  const g = state.geom;
  ctx.fillStyle = 'rgba(255,180,0,.55)';
  for (const p of state.pathPreview!) {
    const c = g.cellCenter(p.x, p.y);
    ctx.beginPath();
    ctx.arc(c.x, c.y, Math.min(g.nodeWidth, g.nodeHeight) / 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBrushFocus(ctx: CanvasRenderingContext2D): void {
  const g = state.geom, t = g.mapType;
  ctx.fillStyle = 'rgba(67,67,67,0.56)';
  ctx.beginPath();
  for (const [ox, oy] of g.getStroke(state.brushSize)) {
    const n = state.cursorNode!;
    const cell = g.getNodeByWorldPoint(n.cx + ox, n.cy + oy);
    const c = g.cellCenter(cell.cx, cell.cy);
    cellPath(ctx, c.x, c.y, g.nodeWidth, g.nodeHeight,
             g.halfNodeWidth, g.halfNodeHeight, t);
  }
  ctx.fill();
}

/**
 * Scrollbar thumbs.
 *
 * Guarded by a cache: `render()` runs on every mousemove during a pan, and
 * writing four inline styles per frame forced a style/layout flush each time for
 * values that usually do not change.
 */
let sbW = -1, sbH = -1, sbX = -1, sbY = -1;
function updateScrollBars(W: number, H: number, pw: number, ph: number, z: number): void {
  const sw = Math.min(1, W / (pw * z)), sh = Math.min(1, H / (ph * z));
  const tw = Math.max(30, sw * W), th = Math.max(30, sh * H);
  const tx = Math.max(0, Math.min(W - tw, (-state.view.offsetX / (pw * z)) * W));
  const ty = Math.max(0, Math.min(H - th, (-state.view.offsetY / (ph * z)) * H));
  const hb = el('hScrollThumb'), vb = el('vScrollThumb');
  if (tw !== sbW) { hb.style.width = tw + 'px'; sbW = tw; }
  if (tx !== sbX) { hb.style.left = tx + 'px'; sbX = tx; }
  if (th !== sbH) { vb.style.height = th + 'px'; sbH = th; }
  if (ty !== sbY) { vb.style.top = ty + 'px'; sbY = ty; }
}
