import { findPath } from '../core/pathfinding';
import type { PathDebug } from '../core/pathfinding';
import { PLAYER_FRAME_TIME, playerDirectionFromAngle } from '../core/player';
import type { Point } from '../core/types';
import { state } from './state';
import type { SeekState, TestState } from './state';
import { getMapData } from './io';
import { render } from '../render/canvas';
import { renderTest, renderTestSize } from '../render/playmode';
import { logicalSize } from '../render/context';
import { toast } from '../ui/overlay';
import { $ } from '../ui/dom';

const MOVE_SPEED = 200;      // Charactor.moveSpeed
const TICK_MS = 1000 / 60;
/** `AStarRoadSeeker.maxStep` — testSeekPathStep gives up after this many expansions. */
const SEEK_MAX_STEP = 1000;
/**
 * `SceneMap.testSeekRoad(... , 100)` — that trailing 100 is the delay handed to
 * `setInterval` inside `testSeekPathStep`, i.e. the search advances **one node
 * every 100 ms**. Replaying several expansions per frame (the obvious guess)
 * makes the debug overlay flash past in a fraction of a second.
 */
const SEEK_STEP_S = 0.1;
/** testSeekPathGraphic.schedule(fn, 0.1, …) — one path segment every 100 ms. */
const PATH_LINE_INTERVAL = 0.1;

/* ---------------- FPS meter ---------------- */
let fpsFrames = 0, fpsLast = 0;
function fpsTick(): void {
  fpsFrames++;
  const now = performance.now();
  if (now - fpsLast < 500) return;
  const fps = Math.round(fpsFrames * 1000 / (now - fpsLast));
  fpsFrames = 0; fpsLast = now;
  const el = document.getElementById('testFps');
  if (el) el.textContent = 'FPS ' + fps;
}

/** TestView.init(getMapData()) — mirrors SceneMap.init(). */
export function startTest(): void {
  if (!state.params) return;
  state.mode = 'test';
  $('editUI').classList.add('hidden');
  $('testView').classList.remove('hidden');
  void getMapData();

  // SceneMap.getSpainPoint(): prefer the defaultSpawn spawn point, else first.
  const spawns = state.entities.filter(e => e.type === 'spawnPoint');
  const def = spawns.find(e => !!e.defaultSpawn) || spawns[0];
  let px = def ? Number(def.x) : 606;             // SceneMap default x
  let py = def ? Number(def.y) : 440;             // SceneMap default y
  const snap = state.geom.getNodeByPixel(px, py);
  if (!state.cellPass(snap.dx, snap.dy)) {
    let best: Point | null = null, bd = Infinity;
    for (let dy = 0; dy < state.road.length; dy++) {
      for (let dx = 0; dx < state.road[0].length; dx++) {
        if (!state.cellPass(dx, dy)) continue;
        const c = state.geom.cellCenter(dx, dy);
        const d = (c.x - px) ** 2 + (c.y - py) ** 2;
        if (d < bd) { bd = d; best = c; }
      }
    }
    if (best) { px = best.x; py = best.y; }
  }
  state.test = {
    // Charactor.start(): direction = 0, state = 3 (sitdown_run) — the player
    // idles in the crouched animation until the first walk.
    player: { x: px, y: py, dir: 0, state: 'sitrun', frame: 0, animT: 0, moving: false, alpha: 1, moveAngle: 0 },
    path: [], follow: false, showPath: false, tick: 0,
    dragPlayer: false, seek: null,
    target: { x: px, y: py }, camX: 0, camY: 0, camReady: false, lastT: 0,
  };
  syncTestButtons();
  renderTestSize(); renderTest();
  if (state.testLoop === null) state.testLoop = window.setInterval(testTick, TICK_MS);
  toast('运行测试：点击地图寻路移动，按住玩家可拖动，F3 跟随，F4 查看寻路过程');
}

export function closeTest(): void {
  state.mode = 'edit';
  $('testView').classList.add('hidden');
  $('editUI').classList.remove('hidden');
  if (state.testLoop !== null) { clearInterval(state.testLoop); state.testLoop = null; }
  render();
}

/** Toggle F3 follow / F4 path-exploration and refresh the toolbar labels. */
export function toggleFollow(): void {
  if (!state.test) return;
  state.test.follow = !state.test.follow;
  syncTestButtons();
  renderTest();
}
export function toggleShowPath(): void {
  if (!state.test) return;
  state.test.showPath = !state.test.showPath;
  // TestView.lookSeekRoad: turning it off stops the search and clears the graphic.
  if (!state.test.showPath) state.test.seek = null;
  syncTestButtons();
  renderTest();
}

function syncTestButtons(): void {
  const T = state.test;
  if (!T) return;
  setButtonLabel('t_followPlayer', T.follow ? '屏幕不跟随玩家(F3)' : '屏幕跟随玩家(F3)');
  setButtonLabel('t_showPath', T.showPath ? '正常寻路(F4)' : '查看寻路过程(F4)');
}
function setButtonLabel(act: string, label: string): void {
  const b = document.querySelector<HTMLElement>('#testToolBar .tb-btn[data-act="' + act + '"]');
  if (b) b.textContent = label;
}

function testTick(): void {
  const T = state.test;
  if (!T) return;
  fpsTick();
  const p = T.player;
  const dt = TICK_MS / 1000;
  stepPlayer(T, dt);
  T.tick++;
  // MovieClip: one column every 0.1 s (timer-based, so frame drops don't speed it up)
  p.animT += dt;
  while (p.animT >= PLAYER_FRAME_TIME) {
    p.animT -= PLAYER_FRAME_TIME;
    p.frame = (p.frame + 1) % 6;
  }
  tickSeek(T, dt);
  updatePlayerAlpha(p);
  renderTest();
}

/**
 * `Charactor.update()` — walk the current leg along a **fixed** angle.
 *
 * The original stores the angle in `_moveAngle` the first time the leg is
 * processed and reuses it until the node is reached; only then is it cleared so
 * the next leg re-acquires it (and re-derives `direction`). Deriving the
 * direction from the live `target - position` vector every frame is *not* the
 * same thing: as the remaining distance shrinks the vector gets noisy and the
 * rounded 8-way facing flips between neighbours, which reads as a jittering
 * sprite.
 */
function stepPlayer(T: TestState, dt: number): void {
  const p = T.player;
  if (!T.path.length) return;
  const nxt = T.path[0], c = state.geom.cellCenter(nxt.x, nxt.y);
  const dx = c.x - p.x, dy = c.y - p.y;
  const step = MOVE_SPEED * dt;
  if (dx * dx + dy * dy > step * step) {
    if (!p.moveAngle) {
      p.moveAngle = Math.atan2(dy, dx);
      // The canvas y axis points DOWN while Cocos (and therefore
      // `Charactor.direction`) uses y UP — feeding the screen-space angle
      // straight in mirrors the facing vertically (the character turns its back
      // on the camera whenever it walks toward the viewer).
      p.dir = playerDirectionFromAngle(-p.moveAngle);
    }
    p.x += Math.cos(p.moveAngle) * step;
    p.y += Math.sin(p.moveAngle) * step;
  } else {
    // arrived: the original snaps only on the *final* node and otherwise just
    // advances the index, which lets the walk cut the corner slightly
    p.moveAngle = 0;
    if (T.path.length === 1) {
      p.x = c.x; p.y = c.y;
      T.path.length = 0;
      p.moving = false;
      p.state = 'stand';
    } else {
      T.path.shift();
    }
  }
}

/** `Charactor.walkByRoad(path)` — `move()` + `walk()` (index 0 is the start node). */
function startWalk(T: TestState, path: Point[]): void {
  T.path = path.slice(1);
  T.player.moveAngle = 0;
  T.player.moving = true;
  T.player.state = 'run';
}

/** `Charactor.stop()` — moving = false, state = stand. */
function stopPlayer(T: TestState): void {
  T.path.length = 0;
  T.player.moving = false;
  T.player.moveAngle = 0;
  T.player.state = 'stand';
}

/**
 * 查看寻路过程(F4) — replays the recorded A* snapshots one every 100 ms.
 * When the search finished with a path, the player walks it while the black
 * polyline is drawn segment by segment (original `testSeekRoadCallback`).
 */
function tickSeek(T: TestState, dt: number): void {
  const S: SeekState | null = T.seek;
  if (!S) return;
  if (S.step < S.frames.length) {
    S.seekT += dt;
    while (S.seekT >= SEEK_STEP_S && S.step < S.frames.length) {
      S.seekT -= SEEK_STEP_S;
      S.step++;
    }
    return;
  }
  if (!S.path) return;
  if (!S.started) {
    S.started = true;
    startWalk(T, S.path);                       // player.walkByRoad(r)
    // schedule(fn, .1, len-2, 0) — delay 0, so the first segment is immediate
    S.lineStep = Math.min(1, Math.max(0, S.path.length - 1));
  }
  S.lineT += dt;
  while (S.lineT >= PATH_LINE_INTERVAL) {
    S.lineT -= PATH_LINE_INTERVAL;
    if (S.lineStep < S.path.length - 1) S.lineStep++;
  }
}

/** Charactor.setPlayerStateByNode: value 2 -> alpha .4, value 3 -> alpha 0. */
function updatePlayerAlpha(p: { x: number; y: number; alpha: number }): void {
  const n = state.geom.getNodeByPixel(p.x, p.y);
  const v = state.road[n.dy]?.[n.dx];
  if (v === 2) p.alpha = 0.4;
  else if (v === 3) p.alpha = 0;
  else p.alpha = 1;
}

/**
 * Resolve a click into the best reachable path.
 * Original `AstarHoneycombRoadSeeker.seekPath2` limits its step budget when the
 * target cell is not passable and then falls back to the closest node found —
 * i.e. the character walks as close as possible instead of refusing to move.
 */
function pathTo(wx: number, wy: number): Point[] | null {
  if (!state.params) return null;
  const from = state.geom.getNodeByPixel(state.test!.player.x, state.test!.player.y);
  const t = state.geom.getNodeByPixel(wx, wy);
  const cols = state.road[0]?.length || 1;
  const key = (dx: number, dy: number) => dy * cols + dx;
  void key;

  const tryPath = (dx: number, dy: number) =>
    findPath(state.road, from.dx, from.dy, dx, dy, state.params!.mapType, v => state.pass(v));

  if (state.cellPass(t.dx, t.dy)) {
    const p = tryPath(t.dx, t.dy);
    if (p && p.length > 1) return p;
  }
  // candidate passable cells sorted by squared distance to the clicked cell
  const cands: Array<{ dx: number; dy: number; d: number }> = [];
  for (let dy = 0; dy < state.road.length; dy++) {
    for (let dx = 0; dx < cols; dx++) {
      if (!state.cellPass(dx, dy)) continue;
      cands.push({ dx, dy, d: (dx - t.dx) ** 2 + (dy - t.dy) ** 2 });
    }
  }
  cands.sort((a, b) => a.d - b.d);
  for (const c of cands.slice(0, 60)) {
    if (c.dx === from.dx && c.dy === from.dy) continue;
    const p = tryPath(c.dx, c.dy);
    if (p && p.length > 1) return p;
  }
  return null;
}

export function bindTest(): void {
  $('testCloseBtn').addEventListener('click', closeTest);
  const cv = $('testCanvas') as HTMLCanvasElement;

  const toMap = (e: MouseEvent): Point => {
    const r = cv.getBoundingClientRect(), s = state.screenScale || 1;
    let x = (e.clientX - r.left) / s, y = (e.clientY - r.top) / s;
    const T = state.test;
    // `cv.width` is the device-pixel bitmap now, so use the logical size.
    if (T && T.follow) {
      const L = logicalSize(cv);
      x += T.player.x - L.w / 2; y += T.player.y - L.h / 2;
    }
    return { x, y };
  };

  cv.addEventListener('mousedown', e => {
    const T = state.test;
    if (!T || e.button !== 0) return;
    const m = toMap(e);
    // SceneMap.onPlayerMouseDown: pressing the player starts a free drag
    if (Math.hypot(m.x - T.player.x, m.y - T.player.y) < 44) {
      T.dragPlayer = true;
      T.path.length = 0;
      return;
    }
    if (T.showPath) {
      // SceneMap.onMapMouseDown -> testSeekRoad: run the step-by-step A* debug
      // instead of walking. The original bails out silently when the clicked
      // node is not passable (`testSeekPathStep` checks `isPassNode(target)`).
      const from = state.geom.getNodeByPixel(T.player.x, T.player.y);
      const t = state.geom.getNodeByPixel(m.x, m.y);
      if (!state.cellPass(t.dx, t.dy)) return;
      // SceneMap.testSeekRoad starts with `this.player.stop()`
      stopPlayer(T);
      const dbg: PathDebug = { open: [], closed: [], frames: [] };
      const path = findPath(state.road, from.dx, from.dy, t.dx, t.dy, state.params!.mapType,
        v => state.pass(v), dbg, SEEK_MAX_STEP);
      T.seek = {
        frames: dbg.frames || [], closed: dbg.closed,
        step: 0, seekT: 0, path, lineStep: 0, lineT: 0, started: false,
      };
      renderTest();
      return;
    }
    // movePlayer(x, y): pathfind then walk (best-effort toward blocked targets)
    const path = pathTo(m.x, m.y);
    if (path) { startWalk(T, path); T.target = { x: m.x, y: m.y }; toast('寻路成功，共 ' + path.length + ' 步'); }
    else toast('无法到达目标（路点不可通行）');
  });

  window.addEventListener('mousemove', e => {
    const T = state.test;
    if (!T || !T.dragPlayer) return;
    const m = toMap(e);
    T.player.x = Math.max(0, Math.min(state.params!.mapWidth, m.x));
    T.player.y = Math.max(0, Math.min(state.params!.mapHeight, m.y));
    updatePlayerAlpha(T.player);
    renderTest();
  });
  window.addEventListener('mouseup', () => {
    if (state.test) state.test.dragPlayer = false;
  });
}
