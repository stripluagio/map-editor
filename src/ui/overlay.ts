import { $, el } from './dom';

let toastTimer: number | null = null;

/**
 * Transient bottom-centre notice.
 *
 * Deliberately tolerant of a missing `#toast` node: `toast()` is called from
 * failure paths (background image failed to load, canvas export blocked) where
 * throwing would replace a useful message with an uncaught error.
 */
export function toast(msg: string): void {
  const t = document.getElementById('toast');
  if (!t) { console.warn('[toast]', msg); return; }
  t.textContent = msg;
  t.classList.remove('hidden');
  if (toastTimer !== null) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.add('hidden'), 2200);
}

export function alertBox(msg: string): void {
  $('alertMsg').textContent = msg;
  $('alertBox').classList.remove('hidden');
}

export function bindOverlay(): void {
  const btn = el('button', '', '确定');
  void btn;
  $('alertOk').addEventListener('click', () => $('alertBox').classList.add('hidden'));
}
