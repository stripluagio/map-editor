import { roadRenderColor } from '../core/color';
import { state } from '../app/state';
import { context2d, sizeCanvas } from './context';

const canvas = () => document.getElementById('miniMapCanvas') as HTMLCanvasElement;

/**
 * 地图缩略图 + 视口白框（原版 `MiniMapView`）。
 *
 * 原版在 `EditArea.update()` 里每帧调用
 * `miniMapView.refreshViewRect(-editStage.x, -editStage.y)`，所以白框始终等于
 * 「当前这一屏」：宽高 = 编辑区尺寸 × 缩放比例 / editStage.scale，位置 = 取反的
 * 编辑区位移。这里由 `render()` 在小地图打开时调用本函数，保证平移/缩放时同步。
 */
export function drawMiniMap(): void {
  const cv = canvas();
  if (!cv) return;
  // 540×450 是布局尺寸（CSS 里也是这个数）；位图按 fitScale × dpr 放大，
  // 否则 #app 的 CSS transform 会把整块画布再缩一次。
  const lw = 540, lh = 450;
  sizeCanvas(cv, lw, lh);
  const { ctx, W, H } = context2d(cv);
  ctx.fillStyle = '#333'; ctx.fillRect(0, 0, W, H);
  const p = state.params;
  if (!p) return;

  const s = Math.min((W - 4) / p.mapWidth, (H - 4) / p.mapHeight);
  const dw = p.mapWidth * s, dh = p.mapHeight * s;
  const dx = (W - dw) / 2, dy = (H - dh) / 2;
  if (p.bgImage && p.bgImage.complete) {
    try { ctx.drawImage(p.bgImage, dx, dy, dw, dh); } catch { /* ignore */ }
  }
  if (state.layers.road) {
    const sets = state.setting.roadSetDatas;
    const cols = state.road[0]?.length || 1;
    const cell = Math.max(1, state.geom.nodeWidth * s);
    for (let v = 0; v < sets.length; v++) {
      if (!sets[v]) continue;
      ctx.fillStyle = roadRenderColor(v, sets[v].color);
      for (const key of state.painted) {
        const y = Math.floor(key / cols), x = key % cols;
        if (state.road[y]?.[x] !== v) continue;
        const c = state.geom.cellCenter(x, y);
        ctx.fillRect(dx + c.x * s, dy + c.y * s, cell, cell);
      }
    }
  }

  // --- 视口白框 (MiniMapView.refreshViewRect) ---
  const mapCv = document.getElementById('mapCanvas') as HTMLCanvasElement;
  const z = state.view.zoom || 1;
  const viewW = mapCv.width, viewH = mapCv.height;   // 编辑区像素（未缩放）
  const vw = (viewW / z) * s, vh = (viewH / z) * s;
  const vx = (-state.view.offsetX / z) * s, vy = (-state.view.offsetY / z) * s;
  // 原版只在底图大于编辑区时才画：整张图都在屏幕内时 `_rectSize=0` → clear()，
  // 没有「一屏」可言，白框消失。
  if (p.mapWidth > viewW || p.mapHeight > viewH) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;                 // 原版 lineWidth 4（不是 3）
    ctx.strokeRect(dx + vx, dy + vy, vw, vh);
  }
  state.minimapRect = { dx, dy, s, vx, vy, vw, vh };
}
