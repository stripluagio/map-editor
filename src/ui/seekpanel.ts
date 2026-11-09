import { state } from '../app/state';
import type { SeekSettings } from '../app/state';
import { $ } from './dom';
import { renderTest } from '../render/playmode';

/**
 * TestView → 寻路设置 (v2.0.2 `SeekPathSetRoot` / `SeekPathSetPanel`).
 *
 * 面板本身是纯 DOM，改动直接写进 `state.seekSettings`，再由 `app/playmode.ts`
 * 读取 —— 和原版一样，这些开关不影响编辑态，只影响测试态的寻路与调试绘制。
 *
 * 两个控件是故意禁用的：
 *   · `RCA 寻路` —— 本版只实现了 A*；
 *   · `显示路点墙角` —— 原版这个开关画的是 RCA 预烘焙的拐角数据
 *     (`RCAStarRoadSeeker.showAllCorner`)，没有 RCA 就没有这份数据。
 * 原版自己的备注文案（"只对4边型格子有效" / "RCA寻路不支持六边形格子"）保留，
 * 另外补一句本版的说明，避免看起来像能点却没反应。
 */
function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** 原版 `onMaxStepInputFieldChange`：填 0 视为没填，回到 1000。 */
function applyMaxStep(raw: string): void {
  let n = Math.floor(Number(raw) || 0);
  if (n === 0) n = 1000;
  n = Math.max(1, n);
  state.seekSettings.maxStep = n;
  ($('seekMaxStep') as HTMLInputElement).value = String(n);
}

/** 原版 `onTprInputFieldChange`：`clamp(value, .1, 1)`。 */
function applyTpr(raw: string): void {
  const n = clamp(Number(raw) || 0.1, 0.1, 1);
  state.seekSettings.tpr = n;
  ($('seekTpr') as HTMLInputElement).value = String(n);
}

/** Push the current settings into the controls (used when the view opens). */
export function syncSeekPanel(): void {
  const S = state.seekSettings;
  ($('seekMaxStep') as HTMLInputElement).value = String(S.maxStep);
  ($('seekTpr') as HTMLInputElement).value = String(S.tpr);
  ($('seekNavLine') as HTMLInputElement).checked = S.navLine;
  ($('seekRoadCorner') as HTMLInputElement).checked = S.roadCorner;
  for (const r of document.querySelectorAll<HTMLInputElement>('input[name="seekType"]')) {
    r.checked = Number(r.value) === (S.useRCA ? 1 : 0);
  }
  for (const r of document.querySelectorAll<HTMLInputElement>('input[name="seekOptimize"]')) {
    r.checked = Number(r.value) === S.optimize;
  }
}

export function bindSeekPanel(): void {
  const maxStep = $('seekMaxStep') as HTMLInputElement;
  maxStep.addEventListener('change', () => applyMaxStep(maxStep.value));
  maxStep.addEventListener('blur', () => applyMaxStep(maxStep.value));

  const tpr = $('seekTpr') as HTMLInputElement;
  tpr.addEventListener('change', () => applyTpr(tpr.value));
  tpr.addEventListener('blur', () => applyTpr(tpr.value));

  ($('seekNavLine') as HTMLInputElement).addEventListener('change', e => {
    state.seekSettings.navLine = (e.target as HTMLInputElement).checked;
    renderTest();
  });

  for (const r of document.querySelectorAll<HTMLInputElement>('input[name="seekType"]')) {
    r.addEventListener('change', () => {
      if (r.disabled) return;
      state.seekSettings.useRCA = Number(r.value) === 1;
    });
  }

  for (const r of document.querySelectorAll<HTMLInputElement>('input[name="seekOptimize"]')) {
    r.addEventListener('change', () => {
      if (r.disabled) return;
      state.seekSettings.optimize = Number(r.value) as SeekSettings['optimize'];
    });
  }

  syncSeekPanel();
}
