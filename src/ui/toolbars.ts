import { TOOLBAR1, TOOLBAR2, TEST_TOOLBAR } from '../core/constants';
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

/** Swap the main toolbar between normal (8 buttons) and road-drawing mode. */
export function setToolbarMode(roadMode: boolean): void {
  const normal = new Set(['createNewFile', 'openFile', 'saveFile', 'showProjectSetting', 'testProject', 'showMiniMap', 'showTeach', 'showCopyright']);
  for (const b of document.querySelectorAll<HTMLElement>('#toolBar1 .tb-btn')) {
    const act = b.dataset.act || '';
    const isNormal = normal.has(act);
    b.classList.toggle('hidden', roadMode ? isNormal : !isNormal);
  }
}

export function buildToolBars(onClick: ActionHandler): void {
  buildToolBar($('toolBar1'), TOOLBAR1, onClick);
  buildToolBar($('toolBar2'), TOOLBAR2, onClick);
  buildToolBar($('testToolBar'), TEST_TOOLBAR, onClick);
}

/** Reflect layer visibility in the toolbar button labels. */
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
