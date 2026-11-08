import { MapType } from '../core/types';
import { hexVertices } from '../core/grid';

/** Draw a hexagon outline/fill path (flatTop = honeycomb, else honeycomb2). */
export function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number,
                        nw: number, nh: number, flatTop: boolean): void {
  const v = hexVertices(cx, cy, nw, nh, flatTop);
  ctx.moveTo(v[0][0], v[0][1]);
  for (let i = 1; i < v.length; i++) ctx.lineTo(v[i][0], v[i][1]);
  ctx.closePath();
}

/** Draw one road cell (diamond / rect / hex) at its centre. */
export function cellPath(ctx: CanvasRenderingContext2D, cx: number, cy: number,
                         nw: number, nh: number, halfW: number, halfH: number,
                         type: MapType, blockScale = 0.95): void {
  if (type === MapType.angle45) {
    const hw = halfW * blockScale, hh = halfH * blockScale;
    ctx.moveTo(cx, cy - hh); ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh); ctx.lineTo(cx - hw, cy); ctx.closePath();
  } else if (type === MapType.angle90) {
    ctx.rect(cx - nw * blockScale / 2, cy - nh * blockScale / 2,
             nw * blockScale, nh * blockScale);
  } else {
    hexPath(ctx, cx, cy, nw * blockScale, nh * blockScale, type === MapType.honeycomb);
  }
}
