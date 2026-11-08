import type { RoadSetData, Settings, ToolName, EntityType } from './types';
import { MapType } from './types';

export const MAP_TYPE_NAMES = ['45度等视角地图', '90度顶视角地图', '纵六边形地图', '横六边形地图'] as const;
export const MAX_CEIL_COUNT = 2_500_000;

/** Exact original defaults from SettingData.js. */
export function defaultRoadSets(): RoadSetData[] {
  return [
    { id: 0, value: 0, color: '#00ff0065', isShow: true,  isPass: true,  desc: '行走路点(Q)' },
    { id: 1, value: 1, color: '#ff000065', isShow: false, isPass: false, desc: '障碍路点(W)' },
    { id: 2, value: 2, color: '#0000ff65', isShow: true,  isPass: true,  desc: '遮挡路点(E)' },
    { id: 3, value: 3, color: '#ffff0065', isShow: true,  isPass: true,  desc: '隐藏路点(R)' },
  ];
}
export function defaultSettings(): Settings {
  return { defaultRoadValue: 1, roadSetDatas: defaultRoadSets() };
}

/** Left-panel tool definitions (exact original labels). */
export const ROAD_SWATCHES: ReadonlyArray<{
  value: number; label: string; sub?: string; color: string; del?: boolean;
}> = [
  { value: -1, label: '删除路点', sub: '(D或右键)', color: '#ffffff', del: true },
  { value: 0,  label: '行走路点(Q)', color: '#00ff00' },
  { value: 1,  label: '障碍路点(W)', color: '#ff0000' },
  { value: 2,  label: '遮挡路点(E)', color: '#0000ff' },
  { value: 3,  label: '隐藏路点(R)', color: '#ffff00' },
];
export const BRUSH_SIZES = [0, 1, 2, 3, 4, 5] as const;

/**
 * Selector skins — verified against the original runtime (EditNPC / EditMonster /
 * EditTransfer / EditSpawnPoint `init()` loops):
 *   NPC 4 (商人/任务/剧情/特殊, label "<name>.NPC"),
 *   Monster 4 (小怪/精英怪/Boss/特殊怪, label "<name>"),
 *   Transfer 3 (类型1/类型2/不可视, label "<name>.传送们" — original typo),
 *   SpawnPoint 1.
 * Icons are the original `*_Icon` sprite frames resolved to their PNG files.
 */
export interface SkinDef {
  /** Label shown under the icon in the left panel (exact original text). */
  label: string;
  /** Icon image path (first animation frame for animated entities). */
  icon: string;
  /** Default objName written to MapData for a newly placed entity. */
  objName: string;
  /**
   * Extra animation frames (SpriteFrame sequence), matching the original
   * `AnimationController` component. Empty/undefined = static sprite.
   */
  frames?: string[];
  /** Seconds per frame (original `AnimationController.frameTime`). */
  frameTime?: number;
  /** Drawn size in map pixels (original Skin node size). */
  w?: number;
  h?: number;
}

/**
 * Selector skins — verified against the original runtime (EditNPC / EditMonster /
 * EditTransfer / EditSpawnPoint `init()` loops):
 *   NPC 4 (商人/任务/剧情/特殊, label "<name>.NPC"),
 *   Monster 4 (小怪/精英怪/Boss/特殊怪, label "<name>"),
 *   Transfer 3 (类型1/类型2/不可视, label "<name>.传送们" — original typo),
 *   SpawnPoint 1.
 *
 * Animation: the original Transfer_1 / Transfer_2 prefabs carry an
 * `AnimationController` (frameTime 0.1, loop) with 8 and 11 SpriteFrames
 * respectively — so portals ARE animated. Transfer_3 (不可视) is static.
 * NPC/Monster use `MovieClip` with row=5,col=1, i.e. a static 5-direction
 * sheet showing one frame (verified: rect & frame index never change).
 */
export const ENTITY_SKINS: Record<EntityType, readonly SkinDef[]> = {
  npc: [
    { label: '商人.NPC', icon: 'assets/skins/npc_1_shangren.png', objName: '商人.NPC', w: 56, h: 99 },
    { label: '任务.NPC', icon: 'assets/skins/npc_2_renwu.png', objName: '任务.NPC', w: 76, h: 99 },
    { label: '剧情.NPC', icon: 'assets/skins/npc_3_juqing.png', objName: '剧情.NPC', w: 64, h: 99 },
    { label: '特殊.NPC', icon: 'assets/skins/npc_4_teshu.png', objName: '特殊.NPC', w: 80, h: 99 },
  ],
  monster: [
    { label: '小怪', icon: 'assets/skins/monster_1_xiaoguai.png', objName: '小怪', w: 60, h: 60 },
    { label: '精英怪', icon: 'assets/skins/monster_2_jingying.png', objName: '精英怪', w: 65, h: 77 },
    { label: 'Boss', icon: 'assets/skins/monster_3_boss.png', objName: 'Boss', w: 105, h: 113 },
    { label: '特殊怪', icon: 'assets/skins/monster_4_teshu.png', objName: '特殊怪', w: 54, h: 58 },
  ],
  transfer: [
    {
      label: '类型1.传送们',
      icon: 'assets/skins/transfer1_f1.png',
      objName: '类型1.传送们',
      w: 200, h: 200, frameTime: 0.1,
      frames: [
        'assets/skins/transfer1_f1.png', 'assets/skins/transfer1_f2.png',
        'assets/skins/transfer1_f3.png', 'assets/skins/transfer1_f4.png',
        'assets/skins/transfer1_f5.png', 'assets/skins/transfer1_f6.png',
        'assets/skins/transfer1_f7.png', 'assets/skins/transfer1_f8.png',
      ],
    },
    {
      label: '类型2.传送们',
      icon: 'assets/skins/transfer2_f1.png',
      objName: '类型2.传送们',
      w: 187, h: 165, frameTime: 0.1,
      frames: [
        'assets/skins/transfer2_f1.png', 'assets/skins/transfer2_f2.png',
        'assets/skins/transfer2_f3.png', 'assets/skins/transfer2_f4.png',
        'assets/skins/transfer2_f5.png', 'assets/skins/transfer2_f6.png',
        'assets/skins/transfer2_f7.png', 'assets/skins/transfer2_f8.png',
        'assets/skins/transfer2_f9.png', 'assets/skins/transfer2_f10.png',
        'assets/skins/transfer2_f11.png',
      ],
    },
    {
      label: '不可视.传送们',
      icon: 'assets/skins/transfer_3_invisible.png',
      objName: '不可视.传送们',
      w: 150, h: 150,
    },
  ],
  spawnPoint: [
    { label: '出生点', icon: 'assets/skins/spawn_1.png', objName: '出生点', w: 134, h: 207 },
  ],
};

export const TOOL_TITLES: Record<ToolName, string> = {
  road: '编辑路点', brush: '设置笔刷', npc: '放置NPC',
  monster: '放置怪物', transfer: '放置传送门', spawnPoint: '放置出生点',
};
export const TOOL_TO_ACTION: Record<ToolName, string> = {
  road: 'openRoadWin', brush: 'openBrushWin', npc: 'openNpcWin',
  monster: 'openMonsterWin', transfer: 'openTransferWin', spawnPoint: 'openSpawnWin',
};

/**
 * ToolBar 1 (main edit toolbar) — the original scene contains 15 buttons,
 * of which 8 are active at startup; the 7 "DrawPoint" / download buttons are
 * hidden and swapped in by `openWin` when a road tool is active.
 */
export const TOOLBAR1: ReadonlyArray<{ label: string; w: number; act: string; hidden?: boolean }> = [
  { label: '新建', w: 100, act: 'createNewFile' },
  { label: '打开', w: 100, act: 'openFile' },
  { label: '保存', w: 100, act: 'saveFile' },
  { label: '设置', w: 100, act: 'showProjectSetting' },
  { label: '运行（ctr + enter）', w: 180, act: 'testProject' },
  { label: '添加可走路点(Q)', w: 180, act: 'addEnableNode', hidden: true },
  { label: '添加不可走路点(W)', w: 180, act: 'addDisableNode', hidden: true },
  { label: '添加透明行走路点(E)', w: 200, act: 'addTransParentNode', hidden: true },
  { label: '添加传送路点(R)', w: 180, act: 'addTransferNode', hidden: true },
  { label: '删除路点(D或右键)', w: 180, act: 'deleteNode', hidden: true },
  { label: '停止放置路点（T）', w: 180, act: 'notDrawNode', hidden: true },
  { label: '显示小地图(F2)', w: 180, act: 'showMiniMap' },
  { label: '下载前端框架', w: 150, act: 'downloadSource', hidden: true },
  { label: '下载大地图切图工具', w: 240, act: 'downloadImageClipTool', hidden: true },
  { label: '教程', w: 120, act: 'showTeach' },
  { label: '帮助', w: 120, act: 'showCopyright' },
];

/** ToolBar 2 (view / entity toolbar). */
export const TOOLBAR2 = [
  { label: '隐藏地图（U）', w: 180, act: 'showMapLayer', key: 'U' },
  { label: '隐藏路点(I)',  w: 180, act: 'showRoadLayer', key: 'I' },
  { label: '隐藏物体(O)',  w: 180, act: 'showEntityLayer', key: 'O' },
  { label: '隐藏网格(P)',  w: 180, act: 'showGridLayer', key: 'P' },
  { label: '设置笔刷', w: 110, act: 'openBrushWin' },
  { label: '编辑路点', w: 110, act: 'openRoadWin' },
  { label: '放置npc', w: 110, act: 'openNpcWin' },
  { label: '放置怪物', w: 110, act: 'openMonsterWin' },
  { label: '放置传送门', w: 130, act: 'openTransferWin' },
  { label: '放置出生点', w: 130, act: 'openSpawnWin' },
] as const;

/**
 * TestView toolbar —— 原版 `TestView/ToolBar` 有 7 个按钮，但 `Button5`
 * （`显示小地图(F2)`）在场景里就是 `active = false`，实测截图也只显示 6 个。
 * 所以这里只放 6 个，和原版实际可见的一致。
 */
export const TEST_TOOLBAR = [
  { label: '隐藏地图(U)', w: 180, act: 't_showMapLayer' },
  { label: '隐藏路点(I)', w: 180, act: 't_showRoadLayer' },
  { label: '隐藏物体(O)', w: 180, act: 't_showEntityLayer' },
  { label: '隐藏网格(P)', w: 180, act: 't_showGridLayer' },
  { label: '屏幕跟随玩家(F3)', w: 200, act: 't_followPlayer' },
  { label: '查看寻路过程(F4)', w: 180, act: 't_showPath' },
] as const;

/** Runtime menu tree from MainMenuBarHandler.js. 'sep' = separator. */
export const MENUS: Record<string, ReadonlyArray<readonly [string, string]>> = {
  file: [
    ['新建', 'createNewFile'], ['打开（CTRL + O）', 'openFile'], ['保存（CTRL + S）', 'saveFile'],
    ['sep', ''], ['设置', 'showProjectSetting'],
  ],
  edit: [
    ['添加可走路点(Q)', 'addEnableNode'], ['添加不可走路点(W)', 'addDisableNode'],
    ['添加透明行走路点(E)', 'addTransParentNode'], ['添加传送路点(R)', 'addTransferNode'],
    ['删除路点(D)', 'deleteNode'], ['停止放置路点（T）', 'notDrawNode'],
    ['停止编辑事件（S）', 'clearAllEditorAreaExecute'], ['sep', ''],
    ['转换路点风格（CTRL + B）', 'switchRoadStyle'], ['隐藏不可走路点（F1）', 'hideBlockRoad'],
    ['sep', ''],
    ['显示隐藏地图(U)', 'showMapLayer'], ['显示隐藏物体(O)', 'showEntityLayer'],
    ['显示隐藏路点(I)', 'showRoadLayer'], ['显示隐藏网格(P)', 'showGridLayer'],
    ['显示隐藏辅助线（J）', 'toggleAuxLine'],
    ['sep', ''], ['显示地图物体锚点(k)', 'showAnchor'],
    ['sep', ''], ['剪切(CTRL + X)', 'cut'], ['复制(CTRL + C)', 'copy'], ['粘贴(CTRL + V)', 'paste'],
  ],
  command: [
    ['运行测试（ctrl + enter）', 'testProject'],
    ['地图切片导出（ctrl + W）', 'exportTiles'],
    ['地图缩小导出（ctrl + T）', 'exportSmall'],
  ],
  window: [
    ['小地图预览面板(F2)', 'showMiniMap'],
    ['路点编辑模式(N)', 'setEditRoadModel'],
    ['普通编辑模式(M)', 'setNormalRoadModel'],
  ],
  help: [['联系我们', 'showCopyright']],
};

/** Keyboard -> road value (Q/W/E/R/D/T). */
export const ROAD_KEYS: Record<string, number> = { q: 0, w: 1, e: 2, r: 3, d: -1, t: -2 };

export const VIEW_IDS: Record<string, string> = {
  newMap: 'newMapView', openMap: 'openMapView', setting: 'settingView',
  miniMap: 'miniMapView', teach: 'teachView', copyright: 'copyrightView', sale: 'saleView',
};

export const TYPE_LABEL: Record<string, string> = {
  npc: 'NPC', monster: '怪物', transfer: '传送门', spawnPoint: '出生点', item: '物体',
};

/** Drawn size + selection-ring geometry for an entity skin. */
export function entitySize(type: string, skin: number): { w: number; h: number } {
  const defs = ENTITY_SKINS[type as EntityType];
  if (!defs || !defs.length) return { w: 100, h: 100 };
  const d = defs[skin % defs.length];
  return { w: d.w || 100, h: d.h || 100 };
}

/**
 * Selection ring used both for drawing and for hit-testing. It hugs the drawn
 * sprite (bottom-centred at the entity origin) so "click inside the white circle"
 * behaves exactly as the user expects for every entity size.
 */
export function entityRing(type: string, skin: number): { cx: number; cy: number; r: number } {
  const { w, h } = entitySize(type, skin);
  // 0.56 * max(w,h) guarantees the ring also covers the sprite's bottom edge
  // (the entity origin), so clicking the "feet" always selects the entity.
  const r = Math.max(44, Math.max(w, h) * 0.56);
  return { cx: 0, cy: -h / 2, r };
}

/** Launch-scene defaults (mapEditor.fire component). */
export const LAUNCH_PARAMS = {
  name: 'mapData',
  bgName: 'map_bg',
  mapType: MapType.honeycomb2,
  mapWidth: 1920,
  mapHeight: 1440,
  ceilWidth: 40,
  ceilHeight: 34.64,
} as const;
