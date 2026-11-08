import { MapType } from './types';

export interface AuxLine {
  /** x for a vertical line, y for a horizontal one (map units). */
  pos: number;
  color: string;
  width: number;
}

/** 原版 `GridLayer` 的辅助线配色（honeycomb / honeycomb2 共用）。 */
export const AUX_STRONG = '#11115566';   // 40% 蓝
export const AUX_FAINT = '#00550025';    // 14.5% 深绿

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
  if (flatTop) {
    const d = nw / 4, l = 3 * d, p = nh / 2;
    const x = cx - nw / 2, y = cy - nh / 2;
    return [[x + d, y], [x + l, y], [x + nw, y + p],
            [x + l, y + nh], [x + d, y + nh], [x, y + p]];
  }
  const d = nw / 4, l = 3 * d, p = nh / 2;
  const x = cx - nh / 2, y = cy - nw / 2;
  return [[x, y + d], [x + p, y], [x + nh, y + d],
          [x + nh, y + l], [x + p, y + nw], [x, y + l]];
}
