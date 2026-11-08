import { MapType } from '../core/types';
import { hexToRgba, roadRenderColor } from '../core/color';
import { PLAYER_DRAW_OFFSET, PLAYER_FRAME_SIZE, playerFrame } from '../core/player';
import { state } from '../app/state';
import { blitScene } from './cache';
import { context2d, inView, sizeCanvas } from './context';
import { cellPath } from './shapes';
import { drawEntities } from './canvas';

const canvas = () => document.getElementById('testCanvas') as HTMLCanvasElement;
const el = (id: string) => document.getElementById(id) as HTMLElement;

export function renderTestSize(): void {
  const st = el('testStage'), cv = canvas();
  sizeCanvas(cv, st.clientWidth, st.clientHeight);
}

export function renderTest(): void {
  const cv = canvas();
  if (!cv.width) return;
  const { ctx, W, H } = context2d(cv);
  const T = state.test;
  if (!T || !state.params) return;
  ctx.fillStyle = '#222'; ctx.fillRect(0, 0, W, H);

  const p = T.player, pw = state.params.mapWidth, ph = state.params.mapHeight;
  // SceneMap.followPlayer: the camera eases toward the player (smooth lerp)
  // instead of snapping, which is what makes the original feel smooth.
  let ox = 0, oy = 0;
  if (T.follow) {
    ox = W / 2 - p.x; oy = H / 2 - p.y;
    ox = Math.min(0, Math.max(W - pw, ox));
    oy = Math.min(0, Math.max(H - ph, oy));
    // time-based easing so the camera glide is frame-rate independent
    const now = performance.now();
    const dt = T.lastT ? Math.min(0.1, (now - T.lastT) / 1000) : 1 / 60;
    T.lastT = now;
    const k = T.camReady ? 1 - Math.exp(-9 * dt) : 1;
    T.camX += (ox - T.camX) * k;
    T.camY += (oy - T.camY) * k;
    if (Math.abs(ox - T.camX) < 0.3) T.camX = ox;
    if (Math.abs(oy - T.camY) < 0.3) T.camY = oy;
    ox = T.camX; oy = T.camY;
    T.camReady = true;
  } else { T.camX = 0; T.camY = 0; T.camReady = false; T.lastT = 0; }
  ctx.save(); ctx.translate(ox, oy);
  ctx.fillStyle = '#222'; ctx.fillRect(0, 0, pw, ph);
  blitScene(ctx);
  if (state.layers.entity) drawEntities(ctx);
  // NOTE: the original draws nothing for a normal walk — the only path graphic
  // is `_testSeekPathGraphic`, which belongs to 查看寻路过程(F4). A yellow
  // "route preview" line here would be an invention, so it is not drawn.
  // 查看寻路过程(F4): draw the A* closed/open sets
  if (T.showPath) drawSeek(ctx);
  drawPlayer(ctx, p);
  ctx.save(); ctx.translate(p.x, p.y); drawPlayerLabels(ctx); ctx.restore();
  ctx.restore();

  const n = state.geom.getNodeByPixel(p.x, p.y);
  el('testInfoPixel').textContent = '(' + Math.floor(p.x) + ',' + Math.floor(p.y) + ')';
  el('testInfoGrid').textContent = '(' + n.dx + ',' + n.dy + ')';
  el('testInfoWorld').textContent = '(' + n.cx + ',' + n.cy + ')';
}

/**
 * 查看寻路过程 (F4) — `SceneMap.testSeekRoadCallback`:
 *
 *   graphic.clear()
 *   path found?  -> lineWidth 4, stroke #2b2b2b, fill #ffcc00: circle(px,py,10)
 *                   for every path node; then one line segment per 0.1 s
 *   no path      -> fill #d4d4d4 for the open list, then #ffcc00 for the closed
 *                   list, circle(px,py,10) each — redrawn on every search tick
 *
 * The circles are r=10 dots on the node centres, not filled hex cells.
 */
function drawSeek(ctx: CanvasRenderingContext2D): void {
  const T = state.test;
  if (!T || !T.seek || !state.params) return;
  const S = T.seek, g = state.geom;
  const dot = (n: { x: number; y: number }) => {
    const c = g.cellCenter(n.x, n.y);
    ctx.moveTo(c.x + 10, c.y);
    ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
  };

  if (S.step < S.frames.length) {
    // still searching: current frontier, grey open + amber closed
    const f = S.frames[Math.max(0, Math.min(S.step, S.frames.length - 1))];
    ctx.fillStyle = '#d4d4d4';
    ctx.beginPath();
    for (const n of f.open) dot(n);
    ctx.fill();
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    for (let i = 0; i < f.closed; i++) dot(S.closed[i]);
    ctx.fill();
    return;
  }
  if (!S.path) {
    // unreachable: the final frontier stays on screen, no line, player stays put
    const f = S.frames[S.frames.length - 1];
    if (!f) return;
    ctx.fillStyle = '#d4d4d4';
    ctx.beginPath();
    for (const n of f.open) dot(n);
    ctx.fill();
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    for (let i = 0; i < f.closed; i++) dot(S.closed[i]);
    ctx.fill();
    return;
  }

  // path found: amber dots on the path + the black polyline, segment by segment
  ctx.fillStyle = '#ffcc00';
  ctx.beginPath();
  for (const n of S.path) dot(n);
  ctx.fill();
  if (S.lineStep > 0) {
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    const c0 = g.cellCenter(S.path[0].x, S.path[0].y);
    ctx.moveTo(c0.x, c0.y);
    for (let i = 1; i <= Math.min(S.lineStep, S.path.length - 1); i++) {
      const c = g.cellCenter(S.path[i].x, S.path[i].y);
      ctx.lineTo(c.x, c.y);
    }
    ctx.stroke();
  }
}

/**
 * Player sprite — original `Charactor` + `MovieClip`.
 *
 * The `Skin` child node keeps the prefab anchor **(0.5, 0.25)**, not (0.5, 0.5),
 * so the 105×105 frame hangs above the player position: 26.25 px of it sits
 * below the anchor (the feet) and 78.75 px above. Directions 5/6/7 mirror the
 * sprite (`scaleX = -1`).
 */
function drawPlayer(ctx: CanvasRenderingContext2D,
                     p: { x: number; y: number; dir: number; state: string; frame: number; alpha?: number }): void {
  ctx.save(); ctx.translate(p.x, p.y);
  if (p.alpha !== undefined && p.alpha < 1) ctx.globalAlpha = p.alpha;
  const sheet = state.charSheet;
  const f = playerFrame(p.dir, p.state as never, p.frame);
  const S = PLAYER_FRAME_SIZE;
  let drew = false;
  if (sheet && sheet.complete && sheet.naturalWidth) {
    ctx.save();
    if (f.flip) ctx.scale(-1, 1);
    try {
      ctx.drawImage(sheet, f.col * S, f.row * S, S, S,
        PLAYER_DRAW_OFFSET.x, PLAYER_DRAW_OFFSET.y, S, S);
      drew = true;
    } catch { /* ignore */ }
    ctx.restore();
  }
  if (!drew) {
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(0, 4, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
    fallbackPlayer(ctx);
  }
  ctx.restore();
}
/**
 * Original TestView Player node: NameTxt "玩家" at local y=+100.3 and DetailTxt
 * "点击我可以拖曳位置" at y=+126 — both **above** the character (canvas y is down).
 */
function drawPlayerLabels(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '24px "Microsoft YaHei",sans-serif';
  ctx.fillStyle = '#E7DE07';
  ctx.strokeStyle = '#2e2e2e'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  ctx.strokeText('玩家', 0, -100);
  ctx.fillText('玩家', 0, -100);
  // hint on a dark bar (DetailTxt sits above the name in the original prefab)
  const hint = '点击我可以拖曳位置';
  ctx.font = '20px "Microsoft YaHei",sans-serif';
  const w = ctx.measureText(hint).width;
  ctx.fillStyle = 'rgba(0,0,0,.62)';
  ctx.beginPath();
  ctx.roundRect(-w / 2 - 8, -144, w + 16, 26, 4);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(hint, 0, -124);
  ctx.restore();
}

function fallbackPlayer(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#f0c020'; ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, -52, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e8b020';
  ctx.beginPath(); ctx.roundRect(-14, -36, 28, 32, 6); ctx.fill(); ctx.stroke();
}
