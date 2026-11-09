import { LAUNCH_PARAMS } from '../core/constants';
import { MapParamsModel, normalizeEntity } from '../core/model';
import { roadRowCount } from '../core/geometry';
import type { MapData } from '../core/types';
import { state } from './state';
import { resizeCanvas, render } from '../render/canvas';
import { invalidateAll } from '../render/cache';

/** Rebuild the painted-cell set from road values (mirrors initRoadPointInfo). */
export function rebuildPainted(): void {
  state.painted = new Set<number>();
  const cols = state.road[0]?.length || 0;
  const def = state.setting.defaultRoadValue;
  for (let dy = 0; dy < state.road.length; dy++) {
    const row = state.road[dy];
    for (let dx = 0; dx < row.length; dx++) {
      if (row[dx] !== def) state.painted.add(dy * cols + dx);
    }
  }
}
import { renderTestSize } from '../render/playmode';
import { buildPropertyPanel } from '../ui/property';
import { syncLayerBtns } from '../ui/toolbars';
import { toast } from '../ui/overlay';

export function defaultBg(cb: (img: HTMLImageElement | null) => void): void {
  if (state.bgImage && state.bgImage.complete && state.bgImage.naturalWidth) {
    cb(state.bgImage); return;
  }
  const img = new Image();
  img.onload = () => { state.bgImage = img; cb(img); };
  img.onerror = () => cb(null);
  img.src = 'assets/map_bg.jpg';
}

/** Initialise a document from MapParams + optional imported MapData. */
export function initDocument(params: MapParamsModel, data: Partial<MapData> | null): void {
  state.params = params;
  const g = state.geom.updateMapInfo(
    params.mapWidth, params.mapHeight, params.ceilWidth, params.ceilHeight, params.mapType);
  // angle45 exports twice the grid's rows (see `roadRowCount`), and its diamond
  // reaches further than `grid.row`, so allocate the export shape — otherwise
  // the bottom-left band is silently unpaintable.
  const roadRows = roadRowCount(params.mapType, g.row);
  const blank = () => new Array<number>(g.col).fill(state.setting.defaultRoadValue);
  state.road = [];
  for (let y = 0; y < roadRows; y++) state.road.push(blank());
  state.painted = new Set<number>();
  state.entities = [];
  if (data) {
    if (Array.isArray(data.roadDataArr)) {
      state.road = data.roadDataArr.map(r => Array.isArray(r) ? r.slice() : blank());
      while (state.road.length < roadRows) state.road.push(blank());
    }
    if (Array.isArray(data.mapItems)) state.entities = data.mapItems.map(normalizeEntity);
  }
  // Mirror original `initRoadPointInfo`: only cells differing from the default
  // road value are stored in `_roadNodeDic` and therefore rendered.
  rebuildPainted();
  state.roadVersion++;
  invalidateAll();
  state.selectedEntity = null;
  state.undo.clear();
  state.view.offsetX = 0; state.view.offsetY = 0; state.view.zoom = 1;
  state.layers = { map: true, road: true, entity: true, grid: true };
  syncLayerBtns(state.layers);
  buildPropertyPanel();
  resizeCanvas(); render();
}

/**
 * Launch state — verified against the original Cocos runtime:
 *   mapData, mapType=3, 1920x1440, ceil 40x34.64, bamboo bg,
 *   roadDataArr = 48x55 all `1` (defaultRoadValue, nothing painted),
 *   mapItems = [] (no entities on the canvas).
 * The red banner / torii / dark water in the screenshot are part of the
 * background image itself, NOT placed entities or painted road cells.
 *
 * The document is created **before** the background image is requested. It used
 * to be created inside `defaultBg()`'s callback, so the entire sample map hung
 * off one image request: if `assets/map_bg.jpg` was missing (an incomplete
 * download) or blocked (some `file://` setups), `createSampleMap` simply never
 * ran and the editor came up with **no document at all** — an empty canvas, which
 * reads as "the downloaded copy has no default scene".
 */
export function createSampleMap(): void {
  const p = new MapParamsModel({ ...LAUNCH_PARAMS, bgSrc: 'assets/map_bg.jpg' });
  initDocument(p, null);   // all cells default (1), zero entities
  // Reproduce the original launch camera framing. Verified by locating the
  // red banner in both 1920x1080 screenshots: original (920,255), clone at
  // zoom=1/offset=0 (929,808) -> shift up by 553px, left by 9px.
  state.view.zoom = 1;
  state.view.offsetX = -9;
  state.view.offsetY = -553;
  render();
  renderTestSize();

  // Attach the background when it arrives. The map is already editable without
  // it, so a missing/slow image degrades to "grid only" plus a visible notice
  // instead of "nothing at all".
  defaultBg(img => {
    if (state.params !== p) return;        // user already opened another map
    if (!img) {
      toast('底图 assets/map_bg.jpg 加载失败：地图仍可编辑，请确认文件存在（用 npm run serve 打开更稳妥）');
      return;
    }
    p.bgImage = img;
    invalidateAll();
    render();
    renderTestSize();
  });
}
