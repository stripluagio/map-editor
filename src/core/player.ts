/**
 * Player sprite sheet math — 1:1 with the original `Charactor` + `MovieClip`.
 *
 * `77/7742ee15-….png` is 2520×525: 24 columns × 5 rows of 105×105 frames.
 *   - columns 0-5   stand        (`state = 0`)
 *   - columns 6-11  run          (`state = 1`)
 *   - columns 12-17 sitdown      (`state = 2`)
 *   - columns 18-23 sitdown_run  (`state = 3`)
 *   - rows 0..4 are 5 facings; directions 5/6/7 reuse rows 3/2/1 **mirrored**
 *     (`Charactor.direction`: `dir > 4 -> rowIndex = 4 - dir % 4, scaleX = -1`).
 */

export type PlayerAnimState = 'stand' | 'run' | 'sitdown' | 'sitrun';

/** MovieClip piece size (texture / col,row). */
export const PLAYER_FRAME_SIZE = 105;
/** MovieClip.interval — one column every 100 ms. */
export const PLAYER_FRAME_TIME = 0.1;
/** Frames per state (`end - begin`). */
export const PLAYER_STATE_FRAMES = 6;
/**
 * The `Skin` child node keeps the prefab's non-centred anchor (0.5, 0.25), so
 * the 105×105 frame hangs **above** the player position: its bottom edge is
 * 26.25 px below the anchor and its head 78.75 px above it. Drawing the frame
 * centred on the player (the naive choice) sinks the character ~26 px into the
 * ground compared with the original.
 */
export const PLAYER_ANCHOR_Y = 0.25;
/** Top-left corner of the 105×105 frame relative to the player position. */
export const PLAYER_DRAW_OFFSET = {
  x: -PLAYER_FRAME_SIZE / 2,
  y: -PLAYER_FRAME_SIZE * (1 - PLAYER_ANCHOR_Y),
};

const STATE_BEGIN: Record<PlayerAnimState, number> = {
  stand: 0, run: 6, sitdown: 12, sitrun: 18,
};

export interface PlayerFrame {
  /** Column inside the sheet (0..23). */
  col: number;
  /** Row inside the sheet (0..4). */
  row: number;
  /** `scaleX = -1` — the original mirrors directions 5/6/7. */
  flip: boolean;
}

/** `Charactor.direction` + `state` + `MovieClip.playIndex` -> sheet cell. */
export function playerFrame(dir: number, state: PlayerAnimState, frame: number): PlayerFrame {
  const d = ((Math.round(dir || 0) % 8) + 8) % 8;
  const row = d > 4 ? 4 - (d % 4) : d;
  const base = STATE_BEGIN[state] ?? 0;
  const f = ((Math.round(frame || 0) % PLAYER_STATE_FRAMES) + PLAYER_STATE_FRAMES) % PLAYER_STATE_FRAMES;
  return { col: base + f, row, flip: d > 4 };
}

/**
 * `Charactor.update()` — direction from the movement angle:
 * `r = round((-angle + PI) / (PI/4)); direction = r > 5 ? r - 6 : r + 2`.
 *
 * The original only recomputes it when `_moveAngle` is (re)acquired — once per
 * path leg — and then walks along that fixed angle. Recomputing per frame is
 * *not* equivalent: near the end of a leg the remaining vector becomes tiny and
 * the rounded 8-way direction starts flipping between neighbours, which makes
 * the sprite jitter.
 */
export function playerDirectionFromAngle(angle: number): number {
  const r = Math.round((-angle + Math.PI) / (Math.PI / 4));
  const d = r > 5 ? r - 6 : r + 2;
  return ((d % 8) + 8) % 8;
}

/** Convenience wrapper: `atan2(dy, dx)` -> `playerDirectionFromAngle`.
 *
 * `dx`/`dy` must be in **Cocos space (y up)**, which is what `Charactor` uses.
 * A canvas renderer has y pointing down, so pass `(dx, -dy)` there. */
export function playerDirectionFromVector(dx: number, dy: number): number {
  if (!dx && !dy) return 0;
  return playerDirectionFromAngle(Math.atan2(dy, dx));
}
