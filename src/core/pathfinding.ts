import { MapType } from './types';
import type { Point } from './types';

/** Binary heap open list (BinaryTreeNode equivalent). */
export class BinaryHeap<T> {
  private data: T[] = [];
  constructor(private readonly score: (v: T) => number) {}
  get length(): number { return this.data.length; }
  push(v: T): void {
    const d = this.data; d.push(v);
    let i = d.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.score(d[p]) <= this.score(d[i])) break;
      [d[p], d[i]] = [d[i], d[p]]; i = p;
    }
  }
  pop(): T | null {
    const d = this.data;
    if (!d.length) return null;
    const r = d[0], last = d.pop() as T;
    if (d.length) {
      d[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r2 = l + 1;
        let m = i;
        if (l < d.length && this.score(d[l]) < this.score(d[m])) m = l;
        if (r2 < d.length && this.score(d[r2]) < this.score(d[m])) m = r2;
        if (m === i) break;
        [d[m], d[i]] = [d[i], d[m]]; i = m;
      }
    }
    return r;
  }
}

export type PassFn = (value: number) => boolean;

/**
 * Optional collector for the "查看寻路过程(F4)" overlay.
 *
 * `open`/`closed` accumulate every node ever pushed / expanded (cheap), while
 * `frames` snapshots the *live* frontier after each expansion — that is exactly
 * what the original redraws on every `setInterval` tick
 * (`SceneMap.testSeekRoadCallback` clears the graphic and refills the current
 * open list `#d4d4d4` and closed list `#ffcc00` as r=10 circles).
 */
export interface PathDebug {
  open: Point[];
  closed: Point[];
  frames?: Array<{ closed: number; open: Point[] }>;
}

/**
 * `isCrossAtAdjacentNodes` — two *neighbouring* cells can be stepped between
 * only when both are passable and the move does not cut a blocked corner.
 */
function crossOk(a: Point, b: Point, pass: (x: number, y: number) => boolean): boolean {
  if (a.x === b.x && a.y === b.y) return false;
  if (!pass(a.x, a.y) || !pass(b.x, b.y)) return false;
  const ix = b.x - a.x, iy = b.y - a.y;
  if (Math.abs(ix) > 1 || Math.abs(iy) > 1) return false;
  if (a.x === b.x || a.y === b.y) return true;
  return pass(a.x, a.y + iy) && pass(a.x + ix, a.y);
}

/**
 * `isArriveBetweenTwoNodes` — walk the straight line between two cells one grid
 * step at a time and require every step to be legal. Used to shortcut a long
 * run of path nodes into one segment.
 */
function lineOfSight(a: Point, b: Point, pass: (x: number, y: number) => boolean): boolean {
  if (a.x === b.x && a.y === b.y) return false;
  const adx = Math.abs(b.x - a.x), ady = Math.abs(b.y - a.y);
  const sx = b.x > a.x ? 1 : b.x < a.x ? -1 : 0;
  const sy = b.y > a.y ? 1 : b.y < a.y ? -1 : 0;
  /** `h <= .5 ? floor(s) : floor(s) + 1` — the original's rounding. */
  const rnd = (s: number) => (s % 1) <= 0.5 ? Math.floor(s) : Math.floor(s) + 1;

  if (adx > ady) {
    const d = ady / adx;
    for (let l = 0; l < adx; l++) {
      const y1 = rnd(a.y + l * sy * d), y2 = rnd(a.y + (l + 1) * sy * d);
      if (!crossOk({ x: a.x + l * sx, y: y1 }, { x: a.x + (l + 1) * sx, y: y2 }, pass)) return false;
    }
  } else {
    const d = adx / ady;
    for (let l = 0; l < ady; l++) {
      const x1 = rnd(a.x + l * sx * d), x2 = rnd(a.x + (l + 1) * sx * d);
      if (!crossOk({ x: x1, y: a.y + l * sy }, { x: x2, y: a.y + (l + 1) * sy }, pass)) return false;
    }
  }
  return true;
}

/**
 * `AStarRoadSeeker.getPath()` with `optimize = true` — the original *never*
 * hands back a raw cell-by-cell path:
 *   1. every node that sits on a straight run (same column / same row /
 *      continuing diagonal) is dropped;
 *   2. then, scanning from the far end, any node whose straight line to an
 *      earlier node is walkable collapses the nodes in between.
 * That is why 查看寻路过程(F4) draws a handful of amber dots joined by a few
 * long black segments instead of one dot per cell.
 */
export function optimizePath(
  road: number[][], path: Point[], isPass: PassFn,
): Point[] {
  if (path.length < 3) return path;
  const rows = road.length, cols = road[0].length;
  const pass = (x: number, y: number) =>
    y >= 0 && y < rows && x >= 0 && x < cols && isPass(road[y][x]);

  const out = path.slice();
  for (let i = 1; i < out.length - 1; i++) {
    const a = out[i - 1], b = out[i], c = out[i + 1];
    const sameCol = b.x === a.x && b.x === c.x;
    const sameRow = b.y === a.y && b.y === c.y;
    const diag = (b.x - a.x) === (c.x - b.x) && (b.y - a.y) === (c.y - b.y)
      && Math.abs(b.x - a.x) === Math.abs(b.y - a.y) && b.x !== a.x;
    if (sameCol || sameRow || diag) { out.splice(i, 1); i--; }
  }
  for (let i = 0; i < out.length - 2; i++) {
    let far = -1;
    for (let j = out.length - 1; j > i + 1; j--) {
      if (lineOfSight(out[i], out[j], pass)) { far = j; break; }
    }
    if (far > i + 1) out.splice(i + 1, far - i - 1);
  }
  return out;
}

/**
 * A* — square 8-neighbour (10/14) / hexagon 6-neighbour (10/10).
 * Returns the path inclusive of start & target, or null.
 */
export function findPath(
  road: number[][], sx: number, sy: number, tx: number, ty: number,
  mapType: MapType, pass: PassFn | null = null, debug?: PathDebug, maxSteps = 400000,
): Point[] | null {
  const rows = road.length;
  if (!rows) return null;
  const cols = road[0].length;
  const isPass: PassFn = pass || (v => v === 0 || v === 2 || v === 3);
  const hex = mapType === MapType.honeycomb || mapType === MapType.honeycomb2;
  const key = (x: number, y: number) => y * cols + x;
  const inb = (x: number, y: number) => y >= 0 && y < rows && x >= 0 && x < cols;
  const neighbours = (x: number, _y: number): Array<[number, number]> =>
    hex
      ? ((x & 1)
        ? [[0,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]]
        : [[0,-1],[1,-1],[1,0],[0,1],[-1,0],[-1,-1]])
      : [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
  const h = (x: number, y: number) => 10 * (Math.abs(x - tx) + Math.abs(y - ty));

  const g = new Map<number, number>(), f = new Map<number, number>(), came = new Map<number, number>();
  const open = new BinaryHeap<number>(k => f.get(k) ?? Infinity);
  /** Live frontier (heap contents) — only maintained when frames are recorded. */
  const openSet = debug?.frames ? new Set<number>() : null;
  const sk = key(sx, sy), tk = key(tx, ty);
  g.set(sk, 0); f.set(sk, h(sx, sy)); open.push(sk);
  if (openSet) openSet.add(sk);
  const closed = new Set<number>();
  let guard = 0;

  while (open.length && guard++ < maxSteps) {
    const cur = open.pop() as number;
    if (closed.has(cur)) continue;
    if (cur === tk) {
      const path: Point[] = [];
      let k: number | undefined = cur;
      while (k !== undefined) { path.push({ x: k % cols, y: Math.floor(k / cols) }); k = came.get(k); }
      return optimizePath(road, path.reverse(), isPass);
    }
    closed.add(cur);
    if (openSet) openSet.delete(cur);
    const cx = cur % cols, cy = Math.floor(cur / cols);
    if (debug) debug.closed.push({ x: cx, y: cy });
    for (const [ox, oy] of neighbours(cx, cy)) {
      const nx = cx + ox, ny = cy + oy;
      if (!inb(nx, ny) || !isPass(road[ny][nx])) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      const cost = hex ? 10 : ((ox && oy) ? 14 : 10);
      const ng = (g.get(cur) ?? Infinity) + cost;
      if (ng < (g.get(nk) ?? Infinity)) {
        came.set(nk, cur); g.set(nk, ng); f.set(nk, ng + h(nx, ny)); open.push(nk);
        if (openSet) openSet.add(nk);
        if (debug) debug.open.push({ x: nx, y: ny });
      }
    }
    if (debug?.frames && openSet) {
      debug.frames.push({
        closed: debug.closed.length,
        open: Array.from(openSet, k => ({ x: k % cols, y: Math.floor(k / cols) })),
      });
    }
  }
  return null;
}
