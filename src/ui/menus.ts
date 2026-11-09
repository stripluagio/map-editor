import { MENUS } from '../core/constants';
import { state } from '../app/state';
import { $, el } from './dom';
import type { ActionHandler } from './toolbars';

export function buildMenus(onAction: ActionHandler): void {
  for (const mi of document.querySelectorAll<HTMLElement>('.menu-item')) {
    mi.addEventListener('mousedown', e => {
      e.stopPropagation();
      const name = mi.dataset.menu || '';
      if (state.openMenu === name) { closeMenu(); return; }
      state.openMenu = name;
      document.querySelectorAll('.menu-item').forEach(x => x.classList.toggle('active', x === mi));
      const p = $('menuPanel');
      p.innerHTML = '';
      p.style.left = mi.offsetLeft + 'px';
      for (const [label, act] of MENUS[name]) {
        if (label === 'sep') { p.appendChild(el('div', 'menu-panel-sep')); continue; }
        const it = el('div', 'menu-panel-item', liveLabel(act, label));
        it.addEventListener('mousedown', ev => { ev.stopPropagation(); closeMenu(); onAction(act); });
        p.appendChild(it);
      }
      p.classList.add('open');
    });
  }
}

/** 菜单面板每次打开都重建，所以这类开关可以直接把当前状态写进标题。 */
function liveLabel(act: string, fallback: string): string {
  if (act === 'toggleAuxLine') return (state.showAuxLine ? '隐藏辅助线' : '显示辅助线') + '（J）';
  if (act === 'showAnchor') return (state.showAnchor ? '隐藏' : '显示') + '锚点(Y)';
  if (act === 'showEntityTitle') return (state.showEntityTitle ? '隐藏' : '显示') + '物体标题';
  return fallback;
}

export function closeMenu(): void {
  state.openMenu = null;
  $('menuPanel').classList.remove('open');
  document.querySelectorAll('.menu-item').forEach(x => x.classList.remove('active'));
}
