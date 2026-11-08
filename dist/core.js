"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/core/index.ts
  var core_exports = {};
  __export(core_exports, {
    AUX_FAINT: () => AUX_FAINT,
    AUX_STRONG: () => AUX_STRONG,
    BRUSH_SIZES: () => BRUSH_SIZES,
    BinaryHeap: () => BinaryHeap,
    CLASS_DIC: () => CLASS_DIC,
    ENTITY_SKINS: () => ENTITY_SKINS,
    ENTITY_TYPES: () => ENTITY_TYPES,
    GRID_BORDER: () => GRID_BORDER,
    LAUNCH_PARAMS: () => LAUNCH_PARAMS,
    MAP_TYPE_NAMES: () => MAP_TYPE_NAMES,
    MAX_CEIL_COUNT: () => MAX_CEIL_COUNT,
    MENUS: () => MENUS,
    MapDataModel: () => MapDataModel,
    MapParamsModel: () => MapParamsModel,
    MapRoadUtils: () => MapRoadUtils,
    MapType: () => MapType,
    PLAYER_ANCHOR_Y: () => PLAYER_ANCHOR_Y,
    PLAYER_DRAW_OFFSET: () => PLAYER_DRAW_OFFSET,
    PLAYER_FRAME_SIZE: () => PLAYER_FRAME_SIZE,
    PLAYER_FRAME_TIME: () => PLAYER_FRAME_TIME,
    PLAYER_STATE_FRAMES: () => PLAYER_STATE_FRAMES,
    ROAD_KEYS: () => ROAD_KEYS,
    ROAD_SWATCHES: () => ROAD_SWATCHES,
    TEST_TOOLBAR: () => TEST_TOOLBAR,
    TOOLBAR1: () => TOOLBAR1,
    TOOLBAR2: () => TOOLBAR2,
    TOOL_TITLES: () => TOOL_TITLES,
    TOOL_TO_ACTION: () => TOOL_TO_ACTION,
    TYPE_LABEL: () => TYPE_LABEL,
    TYPE_TO_CLASS: () => TYPE_TO_CLASS,
    UndoRedo: () => UndoRedo,
    VIEW_IDS: () => VIEW_IDS,
    angle45Lines: () => angle45Lines,
    angle90Lines: () => angle90Lines,
    buildMapData: () => buildMapData,
    computeGridSize: () => computeGridSize,
    defaultEntity: () => defaultEntity,
    defaultRoadSets: () => defaultRoadSets,
    defaultSettings: () => defaultSettings,
    entityColor: () => entityColor,
    entityRing: () => entityRing,
    entitySize: () => entitySize,
    findPath: () => findPath,
    hexToRgba: () => hexToRgba,
    hexVertices: () => hexVertices,
    honeycombAuxLines: () => honeycombAuxLines,
    normalizeEntity: () => normalizeEntity,
    optimizePath: () => optimizePath,
    parseColor: () => parseColor,
    playerDirectionFromAngle: () => playerDirectionFromAngle,
    playerDirectionFromVector: () => playerDirectionFromVector,
    playerFrame: () => playerFrame,
    rgbHex: () => rgbHex,
    rgbaToHex: () => rgbaToHex,
    roadRenderColor: () => roadRenderColor,
    roadRowCount: () => roadRowCount,
    schemaFor: () => schemaFor
  });

  // src/core/types.ts
  var MapType = /* @__PURE__ */ ((MapType2) => {
    MapType2[MapType2["angle45"] = 0] = "angle45";
    MapType2[MapType2["angle90"] = 1] = "angle90";
    MapType2[MapType2["honeycomb"] = 2] = "honeycomb";
    MapType2[MapType2["honeycomb2"] = 3] = "honeycomb2";
    return MapType2;
  })(MapType || {});

  // src/core/constants.ts
  var MAP_TYPE_NAMES = ["45度等视角地图", "90度顶视角地图", "纵六边形地图", "横六边形地图"];
  var MAX_CEIL_COUNT = 25e5;
  function defaultRoadSets() {
    return [
      { id: 0, value: 0, color: "#00ff0065", isShow: true, isPass: true, desc: "行走路点(Q)" },
      { id: 1, value: 1, color: "#ff000065", isShow: false, isPass: false, desc: "障碍路点(W)" },
      { id: 2, value: 2, color: "#0000ff65", isShow: true, isPass: true, desc: "遮挡路点(E)" },
      { id: 3, value: 3, color: "#ffff0065", isShow: true, isPass: true, desc: "隐藏路点(R)" }
    ];
  }
  function defaultSettings() {
    return { defaultRoadValue: 1, roadSetDatas: defaultRoadSets() };
  }
  var ROAD_SWATCHES = [
    { value: -1, label: "删除路点", sub: "(D或右键)", color: "#ffffff", del: true },
    { value: 0, label: "行走路点(Q)", color: "#00ff00" },
    { value: 1, label: "障碍路点(W)", color: "#ff0000" },
    { value: 2, label: "遮挡路点(E)", color: "#0000ff" },
    { value: 3, label: "隐藏路点(R)", color: "#ffff00" }
  ];
  var BRUSH_SIZES = [0, 1, 2, 3, 4, 5];
  var ENTITY_SKINS = {
    npc: [
      { label: "商人.NPC", icon: "assets/skins/npc_1_shangren.png", objName: "商人.NPC", w: 56, h: 99 },
      { label: "任务.NPC", icon: "assets/skins/npc_2_renwu.png", objName: "任务.NPC", w: 76, h: 99 },
      { label: "剧情.NPC", icon: "assets/skins/npc_3_juqing.png", objName: "剧情.NPC", w: 64, h: 99 },
      { label: "特殊.NPC", icon: "assets/skins/npc_4_teshu.png", objName: "特殊.NPC", w: 80, h: 99 }
    ],
    monster: [
      { label: "小怪", icon: "assets/skins/monster_1_xiaoguai.png", objName: "小怪", w: 60, h: 60 },
      { label: "精英怪", icon: "assets/skins/monster_2_jingying.png", objName: "精英怪", w: 65, h: 77 },
      { label: "Boss", icon: "assets/skins/monster_3_boss.png", objName: "Boss", w: 105, h: 113 },
      { label: "特殊怪", icon: "assets/skins/monster_4_teshu.png", objName: "特殊怪", w: 54, h: 58 }
    ],
    transfer: [
      {
        label: "类型1.传送们",
        icon: "assets/skins/transfer1_f1.png",
        objName: "类型1.传送们",
        w: 200,
        h: 200,
        frameTime: 0.1,
        frames: [
          "assets/skins/transfer1_f1.png",
          "assets/skins/transfer1_f2.png",
          "assets/skins/transfer1_f3.png",
          "assets/skins/transfer1_f4.png",
          "assets/skins/transfer1_f5.png",
          "assets/skins/transfer1_f6.png",
          "assets/skins/transfer1_f7.png",
          "assets/skins/transfer1_f8.png"
        ]
      },
      {
        label: "类型2.传送们",
        icon: "assets/skins/transfer2_f1.png",
        objName: "类型2.传送们",
        w: 187,
        h: 165,
        frameTime: 0.1,
        frames: [
          "assets/skins/transfer2_f1.png",
          "assets/skins/transfer2_f2.png",
          "assets/skins/transfer2_f3.png",
          "assets/skins/transfer2_f4.png",
          "assets/skins/transfer2_f5.png",
          "assets/skins/transfer2_f6.png",
          "assets/skins/transfer2_f7.png",
          "assets/skins/transfer2_f8.png",
          "assets/skins/transfer2_f9.png",
          "assets/skins/transfer2_f10.png",
          "assets/skins/transfer2_f11.png"
        ]
      },
      {
        label: "不可视.传送们",
        icon: "assets/skins/transfer_3_invisible.png",
        objName: "不可视.传送们",
        w: 150,
        h: 150
      }
    ],
    spawnPoint: [
      { label: "出生点", icon: "assets/skins/spawn_1.png", objName: "出生点", w: 134, h: 207 }
    ]
  };
  var TOOL_TITLES = {
    road: "编辑路点",
    brush: "设置笔刷",
    npc: "放置NPC",
    monster: "放置怪物",
    transfer: "放置传送门",
    spawnPoint: "放置出生点"
  };
  var TOOL_TO_ACTION = {
    road: "openRoadWin",
    brush: "openBrushWin",
    npc: "openNpcWin",
    monster: "openMonsterWin",
    transfer: "openTransferWin",
    spawnPoint: "openSpawnWin"
  };
  var TOOLBAR1 = [
    { label: "新建", w: 100, act: "createNewFile" },
    { label: "打开", w: 100, act: "openFile" },
    { label: "保存", w: 100, act: "saveFile" },
    { label: "设置", w: 100, act: "showProjectSetting" },
    { label: "运行（ctr + enter）", w: 180, act: "testProject" },
    { label: "添加可走路点(Q)", w: 180, act: "addEnableNode", hidden: true },
    { label: "添加不可走路点(W)", w: 180, act: "addDisableNode", hidden: true },
    { label: "添加透明行走路点(E)", w: 200, act: "addTransParentNode", hidden: true },
    { label: "添加传送路点(R)", w: 180, act: "addTransferNode", hidden: true },
    { label: "删除路点(D或右键)", w: 180, act: "deleteNode", hidden: true },
    { label: "停止放置路点（T）", w: 180, act: "notDrawNode", hidden: true },
    { label: "显示小地图(F2)", w: 180, act: "showMiniMap" },
    { label: "下载前端框架", w: 150, act: "downloadSource", hidden: true },
    { label: "下载大地图切图工具", w: 240, act: "downloadImageClipTool", hidden: true },
    { label: "教程", w: 120, act: "showTeach" },
    { label: "帮助", w: 120, act: "showCopyright" }
  ];
  var TOOLBAR2 = [
    { label: "隐藏地图（U）", w: 180, act: "showMapLayer", key: "U" },
    { label: "隐藏路点(I)", w: 180, act: "showRoadLayer", key: "I" },
    { label: "隐藏物体(O)", w: 180, act: "showEntityLayer", key: "O" },
    { label: "隐藏网格(P)", w: 180, act: "showGridLayer", key: "P" },
    { label: "设置笔刷", w: 110, act: "openBrushWin" },
    { label: "编辑路点", w: 110, act: "openRoadWin" },
    { label: "放置npc", w: 110, act: "openNpcWin" },
    { label: "放置怪物", w: 110, act: "openMonsterWin" },
    { label: "放置传送门", w: 130, act: "openTransferWin" },
    { label: "放置出生点", w: 130, act: "openSpawnWin" }
  ];
  var TEST_TOOLBAR = [
    { label: "隐藏地图(U)", w: 180, act: "t_showMapLayer" },
    { label: "隐藏路点(I)", w: 180, act: "t_showRoadLayer" },
    { label: "隐藏物体(O)", w: 180, act: "t_showEntityLayer" },
    { label: "隐藏网格(P)", w: 180, act: "t_showGridLayer" },
    { label: "屏幕跟随玩家(F3)", w: 200, act: "t_followPlayer" },
    { label: "查看寻路过程(F4)", w: 180, act: "t_showPath" }
  ];
  var MENUS = {
    file: [
      ["新建", "createNewFile"],
      ["打开（CTRL + O）", "openFile"],
      ["保存（CTRL + S）", "saveFile"],
      ["sep", ""],
      ["设置", "showProjectSetting"]
    ],
    edit: [
      ["添加可走路点(Q)", "addEnableNode"],
      ["添加不可走路点(W)", "addDisableNode"],
      ["添加透明行走路点(E)", "addTransParentNode"],
      ["添加传送路点(R)", "addTransferNode"],
      ["删除路点(D)", "deleteNode"],
      ["停止放置路点（T）", "notDrawNode"],
      ["停止编辑事件（S）", "clearAllEditorAreaExecute"],
      ["sep", ""],
      ["转换路点风格（CTRL + B）", "switchRoadStyle"],
      ["隐藏不可走路点（F1）", "hideBlockRoad"],
      ["sep", ""],
      ["显示隐藏地图(U)", "showMapLayer"],
      ["显示隐藏物体(O)", "showEntityLayer"],
      ["显示隐藏路点(I)", "showRoadLayer"],
      ["显示隐藏网格(P)", "showGridLayer"],
      ["显示隐藏辅助线（J）", "toggleAuxLine"],
      ["sep", ""],
      ["显示地图物体锚点(k)", "showAnchor"],
      ["sep", ""],
      ["剪切(CTRL + X)", "cut"],
      ["复制(CTRL + C)", "copy"],
      ["粘贴(CTRL + V)", "paste"]
    ],
    command: [
      ["运行测试（ctrl + enter）", "testProject"],
      ["地图切片导出（ctrl + W）", "exportTiles"],
      ["地图缩小导出（ctrl + T）", "exportSmall"]
    ],
    window: [
      ["小地图预览面板(F2)", "showMiniMap"],
      ["路点编辑模式(N)", "setEditRoadModel"],
      ["普通编辑模式(M)", "setNormalRoadModel"]
    ],
    help: [["联系我们", "showCopyright"]]
  };
  var ROAD_KEYS = { q: 0, w: 1, e: 2, r: 3, d: -1, t: -2 };
  var VIEW_IDS = {
    newMap: "newMapView",
    openMap: "openMapView",
    setting: "settingView",
    miniMap: "miniMapView",
    teach: "teachView",
    copyright: "copyrightView",
    sale: "saleView"
  };
  var TYPE_LABEL = {
    npc: "NPC",
    monster: "怪物",
    transfer: "传送门",
    spawnPoint: "出生点",
    item: "物体"
  };
  function entitySize(type, skin) {
    const defs = ENTITY_SKINS[type];
    if (!defs || !defs.length) return { w: 100, h: 100 };
    const d = defs[skin % defs.length];
    return { w: d.w || 100, h: d.h || 100 };
  }
  function entityRing(type, skin) {
    const { w, h } = entitySize(type, skin);
    const r = Math.max(44, Math.max(w, h) * 0.56);
    return { cx: 0, cy: -h / 2, r };
  }
  var LAUNCH_PARAMS = {
    name: "mapData",
    bgName: "map_bg",
    mapType: 3 /* honeycomb2 */,
    mapWidth: 1920,
    mapHeight: 1440,
    ceilWidth: 40,
    ceilHeight: 34.64
  };

  // src/core/color.ts
  function hexToRgba(hex) {
    let h = hex.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2] + "ff";
    else if (h.length === 4) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    else if (h.length === 6) h += "ff";
    if (h.length !== 8) h = "ffffffff";
    const n = parseInt(h, 16);
    const r = n >>> 24 & 255, g = n >>> 16 & 255, b = n >>> 8 & 255, a = n & 255;
    return "rgba(" + r + "," + g + "," + b + "," + (a / 255).toFixed(3) + ")";
  }
  function parseColor(hex) {
    let h = (hex || "#FFFFFFFF").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2] + "FF";
    else if (h.length === 4) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    else if (h.length === 6) h += "FF";
    if (h.length !== 8) h = "FFFFFFFF";
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: parseInt(h.slice(6, 8), 16)
    };
  }
  function rgbaToHex(r, g, b, a) {
    const p = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0").toUpperCase();
    return "#" + p(r) + p(g) + p(b) + p(a);
  }
  function rgbHex(r, g, b) {
    const p = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
    return "#" + p(r) + p(g) + p(b);
  }
  function roadRenderColor(_value, settingColor) {
    return hexToRgba(settingColor);
  }
  function entityColor(type, skin) {
    const palettes = {
      npc: ["#e05555", "#55a0e0", "#c0a060", "#70c070", "#b070d0", "#d0a050"],
      monster: ["#8090d0", "#a06060", "#909090", "#7050a0", "#606060", "#a08050"],
      transfer: ["#40c0e0"],
      spawnPoint: ["#f0c040"]
    };
    const p = palettes[type] || ["#aaaaaa"];
    return p[skin % p.length];
  }

  // src/core/geometry.ts
  var MapRoadUtils = class {
    constructor() {
      this.mapWidth = 1920;
      this.mapHeight = 1080;
      this.nodeWidth = 60;
      this.nodeHeight = 30;
      this.halfNodeWidth = 30;
      this.halfNodeHeight = 15;
      this.mapType = 0 /* angle45 */;
      this.row = 0;
      this.col = 0;
    }
    updateMapInfo(w, h, nw, nh, type) {
      this.mapWidth = w;
      this.mapHeight = h;
      this.nodeWidth = nw;
      this.nodeHeight = nh;
      this.halfNodeWidth = nw / 2;
      this.halfNodeHeight = nh / 2;
      this.mapType = type;
      switch (type) {
        case 0 /* angle45 */:
          this.col = Math.ceil(w / nw);
          this.row = 2 * Math.ceil(h / nh);
          break;
        case 1 /* angle90 */:
          this.col = Math.ceil(w / nw);
          this.row = Math.ceil(h / nh);
          break;
        case 2 /* honeycomb */:
          this.col = 2 * Math.ceil((w - nw / 4) / (nw / 4 * 6));
          this.row = Math.ceil((h - nh / 2) / nh);
          break;
        case 3 /* honeycomb2 */:
          this.col = Math.ceil((w - nh / 2) / nh);
          this.row = 2 * Math.ceil((h - nw / 4) / (nw / 4 * 6));
          break;
      }
      return { row: this.row, col: this.col };
    }
    getNodeByPixel(px, py) {
      const wp = this.getWorldPointByPixel(px, py);
      const pp = this.getPixelByWorldPoint(wp.x, wp.y);
      const g = this.getDerectByPixel(px, py);
      return { cx: wp.x, cy: wp.y, px: pp.x, py: pp.y, dx: g.x, dy: g.y };
    }
    getNodeByWorldPoint(cx, cy) {
      const pp = this.getPixelByWorldPoint(cx, cy);
      return this.getNodeByPixel(pp.x, pp.y);
    }
    getWorldPointByPixel(x, y) {
      switch (this.mapType) {
        case 0 /* angle45 */: {
          const col = this.col - 1;
          return {
            x: Math.ceil(x / this.nodeWidth - 0.5 + y / this.nodeHeight) - 1,
            y: col - Math.ceil(x / this.nodeWidth - 0.5 - y / this.nodeHeight)
          };
        }
        case 1 /* angle90 */:
          return { x: Math.floor(x / this.nodeWidth), y: Math.floor(y / this.nodeHeight) };
        case 2 /* honeycomb */: {
          const nw = this.nodeWidth, nh = this.nodeHeight;
          const cxApprox = Math.floor(x / (nw * 3 / 4));
          let best = null, bestD = Infinity;
          for (let cx = cxApprox - 2; cx <= cxApprox + 2; cx++) {
            const offY = cx & 1 ? nh / 2 : 0;
            const cy = Math.floor((y - offY) / nh);
            for (let dy = cy - 1; dy <= cy + 1; dy++) {
              const p = this.getPixelByWorldPoint(cx, dy);
              const d = (p.x - x) ** 2 + (p.y - y) ** 2;
              if (d < bestD) {
                bestD = d;
                best = { x: cx, y: dy };
              }
            }
          }
          return best || { x: 0, y: 0 };
        }
        case 3 /* honeycomb2 */: {
          const nw = this.nodeWidth, nh = this.nodeHeight;
          const cyApprox = Math.floor(y / (nw * 3 / 4));
          let best = null, bestD = Infinity;
          for (let cy = cyApprox - 2; cy <= cyApprox + 2; cy++) {
            const offX = cy & 1 ? nh / 2 : 0;
            const cx = Math.floor((x - offX) / nh);
            for (let dx = cx - 1; dx <= cx + 1; dx++) {
              const p = this.getPixelByWorldPoint(dx, cy);
              const d = (p.x - x) ** 2 + (p.y - y) ** 2;
              if (d < bestD) {
                bestD = d;
                best = { x: dx, y: cy };
              }
            }
          }
          return best || { x: 0, y: 0 };
        }
      }
      return { x: 0, y: 0 };
    }
    getPixelByWorldPoint(cx, cy) {
      switch (this.mapType) {
        case 0 /* angle45 */: {
          const col = this.col - 1;
          return {
            x: (cx + 1 - (cy - col)) * this.halfNodeWidth,
            y: (cx + 1 + (cy - col)) * this.halfNodeHeight
          };
        }
        case 1 /* angle90 */:
          return { x: cx * this.nodeWidth, y: cy * this.nodeHeight };
        case 2 /* honeycomb */: {
          const nw = this.nodeWidth, nh = this.nodeHeight;
          return {
            x: cx * (nw * 3 / 4) + nw / 2,
            y: cy * nh + (cx & 1 ? nh / 2 : 0) + nh / 2
          };
        }
        case 3 /* honeycomb2 */: {
          const nw = this.nodeWidth, nh = this.nodeHeight;
          return {
            x: cx * nh + (cy & 1 ? nh / 2 : 0) + nh / 2,
            y: cy * (nw * 3 / 4) + nw / 2
          };
        }
      }
      return { x: 0, y: 0 };
    }
    getDerectByPixel(x, y) {
      return this.getWorldPointByPixel(x, y);
    }
    getNodeByDerect(dx, dy) {
      const pp = this.getPixelByWorldPoint(dx, dy);
      return this.getNodeByPixel(pp.x, pp.y);
    }
    /** Center pixel of a cell, for rendering. */
    cellCenter(dx, dy) {
      const p = this.getPixelByWorldPoint(dx, dy);
      if (this.mapType === 1 /* angle90 */) {
        return { x: p.x + this.nodeWidth / 2, y: p.y + this.nodeHeight / 2 };
      }
      return p;
    }
    /** Diamond brush stroke: |dx|+|dy| <= size. */
    getStroke(size) {
      if (!size) return [[0, 0]];
      const out = [];
      for (let y = -size; y <= size; y++)
        for (let x = -size; x <= size; x++)
          if (Math.abs(x) + Math.abs(y) <= size) out.push([x, y]);
      return out;
    }
  };
  function computeGridSize(w, h, nw, nh, type) {
    switch (type) {
      case 0 /* angle45 */:
        return { col: Math.ceil(w / nw), row: 2 * Math.ceil(h / nh) };
      case 1 /* angle90 */:
        return { col: Math.ceil(w / nw), row: Math.ceil(h / nh) };
      case 2 /* honeycomb */:
        return {
          col: 2 * Math.ceil((w - nw / 4) / (nw / 4 * 6)),
          row: Math.ceil((h - nh / 2) / nh)
        };
      case 3 /* honeycomb2 */:
        return {
          col: Math.ceil((w - nh / 2) / nh),
          row: 2 * Math.ceil((h - nw / 4) / (nw / 4 * 6))
        };
    }
    return { col: 0, row: 0 };
  }
  function roadRowCount(type, gridRow) {
    return type === 0 /* angle45 */ ? gridRow * 2 : gridRow;
  }

  // src/core/schema.ts
  function attr(attribute, tip, type = "normal", visible = true, editable = true, label) {
    return { attribute, tip, type, visible, editable, label: label || tip };
  }
  var BASE = [
    attr("objId", "物体Id"),
    attr("objName", "物体名称"),
    attr("objType", "物体类型"),
    attr("skin", "物体皮肤"),
    attr("x", "x坐标", "number"),
    attr("y", "y坐标", "number"),
    attr("cx", "世界坐标x轴", "number", false),
    attr("cy", "世界坐标y轴", "number", false),
    attr("params", "自定义参数")
  ];
  var CLASS_DIC = {
    EditorElement: BASE.slice(),
    EditorNPC: BASE.concat([
      attr("direction", "角色方向,值的范围为 0-7", "number"),
      attr("npcType", "npc类型", "number", false, false),
      attr("isPatrol", "是否巡逻", "bool"),
      attr("dialogueId", "对话Id,用于npc的对话内容", "number", true, true, "对话Id"),
      attr("taskId", "用于npc发布任务", "number", true, true, "任务Id"),
      attr("funcId", "用于识别npc具备什么功能", "number", true, true, "功能Id")
    ]),
    EditorMonster: BASE.concat([
      attr("direction", "角色方向,值的范围为 0-7", "number"),
      attr("monsterType", "monster类型", "number", false, false),
      attr("isPatrol", "是否巡逻", "bool"),
      attr("dialogueId", "对话Id,用于怪物的对话内容", "number", true, true, "对话Id"),
      attr("fightId", "在需要跳转到战斗副本时使用", "number", true, true, "战斗Id")
    ]),
    EditorTransfer: BASE.concat([
      attr("targetMapId", "传送到目标地图Id", "normal", true, true, "目标地图Id"),
      attr("targetMapSpawnId", "目标地图的出生点Id", "number", true, true, "目标出生点Id"),
      attr("transferType", "transfer类型", "number", false, false)
    ]),
    EditorSpawnPoint: BASE.concat([
      attr("spawnId", "在当前地图出生点的Id", "number", true, true, "地图出生点Id"),
      attr("defaultSpawn", "设置是否是默认出生点", "bool", true, true, "默认出生点")
    ])
  };
  var TYPE_TO_CLASS = {
    npc: "EditorNPC",
    monster: "EditorMonster",
    transfer: "EditorTransfer",
    spawnPoint: "EditorSpawnPoint"
  };
  var ENTITY_TYPES = ["npc", "monster", "transfer", "spawnPoint"];
  function schemaFor(entity) {
    return CLASS_DIC[entity?.className || "EditorElement"] || CLASS_DIC.EditorElement;
  }

  // src/core/model.ts
  var MapParamsModel = class {
    constructor(o = {}) {
      this.name = o.name ?? "未命名";
      this.mapType = o.mapType ?? 0 /* angle45 */;
      this.mapWidth = o.mapWidth || 1920;
      this.mapHeight = o.mapHeight || 1080;
      this.ceilWidth = o.ceilWidth || 60;
      this.ceilHeight = o.ceilHeight || 30;
      this.bgName = o.bgName || "map_bg";
      this.bgImage = o.bgImage ?? null;
      this.bgSrc = o.bgSrc ?? null;
    }
  };
  var MapDataModel = class _MapDataModel {
    constructor() {
      this.name = "";
      this.bgName = "";
      this.type = 0 /* angle45 */;
      this.mapWidth = 0;
      this.mapHeight = 0;
      this.nodeWidth = 0;
      this.nodeHeight = 0;
      this.alignment = 0;
      this.offsetX = 0;
      this.offsetY = 0;
      this.roadDataArr = [];
      this.mapItems = [];
    }
    static fromJson(obj) {
      const d = new _MapDataModel();
      Object.assign(d, obj);
      if (!Array.isArray(d.roadDataArr)) d.roadDataArr = [];
      if (!Array.isArray(d.mapItems)) d.mapItems = [];
      return d;
    }
    toJson() {
      return {
        name: this.name,
        bgName: this.bgName,
        type: this.type,
        mapWidth: this.mapWidth,
        mapHeight: this.mapHeight,
        nodeWidth: this.nodeWidth,
        nodeHeight: this.nodeHeight,
        alignment: this.alignment,
        offsetX: this.offsetX,
        offsetY: this.offsetY,
        roadDataArr: this.roadDataArr,
        mapItems: this.mapItems
      };
    }
  };
  function defaultEntity(type, x, y) {
    const cls = TYPE_TO_CLASS[type] || "EditorElement";
    const e = { type: type || "item", className: cls };
    for (const a of CLASS_DIC[cls]) {
      if (a.type === "number") e[a.attribute] = 0;
      else if (a.type === "bool") e[a.attribute] = false;
      else e[a.attribute] = "";
    }
    e.objId = "0";
    e.objType = "0";
    e.objName = type === "npc" ? "NPC" : type === "monster" ? "怪物" : type === "transfer" ? "传送门" : type === "spawnPoint" ? "出生点" : "item";
    e.skin = "0";
    e.x = Math.round((x || 0) * 1e3) / 1e3;
    e.y = Math.round((y || 0) * 1e3) / 1e3;
    e.cx = 0;
    e.cy = 0;
    e.params = "";
    e.width = 100;
    e.height = 100;
    return e;
  }
  function normalizeEntity(raw) {
    const type = raw.type || "item";
    const d = defaultEntity(type, Number(raw.x) || 0, Number(raw.y) || 0);
    for (const k of Object.keys(raw)) if (k !== "type") d[k] = raw[k];
    d.className = TYPE_TO_CLASS[type] || "EditorElement";
    d.type = type;
    return d;
  }
  function buildMapData(params, road, entities, settings) {
    const d = new MapDataModel();
    d.name = params.name;
    d.bgName = params.bgName;
    d.type = params.mapType;
    d.mapWidth = params.mapWidth;
    d.mapHeight = params.mapHeight;
    d.nodeWidth = params.ceilWidth;
    d.nodeHeight = params.ceilHeight;
    d.alignment = 0;
    d.offsetX = 0;
    d.offsetY = 0;
    d.roadDataArr = road.map((r) => r.slice());
    d.mapItems = entities.slice().sort((a, b) => (Number(b.y) || 0) - (Number(a.y) || 0)).map((e) => {
      const out = { type: e.type || "item" };
      const schema = CLASS_DIC[e.className || "EditorElement"] || CLASS_DIC.EditorElement;
      for (const a of schema) out[a.attribute] = e[a.attribute];
      if (e.type === "item" || !schema.length) {
        out.x = e.x;
        out.y = e.y;
        out.width = e.width || 100;
        out.height = e.height || 100;
      }
      return out;
    });
    return d.toJson();
  }

  // src/core/pathfinding.ts
  var BinaryHeap = class {
    constructor(score) {
      this.score = score;
      this.data = [];
    }
    get length() {
      return this.data.length;
    }
    push(v) {
      const d = this.data;
      d.push(v);
      let i = d.length - 1;
      while (i > 0) {
        const p = i - 1 >> 1;
        if (this.score(d[p]) <= this.score(d[i])) break;
        [d[p], d[i]] = [d[i], d[p]];
        i = p;
      }
    }
    pop() {
      const d = this.data;
      if (!d.length) return null;
      const r = d[0], last = d.pop();
      if (d.length) {
        d[0] = last;
        let i = 0;
        for (; ; ) {
          const l = 2 * i + 1, r2 = l + 1;
          let m = i;
          if (l < d.length && this.score(d[l]) < this.score(d[m])) m = l;
          if (r2 < d.length && this.score(d[r2]) < this.score(d[m])) m = r2;
          if (m === i) break;
          [d[m], d[i]] = [d[i], d[m]];
          i = m;
        }
      }
      return r;
    }
  };
  function crossOk(a, b, pass) {
    if (a.x === b.x && a.y === b.y) return false;
    if (!pass(a.x, a.y) || !pass(b.x, b.y)) return false;
    const ix = b.x - a.x, iy = b.y - a.y;
    if (Math.abs(ix) > 1 || Math.abs(iy) > 1) return false;
    if (a.x === b.x || a.y === b.y) return true;
    return pass(a.x, a.y + iy) && pass(a.x + ix, a.y);
  }
  function lineOfSight(a, b, pass) {
    if (a.x === b.x && a.y === b.y) return false;
    const adx = Math.abs(b.x - a.x), ady = Math.abs(b.y - a.y);
    const sx = b.x > a.x ? 1 : b.x < a.x ? -1 : 0;
    const sy = b.y > a.y ? 1 : b.y < a.y ? -1 : 0;
    const rnd = (s) => s % 1 <= 0.5 ? Math.floor(s) : Math.floor(s) + 1;
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
  function optimizePath(road, path, isPass) {
    if (path.length < 3) return path;
    const rows = road.length, cols = road[0].length;
    const pass = (x, y) => y >= 0 && y < rows && x >= 0 && x < cols && isPass(road[y][x]);
    const out = path.slice();
    for (let i = 1; i < out.length - 1; i++) {
      const a = out[i - 1], b = out[i], c = out[i + 1];
      const sameCol = b.x === a.x && b.x === c.x;
      const sameRow = b.y === a.y && b.y === c.y;
      const diag = b.x - a.x === c.x - b.x && b.y - a.y === c.y - b.y && Math.abs(b.x - a.x) === Math.abs(b.y - a.y) && b.x !== a.x;
      if (sameCol || sameRow || diag) {
        out.splice(i, 1);
        i--;
      }
    }
    for (let i = 0; i < out.length - 2; i++) {
      let far = -1;
      for (let j = out.length - 1; j > i + 1; j--) {
        if (lineOfSight(out[i], out[j], pass)) {
          far = j;
          break;
        }
      }
      if (far > i + 1) out.splice(i + 1, far - i - 1);
    }
    return out;
  }
  function findPath(road, sx, sy, tx, ty, mapType, pass = null, debug, maxSteps = 4e5) {
    const rows = road.length;
    if (!rows) return null;
    const cols = road[0].length;
    const isPass = pass || ((v) => v === 0 || v === 2 || v === 3);
    const hex = mapType === 2 /* honeycomb */ || mapType === 3 /* honeycomb2 */;
    const key = (x, y) => y * cols + x;
    const inb = (x, y) => y >= 0 && y < rows && x >= 0 && x < cols;
    const neighbours = (x, _y) => hex ? x & 1 ? [[0, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]] : [[0, -1], [1, -1], [1, 0], [0, 1], [-1, 0], [-1, -1]] : [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
    const h = (x, y) => 10 * (Math.abs(x - tx) + Math.abs(y - ty));
    const g = /* @__PURE__ */ new Map(), f = /* @__PURE__ */ new Map(), came = /* @__PURE__ */ new Map();
    const open = new BinaryHeap((k) => f.get(k) ?? Infinity);
    const openSet = debug?.frames ? /* @__PURE__ */ new Set() : null;
    const sk = key(sx, sy), tk = key(tx, ty);
    g.set(sk, 0);
    f.set(sk, h(sx, sy));
    open.push(sk);
    if (openSet) openSet.add(sk);
    const closed = /* @__PURE__ */ new Set();
    let guard = 0;
    while (open.length && guard++ < maxSteps) {
      const cur = open.pop();
      if (closed.has(cur)) continue;
      if (cur === tk) {
        const path = [];
        let k = cur;
        while (k !== void 0) {
          path.push({ x: k % cols, y: Math.floor(k / cols) });
          k = came.get(k);
        }
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
        const cost = hex ? 10 : ox && oy ? 14 : 10;
        const ng = (g.get(cur) ?? Infinity) + cost;
        if (ng < (g.get(nk) ?? Infinity)) {
          came.set(nk, cur);
          g.set(nk, ng);
          f.set(nk, ng + h(nx, ny));
          open.push(nk);
          if (openSet) openSet.add(nk);
          if (debug) debug.open.push({ x: nx, y: ny });
        }
      }
      if (debug?.frames && openSet) {
        debug.frames.push({
          closed: debug.closed.length,
          open: Array.from(openSet, (k) => ({ x: k % cols, y: Math.floor(k / cols) }))
        });
      }
    }
    return null;
  }

  // src/core/player.ts
  var PLAYER_FRAME_SIZE = 105;
  var PLAYER_FRAME_TIME = 0.1;
  var PLAYER_STATE_FRAMES = 6;
  var PLAYER_ANCHOR_Y = 0.25;
  var PLAYER_DRAW_OFFSET = {
    x: -PLAYER_FRAME_SIZE / 2,
    y: -PLAYER_FRAME_SIZE * (1 - PLAYER_ANCHOR_Y)
  };
  var STATE_BEGIN = {
    stand: 0,
    run: 6,
    sitdown: 12,
    sitrun: 18
  };
  function playerFrame(dir, state, frame) {
    const d = (Math.round(dir || 0) % 8 + 8) % 8;
    const row = d > 4 ? 4 - d % 4 : d;
    const base = STATE_BEGIN[state] ?? 0;
    const f = (Math.round(frame || 0) % PLAYER_STATE_FRAMES + PLAYER_STATE_FRAMES) % PLAYER_STATE_FRAMES;
    return { col: base + f, row, flip: d > 4 };
  }
  function playerDirectionFromAngle(angle) {
    const r = Math.round((-angle + Math.PI) / (Math.PI / 4));
    const d = r > 5 ? r - 6 : r + 2;
    return (d % 8 + 8) % 8;
  }
  function playerDirectionFromVector(dx, dy) {
    if (!dx && !dy) return 0;
    return playerDirectionFromAngle(Math.atan2(dy, dx));
  }

  // src/core/grid.ts
  var AUX_STRONG = "#11115566";
  var AUX_FAINT = "#00550025";
  function honeycombAuxLines(ceilWidth, ceilHeight, mapWidth, mapHeight, type) {
    const quarter = ceilWidth / 4;
    const halfW = ceilWidth / 2, halfH = ceilHeight / 2;
    const period = ceilWidth;
    const offs = [0, halfW - halfH, halfW, halfW + halfH];
    const widths = [1, 1.2, 1.2, 1.2];
    const offsetFamily = (max) => {
      const out = [];
      for (let base = 0; base <= max + 1e-6; base += period) {
        for (let k = 0; k < offs.length; k++) {
          const pos = base + offs[k];
          if (pos > max + 1e-6) continue;
          out.push({ pos, color: k === 0 ? AUX_STRONG : AUX_FAINT, width: widths[k] });
        }
      }
      return out;
    };
    const uniformFamily = (max) => {
      const out = [];
      for (let p = 0; p * quarter <= max + 1e-6; p++) {
        out.push({ pos: p * quarter, color: p % 4 === 0 ? AUX_STRONG : AUX_FAINT, width: 1 });
      }
      return out;
    };
    const verticalHasOffset = type === 3 /* honeycomb2 */;
    return {
      vertical: verticalHasOffset ? offsetFamily(mapWidth) : uniformFamily(mapWidth),
      horizontal: verticalHasOffset ? uniformFamily(mapHeight) : offsetFamily(mapHeight)
    };
  }
  function hexVertices(cx, cy, nw, nh, flatTop) {
    if (flatTop) {
      const d2 = nw / 4, l2 = 3 * d2, p2 = nh / 2;
      const x2 = cx - nw / 2, y2 = cy - nh / 2;
      return [
        [x2 + d2, y2],
        [x2 + l2, y2],
        [x2 + nw, y2 + p2],
        [x2 + l2, y2 + nh],
        [x2 + d2, y2 + nh],
        [x2, y2 + p2]
      ];
    }
    const d = nw / 4, l = 3 * d, p = nh / 2;
    const x = cx - nh / 2, y = cy - nw / 2;
    return [
      [x, y + d],
      [x + p, y],
      [x + nh, y + d],
      [x + nh, y + l],
      [x + p, y + nw],
      [x, y + l]
    ];
  }
  var GRID_BORDER = "#bbbbbbaa";
  function angle90Lines(mapWidth, mapHeight, nw, nh, showAux) {
    const halfW = nw / 2, halfH = nh / 2;
    const cols = Math.ceil(mapWidth / nw), rows = Math.ceil(mapHeight / nh);
    const horizontal = [];
    const vertical = [];
    for (let n = 0; n <= 2 * rows + 1; n++) {
      const even = n % 2 === 0;
      if (!even && !showAux) continue;
      horizontal.push({ pos: n * halfH, color: even ? GRID_BORDER : AUX_FAINT, width: even ? 2 : 1 });
    }
    for (let r = 0; r <= 2 * cols + 1; r++) {
      const even = r % 2 === 0;
      if (!even && !showAux) continue;
      vertical.push({ pos: r * halfW, color: even ? GRID_BORDER : AUX_FAINT, width: even ? 2 : 1 });
    }
    return { horizontal, vertical, diagonals: [] };
  }
  function angle45Lines(mapWidth, mapHeight, nw, nh, showAux) {
    const halfW = nw / 2, halfH = nh / 2;
    const cols = Math.ceil(mapWidth / nw), rows = Math.ceil(mapHeight / nh);
    const t = 2 * rows + 1, e = 2 * cols + 1;
    const horizontal = [];
    const vertical = [];
    if (showAux) {
      for (let n = 0; n <= t; n++) {
        horizontal.push({ pos: n * halfH, color: n % 2 === 0 ? AUX_STRONG : AUX_FAINT, width: 1 });
      }
      for (let r = 0; r <= e; r++) {
        vertical.push({ pos: r * halfW, color: r % 2 === 0 ? AUX_STRONG : AUX_FAINT, width: 1 });
      }
    }
    const o = t * halfH;
    const diagonals = [];
    for (let a = 1; a < e + t; a++) {
      if (a % 2 === 1) {
        diagonals.push({ x1: a * halfW, y1: 0, x2: 0, y2: a * halfH });
      } else {
        diagonals.push({ x1: a * halfW, y1: o, x2: 0, y2: (t - a) * halfH });
      }
    }
    return { horizontal, vertical, diagonals };
  }

  // src/core/undo.ts
  var UndoRedo = class {
    constructor(limit = 200) {
      this.limit = limit;
      this.undoStack = [];
      this.redoStack = [];
    }
    push(action) {
      this.undoStack.push(action);
      if (this.undoStack.length > this.limit) this.undoStack.shift();
      this.redoStack.length = 0;
    }
    undo() {
      const a = this.undoStack.pop();
      if (!a) return false;
      a.undo();
      this.redoStack.push(a);
      return true;
    }
    redo() {
      const a = this.redoStack.pop();
      if (!a) return false;
      a.redo();
      this.undoStack.push(a);
      return true;
    }
    clear() {
      this.undoStack.length = 0;
      this.redoStack.length = 0;
    }
  };

  // src/core-entry.ts
  var api = {};
  for (const k of Object.keys(core_exports)) api[k] = core_exports[k];
  api.DEFAULT_ROAD_SETS = defaultRoadSets;
  api.MapData = MapDataModel;
  api.MapParams = MapParamsModel;
  window.WMCore = api;
})();
