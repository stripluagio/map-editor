import { state } from '../app/state';

export interface RenderCtx {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
}

/**
 * Logical (app-unit) size of each canvas.
 *
 * A canvas has two independent sizes: the **bitmap** (`cv.width` × `cv.height`,
 * in device pixels) and the **CSS box** (`cv.style.width/height`, in layout px).
 * All the app's drawing and hit-testing math works in layout ("app") units, so we
 * record that separately instead of reading `cv.width` back.
 */
const logical = new WeakMap<HTMLCanvasElement, { w: number; h: number }>();

export function logicalSize(cv: HTMLCanvasElement): { w: number; h: number } {
  return logical.get(cv) || { w: cv.width, h: cv.height };
}

/**
 * Match a canvas backing store to the device pixels it actually occupies, and
 * remember its logical size.
 *
 * Why this exists: `#app` carries `transform: scale(innerWidth / 1920)` (the clone's
 * `_fitWidth`, same as Cocos). A canvas whose bitmap is `layout px` therefore gets
 * **resampled by the browser every frame** — measured bitmap 1464×884 shown at
 * 1451.8×876.6 (ratio 0.9917), which is what made 1px lines and text look soft.
 *
 * Sizing the bitmap at `layout × fitScale × dpr` and pre-scaling the 2D context by
 * the same factor removes that extra resample, while drawing code keeps using app
 * units. Returns device pixels per app unit.
 */
export function sizeCanvas(cv: HTMLCanvasElement, lw: number, lh: number): number {
  const s = state.screenScale || 1;
  const dpr = window.devicePixelRatio || 1;
  const bw = Math.max(1, Math.round(lw * s * dpr));
  const bh = Math.max(1, Math.round(lh * s * dpr));
  // Assigning width/height clears the bitmap, so only touch it when it changed.
  if (cv.width !== bw) cv.width = bw;
  if (cv.height !== bh) cv.height = bh;
  cv.style.width = lw + 'px';
  cv.style.height = lh + 'px';
  logical.set(cv, { w: lw, h: lh });
  return cv.width / Math.max(1, lw);
}

/**
 * Get a 2D context whose transform maps **app units → device pixels**.
 *
 * `setTransform` (not `scale`) so the baseline is deterministic: callers always
 * start from app-unit coordinates, and every `save()`/`restore()` inside a draw
 * pass stays relative to it.
 */
export function context2d(cv: HTMLCanvasElement): RenderCtx {
  const ctx = cv.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  const L = logicalSize(cv);
  ctx.setTransform(cv.width / Math.max(1, L.w), 0, 0,
                   cv.height / Math.max(1, L.h), 0, 0);
  return { ctx, W: L.w, H: L.h };
}

/** True when a world-space point is near the visible viewport. */
export function inView(x: number, y: number, W: number, H: number, pad = 80): boolean {
  const z = state.view.zoom;
  const sx = x * z + state.view.offsetX, sy = y * z + state.view.offsetY;
  return sx >= -pad && sx <= W + pad && sy >= -pad && sy <= H + pad;
}
