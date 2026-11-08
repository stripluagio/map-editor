import { LAUNCH_PARAMS } from '../core/constants';
import { MapParamsModel, normalizeEntity } from '../core/model';
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
  state.road = [];
  for (let y = 0; y < g.row; y++) state.road.push(new Array<number>(g.col).fill(state.setting.defaultRoadValue));
  state.painted = new Set<number>();
  state.entities = [];
  if (data) {
    if (Array.isArray(data.roadDataArr)) {
      state.road = data.roadDataArr.map(r => Array.isArray(r) ? r.slice() : new Array<number>(g.col).fill(state.setting.defaultRoadValue));
      while (state.road.length < g.row) state.road.push(new Array<number>(g.col).fill(state.setting.defaultRoadValue));
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
 */
export function createSampleMap(): void {
  defaultBg(img => {
    const p = new MapParamsModel({ ...LAUNCH_PARAMS, bgImage: img, bgSrc: 'assets/map_bg.jpg' });
    initDocument(p, null);   // all cells default (1), zero entities
    // Reproduce the original launch camera framing. Verified by locating the
    // red banner in both 1920x1080 screenshots: original (920,255), clone at
    // zoom=1/offset=0 (929,808) -> shift up by 553px, left by 9px.
    state.view.zoom = 1;
    state.view.offsetX = -9;
    state.view.offsetY = -553;
    render();
    renderTestSize();
  });
}
