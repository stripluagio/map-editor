import { VIEW_IDS } from '../core/constants';
import type { ViewName } from '../core/types';
import { state } from '../app/state';
import { $, $$ } from './dom';
import { buildNewMapToggles, checkToggle } from './wizard';
import { buildSettingTable, resetSettings } from './settings-table';
import { drawMiniMap } from '../render/minimap';

/** TeachView: play on open, stop on close (mirrors TeachView.playVideo/stopVideo). */
let teachDots: number | null = null;
function startTeach(): void {
  const v = $('teachVideo') as HTMLVideoElement | null;
  if (!v) return;
  const loading = document.getElementById('teachLoading');
  const dots = ['Loading.', 'Loading..', 'Loading...'];
  let i = 0;
  if (teachDots !== null) clearInterval(teachDots);
  if (loading) {
    loading.classList.remove('hidden');
    teachDots = window.setInterval(() => {
      i = (i + 1) % dots.length; loading.textContent = dots[i];
    }, 300);
  }
  try { v.currentTime = 0; } catch { /* ignore */ }
  try { v.load(); } catch { /* ignore */ }
  v.play().catch(() => { /* autoplay may need a user gesture; controls remain */ });
  const reveal = () => {
    if (loading) loading.classList.add('hidden');
    if (teachDots !== null) { clearInterval(teachDots); teachDots = null; }
  };
  v.onloadeddata = () => { reveal(); v.play().catch(() => { /* ignore */ }); };
  v.oncanplay = reveal;
}
function stopTeach(): void {
  const v = $('teachVideo') as HTMLVideoElement | null;
  if (v) { try { v.pause(); v.currentTime = 0; } catch { /* ignore */ } }
  if (teachDots !== null) { clearInterval(teachDots); teachDots = null; }
  const loading = document.getElementById('teachLoading');
  if (loading) loading.classList.add('hidden');
}

export function openView(name: ViewName): void {
  closeView();
  const id = VIEW_IDS[name];
  if (!id) return;
  $(id).classList.remove('hidden');
  state.activeView = name;
  if (name === 'newMap') {
    state.nmBgImage = null; state.nmBgName = ''; state.nmBgSrc = null;
    ($('nmName') as HTMLInputElement).value = '未命名';
    ($('nmWidth') as HTMLInputElement).value = '';
    ($('nmHeight') as HTMLInputElement).value = '';
    ($('nmBgPath') as HTMLInputElement).value = '';
    // 原点模式默认沿用当前地图。原版每次开新图都回到「基于左下角」，
    // 但那样用户设过一次左上角后，第二张图会悄悄变回去 —— 这里宁可记住。
    const align = state.params ? (state.params.alignment || 0) : 0;
    for (const r of document.querySelectorAll<HTMLInputElement>('input[name="nmAlign"]')) {
      r.checked = Number(r.value) === align;
    }
    buildNewMapToggles();
    checkToggle(state.nmMapType);
  } else if (name === 'setting') {
    ($('stName') as HTMLInputElement).value = state.params ? state.params.name : '未命名';
    ($('stDefaultValue') as HTMLInputElement).value = String(state.setting.defaultRoadValue);
    buildSettingTable();
  } else if (name === 'miniMap') {
    drawMiniMap();
  } else if (name === 'teach') {
    startTeach();
  }
}

export function closeView(): void {
  if (!state.activeView) return;
  if (state.activeView === 'teach') stopTeach();
  const id = VIEW_IDS[state.activeView];
  if (id) $(id).classList.add('hidden');
  state.activeView = null;
}

export function bindViews(applySettings: () => void): void {
  $$('.view-close').forEach(b => {
    const close = (e: Event) => { e.stopPropagation(); closeView(); };
    b.addEventListener('mousedown', close);
    b.addEventListener('click', close);
  });
  $('stReset').addEventListener('click', resetSettings);
  $('stApply').addEventListener('click', applySettings);
  $('stCancel').addEventListener('click', closeView);
}
