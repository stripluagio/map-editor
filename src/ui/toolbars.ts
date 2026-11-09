import { TOOLBAR1, TOOLBAR2, TOOLBAR3, TEST_TOOLBAR } from '../core/constants';
import { $, el } from './dom';

export type ActionHandler = (act: string, btn?: HTMLElement, ev?: Event) => void;

interface BtnDef { readonly label: string; readonly w: number; readonly act: string; readonly hidden?: boolean }

function buildToolBar(container: HTMLElement, items: readonly BtnDef[], onClick: ActionHandler): void {
  container.innerHTML = '';
  for (const it of items) {
    const b = el('div', 'tb-btn' + (it.hidden ? ' hidden' : ''), it.label);
    b.style.width = it.w + 'px';
    b.dataset.act = it.act;
    b.addEventListener('mousedown', e => { e.stopPropagation(); onClick(it.act, b, e); });
    container.appendChild(b);
  }
}

/**
 * Buttons that stay visible while a road tool is armed. Everything else on
 * toolBar1 is swapped for the six "添加*路点" buttons, exactly like the original
 * `EditToolPanel.openWin()` toggles `DrawPointBtn1..6`.
 */
const ALWAYS_VISIBLE = new Set([
  'createNewFile', 'openFile', 'saveFile', 'saveAsFile', 'showProjectSetting',
  'importEditAssets', 'testProject', 'showMiniMap', 'openExcelExportTool',
  'showTeach', 'showIntroduce', 'openSaleMapEditor', 'gotoMoreGame',
]);

/** Swap the main toolbar between normal mode and road-drawing mode. */
export function setToolbarMode(roadMode: boolean): void {
  for (const b of document.querySelectorAll<HTMLElement>('#toolBar1 .tb-btn')) {
    const act = b.dataset.act || '';
    const isNormal = ALWAYS_VISIBLE.has(act);
    b.classList.toggle('hidden', roadMode ? isNormal : !isNormal);
  }
}

export function buildToolBars(onClick: ActionHandler): void {
  buildToolBar($('toolBar1'), TOOLBAR1, onClick);
  buildToolBar($('toolBar2'), TOOLBAR2, onClick);
  buildToolBar($('toolBar3'), TOOLBAR3, onClick);
  buildToolBar($('testToolBar'), TEST_TOOLBAR, onClick);
}

/**
 * Reflect toggles in the toolbar labels. The original updates the label text on
 * click (隐藏… ↔ 显示…), which is why these are text swaps rather than classes.
 */
export function syncLayerBtns(layers: { map: boolean; road: boolean; entity: boolean; grid: boolean }): void {
  const map: Record<string, [string, string, boolean]> = {
    showMapLayer: ['隐藏地图（U）', '显示地图（U）', layers.map],
    showRoadLayer: ['隐藏路点(I)', '显示路点(I)', layers.road],
    showEntityLayer: ['隐藏物体(O)', '显示物体(O)', layers.entity],
    showGridLayer: ['隐藏网格(P)', '显示网格(P)', layers.grid],
  };
  for (const [act, [hide, show, on]] of Object.entries(map)) {
    for (const b of document.querySelectorAll<HTMLElement>('.tb-btn[data-act="' + act + '"]')) {
      b.textContent = on ? hide : show;
    }
  }
}

/** Same for the anchor / entity-title switches (v2.0.2 toolBar2). */
export function syncSwitchBtns(showAnchor: boolean, showTitle: boolean): void {
  for (const b of document.querySelectorAll<HTMLElement>('.tb-btn[data-act="showAnchor"]')) {
    b.textContent = showAnchor ? '隐藏物体锚点(Y)' : '显示物体锚点(Y)';
  }
  for (const b of document.querySelectorAll<HTMLElement>('.tb-btn[data-act="showEntityTitle"]')) {
    b.textContent = showTitle ? '隐藏物体标题' : '显示物体标题';
  }
}
