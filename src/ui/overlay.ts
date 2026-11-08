import { $, el } from './dom';

let toastTimer: number | null = null;

export function toast(msg: string): void {
  const t = $('toast');
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
