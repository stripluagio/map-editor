import type { Rgba } from './types';

/** Convert #RGB / #RGBA / #RRGGBB / #RRGGBBAA into CSS rgba(). */
export function hexToRgba(hex: string): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2]+'ff';
  else if (h.length === 4) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2]+h[3]+h[3];
  else if (h.length === 6) h += 'ff';
  if (h.length !== 8) h = 'ffffffff';
  const n = parseInt(h, 16);
  const r = (n >>> 24) & 255, g = (n >>> 16) & 255, b = (n >>> 8) & 255, a = n & 255;
  return 'rgba(' + r + ',' + g + ',' + b + ',' + (a / 255).toFixed(3) + ')';
}

export function parseColor(hex: string | undefined): Rgba {
  let h = (hex || '#FFFFFFFF').replace('#', '');
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2]+'FF';
  else if (h.length === 4) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2]+h[3]+h[3];
  else if (h.length === 6) h += 'FF';
  if (h.length !== 8) h = 'FFFFFFFF';
  return {
    r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16), a: parseInt(h.slice(6, 8), 16),
  };
}

export function rgbaToHex(r: number, g: number, b: number, a: number): string {
  const p = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0').toUpperCase();
  return '#' + p(r) + p(g) + p(b) + p(a);
}

export function rgbHex(r: number, g: number, b: number): string {
  const p = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + p(r) + p(g) + p(b);
}

/** Road fill colour as rendered on canvas (SettingData / _colorHexList). */
export function roadRenderColor(_value: number, settingColor: string): string {
  return hexToRgba(settingColor);
}

export function entityColor(type: string, skin: number): string {
  const palettes: Record<string, string[]> = {
    npc: ['#e05555', '#55a0e0', '#c0a060', '#70c070', '#b070d0', '#d0a050'],
    monster: ['#8090d0', '#a06060', '#909090', '#7050a0', '#606060', '#a08050'],
    transfer: ['#40c0e0'], spawnPoint: ['#f0c040'],
  };
  const p = palettes[type] || ['#aaaaaa'];
  return p[skin % p.length];
}
