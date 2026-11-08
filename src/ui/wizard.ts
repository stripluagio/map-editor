import { MapType, MAX_CEIL_COUNT, MAP_TYPE_NAMES } from '../core';
import { computeGridSize } from '../core/geometry';
import { MapParamsModel } from '../core/model';
import type { ViewName, MapData } from '../core/types';
import { state } from '../app/state';
import { $, el, inputValue, setInputValue } from './dom';
import { closeView } from './views';
import { alertBox } from './overlay';
import { hexPath } from '../render/shapes';

export type InitDocument = (params: MapParamsModel, data: Partial<MapData> | null) => void;

export function buildNewMapToggles(): void {
  const c = $('nmToggles');
  c.innerHTML = '';
  MAP_TYPE_NAMES.forEach((name, i) => {
    const l = el('label', 'nm-toggle' + (i === state.nmMapType ? ' active' : ''));
    const r = el('input');
    r.type = 'radio'; r.name = 'nmType'; r.checked = i === state.nmMapType;
    r.addEventListener('change', () => { state.nmMapType = i; checkToggle(i); });
    l.append(r, el('span', '', name));
    c.appendChild(l);
  });
}

export function checkToggle(type: MapType): void {
  const rw = $('nmRoadW') as HTMLInputElement;
  const rh = $('nmRoadH') as HTMLInputElement;
  const regLabel = ($('nmRegular') as HTMLInputElement).parentElement as HTMLElement;
  const detail = $('nmDetail');
  if (type === MapType.angle45) {
    rw.value = '60'; rh.value = '30'; rh.disabled = false;
    regLabel.classList.add('hidden'); detail.classList.add('hidden');
  } else if (type === MapType.angle90) {
    rw.value = '40'; rh.value = '40'; rh.disabled = false;
    regLabel.classList.add('hidden'); detail.classList.add('hidden');
  } else {
    rw.value = '40'; rh.value = (40 / 2 * 1.732).toFixed(2); rh.disabled = true;
    regLabel.classList.remove('hidden'); detail.classList.remove('hidden');
  }
  buildNewMapToggles();
  drawGridPreview();
}

export function drawGridPreview(): void {
  const cv = $('nmGridPreview') as HTMLCanvasElement;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const W = cv.width, H = cv.height, t = state.nmMapType;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1;
  const nw = t === MapType.angle45 ? 28 : t === MapType.angle90 ? 28 : 28;
  const nh = t === MapType.angle45 ? 14 : t === MapType.angle90 ? 28 : 24.25;
  ctx.beginPath();
  if (t === MapType.angle45) {
    for (let i = -20; i < 30; i++) {
      ctx.moveTo(i * nw, 0); ctx.lineTo(i * nw + H * (nw / nh), H);
      ctx.moveTo(i * nw, 0); ctx.lineTo(i * nw - H * (nw / nh), H);
    }
  } else if (t === MapType.angle90) {
    for (let x = 0; x <= W; x += nw) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y <= H; y += nh) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  } else {
    const rows = Math.ceil(H / nh) + 2, cols = Math.ceil(W / (nw * 3 / 4)) + 2;
    for (let dy = 0; dy < rows; dy++) for (let dx = 0; dx < cols; dx++) {
      let cx: number, cy: number, ww: number, hh: number, vert: boolean;
      if (t === MapType.honeycomb) {
        cx = dx * nw * 3 / 4 + nw / 2; cy = dy * nh + ((dx & 1) ? nh / 2 : 0) + nh / 2;
        ww = nw; hh = nh; vert = true;
      } else {
        cx = dx * nh + ((dy & 1) ? nh / 2 : 0) + nh / 2; cy = dy * nw * 3 / 4 + nw / 2;
        ww = nh; hh = nw; vert = false;
      }
      hexPath(ctx, cx, cy, ww, hh, vert);
    }
  }
  ctx.stroke();
}

export function confirmNewMap(initDocument: InitDocument): void {
  if (!state.nmBgImage) { alertBox('还没选择底图'); return; }
  const mw = Number(inputValue('nmWidth')) || state.nmBgImage.width;
  const mh = Number(inputValue('nmHeight')) || state.nmBgImage.height;
  const nw = Number(inputValue('nmRoadW')) || 60;
  const nh = Number(inputValue('nmRoadH')) || 30;
  const t = state.nmMapType;
  const { col, row } = computeGridSize(mw, mh, nw, nh, t);
  if (col * row > MAX_CEIL_COUNT) {
    alertBox('路点格子数不能超过' + MAX_CEIL_COUNT + ',创建失败，请重新调整路点格子大小');
    return;
  }
  const p = new MapParamsModel({
    name: inputValue('nmName') || '未命名', mapType: t,
    mapWidth: mw, mapHeight: mh, ceilWidth: nw, ceilHeight: nh,
    bgName: state.nmBgName || 'map_bg',
    bgImage: state.nmBgImage, bgSrc: state.nmBgSrc,
  });
  state.bgImage = state.nmBgImage;
  initDocument(p, null);
  closeView();
}

export function bindNewMap(initDocument: InitDocument): void {
  $('nmBrowseBtn').addEventListener('click', () => ($('nmBgFile') as HTMLInputElement).click());
  ($('nmBgFile') as HTMLInputElement).addEventListener('change', e => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        state.nmBgImage = img;
        state.nmBgName = f.name.replace(/\.[^.]+$/, '');
        state.nmBgSrc = String(r.result);
        setInputValue('nmBgPath', f.name);
        setInputValue('nmWidth', String(img.width));
        setInputValue('nmHeight', String(img.height));
      };
      img.src = String(r.result);
    };
    r.readAsDataURL(f);
  });
  $('nmConfirmBtn').addEventListener('click', () => confirmNewMap(initDocument));
  $('nmCancelBtn').addEventListener('click', closeView);
  ($('nmRegular') as HTMLInputElement).addEventListener('change', e => {
    const rh = $('nmRoadH') as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;
    rh.disabled = checked;
    if (checked) rh.value = (Number(inputValue('nmRoadW')) / 2 * 1.732).toFixed(2);
  });
  ($('nmRoadW') as HTMLInputElement).addEventListener('input', () => {
    if ((state.nmMapType === MapType.honeycomb || state.nmMapType === MapType.honeycomb2)
        && ($('nmRegular') as HTMLInputElement).checked) {
      setInputValue('nmRoadH', (Number(inputValue('nmRoadW')) / 2 * 1.732).toFixed(2));
    }
    drawGridPreview();
  });
  ($('nmRoadH') as HTMLInputElement).addEventListener('input', drawGridPreview);
}

/** OpenMapView: JSON + background image import. */
export function bindOpenMap(initDocument: InitDocument): void {
  $('omDataBrowse').addEventListener('click', () => ($('omDataFile') as HTMLInputElement).click());
  $('omBgBrowse').addEventListener('click', () => ($('omBgFile') as HTMLInputElement).click());
  ($('omDataFile') as HTMLInputElement).addEventListener('change', e => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { state.omData = String(r.result); setInputValue('omDataPath', f.name); };
    r.readAsText(f);
  });
  ($('omBgFile') as HTMLInputElement).addEventListener('change', e => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => { state.omBgImage = img; state.omBgSrc = String(r.result); };
      img.src = String(r.result);
      setInputValue('omBgPath', f.name);
    };
    r.readAsDataURL(f);
  });
  $('omConfirm').addEventListener('click', () => {
    if (!state.omData) { alertBox('请选择地图数据文件'); return; }
    let d: Record<string, unknown>;
    try { d = JSON.parse(state.omData); }
    catch (err) { alertBox('地图数据解析失败：' + (err as Error).message); return; }
    initDocument(paramsFromMapData(d), d as Partial<MapData>);
    closeView();
  });
  $('omCancel').addEventListener('click', closeView);
}


/**
 * MapParams from an imported MapData JSON.
 *
 * `nodeWidth`/`nodeHeight` are the original's names for `ceilWidth`/`ceilHeight`.
 * Note `type` is read with `??` rather than `||`: MapType.angle45 is `0`, so
 * `Number(d.type) || angle45` would look right by accident but silently swallow
 * a genuine 0 from a future enum change.
 */
export function paramsFromMapData(d: Record<string, unknown>): MapParamsModel {
  return new MapParamsModel({
    name: String(d.name || '未命名'), bgName: String(d.bgName || 'map_bg'),
    mapType: d.type === undefined || d.type === null ? MapType.angle45 : Number(d.type),
    mapWidth: Number(d.mapWidth) || 1920, mapHeight: Number(d.mapHeight) || 1080,
    ceilWidth: Number(d.nodeWidth) || 60, ceilHeight: Number(d.nodeHeight) || 30,
    bgImage: state.omBgImage || state.bgImage, bgSrc: state.omBgSrc,
  });
}

export function openViewByName(_name: ViewName): void { /* handled in views.ts */ }
