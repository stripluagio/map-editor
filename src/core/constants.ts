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
/**
 * Brush sizes — read out of the live v2.0.2 runtime, not guessed:
 * `EditBrush.itemList.map(i => i.size)` === `[0,1,2,3,4]` (5 items).
 * The clone used to expose 6 (`0..5`), one more than the original selector has.
 */
export const BRUSH_SIZES = [0, 1, 2, 3, 4] as const;
/**
 * Holding Shift switches to the "big brush" (v2.0.2 changelog item 3).
 * `EditBrush.onShiftKeyDown()` does `this.itemList[2].size`, i.e. size 2 —
 * and `onShiftKeyUp()` restores `lastItem.size`.
 */
export const SHIFT_BRUSH_SIZE = 2;

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
/** Inline-SVG icon as a data URI (no extra files, works as `<img src>`). */
function svgIcon(body: string): string {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">'
            + body + '</svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
const BOX    = '<rect x="8" y="18" width="48" height="38" rx="4" fill="#c8873c" stroke="#5c3a12" stroke-width="3"/>'
             + '<path d="M8 32h48" stroke="#5c3a12" stroke-width="3"/><rect x="27" y="26" width="10" height="12" fill="#f0c060" stroke="#5c3a12" stroke-width="2"/>';
const BARREL = '<ellipse cx="32" cy="20" rx="18" ry="7" fill="#b9762f" stroke="#4d2d0a" stroke-width="3"/>'
             + '<path d="M14 20v26c0 4 8 7 18 7s18-3 18-7V20" fill="#c8873c" stroke="#4d2d0a" stroke-width="3"/>'
             + '<path d="M14 30c6 3 30 3 36 0M14 40c6 3 30 3 36 0" stroke="#7a4a15" stroke-width="2" fill="none"/>';
const STONE  = '<path d="M22 58V20c0-6 4-10 10-10s10 4 10 10v38z" fill="#9aa0a6" stroke="#3d4247" stroke-width="3"/>'
             + '<path d="M26 30h12M26 38h12M26 46h12" stroke="#3d4247" stroke-width="2"/>';
const COIN   = '<circle cx="32" cy="32" r="22" fill="#f2c53d" stroke="#8a6a10" stroke-width="3"/>'
             + '<circle cx="32" cy="32" r="13" fill="none" stroke="#8a6a10" stroke-width="2"/>';
const POTION = '<path d="M25 12h14v8l6 10v20a8 8 0 0 1-8 8H27a8 8 0 0 1-8-8V30l6-10z" fill="#7fd0f0" stroke="#14425c" stroke-width="3"/>'
             + '<path d="M22 40h20v10a6 6 0 0 1-6 6h-8a6 6 0 0 1-6-6z" fill="#e2564a"/>';
const KEY    = '<circle cx="18" cy="32" r="11" fill="none" stroke="#d8a520" stroke-width="6"/>'
             + '<path d="M28 32h28M46 32v10M54 32v8" stroke="#d8a520" stroke-width="6" fill="none"/>';
const FLAG   = '<path d="M18 58V8" stroke="#4a4a4a" stroke-width="5"/>'
             + '<path d="M18 10h30l-6 10 6 10H18z" fill="#e2564a" stroke="#7a1f1a" stroke-width="3"/>';
const ZONE   = '<rect x="6" y="14" width="52" height="36" rx="4" fill="none" stroke="#4aa3e2" stroke-width="4" stroke-dasharray="8 6"/>'
             + '<path d="M6 14 58 50M58 14 6 50" stroke="#4aa3e2" stroke-width="2" opacity=".55"/>';

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
  // ---- v2.0.2 新增的三种放置类型 -------------------------------------------
  // 原版把这三类的可选资源放在用户导入的 `MapEditorAssets` 里（`EditAssets` +
  // `ImportCustomAssetsView`），没导入时面板是空的（"没有该类型的编辑数据"）。
  // 我们还没有资源导入流程，所以给每个类型一个内置占位图，保证工具立刻可用；
  // 图标用内联 SVG，不额外占仓库体积。
  obj: [
    { label: '宝箱物件', icon: svgIcon(BOX), objName: '宝箱物件', w: 72, h: 72 },
    { label: '木桶物件', icon: svgIcon(BARREL), objName: '木桶物件', w: 64, h: 76 },
    { label: '石碑物件', icon: svgIcon(STONE), objName: '石碑物件', w: 64, h: 84 },
  ],
  prop: [
    { label: '金币', icon: svgIcon(COIN), objName: '金币', w: 44, h: 44 },
    { label: '药水', icon: svgIcon(POTION), objName: '药水', w: 44, h: 60 },
    { label: '钥匙', icon: svgIcon(KEY), objName: '钥匙', w: 56, h: 40 },
  ],
  event: [
    { label: '剧情事件', icon: svgIcon(FLAG), objName: '剧情事件', w: 56, h: 80 },
    { label: '触发区域', icon: svgIcon(ZONE), objName: '触发区域', w: 96, h: 64 },
  ],
};

export const TOOL_TITLES: Record<ToolName, string> = {
  road: '编辑路点', brush: '设置笔刷', npc: '放置NPC',
  monster: '放置怪物', transfer: '放置传送门', spawnPoint: '放置出生点',
  obj: '放置物体', prop: '放置道具', event: '放置事件',
};
export const TOOL_TO_ACTION: Record<ToolName, string> = {
  road: 'openRoadWin', brush: 'openBrushWin', npc: 'openNpcWin',
  monster: 'openMonsterWin', transfer: 'openTransferWin', spawnPoint: 'openSpawnWin',
  obj: 'openObjWin', prop: 'openPropWin', event: 'openEventWin',
};

/**
 * ToolBar 1 — the visible buttons, read off the live v2.0.2 build:
 *   新建 | 打开 | 保存 | 另存为 | 设置 | 导入编辑资源 | 运行（ctr + enter）
 *   | 显示小地图(F2) | Excel导出数据工具 | 教程 | 地图介绍 | 购买地图编辑器 | 更多游戏项目
 * The 6 "添加*路点" buttons are hidden and swapped in while a road tool is armed.
 */
export const TOOLBAR1: ReadonlyArray<{ label: string; w: number; act: string; hidden?: boolean }> = [
  { label: '新建', w: 100, act: 'createNewFile' },
  { label: '打开', w: 100, act: 'openFile' },
  { label: '保存', w: 100, act: 'saveFile' },
  { label: '另存为', w: 110, act: 'saveAsFile' },
  { label: '设置', w: 90, act: 'showProjectSetting' },
  { label: '导入编辑资源', w: 150, act: 'importEditAssets' },
  { label: '运行（ctr + enter）', w: 180, act: 'testProject' },
  { label: '添加可走路点(Q)', w: 180, act: 'addEnableNode', hidden: true },
  { label: '添加不可走路点(W)', w: 180, act: 'addDisableNode', hidden: true },
  { label: '添加透明行走路点(E)', w: 200, act: 'addTransParentNode', hidden: true },
  { label: '添加传送路点(R)', w: 180, act: 'addTransferNode', hidden: true },
  { label: '删除路点(D或右键)', w: 180, act: 'deleteNode', hidden: true },
  { label: '停止放置路点（T）', w: 180, act: 'notDrawNode', hidden: true },
  { label: '显示小地图(F2)', w: 170, act: 'showMiniMap' },
  { label: 'Excel导出数据工具', w: 200, act: 'openExcelExportTool' },
  { label: '下载前端框架', w: 150, act: 'downloadSource', hidden: true },
  { label: '下载大地图切图工具', w: 240, act: 'downloadImageClipTool', hidden: true },
  { label: '教程', w: 90, act: 'showTeach' },
  { label: '地图介绍', w: 120, act: 'showIntroduce' },
  { label: '购买地图编辑器', w: 160, act: 'openSaleMapEditor' },
  { label: '更多游戏项目', w: 150, act: 'gotoMoreGame' },
];

/**
 * ToolBar 2 — layer / view switches (live v2.0.2):
 *   隐藏地图（U） | 隐藏路点(I) | 隐藏物体(O) | 隐藏网格(P)
 *   | 隐藏物体锚点(Y) | 隐藏物体标题 | 路点编辑模式
 */
export const TOOLBAR2 = [
  { label: '隐藏地图（U）', w: 180, act: 'showMapLayer', key: 'U' },
  { label: '隐藏路点(I)',  w: 180, act: 'showRoadLayer', key: 'I' },
  { label: '隐藏物体(O)',  w: 180, act: 'showEntityLayer', key: 'O' },
  { label: '隐藏网格(P)',  w: 180, act: 'showGridLayer', key: 'P' },
  { label: '隐藏物体锚点(Y)', w: 200, act: 'showAnchor' },
  { label: '隐藏物体标题', w: 180, act: 'showEntityTitle' },
  { label: '路点编辑模式', w: 180, act: 'setEditRoadModel' },
] as const;

/**
 * ToolBar 3 — the left-panel tabs (live v2.0.2 has 9):
 *   设置笔刷 | 编辑路点 | 放置npc | 放置怪物 | 放置传送门 | 放置出生点
 *   | 放置物体 | 放置道具 | 放置事件
 */
export const TOOLBAR3 = [
  { label: '设置笔刷', w: 110, act: 'openBrushWin' },
  { label: '编辑路点', w: 110, act: 'openRoadWin' },
  { label: '放置npc', w: 110, act: 'openNpcWin' },
  { label: '放置怪物', w: 110, act: 'openMonsterWin' },
  { label: '放置传送门', w: 130, act: 'openTransferWin' },
  { label: '放置出生点', w: 130, act: 'openSpawnWin' },
  { label: '放置物体', w: 110, act: 'openObjWin' },
  { label: '放置道具', w: 110, act: 'openPropWin' },
  { label: '放置事件', w: 110, act: 'openEventWin' },
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

/**
 * Runtime menu tree — live `MainMenuBarHandler.getMenuData()` of v2.0.2.
 *
 * Differences from the older build this project started from:
 *   - 文件 gained 另存为（Shift + S）;
 *   - 编辑's anchor item is 显示隐藏锚点(Y) (it used to read 显示地图物体锚点(k)),
 *     and 剪切/复制/粘贴/转换路点风格 are no longer menu entries (keyboard only);
 *   - 下载 and 工具 are brand-new menus;
 *   - 帮助 gained 关于在线地图编辑器.
 *
 * We keep three deliberate additions of our own: 转换路点风格 / 隐藏不可走路点 /
 * 显示隐藏辅助线 (the original only had them in the dead `Menubar.data` template),
 * and the two export commands in 命令 (the live original dropped them entirely,
 * which left Ctrl+W / Ctrl+T labels pointing at nothing).
 *
 * The 下载 submenu is flattened to `父项_子项` labels: our menu panel is a single
 * level, and every entry stays reachable.
 */
export const MENUS: Record<string, ReadonlyArray<readonly [string, string]>> = {
  file: [
    ['新建', 'createNewFile'], ['打开（CTRL + O）', 'openFile'],
    ['保存（CTRL + S）', 'saveFile'], ['另存为（Shift + S）', 'saveAsFile'],
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
    ['sep', ''], ['显示隐藏锚点(Y)', 'showAnchor'],
    ['sep', ''], ['剪切(CTRL + X)', 'cut'], ['复制(CTRL + C)', 'copy'], ['粘贴(CTRL + V)', 'paste'],
  ],
  command: [
    ['运行测试（ctrl + enter）', 'testProject'],
    ['地图切片导出（ctrl + W）', 'exportTiles'],
    ['地图缩小导出（ctrl + T）', 'exportSmall'],
  ],
  download: [
    ['基础前端框架Creator_v2.4.15（免费）', 'dl_creator_base_2'],
    ['基础前端框架Creator_v3.8.6（免费）', 'dl_creator_base_3'],
    ['高级前端框架Creator_v2.4.15（付费）', 'dl_creator_pro_2'],
    ['高级前端框架Creator_v3.8.6（付费）', 'dl_creator_pro_3'],
    ['基础前端框架Laya_v3.3.8（免费）', 'dl_laya_base_3'],
    ['高级前端框架Laya_v3.3.8（付费）', 'dl_laya_pro_3'],
    ['基础前端框架Unity_v2022.3.13（免费）', 'dl_unity_base'],
    ['sep', ''],
    ['下载大地图切图工具', 'downloadImageClipTool'],
  ],
  window: [
    ['小地图预览面板(F2)', 'showMiniMap'],
    ['路点编辑模式(N)', 'setEditRoadModel'],
    ['普通编辑模式(M)', 'setNormalRoadModel'],
  ],
  tools: [
    ['Excel导出数据工具', 'openExcelExportTool'],
    ['下载大地图切图工具', 'downloadImageClipTool'],
  ],
  help: [
    ['关于在线地图编辑器', 'showAbout'],
    ['联系我们', 'showCopyright'],
  ],
};

/** 下载菜单里各条目的真实地址（从线上 bundle 的 `fun` 里原样抄下来）。 */
export const DOWNLOAD_LINKS: Record<string, string> = {
  dl_creator_base_2: 'https://easymapeditor-1258223435.cos.ap-guangzhou.myqcloud.com/framework/cocos/RPGFramework_base_2.4.15.zip',
  dl_creator_base_3: 'https://easymapeditor-1258223435.cos.ap-guangzhou.myqcloud.com/framework/cocos/RPGFramework_base_3.8.6.zip',
  dl_laya_base_3:    'https://easymapeditor-1258223435.cos.ap-guangzhou.myqcloud.com/framework/laya/RPGFramework_Base_Laya_3.3.8.zip',
  dl_unity_base:     'https://easymapeditor-1258223435.cos.ap-guangzhou.myqcloud.com/framework/unity/RPGMapFramework_2022.3.13.zip',
  downloadImageClipTool: 'https://easymapeditor-1258223435.cos.ap-guangzhou.myqcloud.com/tool/ImageClip.zip',
};

/** Keyboard -> road value (Q/W/E/R/D/T). */
export const ROAD_KEYS: Record<string, number> = { q: 0, w: 1, e: 2, r: 3, d: -1, t: -2 };

export const VIEW_IDS: Record<string, string> = {
  newMap: 'newMapView', openMap: 'openMapView', setting: 'settingView',
  miniMap: 'miniMapView', teach: 'teachView', copyright: 'copyrightView', sale: 'saleView',
  about: 'aboutView', excel: 'excelView',
};

export const TYPE_LABEL: Record<string, string> = {
  npc: 'NPC', monster: '怪物', transfer: '传送门', spawnPoint: '出生点', item: '物体',
  obj: '物体', prop: '道具', event: '事件',
};

/**
 * 用户导入的皮肤（「文件 → 导入编辑资源」）。**追加在内置皮肤之后**，
 * 所以 `skin` 索引不会错位 —— 导入前后已有实体的索引含义不变。
 * 图片是 `blob:` 对象 URL，刷新页面就没了，需要重新导入（原版也一样，
 * 它把资源放在内存里的 `EditAssets` 中）。
 */
export const IMPORTED_SKINS: Record<string, SkinDef[]> = {};

/** 某个类型当前可选的皮肤 = 内置 + 已导入。 */
export function skinsFor(type: string): readonly SkinDef[] {
  const builtin = ENTITY_SKINS[type as EntityType] || [];
  const extra = IMPORTED_SKINS[type];
  return extra && extra.length ? builtin.concat(extra) : builtin;
}

/** 清空某个类型的导入皮肤（重新导入前调用）。 */
export function clearImportedSkins(type: string): void {
  delete IMPORTED_SKINS[type];
}

/** Drawn size + selection-ring geometry for an entity skin. */
export function entitySize(type: string, skin: number): { w: number; h: number } {
  const defs = skinsFor(type);
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
