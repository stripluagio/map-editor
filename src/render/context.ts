import { state } from '../app/state';

export interface RenderCtx {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
}

/** Get a 2D context + size for a canvas element. */
export function context2d(cv: HTMLCanvasElement): RenderCtx {
  const ctx = cv.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  return { ctx, W: cv.width, H: cv.height };
}

/** True when a world-space point is near the visible viewport. */
export function inView(x: number, y: number, W: number, H: number, pad = 80): boolean {
  const z = state.view.zoom;
  const sx = x * z + state.view.offsetX, sy = y * z + state.view.offsetY;
  return sx >= -pad && sx <= W + pad && sy >= -pad && sy <= H + pad;
}
