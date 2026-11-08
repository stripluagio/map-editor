import { MapType } from './types';

export interface AuxLine {
  /** x for a vertical line, y for a horizontal one (map units). */
  pos: number;
  color: string;
  width: number;
}

/** 原版 `GridLayer` 的辅助线配色（honeycomb / honeycomb2 共用）。 */
export const AUX_STRONG = '#11115566';   // 40% 蓝
/**
 * 深绿辅助线 = 原版 `lingColor1 = "#00550025"`（alpha = 0x25/255 = 0.145）。
 *
 * 曾经想把它提到 0.27 让「看起来更实」，实测原版截图否掉了这个想法：
 * 原版绿色像素里 **96% 是 `(0,12,0)`**（黑底上单遍 0.145），
 * 只有 4% 是 `(0,23,0)` —— 那是两族辅助线在同一位置重叠、`1-(1-0.145)² = 0.269`
 * 的结果。把 alpha 提到 0.27 会让那 96% 的线亮 1.86 倍。
 *
 * 「发虚」的真实原因是画布被 CSS transform 二次重采样（见 render/cache.ts 的
 * 设备像素对齐），不是 alpha 太小。
 */
export const AUX_FAINT = '#00550025';    // 14.5% 深绿（= 原版 lingColor1 字面值）

/**
 * 六边形地图的矩形辅助线 —— 复刻 `GridLayer.drawHoneycombGrid` /
 * `drawHoneycombGrid2`。
 *
 * 关键：原版的辅助线**不是等距方格**，而是两族叠起来的：
 *
 * - **带偏移族**：每个 `ceilWidth` 周期 4 条，偏移
 *   `0 / (halfW-halfH) / halfW / (halfW+halfH)`；只有落在周期起点的那条是
 *   `#11115566`(40%)、1px，其余 3 条是 `#00550025`(14.5%) 的深绿、1.2px
 *   （原代码是一个三元表达式：`l%4==0 ? (lingColor2, 1) : (lingColor1, 1.2)`）。
 * - **等距族**：每 `ceilWidth/4` 一条；每 4 条里的第 1 条是 `#11115566`，其余
 *   `#00550025`，宽度都是 1px。
 *
 * `honeycomb2`（pointy-top）竖线带偏移、横线等距；`honeycomb`（flat-top）反过来。
 *
 * 之前这里是「每 nw/2、nh/2 一条、统一 #11115566」—— 线更密、颜色更亮，
 * 叠在六边形上就读成了「矩形格子」。
 */
export function honeycombAuxLines(
  ceilWidth: number, ceilHeight: number,
  mapWidth: number, mapHeight: number,
  type: MapType,
): { vertical: AuxLine[]; horizontal: AuxLine[] } {
  const quarter = ceilWidth / 4;
  const halfW = ceilWidth / 2, halfH = ceilHeight / 2;
  const period = ceilWidth;
  const offs = [0, halfW - halfH, halfW, halfW + halfH];
  const widths = [1, 1.2, 1.2, 1.2];

  const offsetFamily = (max: number): AuxLine[] => {
    const out: AuxLine[] = [];
    for (let base = 0; base <= max + 1e-6; base += period) {
      for (let k = 0; k < offs.length; k++) {
        const pos = base + offs[k];
        if (pos > max + 1e-6) continue;
        out.push({ pos, color: k === 0 ? AUX_STRONG : AUX_FAINT, width: widths[k] });
      }
    }
    return out;
  };

  const uniformFamily = (max: number): AuxLine[] => {
    const out: AuxLine[] = [];
    for (let p = 0; p * quarter <= max + 1e-6; p++) {
      out.push({ pos: p * quarter, color: p % 4 === 0 ? AUX_STRONG : AUX_FAINT, width: 1 });
    }
    return out;
  };

  const verticalHasOffset = type === MapType.honeycomb2;
  return {
    vertical: verticalHasOffset ? offsetFamily(mapWidth) : uniformFamily(mapWidth),
    horizontal: verticalHasOffset ? uniformFamily(mapHeight) : offsetFamily(mapHeight),
  };
}

/**
 * 六边形顶点（世界坐标），复刻原版 `drawHoneycombGrid` / `drawHoneycombGrid2`
 * 的两种朝向。`nw`/`nh` 是 MapParams 的 `ceilWidth`/`ceilHeight`。
 *
 * - `flatTop`（honeycomb）：宽 `nw`（左右是顶点）、高 `nh`（上下是平边）。
 * - 否则（honeycomb2，pointy-top）：宽 `nh`、高 `nw`，上下是顶点。
 *
 * 两种都是**以 (cx,cy) 为中心的正六边形**：内缩 `nw/4`、尖角偏移 `nh/2`。
 * 之前 pointy-top 分支把 nw/nh 用反了（内缩 nh/4、尖角 nw/2），
 * 结果是压扁且整体右偏 `halfW-halfH`。
 */
export function hexVertices(
  cx: number, cy: number, nw: number, nh: number, flatTop: boolean,
): Array<[number, number]> {
  const v = hexVertsInto(new Float64Array(12), cx, cy, nw, nh, flatTop);
  const out: Array<[number, number]> = [];
  for (let i = 0; i < 12; i += 2) out.push([v[i], v[i + 1]]);
  return out;
}

/**
 * Same vertices, written into a caller-owned 12-slot buffer (`[x0,y0,x1,y1,…]`).
 *
 * The honeycomb outline is rebuilt for every cell on the map — 2640 of them at
 * 1920×1440 — and `hexVertices` allocates 7 arrays per call. That allocation
 * churn, not the rasterisation, was half the cost of a grid rebuild (measured
 * ~64 ms of ~131 ms). Reusing one buffer removes it.
 */
export function hexVertsInto(
  out: Float64Array, cx: number, cy: number, nw: number, nh: number, flatTop: boolean,
): Float64Array {
  const d = nw / 4, l = 3 * d, p = nh / 2;
  if (flatTop) {
    const x = cx - nw / 2, y = cy - nh / 2;
    out[0] = x + d; out[1] = y;
    out[2] = x + l; out[3] = y;
    out[4] = x + nw; out[5] = y + p;
    out[6] = x + l; out[7] = y + nh;
    out[8] = x + d; out[9] = y + nh;
    out[10] = x; out[11] = y + p;
  } else {
    const x = cx - nh / 2, y = cy - nw / 2;
    out[0] = x; out[1] = y + d;
    out[2] = x + p; out[3] = y;
    out[4] = x + nh; out[5] = y + d;
    out[6] = x + nh; out[7] = y + l;
    out[8] = x + p; out[9] = y + nw;
    out[10] = x; out[11] = y + l;
  }
  return out;
}

/** 格子边界色（原版 `lingColor3`）。 */
export const GRID_BORDER = '#bbbbbbaa';

export interface Segment { x1: number; y1: number; x2: number; y2: number }

export interface RectGrid {
  /** y 坐标（map 单位）。 */
  horizontal: AuxLine[];
  /** x 坐标（map 单位）。 */
  vertical: AuxLine[];
  /** 45 度地图的斜线；90 度恒为空。 */
  diagonals: Segment[];
}

/**
 * 90 度地图的网格 —— 复刻 `GridLayer.draw90AngleGrid`。
 *
 * 原版在**半格**间距上画线：偶数条是格子边界（`lingColor3` 2px），
 * 奇数条是辅助线（`lingColor1` 1px）。
 *
 * ⚠️ 原版关掉辅助线时，奇数条**仍然会被画出来**：
 *
 *     n % 2 == 0 ? (strokeColor = lingColor3, lineWidth = 2)
 *                : this._isShowAuxiliaryLine && (strokeColor = lingColor1, lineWidth = 1)
 *
 * 关掉时 `else if` 分支整个短路，`strokeColor` / `lineWidth` 保持上一条（偶数条）的
 * `lingColor3` / 2px，于是奇数条变成**灰色的半格线** —— 看起来「关不掉」。
 *
 * 这里**严格照抄**这个行为（不再按开关本意去隐藏奇数条）：原版怎么样就怎么样。
 */
export function angle90Lines(
  mapWidth: number, mapHeight: number,
  nw: number, nh: number, showAux: boolean,
): RectGrid {
  const halfW = nw / 2, halfH = nh / 2;
  const cols = Math.ceil(mapWidth / nw), rows = Math.ceil(mapHeight / nh);
  const horizontal: AuxLine[] = [];
  const vertical: AuxLine[] = [];
  for (let n = 0; n <= 2 * rows + 1; n++) {
    horizontal.push(angle90Line(n * halfH, n % 2 === 0, showAux));
  }
  for (let r = 0; r <= 2 * cols + 1; r++) {
    vertical.push(angle90Line(r * halfW, r % 2 === 0, showAux));
  }
  return { horizontal, vertical, diagonals: [] };
}

/**
 * 一条 90 度网格线。`even` = 落在格子边界上。
 *
 * 奇数条（辅助线）在 `showAux` 关掉时**沿用偶数条的灰色 2px**，见上面 `angle90Lines`
 * 的说明 —— 这是原版 `&&` 短路留下的行为，不是笔误。
 */
function angle90Line(pos: number, even: boolean, showAux: boolean): AuxLine {
  if (even) return { pos, color: GRID_BORDER, width: 2 };
  if (!showAux) return { pos, color: GRID_BORDER, width: 2 };
  return { pos, color: AUX_FAINT, width: 1 };
}

/**
 * 45 度地图的网格 —— 复刻 `GridLayer.draw45AngleGrid`。
 *
 * 两部分：
 * - **两族矩形辅助线**（整段都受 `_isShowAuxiliaryLine` 控制）：半格间距，
 *   偶数条 `lingColor2`(蓝)、奇数条 `lingColor1`(绿)，都是 1px。
 * - **两族斜线**（始终画）：`lingColor3` 2px。`a` 为奇数时从 `(a*halfW, 0)`
 *   连到 `(0, a*halfH)`，偶数时从 `(a*halfW, o)` 连到 `(0, (t-a)*halfH)`。
 *   原版对超出 `i`/`o` 的端点做了裁剪；这里不做，交给 canvas 裁 —— 端点只是沿同一条
 *   线移动，画面内可见部分完全一致。
 */
export function angle45Lines(
  mapWidth: number, mapHeight: number,
  nw: number, nh: number, showAux: boolean,
): RectGrid {
  const halfW = nw / 2, halfH = nh / 2;
  const cols = Math.ceil(mapWidth / nw), rows = Math.ceil(mapHeight / nh);
  const t = 2 * rows + 1, e = 2 * cols + 1;
  const horizontal: AuxLine[] = [];
  const vertical: AuxLine[] = [];
  if (showAux) {
    for (let n = 0; n <= t; n++) {
      horizontal.push({ pos: n * halfH, color: n % 2 === 0 ? AUX_STRONG : AUX_FAINT, width: 1 });
    }
    for (let r = 0; r <= e; r++) {
      vertical.push({ pos: r * halfW, color: r % 2 === 0 ? AUX_STRONG : AUX_FAINT, width: 1 });
    }
  }
  const o = t * halfH;
  const diagonals: Segment[] = [];
  for (let a = 1; a < e + t; a++) {
    if (a % 2 === 1) {
      diagonals.push({ x1: a * halfW, y1: 0, x2: 0, y2: a * halfH });
    } else {
      diagonals.push({ x1: a * halfW, y1: o, x2: 0, y2: (t - a) * halfH });
    }
  }
  return { horizontal, vertical, diagonals };
}
