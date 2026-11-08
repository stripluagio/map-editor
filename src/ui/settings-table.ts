import { defaultRoadSets } from '../core/constants';
import { parseColor, rgbaToHex, rgbHex, hexToRgba } from '../core/color';
import { state } from '../app/state';
import { $, el } from './dom';

const HEADERS = ['编号', '路点值', '颜色', '透明度', '颜色值', '是否显示', '是否可走'];

export function buildSettingTable(): void {
  const t = $('stRoadTable');
  t.innerHTML = '';
  const head = el('div', 'st-thead');
  for (const h of HEADERS) head.appendChild(el('div', 'st-th', h));
  t.appendChild(head);

  state.setting.roadSetDatas.forEach((s, i) => {
    const row = el('div', 'st-tr');
    row.appendChild(el('div', 'st-td', String(i)));

    const v = makeText(String(s.value), i, 'value');
    row.appendChild(tdOf(v));

    const col = el('div', 'st-td');
    const sw = el('span', 'st-color');
    sw.style.background = hexToRgba(s.color);
    sw.addEventListener('click', () => openColorPicker(i, sw));
    col.appendChild(sw); row.appendChild(col);

    row.appendChild(tdOf(makeText(String(parseColor(s.color).a), i, 'alpha')));
    const hx = makeText((s.color || '').toUpperCase(), i, 'hex', 'wide');
    row.appendChild(tdOf(hx));

    for (const k of ['isShow', 'isPass'] as const) {
      const cb = el('input'); cb.type = 'checkbox'; cb.checked = !!s[k];
      cb.dataset.i = String(i); cb.dataset.k = k;
      row.appendChild(tdOf(cb));
    }
    t.appendChild(row);
  });

  t.querySelectorAll<HTMLInputElement>('input[type=text]').forEach(inp => {
    inp.addEventListener('change', () => {
      const s = state.setting.roadSetDatas[Number(inp.dataset.i)];
      const k = inp.dataset.k;
      if (k === 'value') s.value = Number(inp.value) || 0;
      else if (k === 'hex') { s.color = inp.value; buildSettingTable(); }
      else if (k === 'alpha') {
        const c = parseColor(s.color);
        c.a = Math.max(0, Math.min(255, Number(inp.value) || 0));
        s.color = rgbaToHex(c.r, c.g, c.b, c.a);
        buildSettingTable();
      }
    });
  });
  t.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      const s = state.setting.roadSetDatas[Number(cb.dataset.i)];
      (s as unknown as Record<string, boolean>)[cb.dataset.k || ''] = cb.checked;
    });
  });
}

function makeText(value: string, i: number, k: string, cls = ''): HTMLInputElement {
  const inp = el('input', cls);
  inp.type = 'text'; inp.value = value;
  inp.dataset.i = String(i); inp.dataset.k = k;
  return inp;
}
function tdOf(child: HTMLElement): HTMLElement {
  const td = el('div', 'st-td'); td.appendChild(child); return td;
}

function openColorPicker(i: number, sw: HTMLElement): void {
  const inp = el('input');
  inp.type = 'color';
  const c = parseColor(state.setting.roadSetDatas[i].color);
  inp.value = rgbHex(c.r, c.g, c.b);
  inp.style.position = 'absolute'; inp.style.opacity = '0';
  document.body.appendChild(inp); inp.click();
  inp.addEventListener('input', () => {
    const v = inp.value;
    const cc = parseColor(state.setting.roadSetDatas[i].color);
    state.setting.roadSetDatas[i].color = rgbaToHex(
      parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16), cc.a);
    sw.style.background = hexToRgba(state.setting.roadSetDatas[i].color);
    buildSettingTable();
  });
  inp.addEventListener('change', () => { buildSettingTable(); inp.remove(); });
}

export function resetSettings(): void {
  state.setting.defaultRoadValue = 1;
  state.setting.roadSetDatas = defaultRoadSets();
  ($('stDefaultValue') as HTMLInputElement).value = '1';
  buildSettingTable();
}
