import { ROAD_SWATCHES, BRUSH_SIZES, ENTITY_SKINS, TOOL_TITLES, TOOL_TO_ACTION } from '../core/constants';
import type { ToolName } from '../core/types';
import { entityColor } from '../core/color';
import { state } from '../app/state';
import { armBrush } from '../app/editing';
import { $, el } from './dom';

/** Render the left tool panel for the current tool, and update its title. */
export function updateToolPanel(): void {
  const c = $('toolContent');
  c.innerHTML = '';
  if (state.tool === 'road') buildRoadPanel(c);
  else if (state.tool === 'brush') buildBrushPanel(c);
  else buildEntityPanel(c, state.tool);
  updateToolTitle();
}

function buildRoadPanel(c: HTMLElement): void {
  for (const s of ROAD_SWATCHES) {
    const item = el('div', 'tool-item' + (state.roadValue === s.value ? ' selected' : ''));
    const sw = el('div', 'tool-swatch' + (s.del ? ' del' : ''));
    if (!s.del) sw.style.background = s.color;
    sw.appendChild(el('div', 'sel-frame'));
    const lab = el('div', 'tool-label');
    lab.textContent = s.label;
    if (s.sub) lab.appendChild(el('small', '', s.sub));
    item.append(sw, lab);
    item.addEventListener('mousedown', e => { e.stopPropagation(); selectRoad(s.value); });
    c.appendChild(item);
  }
}

function buildBrushPanel(c: HTMLElement): void {
  for (const sz of BRUSH_SIZES) {
    const item = el('div', 'tool-item' + (state.brushSize === sz ? ' selected' : ''));
    const sw = el('div', 'tool-swatch');
    sw.style.background = '#f0f0f0';
    sw.style.display = 'flex'; sw.style.alignItems = 'center'; sw.style.justifyContent = 'center';
    const inner = el('div');
    inner.style.width = (20 + sz * 13) + 'px';
    inner.style.height = (20 + sz * 13) + 'px';
    inner.style.background = '#434343';
    sw.append(inner, el('div', 'sel-frame'));
    item.append(sw, el('div', 'tool-label', sz === 0 ? '单个路点' : '笔刷 ' + sz));
    item.addEventListener('mousedown', e => { e.stopPropagation(); state.brushSize = sz; updateToolPanel(); });
    c.appendChild(item);
  }
}

function buildEntityPanel(c: HTMLElement, tool: ToolName): void {
  const skins = (ENTITY_SKINS as Record<string, readonly { label: string; icon: string }[]>)[tool]
             || [{ label: '默认', icon: '' }];
  const sprites = state.sprites[tool] || [];
  skins.forEach((def, i) => {
    const item = el('div', 'tool-item' + (state.entitySkin === i ? ' selected' : ''));
    const sw = el('div', 'tool-swatch');
    sw.style.background = '#292929';
    sw.style.display = 'flex'; sw.style.alignItems = 'center'; sw.style.justifyContent = 'center';
    const img = (sprites[i] && sprites[i][0]) || null;
    if (img && img.complete && img.naturalWidth) {
      const icon = el('img');
      icon.src = img.src;
      const def = skins[i] as { w?: number; h?: number };
      const dw = def?.w || img.naturalWidth;
      const dh = def?.h || img.naturalHeight;
      const scale = Math.min(1, 86 / dh, 88 / dw);
      icon.style.width = Math.round(dw * scale) + 'px';
      icon.style.height = Math.round(dh * scale) + 'px';
      icon.style.objectFit = 'contain';
      sw.appendChild(icon);
    } else {
      const fallback = el('div');
      fallback.style.width = '52px'; fallback.style.height = '86px';
      fallback.style.background = entityColor(tool, i);
      fallback.style.borderRadius = '6px 6px 0 0';
      sw.appendChild(fallback);
    }
    sw.appendChild(el('div', 'sel-frame'));
    item.append(sw, el('div', 'tool-label', def.label));
    item.addEventListener('mousedown', e => {
      e.stopPropagation();
      state.entitySkin = i;
      state.entityType = tool;
      updateToolPanel();
      if (tool !== 'road' && tool !== 'brush') {
        // Original EditObject.setBrush: after picking a selector the entity
        // follows the cursor and is dropped with the next left click.
        armBrush(tool as 'npc' | 'monster' | 'transfer' | 'spawnPoint');
      }
    });
    c.appendChild(item);
  });
  state.entityType = tool;
}

export function selectRoad(v: number): void {
  state.roadValue = v;
  state.tool = 'road';
  state.entityType = null;
  updateToolPanel();
}

export function setTool(tool: ToolName): void {
  state.tool = tool;
  state.entityType = null;
  if (tool === 'road') state.roadValue = 0;
  if (tool === 'brush' && state.roadValue < 0) state.roadValue = 0;
  updateToolPanel();
}

export function updateToolTitle(): void {
  $('toolTitle').textContent = TOOL_TITLES[state.tool] || '工具栏';
  for (const b of document.querySelectorAll<HTMLElement>('#toolBar2 .tb-btn')) b.classList.remove('active');
  const act = TOOL_TO_ACTION[state.tool];
  const b = document.querySelector<HTMLElement>('#toolBar2 .tb-btn[data-act="' + act + '"]');
  if (b) b.classList.add('active');
}
