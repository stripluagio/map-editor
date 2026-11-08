import { ROAD_KEYS } from '../core/constants';
import { findPath } from '../core/pathfinding';
import { state } from './state';
import { render } from '../render/canvas';
import { renderTest } from '../render/playmode';
import { selectRoad } from '../ui/toolpanel';
import { updateToolPanel } from '../ui/toolpanel';
import { closeMenu } from '../ui/menus';
import { closeView, openView } from '../ui/views';
import { drawMiniMap } from '../render/minimap';
import { deleteSelectedEntity, cutEntity, copyEntity, pasteEntity } from './editing';
import { closeTest, toggleFollow, toggleShowPath } from './playmode';
import { toast } from '../ui/overlay';
import type { ActionHandler } from '../ui/toolbars';

export function bindKeyboard(action: ActionHandler): void {
  window.addEventListener('keydown', e => {
    const tag = (e.target as HTMLElement).tagName?.toLowerCase() || '';
    const typing = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement).isContentEditable;

    if (e.ctrlKey && e.key.toLowerCase() === 'o') { e.preventDefault(); action('openFile'); return; }
    if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); action('saveFile'); return; }
    if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); action('testProject'); return; }
    if (e.ctrlKey && e.key.toLowerCase() === 'x') { e.preventDefault(); if (!typing) cutEntity(); return; }
    if (e.ctrlKey && e.key.toLowerCase() === 'c') { e.preventDefault(); if (!typing) copyEntity(); return; }
    if (e.ctrlKey && e.key.toLowerCase() === 'v') { e.preventDefault(); if (!typing) pasteEntity(); return; }
    if (e.ctrlKey && e.key.toLowerCase() === 'z') { e.preventDefault(); if (state.mode === 'edit') { state.undo.undo(); render(); } return; }
    if (e.ctrlKey && e.key.toLowerCase() === 'y') { e.preventDefault(); if (state.mode === 'edit') { state.undo.redo(); render(); } return; }
    // 编辑 → 转换路点风格（CTRL + B）
    if (e.ctrlKey && e.key.toLowerCase() === 'b') { e.preventDefault(); if (state.mode === 'edit') action('switchRoadStyle'); return; }
    // NOTE: 命令菜单里还写着 `地图切片导出（ctrl + W）` / `地图缩小导出（ctrl + T）`，
    // 但这两个是浏览器保留键（关标签页 / 开新标签页），页面里的 `preventDefault()`
    // 对它们无效 —— 硬绑只会让用户误关标签页。所以这里不绑，菜单项才是可靠入口。
    // 原版同样没绑（这两个条目只存在于 `Menubar.data` 那份静态模板里，从来没有 `fun`）。
    if (e.key === 'Escape') {
      if (state.activeView) closeView();
      else if (state.mode === 'test') closeTest();
      else closeMenu();
      return;
    }
    if (state.mode === 'test') {
      if (e.key === 'F3') { e.preventDefault(); toggleFollow(); }
      if (e.key === 'F4') { e.preventDefault(); toggleShowPath(); }
      return;
    }
    if (typing) return;
    if (e.key === ' ') { state.spaceDown = true; e.preventDefault(); return; }
    const k = e.key.toLowerCase();
    if (k in ROAD_KEYS) { selectRoad(ROAD_KEYS[k]); return; }
    if (k === 's') { state.roadValue = -2; state.entityType = null; updateToolPanel(); return; }
    if (k === 'u') { action('showMapLayer'); return; }
    if (k === 'i') { action('showRoadLayer'); return; }
    if (k === 'o') { action('showEntityLayer'); return; }
    if (k === 'p') { action('showGridLayer'); return; }
    if (k === 'n') { action('setEditRoadModel'); return; }
    if (k === 'm') { action('setNormalRoadModel'); return; }
    if (k === 'k') { state.showAnchor = !state.showAnchor; render(); return; }
    if (k === 'j') { action('toggleAuxLine'); return; }
    if (k === 'f1') { e.preventDefault(); action('hideBlockRoad'); return; }
    if (k === 'f2') { e.preventDefault(); openView('miniMap'); drawMiniMap(); return; }
    if (k === 'f5') { e.preventDefault(); action('testProject'); return; }
    if (k === 'delete' || k === 'backspace') { deleteSelectedEntity(); return; }
    if (k === 'a') { astarTest(); return; }
  });
  window.addEventListener('keyup', e => { if (e.key === ' ') state.spaceDown = false; });
}

function astarTest(): void {
  const r = state.road;
  if (!r.length || !state.params) return;
  const pass = (v: number) => state.pass(v);
  const mid = Math.floor(r.length / 2);
  let sx = -1, sy = -1, tx = -1, ty = -1;
  for (let x = 0; x < r[0].length; x++) {
    if (pass(r[mid][x])) { if (sx < 0) { sx = x; sy = mid; } tx = x; ty = mid; }
  }
  if (sx < 0) {
    for (let y = 0; y < r.length; y++) for (let x = 0; x < r[0].length; x++) if (pass(r[y][x]) && sx < 0) { sx = x; sy = y; }
    for (let y = r.length - 1; y >= 0; y--) for (let x = r[0].length - 1; x >= 0; x--) if (pass(r[y][x]) && tx < 0) { tx = x; ty = y; }
  }
  if (sx < 0 || tx < 0) { toast('没有可行走路点'); return; }
  const path = findPath(r, sx, sy, tx, ty, state.params.mapType, pass);
  state.pathPreview = path;
  toast(path ? 'A* 寻路：' + path.length + ' 步' : 'A* 寻路：无路径');
  render();
}
