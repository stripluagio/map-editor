import { MapDataModel, buildMapData } from '../core/model';
import { state } from './state';
import { render } from '../render/canvas';
import { toast } from '../ui/overlay';
import { closeView } from '../ui/views';
import { $ } from '../ui/dom';

/** Returns a MapDataModel (so `.toJson()` stays available, matching the JS API). */
export function getMapData(): MapDataModel | null {
  if (!state.params) return null;
  const m = new MapDataModel();
  Object.assign(m, buildMapData(state.params, state.road, state.entities, state.setting));
  return m;
}

function download(name: string, text: string, type = 'application/json'): void {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/** Longest side of the 地图缩小导出 thumbnail. */
export const SMALL_EXPORT_MAX = 512;

/**
 * Build the exported map image.
 *
 * 地图切片导出 / 地图缩小导出 export the **map asset**, i.e. the background
 * image stretched over `mapWidth × mapHeight` — exactly what the editor's
 * `MapLayer` shows when every helper layer is off.
 *
 * They must NOT reuse `#mapCanvas`: that is the *editor viewport*, so it carries
 * the road points, the grid, the entity layer and only covers the visible part
 * of a panned/zoomed map. Dumping it baked all of that into the PNG (and cut
 * the map off at the current scroll position).
 *
 * `scale` is applied to the full map, independent of the current view.
 */
export function buildMapExport(scale = 1): HTMLCanvasElement | null {
  const p = state.params;
  if (!p) return null;
  const w = Math.max(1, Math.round(p.mapWidth * scale));
  const h = Math.max(1, Math.round(p.mapHeight * scale));
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  const bg = p.bgImage;
  if (bg && bg.complete && bg.naturalWidth) {
    ctx.drawImage(bg, 0, 0, w, h);
  } else {
    // no background yet — keep the same "empty map" look as the editor
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, w, h);
  }
  return cv;
}

function saveCanvasPNG(cv: HTMLCanvasElement, name: string): void {
  const a = document.createElement('a');
  a.href = cv.toDataURL('image/png');
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 500);
}

export function saveFile(): void {
  const d = getMapData();
  if (!d) return;
  download(d.name + '.json', JSON.stringify(d.toJson()));
  toast('已保存 ' + d.name + '.json');
}
/** 地图切片导出（ctrl + W）— full-size map image, no editor overlays. */
export function exportTiles(): void {
  const p = state.params;
  if (!p) return;
  const cv = buildMapExport(1);
  if (!cv) return;
  saveCanvasPNG(cv, p.name + '.png');
  toast('地图切片导出：' + cv.width + '×' + cv.height + ' 原图 PNG（不含路点/网格）');
}
/** 地图缩小导出（ctrl + T）— the same clean map, scaled down for a thumbnail. */
export function exportSmall(): void {
  const p = state.params;
  if (!p) return;
  const longest = Math.max(p.mapWidth, p.mapHeight) || 1;
  const scale = Math.min(1, SMALL_EXPORT_MAX / longest);
  const cv = buildMapExport(scale);
  if (!cv) return;
  saveCanvasPNG(cv, p.name + '_small.png');
  toast('地图缩小导出：' + cv.width + '×' + cv.height + ' 缩略 PNG（不含路点/网格）');
}

export function saveSettings(): void {
  try { localStorage.setItem('wmc_settings', JSON.stringify(state.setting)); } catch { /* ignore */ }
}
export function loadSettings(): void {
  try {
    const s = JSON.parse(localStorage.getItem('wmc_settings') || 'null');
    if (s && Array.isArray(s.roadSetDatas)) state.setting = s;
  } catch { /* ignore */ }
}

export function applySettings(): void {
  state.setting.defaultRoadValue = Number(($('stDefaultValue') as HTMLInputElement).value) || 0;
  if (state.params) state.params.name = ($('stName') as HTMLInputElement).value || state.params.name;
  saveSettings();
  state.roadVersion++;
  closeView();
  render();
  toast('设置已应用');
}
