import { MapType } from './types';
import type { Point, RoadNode } from './types';

/**
 * MapRoadUtils — exact port of the 4 grid geometries.
 * (cx,cy)=world, (px,py)=pixel, (dx,dy)=grid.
 */
export class MapRoadUtils {
  mapWidth = 1920;
  mapHeight = 1080;
  nodeWidth = 60;
  nodeHeight = 30;
  halfNodeWidth = 30;
  halfNodeHeight = 15;
  mapType: MapType = MapType.angle45;
  row = 0;
  col = 0;

  updateMapInfo(w: number, h: number, nw: number, nh: number, type: MapType): { row: number; col: number } {
    this.mapWidth = w; this.mapHeight = h;
    this.nodeWidth = nw; this.nodeHeight = nh;
    this.halfNodeWidth = nw / 2; this.halfNodeHeight = nh / 2;
    this.mapType = type;
    switch (type) {
      case MapType.angle45:
        this.col = Math.ceil(w / nw); this.row = 2 * Math.ceil(h / nh); break;
      case MapType.angle90:
        this.col = Math.ceil(w / nw); this.row = Math.ceil(h / nh); break;
      case MapType.honeycomb:
        this.col = 2 * Math.ceil((w - nw / 4) / (nw / 4 * 6));
        this.row = Math.ceil((h - nh / 2) / nh); break;
      case MapType.honeycomb2:
        this.col = Math.ceil((w - nh / 2) / nh);
        this.row = 2 * Math.ceil((h - nw / 4) / (nw / 4 * 6)); break;
    }
    return { row: this.row, col: this.col };
  }

  getNodeByPixel(px: number, py: number): RoadNode {
    const wp = this.getWorldPointByPixel(px, py);
    const pp = this.getPixelByWorldPoint(wp.x, wp.y);
    const g = this.getDerectByPixel(px, py);
    return { cx: wp.x, cy: wp.y, px: pp.x, py: pp.y, dx: g.x, dy: g.y };
  }

  getNodeByWorldPoint(cx: number, cy: number): RoadNode {
    const pp = this.getPixelByWorldPoint(cx, cy);
    return this.getNodeByPixel(pp.x, pp.y);
  }

  getWorldPointByPixel(x: number, y: number): Point {
    switch (this.mapType) {
      case MapType.angle45: {
        const col = this.col - 1;
        return {
          x: Math.ceil(x / this.nodeWidth - .5 + y / this.nodeHeight) - 1,
          y: col - Math.ceil(x / this.nodeWidth - .5 - y / this.nodeHeight),
        };
      }
      case MapType.angle90:
        return { x: Math.floor(x / this.nodeWidth), y: Math.floor(y / this.nodeHeight) };
      case MapType.honeycomb: {
        const nw = this.nodeWidth, nh = this.nodeHeight;
        const cxApprox = Math.floor(x / (nw * 3 / 4));
        let best: Point | null = null, bestD = Infinity;
        for (let cx = cxApprox - 2; cx <= cxApprox + 2; cx++) {
          const offY = (cx & 1) ? nh / 2 : 0;
          const cy = Math.floor((y - offY) / nh);
          for (let dy = cy - 1; dy <= cy + 1; dy++) {
            const p = this.getPixelByWorldPoint(cx, dy);
            const d = (p.x - x) ** 2 + (p.y - y) ** 2;
            if (d < bestD) { bestD = d; best = { x: cx, y: dy }; }
          }
        }
        return best || { x: 0, y: 0 };
      }
      case MapType.honeycomb2: {
        const nw = this.nodeWidth, nh = this.nodeHeight;
        const cyApprox = Math.floor(y / (nw * 3 / 4));
        let best: Point | null = null, bestD = Infinity;
        for (let cy = cyApprox - 2; cy <= cyApprox + 2; cy++) {
          const offX = (cy & 1) ? nh / 2 : 0;
          const cx = Math.floor((x - offX) / nh);
          for (let dx = cx - 1; dx <= cx + 1; dx++) {
            const p = this.getPixelByWorldPoint(dx, cy);
            const d = (p.x - x) ** 2 + (p.y - y) ** 2;
            if (d < bestD) { bestD = d; best = { x: dx, y: cy }; }
          }
        }
        return best || { x: 0, y: 0 };
      }
    }
    return { x: 0, y: 0 };
  }

  getPixelByWorldPoint(cx: number, cy: number): Point {
    switch (this.mapType) {
      case MapType.angle45: {
        const col = this.col - 1;
        return {
          x: (cx + 1 - (cy - col)) * this.halfNodeWidth,
          y: (cx + 1 + (cy - col)) * this.halfNodeHeight,
        };
      }
      case MapType.angle90:
        return { x: cx * this.nodeWidth, y: cy * this.nodeHeight };
      case MapType.honeycomb: {
        const nw = this.nodeWidth, nh = this.nodeHeight;
        return { x: cx * (nw * 3 / 4) + nw / 2,
                 y: cy * nh + ((cx & 1) ? nh / 2 : 0) + nh / 2 };
      }
      case MapType.honeycomb2: {
        const nw = this.nodeWidth, nh = this.nodeHeight;
        return { x: cx * nh + ((cy & 1) ? nh / 2 : 0) + nh / 2,
                 y: cy * (nw * 3 / 4) + nw / 2 };
      }
    }
    return { x: 0, y: 0 };
  }

  getDerectByPixel(x: number, y: number): Point {
    return this.getWorldPointByPixel(x, y);
  }

  getNodeByDerect(dx: number, dy: number): RoadNode {
    const pp = this.getPixelByWorldPoint(dx, dy);
    return this.getNodeByPixel(pp.x, pp.y);
  }

  /** Center pixel of a cell, for rendering. */
  cellCenter(dx: number, dy: number): Point {
    const p = this.getPixelByWorldPoint(dx, dy);
    if (this.mapType === MapType.angle90) {
      return { x: p.x + this.nodeWidth / 2, y: p.y + this.nodeHeight / 2 };
    }
    return p;
  }

  /** Diamond brush stroke: |dx|+|dy| <= size. */
  getStroke(size: number): Array<[number, number]> {
    if (!size) return [[0, 0]];
    const out: Array<[number, number]> = [];
    for (let y = -size; y <= size; y++)
      for (let x = -size; x <= size; x++)
        if (Math.abs(x) + Math.abs(y) <= size) out.push([x, y]);
    return out;
  }
}

/** Compute the row/col count for a new map (wizard validation). */
export function computeGridSize(w: number, h: number, nw: number, nh: number, type: MapType): { col: number; row: number } {  switch (type) {
    case MapType.angle45: return { col: Math.ceil(w / nw), row: 2 * Math.ceil(h / nh) };
    case MapType.angle90: return { col: Math.ceil(w / nw), row: Math.ceil(h / nh) };
    case MapType.honeycomb: return {
      col: 2 * Math.ceil((w - nw / 4) / (nw / 4 * 6)),
      row: Math.ceil((h - nh / 2) / nh),
    };
    case MapType.honeycomb2: return {
      col: Math.ceil((w - nh / 2) / nh),
      row: 2 * Math.ceil((h - nw / 4) / (nw / 4 * 6)),
    };
  }
  return { col: 0, row: 0 };
}

/**
 * Number of rows the exported `roadDataArr` has — which is NOT always `grid.row`.
 *
 * Original `RoadPointLayer.getRoadPointInfo()`:
 *
 *     var c = mapType == MapType.angle45 ? 2 * i : i;   // i = MapRoadUtils.row
 *
 * and `MapRoadUtils.updateMapInfo` already sets `_row = 2 * ceil(h / nh)` for
 * angle45, so the export is `4 * ceil(h / nh)` — twice the grid.
 *
 * Measured on the real Cocos build (1920x1440, cell 40x34.64):
 *   angle45   168 rows x 48 cols      angle90  42 x 48
 *   honeycomb  42 x 64                honeycomb2  48 x 55
 *
 * It is not cosmetic: an angle45 map's diamond reaches `dy = 88` while
 * `grid.row` is only 84, so a grid-sized array silently drops those cells
 * (`paintAt` skips out-of-range nodes). Matching the original's height makes
 * the paintable area exactly equal to the savable area.
 */
export function roadRowCount(type: MapType, gridRow: number): number {
  return type === MapType.angle45 ? gridRow * 2 : gridRow;
}
