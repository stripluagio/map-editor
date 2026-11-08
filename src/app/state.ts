import { MapType } from '../core/types';
import type { MapParams, MapItem, Settings, ToolName, ViewName, LayerKey, Point, RoadNode } from '../core/types';
import type { PlayerAnimState } from '../core/player';
import { MapRoadUtils, UndoRedo, defaultSettings } from '../core';

export interface Player {
  x: number; y: number;
  dir: number; state: PlayerAnimState; frame: number; moving: boolean;
  /** MovieClip timer — one column every 0.1 s. */
  animT: number;
  alpha: number;
  /**
   * `Charactor._moveAngle` — the angle of the *current* path leg. The original
   * acquires it once when the leg starts (while it is still 0) and then walks
   * along that fixed angle; it is reset to 0 on arrival.
   */
  moveAngle: number;
}
/** 「查看寻路过程(F4)」 overlay — mirrors SceneMap.testSeekRoad + testSeekPathGraphic. */
export interface SeekState {
  /** One snapshot of the live open/closed sets per A* expansion. */
  frames: Array<{ closed: number; open: Point[] }>;
  /** Every expanded node, in order (frames index into this). */
  closed: Point[];
  /** How many snapshots have been replayed (the original redraws one per tick). */
  step: number;
  /** Time accumulated towards the next 100 ms expansion tick. */
  seekT: number;
  /** Found path, or null when the target is unreachable. */
  path: Point[] | null;
  /** Segments of the black path line already drawn (0.1 s each). */
  lineStep: number;
  lineT: number;
  /** Player has been sent along `path`. */
  started: boolean;
}
export interface TestState {
  player: Player;
  path: Point[];
  follow: boolean;          // SceneMap.isFollowPlayer (default false)
  showPath: boolean;        // TestView.isLookSeekRoad ("查看寻路过程")
  tick: number;
  dragPlayer: boolean;      // dragging the player with the mouse
  seek: SeekState | null;   // F4 overlay state
  target: Point;
  camX: number;             // smoothed camera offsets (follow mode)
  camY: number;
  camReady: boolean;
  lastT: number;            // last render timestamp for frame-rate independent easing
}
export interface ViewState { scale: number; offsetX: number; offsetY: number; zoom: number }

/** Central application state — the single source of truth. */
export class AppState {
  // document
  params: MapParams | null = null;
  road: number[][] = [];
  /**
   * Cells the user has explicitly painted. The original RoadPointLayer stores
   * edited cells in `_roadNodeDic`; every cell whose value equals the default
   * road value is NOT stored and therefore not drawn — even if you paint that
   * same value back with W. This set mirrors that dictionary.
   */
  painted = new Set<number>();   // key = dy * cols + dx
  /** Bumped whenever road data or its colours change (invalidates the cache). */
  roadVersion = 0;
  entities: MapItem[] = [];
  selectedEntity: MapItem | null = null;
  clipboard: MapItem | null = null;
  geom = new MapRoadUtils();
  undo = new UndoRedo(200);

  // settings
  setting: Settings = defaultSettings();

  // view
  view: ViewState = { scale: 1, offsetX: 0, offsetY: 0, zoom: 1 };
  screenScale = 1;
  layers: Record<LayerKey, boolean> = { map: true, road: true, entity: true, grid: true };
  mode: 'edit' | 'test' = 'edit';
  activeView: ViewName | null = null;
  openMenu: string | null = null;

  // tools
  tool: ToolName = 'road';
  roadValue = 0;
  brushSize = 0;
  entityType: ToolName | null = null;
  entitySkin = 0;
  editRoadModel = false;
  showAnchor = false;
  /**
   * 原版 `GridLayer._isShowAuxiliaryLine` 默认是 `true`；本项目**故意默认关闭**，
   * 因为那两族矩形辅助线是原版给「画路点时对格子用的参考线」，默认铺满屏很吵。
   * 菜单「编辑 → 显示辅助线（J）」可随时打开，渲染逻辑与原版逐参数一致。
   */
  showAuxLine = false;
  roadStyle = 0;

  // interaction
  drawing = false;
  panning = false;
  draggingEntity: MapItem | null = null;
  dragOffset: Point = { x: 0, y: 0 };
  dragStart: Point = { x: 0, y: 0 };
  spaceDown = false;
  lastMouse: Point = { x: 0, y: 0 };
  cursorNode: RoadNode | null = null;
  pathPreview: Point[] | null = null;
  /**
   * Entity "brush" (EditObject.setBrush): after picking a selector the new
   * entity follows the cursor as a ghost and is dropped on the next click.
   */
  brushEntity: MapItem | null = null;

  // assets
  bgImage: HTMLImageElement | null = null;
  charSheet: HTMLImageElement | null = null;
  /** sprites[type][skinIndex] = animation frames (>=1). */
  sprites: Partial<Record<string, HTMLImageElement[][]>> = {};

  // wizard temp state
  nmMapType: MapType = MapType.angle45;
  nmBgImage: HTMLImageElement | null = null;
  nmBgName = '';
  nmBgSrc: string | null = null;
  omData: string | null = null;
  omBgImage: HTMLImageElement | null = null;
  omBgSrc: string | null = null;

  // minimap
  /** Last minimap blit: image origin/size scale + the white viewport rect. */
  minimapRect: { dx: number; dy: number; s: number; vx?: number; vy?: number; vw?: number; vh?: number } | null = null;

  // play mode
  test: TestState | null = null;
  testLoop: number | null = null;

  /** Is the given road value passable? */
  pass(v: number): boolean {
    const s = this.setting.roadSetDatas.find(q => q.value === v);
    return s ? s.isPass : true;
  }
  cellPass(dx: number, dy: number): boolean {
    return dy >= 0 && dy < this.road.length && dx >= 0 && dx < this.road[0].length
      && this.pass(this.road[dy][dx]);
  }
}

/** Singleton state instance. */
export const state = new AppState();

/** Expose to window for the e2e tests (WMApp / WMGetMapData / WMAction). */
export function exposeGlobals(extra: Record<string, unknown>): void {
  const w = window as unknown as Record<string, unknown>;
  w.WMApp = state;
  Object.assign(w, extra);
}
