import { TYPE_LABEL } from '../core/constants';
import { schemaFor } from '../core/schema';
import type { MapItem } from '../core/types';
import { state } from '../app/state';
import { render } from '../render/canvas';
import { $, el } from './dom';

/** Rebuild the right-hand property panel for the selected entity. */
export function buildPropertyPanel(): void {
  const e = state.selectedEntity;
  const c = $('propertyContent');
  c.innerHTML = '';
  $('propertyName').textContent = e ? (TYPE_LABEL[e.type] || '') : '';
  if (!e) return;

  for (const a of schemaFor(e)) {
    if (!a.visible) continue;
    const row = el('div', 'prop-row');
    const lab = el('div', 'prop-label', a.label || a.attribute);
    lab.title = a.tip;
    lab.appendChild(el('div', 'prop-tip', a.tip));
    row.appendChild(lab);
    if (a.type === 'bool') {
      const chk = el('input', 'prop-bool');
      chk.type = 'checkbox'; chk.checked = !!e[a.attribute]; chk.disabled = !a.editable;
      chk.addEventListener('change', () => setProp(e, a.attribute, chk.checked));
      row.appendChild(chk);
    } else {
      const inp = el('input', 'prop-value');
      inp.type = 'text'; inp.value = String(e[a.attribute] ?? '');
      inp.disabled = !a.editable;
      if (!a.editable) inp.title = '该属性不可编辑';
      inp.addEventListener('change', () => {
        const v: string | number = a.type === 'number' ? (Number(inp.value) || 0) : inp.value;
        setProp(e, a.attribute, v);
      });
      row.appendChild(inp);
    }
    c.appendChild(row);
  }
}

function setProp(e: MapItem, key: string, val: unknown): void {
  const old = e[key];
  // Original EditorSpawnPoint: turning 默认出生点 on emits `ChangeDefaultSpawn`,
  // and every other spawn point listens and clears its own flag — a map has at
  // most one default spawn point.
  const cleared: MapItem[] = key === 'defaultSpawn' && val
    ? state.entities.filter(o => o !== e && o.type === 'spawnPoint' && !!o.defaultSpawn)
    : [];
  e[key] = val;
  for (const o of cleared) o.defaultSpawn = false;
  state.undo.push({
    undo: () => {
      e[key] = old;
      for (const o of cleared) o.defaultSpawn = true;
      buildPropertyPanel(); render();
    },
    redo: () => {
      e[key] = val;
      for (const o of cleared) o.defaultSpawn = false;
      buildPropertyPanel(); render();
    },
  });
  render();
}
