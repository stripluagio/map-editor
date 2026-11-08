import type { Point } from '../core/types';
import { state } from './state';
import { render, resizeCanvas } from '../render/canvas';
import { paintAt, placeEntity, entityAt, selectEntity, moveBrush, commitBrush } from './editing';
import { closeMenu } from '../ui/menus';
import { buildPropertyPanel } from '../ui/property';
import { drawMiniMap } from '../render/minimap';
import { logicalSize } from '../render/context';
import { $ } from '../ui/dom';

const canvas = () => document.getElementById('mapCanvas') as HTMLCanvasElement;

function canvasPoint(ev: MouseEvent): Point {
  const r = canvas().getBoundingClientRect();
  const s = state.screenScale || 1;
  return { x: (ev.clientX - r.left) / s, y: (ev.clientY - r.top) / s };
}
function worldPoint(ev: MouseEvent): Point {
  const p = canvasPoint(ev);
  return { x: (p.x - state.view.offsetX) / state.view.zoom,
           y: (p.y - state.view.offsetY) / state.view.zoom };
}
function nodeAt(x: number, y: number) { return state.geom.getNodeByPixel(x, y); }

function updateInfoBar(n: ReturnType<typeof nodeAt>): void {
  const px = '(' + Math.floor(n.px) + ',' + Math.floor(n.py) + ')';
  const grid = '(' + n.dx + ',' + n.dy + ')';
  const world = '(' + n.cx + ',' + n.cy + ')';
  $('infoPixel').textContent = px;
  $('infoGrid').textContent = grid;
  $('infoWorld').textContent = world;
  $('testInfoPixel').textContent = px;
  $('testInfoGrid').textContent = grid;
  $('testInfoWorld').textContent = world;
}

export function clampView(): void {
  const cv = canvas(), z = state.view.zoom;
  const L = logicalSize(cv);
  const pw = state.params ? state.params.mapWidth * z : 1920;
  const ph = state.params ? state.params.mapHeight * z : 1080;
  state.view.offsetX = Math.min(0, Math.max(L.w - pw, state.view.offsetX));
  state.view.offsetY = Math.min(0, Math.max(L.h - ph, state.view.offsetY));
}

function bindScrollDrag(thumb: HTMLElement, axis: 'x' | 'y'): void {
  thumb.addEventListener('mousedown', e => {
    e.stopPropagation();
    const start = axis === 'x' ? e.clientX : e.clientY;
    const ox = state.view.offsetX, oy = state.view.offsetY;
    const move = (ev: MouseEvent) => {
      const d = (axis === 'x' ? ev.clientX - start : ev.clientY - start) / (state.screenScale || 1);
      if (axis === 'x') state.view.offsetX = ox - d; else state.view.offsetY = oy - d;
      clampView(); render();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  });
}

export function bindMapInput(): void {
  const cv = canvas();
  cv.addEventListener('contextmenu', e => e.preventDefault());

  cv.addEventListener('mousedown', e => {
    closeMenu();
    if (state.mode !== 'edit') return;
    const wp = worldPoint(e), n = nodeAt(wp.x, wp.y);
    if (e.button === 2) {
      // Original: right-click on an entity only selects it (property panel);
      // right-click elsewhere removes the road point under the cursor.
      const hitR = entityAt(wp.x, wp.y);
      if (hitR) { selectEntity(hitR); return; }
      state.drawing = true;
      paintAt(n, state.setting.defaultRoadValue, true);
      return;
    }
    if (e.button === 1 || state.spaceDown) {
      state.panning = true;
      state.lastMouse = { x: e.clientX, y: e.clientY };
      return;
    }
    if (e.button !== 0) return;
    if (state.brushEntity) { commitBrush(wp.x, wp.y); return; }   // drop the ghost
    const hit = entityAt(wp.x, wp.y);
    if (hit) {
      // Left press on an existing entity selects it and starts a drag
      // (EntityLayer.onMouseDown -> setBrush), preserving the grab offset.
      selectEntity(hit);
      state.draggingEntity = hit;
      state.dragOffset = { x: wp.x - Number(hit.x || 0), y: wp.y - Number(hit.y || 0) };
      state.dragStart = { x: Number(hit.x || 0), y: Number(hit.y || 0) };
      return;
    }
    if (state.editRoadModel && state.roadValue >= 0) { paintAt(n, state.roadValue); return; }
    if (state.roadValue === -2) return;
    state.drawing = true;
    if (state.roadValue === -1) paintAt(n, state.setting.defaultRoadValue, true);
    else paintAt(n, state.roadValue);
  });

  window.addEventListener('mousemove', e => {
    if (state.mode !== 'edit') return;
    const r = cv.getBoundingClientRect(), s = state.screenScale || 1;
    const lx = (e.clientX - r.left) / s, ly = (e.clientY - r.top) / s;
    const L = logicalSize(cv), LW = L.w, LH = L.h;
    if (state.panning) {
      state.view.offsetX += (e.clientX - state.lastMouse.x) / s;
      state.view.offsetY += (e.clientY - state.lastMouse.y) / s;
      state.lastMouse = { x: e.clientX, y: e.clientY };
      clampView(); render(); return;
    }
    if (state.draggingEntity) {
      const wp = { x: (lx - state.view.offsetX) / state.view.zoom,
                   y: (ly - state.view.offsetY) / state.view.zoom };
      state.draggingEntity.x = Math.round((wp.x - state.dragOffset.x) * 1000) / 1000;
      state.draggingEntity.y = Math.round((wp.y - state.dragOffset.y) * 1000) / 1000;
      buildPropertyPanel(); render(); return;
    }
    if (state.brushEntity) {
      // ghost follows the cursor until dropped
      const wpb = { x: (lx - state.view.offsetX) / state.view.zoom,
                    y: (ly - state.view.offsetY) / state.view.zoom };
      const nb = nodeAt(wpb.x, wpb.y);
      moveBrush(nb.px, nb.py);
      state.cursorNode = nb;
      updateInfoBar(nb);
      return;
    }
    if (lx < 0 || ly < 0 || lx > LW || ly > LH) {
      state.cursorNode = null; render(); return;
    }
    const wp = { x: (lx - state.view.offsetX) / state.view.zoom,
                 y: (ly - state.view.offsetY) / state.view.zoom };
    const node = nodeAt(wp.x, wp.y);
    state.cursorNode = node;
    updateInfoBar(node);
    if (state.drawing) {
      if (state.roadValue === -1) paintAt(node, state.setting.defaultRoadValue, true);
      else paintAt(node, state.roadValue);
    }
    render();
  });

  window.addEventListener('mouseup', () => {
    state.drawing = false; state.panning = false;
    if (state.draggingEntity) {
      const ent = state.draggingEntity;
      const from = state.dragStart;
      // snap cx/cy to the road node under the dropped entity (original drop)
      const n = state.geom.getNodeByPixel(Number(ent.x) || 0, Number(ent.y) || 0);
      const wp = state.geom.getWorldPointByPixel(n.px, n.py);
      ent.cx = wp.x; ent.cy = wp.y;
      const to = { x: Number(ent.x), y: Number(ent.y) };
      state.undo.push({
        undo: () => { ent.x = from.x; ent.y = from.y; buildPropertyPanel(); render(); },
        redo: () => { ent.x = to.x; ent.y = to.y; buildPropertyPanel(); render(); },
      });
      state.draggingEntity = null;
      buildPropertyPanel();
    }
  });
  cv.addEventListener('mouseleave', () => { state.cursorNode = null; render(); });

  cv.addEventListener('wheel', e => {
    e.preventDefault();
    const p = canvasPoint(e), old = state.view.zoom;
    let nz = old * (e.deltaY < 0 ? 1.1 : 0.9);
    nz = Math.max(.2, Math.min(4, nz));
    state.view.offsetX = p.x - (p.x - state.view.offsetX) * (nz / old);
    state.view.offsetY = p.y - (p.y - state.view.offsetY) * (nz / old);
    state.view.zoom = nz;
    clampView(); render();
  }, { passive: false });

  bindScrollDrag($('hScrollThumb'), 'x');
  bindScrollDrag($('vScrollThumb'), 'y');

  // minimap click -> recentre viewport
  ($('miniMapCanvas') as HTMLCanvasElement).addEventListener('click', e => {
    const mcv = $('miniMapCanvas') as HTMLCanvasElement;
    const r = mcv.getBoundingClientRect(), s = state.screenScale || 1;
    const x = (e.clientX - r.left) / s, y = (e.clientY - r.top) / s;
    const m = state.minimapRect;
    if (!m) return;
    const wx = (x - m.dx) / m.s, wy = (y - m.dy) / m.s;
    const L = logicalSize(cv);
    state.view.offsetX = L.w / 2 - wx * state.view.zoom;
    state.view.offsetY = L.h / 2 - wy * state.view.zoom;
    clampView(); render(); drawMiniMap();
  });

  window.addEventListener('resize', () => { fitStage(); resizeCanvas(); });
}

export function fitStage(): void {
  const s = window.innerWidth / 1920;   // Cocos Canvas _fitWidth=true
  $('app').style.transform = 'scale(' + s + ')';
  state.screenScale = s;
}
