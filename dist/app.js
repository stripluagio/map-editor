"use strict";
(() => {
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
  var BRUSH_SIZES = [0, 1, 2, 3, 4];
  var SHIFT_BRUSH_SIZE = 2;
  function svgIcon(body) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">' + body + "</svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  var BOX = '<rect x="8" y="18" width="48" height="38" rx="4" fill="#c8873c" stroke="#5c3a12" stroke-width="3"/><path d="M8 32h48" stroke="#5c3a12" stroke-width="3"/><rect x="27" y="26" width="10" height="12" fill="#f0c060" stroke="#5c3a12" stroke-width="2"/>';
  var BARREL = '<ellipse cx="32" cy="20" rx="18" ry="7" fill="#b9762f" stroke="#4d2d0a" stroke-width="3"/><path d="M14 20v26c0 4 8 7 18 7s18-3 18-7V20" fill="#c8873c" stroke="#4d2d0a" stroke-width="3"/><path d="M14 30c6 3 30 3 36 0M14 40c6 3 30 3 36 0" stroke="#7a4a15" stroke-width="2" fill="none"/>';
  var STONE = '<path d="M22 58V20c0-6 4-10 10-10s10 4 10 10v38z" fill="#9aa0a6" stroke="#3d4247" stroke-width="3"/><path d="M26 30h12M26 38h12M26 46h12" stroke="#3d4247" stroke-width="2"/>';
  var COIN = '<circle cx="32" cy="32" r="22" fill="#f2c53d" stroke="#8a6a10" stroke-width="3"/><circle cx="32" cy="32" r="13" fill="none" stroke="#8a6a10" stroke-width="2"/>';
  var POTION = '<path d="M25 12h14v8l6 10v20a8 8 0 0 1-8 8H27a8 8 0 0 1-8-8V30l6-10z" fill="#7fd0f0" stroke="#14425c" stroke-width="3"/><path d="M22 40h20v10a6 6 0 0 1-6 6h-8a6 6 0 0 1-6-6z" fill="#e2564a"/>';
  var KEY = '<circle cx="18" cy="32" r="11" fill="none" stroke="#d8a520" stroke-width="6"/><path d="M28 32h28M46 32v10M54 32v8" stroke="#d8a520" stroke-width="6" fill="none"/>';
  var FLAG = '<path d="M18 58V8" stroke="#4a4a4a" stroke-width="5"/><path d="M18 10h30l-6 10 6 10H18z" fill="#e2564a" stroke="#7a1f1a" stroke-width="3"/>';
  var ZONE = '<rect x="6" y="14" width="52" height="36" rx="4" fill="none" stroke="#4aa3e2" stroke-width="4" stroke-dasharray="8 6"/><path d="M6 14 58 50M58 14 6 50" stroke="#4aa3e2" stroke-width="2" opacity=".55"/>';
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
    ],
    // ---- v2.0.2 新增的三种放置类型 -------------------------------------------
    // 原版把这三类的可选资源放在用户导入的 `MapEditorAssets` 里（`EditAssets` +
    // `ImportCustomAssetsView`），没导入时面板是空的（"没有该类型的编辑数据"）。
    // 我们还没有资源导入流程，所以给每个类型一个内置占位图，保证工具立刻可用；
    // 图标用内联 SVG，不额外占仓库体积。
    obj: [
      { label: "宝箱物件", icon: svgIcon(BOX), objName: "宝箱物件", w: 72, h: 72 },
      { label: "木桶物件", icon: svgIcon(BARREL), objName: "木桶物件", w: 64, h: 76 },
      { label: "石碑物件", icon: svgIcon(STONE), objName: "石碑物件", w: 64, h: 84 }
    ],
    prop: [
      { label: "金币", icon: svgIcon(COIN), objName: "金币", w: 44, h: 44 },
      { label: "药水", icon: svgIcon(POTION), objName: "药水", w: 44, h: 60 },
      { label: "钥匙", icon: svgIcon(KEY), objName: "钥匙", w: 56, h: 40 }
    ],
    event: [
      { label: "剧情事件", icon: svgIcon(FLAG), objName: "剧情事件", w: 56, h: 80 },
      { label: "触发区域", icon: svgIcon(ZONE), objName: "触发区域", w: 96, h: 64 }
    ]
  };
  var TOOL_TITLES = {
    road: "编辑路点",
    brush: "设置笔刷",
    npc: "放置NPC",
    monster: "放置怪物",
    transfer: "放置传送门",
    spawnPoint: "放置出生点",
    obj: "放置物体",
    prop: "放置道具",
    event: "放置事件"
  };
  var TOOL_TO_ACTION = {
    road: "openRoadWin",
    brush: "openBrushWin",
    npc: "openNpcWin",
    monster: "openMonsterWin",
    transfer: "openTransferWin",
    spawnPoint: "openSpawnWin",
    obj: "openObjWin",
    prop: "openPropWin",
    event: "openEventWin"
  };
  var TOOLBAR1 = [
    { label: "新建", w: 100, act: "createNewFile" },
    { label: "打开", w: 100, act: "openFile" },
    { label: "保存", w: 100, act: "saveFile" },
    { label: "另存为", w: 110, act: "saveAsFile" },
    { label: "设置", w: 90, act: "showProjectSetting" },
    { label: "导入编辑资源", w: 150, act: "importEditAssets" },
    { label: "运行（ctr + enter）", w: 180, act: "testProject" },
    { label: "添加可走路点(Q)", w: 180, act: "addEnableNode", hidden: true },
    { label: "添加不可走路点(W)", w: 180, act: "addDisableNode", hidden: true },
    { label: "添加透明行走路点(E)", w: 200, act: "addTransParentNode", hidden: true },
    { label: "添加传送路点(R)", w: 180, act: "addTransferNode", hidden: true },
    { label: "删除路点(D或右键)", w: 180, act: "deleteNode", hidden: true },
    { label: "停止放置路点（T）", w: 180, act: "notDrawNode", hidden: true },
    { label: "显示小地图(F2)", w: 170, act: "showMiniMap" },
    { label: "Excel导出数据工具", w: 200, act: "openExcelExportTool" },
    { label: "下载前端框架", w: 150, act: "downloadSource", hidden: true },
    { label: "下载大地图切图工具", w: 240, act: "downloadImageClipTool", hidden: true },
    { label: "教程", w: 90, act: "showTeach" },
    { label: "地图介绍", w: 120, act: "showIntroduce" },
    { label: "购买地图编辑器", w: 160, act: "openSaleMapEditor" },
    { label: "更多游戏项目", w: 150, act: "gotoMoreGame" }
  ];
  var TOOLBAR2 = [
    { label: "隐藏地图（U）", w: 180, act: "showMapLayer", key: "U" },
    { label: "隐藏路点(I)", w: 180, act: "showRoadLayer", key: "I" },
    { label: "隐藏物体(O)", w: 180, act: "showEntityLayer", key: "O" },
    { label: "隐藏网格(P)", w: 180, act: "showGridLayer", key: "P" },
    { label: "隐藏物体锚点(Y)", w: 200, act: "showAnchor" },
    { label: "隐藏物体标题", w: 180, act: "showEntityTitle" },
    { label: "路点编辑模式", w: 180, act: "setEditRoadModel" }
  ];
  var TOOLBAR3 = [
    { label: "设置笔刷", w: 110, act: "openBrushWin" },
    { label: "编辑路点", w: 110, act: "openRoadWin" },
    { label: "放置npc", w: 110, act: "openNpcWin" },
    { label: "放置怪物", w: 110, act: "openMonsterWin" },
    { label: "放置传送门", w: 130, act: "openTransferWin" },
    { label: "放置出生点", w: 130, act: "openSpawnWin" },
    { label: "放置物体", w: 110, act: "openObjWin" },
    { label: "放置道具", w: 110, act: "openPropWin" },
    { label: "放置事件", w: 110, act: "openEventWin" }
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
      ["另存为（Shift + S）", "saveAsFile"],
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
      ["显示隐藏锚点(Y)", "showAnchor"],
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
    download: [
      ["基础前端框架Creator_v2.4.15（免费）", "dl_creator_base_2"],
      ["基础前端框架Creator_v3.8.6（免费）", "dl_creator_base_3"],
      ["高级前端框架Creator_v2.4.15（付费）", "dl_creator_pro_2"],
      ["高级前端框架Creator_v3.8.6（付费）", "dl_creator_pro_3"],
      ["基础前端框架Laya_v3.3.8（免费）", "dl_laya_base_3"],
      ["高级前端框架Laya_v3.3.8（付费）", "dl_laya_pro_3"],
      ["基础前端框架Unity_v2022.3.13（免费）", "dl_unity_base"],
      ["sep", ""],
      ["下载大地图切图工具", "downloadImageClipTool"]
    ],
    window: [
      ["小地图预览面板(F2)", "showMiniMap"],
      ["路点编辑模式(N)", "setEditRoadModel"],
      ["普通编辑模式(M)", "setNormalRoadModel"]
    ],
    tools: [
      ["Excel导出数据工具", "openExcelExportTool"],
      ["下载大地图切图工具", "downloadImageClipTool"]
    ],
    help: [
      ["关于在线地图编辑器", "showAbout"],
      ["联系我们", "showCopyright"]
    ]
  };
  var DOWNLOAD_LINKS = {
    dl_creator_base_2: "https://easymapeditor-1258223435.cos.ap-guangzhou.myqcloud.com/framework/cocos/RPGFramework_base_2.4.15.zip",
    dl_creator_base_3: "https://easymapeditor-1258223435.cos.ap-guangzhou.myqcloud.com/framework/cocos/RPGFramework_base_3.8.6.zip",
    dl_laya_base_3: "https://easymapeditor-1258223435.cos.ap-guangzhou.myqcloud.com/framework/laya/RPGFramework_Base_Laya_3.3.8.zip",
    dl_unity_base: "https://easymapeditor-1258223435.cos.ap-guangzhou.myqcloud.com/framework/unity/RPGMapFramework_2022.3.13.zip",
    downloadImageClipTool: "https://easymapeditor-1258223435.cos.ap-guangzhou.myqcloud.com/tool/ImageClip.zip"
  };
  var ROAD_KEYS = { q: 0, w: 1, e: 2, r: 3, d: -1, t: -2 };
  var VIEW_IDS = {
    newMap: "newMapView",
    openMap: "openMapView",
    setting: "settingView",
    miniMap: "miniMapView",
    teach: "teachView",
    copyright: "copyrightView",
    sale: "saleView",
    about: "aboutView",
    excel: "excelView"
  };
  var TYPE_LABEL = {
    npc: "NPC",
    monster: "怪物",
    transfer: "传送门",
    spawnPoint: "出生点",
    item: "物体",
    obj: "物体",
    prop: "道具",
    event: "事件"
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
    ]),
    // v2.0.2 新增的三种放置类型。`EditorObjElement` / `EditorEventObjElement`
    // 在原版里就是 `baseAttributes.concat([])` —— 一个字段都不加，靠 `objName` /
    // `assetsPath` 区分具体资源；只有道具多了「是否宝箱 / 道具id / 道具数量」。
    EditorObjElement: BASE.slice(),
    EditorPropElement: BASE.concat([
      attr("isTreasure", "是否是宝箱", "bool", true, true, "是否是宝箱"),
      attr("itemId", "拾取到的道具id", "number", true, true, "道具id"),
      attr("itemNum", "拾取到的道具数量", "number", true, true, "道具数量")
    ]),
    EditorEventObjElement: BASE.slice()
  };
  var TYPE_TO_CLASS = {
    npc: "EditorNPC",
    monster: "EditorMonster",
    transfer: "EditorTransfer",
    spawnPoint: "EditorSpawnPoint",
    obj: "EditorObjElement",
    prop: "EditorPropElement",
    event: "EditorEventObjElement"
  };
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
      this.alignment = o.alignment ?? 0;
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
  var DEFAULT_OBJ_NAME = {
    npc: "NPC",
    monster: "怪物",
    transfer: "传送门",
    spawnPoint: "出生点",
    obj: "物体",
    prop: "道具",
    event: "事件"
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
    e.objName = DEFAULT_OBJ_NAME[type] || "item";
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
    d.alignment = params.alignment || 0;
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
          const l = 2 * i + 1, r22 = l + 1;
          let m = i;
          if (l < d.length && this.score(d[l]) < this.score(d[m])) m = l;
          if (r22 < d.length && this.score(d[r22]) < this.score(d[m])) m = r22;
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
  function optimizePath(road, path, isPass, level = 2) {
    if (level <= 0 || path.length < 3) return path;
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
    if (level < 2) return out;
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
  function findPath(road, sx, sy, tx, ty, mapType, pass = null, debug, maxSteps = 4e5, optimize = 2) {
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
        return optimizePath(road, path.reverse(), isPass, optimize);
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
  function playerFrame(dir, state2, frame) {
    const d = (Math.round(dir || 0) % 8 + 8) % 8;
    const row = d > 4 ? 4 - d % 4 : d;
    const base = STATE_BEGIN[state2] ?? 0;
    const f = (Math.round(frame || 0) % PLAYER_STATE_FRAMES + PLAYER_STATE_FRAMES) % PLAYER_STATE_FRAMES;
    return { col: base + f, row, flip: d > 4 };
  }
  function playerDirectionFromAngle(angle) {
    const r = Math.round((-angle + Math.PI) / (Math.PI / 4));
    const d = r > 5 ? r - 6 : r + 2;
    return (d % 8 + 8) % 8;
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
    const v = hexVertsInto(new Float64Array(12), cx, cy, nw, nh, flatTop);
    const out = [];
    for (let i = 0; i < 12; i += 2) out.push([v[i], v[i + 1]]);
    return out;
  }
  function hexVertsInto(out, cx, cy, nw, nh, flatTop) {
    const d = nw / 4, l = 3 * d, p = nh / 2;
    if (flatTop) {
      const x = cx - nw / 2, y = cy - nh / 2;
      out[0] = x + d;
      out[1] = y;
      out[2] = x + l;
      out[3] = y;
      out[4] = x + nw;
      out[5] = y + p;
      out[6] = x + l;
      out[7] = y + nh;
      out[8] = x + d;
      out[9] = y + nh;
      out[10] = x;
      out[11] = y + p;
    } else {
      const x = cx - nh / 2, y = cy - nw / 2;
      out[0] = x;
      out[1] = y + d;
      out[2] = x + p;
      out[3] = y;
      out[4] = x + nh;
      out[5] = y + d;
      out[6] = x + nh;
      out[7] = y + l;
      out[8] = x + p;
      out[9] = y + nw;
      out[10] = x;
      out[11] = y + l;
    }
    return out;
  }
  var GRID_BORDER = "#bbbbbbaa";
  function angle90Lines(mapWidth, mapHeight, nw, nh, showAux) {
    const halfW = nw / 2, halfH = nh / 2;
    const cols = Math.ceil(mapWidth / nw), rows = Math.ceil(mapHeight / nh);
    const horizontal = [];
    const vertical = [];
    for (let n = 0; n <= 2 * rows + 1; n++) {
      horizontal.push(angle90Line(n * halfH, n % 2 === 0, showAux));
    }
    for (let r = 0; r <= 2 * cols + 1; r++) {
      vertical.push(angle90Line(r * halfW, r % 2 === 0, showAux));
    }
    return { horizontal, vertical, diagonals: [] };
  }
  function angle90Line(pos, even, showAux) {
    if (even) return { pos, color: GRID_BORDER, width: 2 };
    if (!showAux) return { pos, color: GRID_BORDER, width: 2 };
    return { pos, color: AUX_FAINT, width: 1 };
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
    push(action2) {
      this.undoStack.push(action2);
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

  // src/app/state.ts
  var AppState = class {
    constructor() {
      // document
      this.params = null;
      this.road = [];
      /**
       * Cells the user has explicitly painted. The original RoadPointLayer stores
       * edited cells in `_roadNodeDic`; every cell whose value equals the default
       * road value is NOT stored and therefore not drawn — even if you paint that
       * same value back with W. This set mirrors that dictionary.
       */
      this.painted = /* @__PURE__ */ new Set();
      // key = dy * cols + dx
      /** Bumped whenever road data or its colours change (invalidates the cache). */
      this.roadVersion = 0;
      this.entities = [];
      this.selectedEntity = null;
      this.clipboard = null;
      this.geom = new MapRoadUtils();
      this.undo = new UndoRedo(200);
      // settings
      this.setting = defaultSettings();
      // view
      this.view = { scale: 1, offsetX: 0, offsetY: 0, zoom: 1 };
      this.screenScale = 1;
      this.layers = { map: true, road: true, entity: true, grid: true };
      this.mode = "edit";
      this.activeView = null;
      this.openMenu = null;
      // tools
      this.tool = "road";
      this.roadValue = 0;
      this.brushSize = 0;
      this.entityType = null;
      this.entitySkin = 0;
      this.editRoadModel = false;
      this.showAnchor = false;
      /** v2.0.2 toolBar2 「隐藏物体标题」—— 关闭时只画图标不画名字。 */
      this.showEntityTitle = true;
      /**
       * 按住 Shift 时临时切到大笔刷（原版 `EditBrush.onShiftKeyDown` → `itemList[2]`）。
       * `shiftBrushPrev` 记住按下前的档位，松键还原 —— 原版的 `lastItem`。
       */
      this.shiftBrush = false;
      this.shiftBrushPrev = 0;
      /** 导入编辑资源时扫到的图片文件名（预设规则导入尚未实现，见 app/io.ts）。 */
      this.importedAssets = [];
      /**
       * 原版 `GridLayer._isShowAuxiliaryLine` 默认是 `true`；本项目**故意默认关闭**，
       * 因为那两族矩形辅助线是原版给「画路点时对格子用的参考线」，默认铺满屏很吵。
       * 菜单「编辑 → 显示辅助线（J）」可随时打开，渲染逻辑与原版逐参数一致。
       */
      this.showAuxLine = false;
      this.roadStyle = 0;
      // interaction
      this.drawing = false;
      this.panning = false;
      this.draggingEntity = null;
      this.dragOffset = { x: 0, y: 0 };
      this.dragStart = { x: 0, y: 0 };
      this.spaceDown = false;
      this.lastMouse = { x: 0, y: 0 };
      this.cursorNode = null;
      this.pathPreview = null;
      /**
       * Entity "brush" (EditObject.setBrush): after picking a selector the new
       * entity follows the cursor as a ghost and is dropped on the next click.
       */
      this.brushEntity = null;
      // assets
      this.bgImage = null;
      this.charSheet = null;
      /** sprites[type][skinIndex] = animation frames (>=1). */
      this.sprites = {};
      // wizard temp state
      this.nmMapType = 0 /* angle45 */;
      this.nmBgImage = null;
      this.nmBgName = "";
      this.nmBgSrc = null;
      this.omData = null;
      this.omBgImage = null;
      this.omBgSrc = null;
      // minimap
      /** Last minimap blit: image origin/size scale + the white viewport rect. */
      this.minimapRect = null;
      // play mode
      this.test = null;
      this.testLoop = null;
      /** 测试视图 → 寻路设置（v2.0.2 SeekPathSetPanel）。跨次进入测试保留。 */
      this.seekSettings = {
        maxStep: 1e3,
        tpr: 0.1,
        navLine: true,
        roadCorner: false,
        optimize: 2,
        useRCA: false
      };
    }
    /** Is the given road value passable? */
    pass(v) {
      const s = this.setting.roadSetDatas.find((q) => q.value === v);
      return s ? s.isPass : true;
    }
    cellPass(dx, dy) {
      return dy >= 0 && dy < this.road.length && dx >= 0 && dx < this.road[0].length && this.pass(this.road[dy][dx]);
    }
  };
  var state = new AppState();
  function exposeGlobals(extra) {
    const w = window;
    w.WMApp = state;
    Object.assign(w, extra);
  }

  // src/render/shapes.ts
  function hexPath(ctx, cx, cy, nw, nh, flatTop) {
    const v = hexVertices(cx, cy, nw, nh, flatTop);
    ctx.moveTo(v[0][0], v[0][1]);
    for (let i = 1; i < v.length; i++) ctx.lineTo(v[i][0], v[i][1]);
    ctx.closePath();
  }
  function cellPath(ctx, cx, cy, nw, nh, halfW, halfH, type, blockScale = 0.95) {
    if (type === 0 /* angle45 */) {
      const hw = halfW * blockScale, hh = halfH * blockScale;
      ctx.moveTo(cx, cy - hh);
      ctx.lineTo(cx + hw, cy);
      ctx.lineTo(cx, cy + hh);
      ctx.lineTo(cx - hw, cy);
      ctx.closePath();
    } else if (type === 1 /* angle90 */) {
      ctx.rect(
        cx - nw * blockScale / 2,
        cy - nh * blockScale / 2,
        nw * blockScale,
        nh * blockScale
      );
    } else {
      hexPath(ctx, cx, cy, nw * blockScale, nh * blockScale, type === 2 /* honeycomb */);
    }
  }

  // src/render/gridpath.ts
  var cache = null;
  var buf = new Float64Array(12);
  var r2 = (v) => Math.round(v * 100) / 100;
  function hexOutlinePath(g, cols, rows) {
    const flatTop = g.mapType === 2 /* honeycomb */;
    const sig = [g.mapType, cols, rows, g.nodeWidth, g.nodeHeight].join("|");
    if (cache && cache.sig === sig) return cache.path;
    const nw = g.nodeWidth, nh = g.nodeHeight;
    const parts = [];
    for (let dy = 0; dy < rows; dy++) {
      for (let dx = 0; dx < cols; dx++) {
        const c = g.cellCenter(dx, dy);
        hexVertsInto(buf, c.x, c.y, nw, nh, flatTop);
        let s = "M" + r2(buf[0]) + " " + r2(buf[1]);
        for (let i = 2; i < 12; i += 2) s += "L" + r2(buf[i]) + " " + r2(buf[i + 1]);
        parts.push(s + "Z");
      }
    }
    const path = new Path2D(parts.join(""));
    cache = { sig, path };
    return path;
  }
  function invalidateHexPath() {
    cache = null;
  }

  // src/render/context.ts
  var logical = /* @__PURE__ */ new WeakMap();
  function logicalSize(cv) {
    return logical.get(cv) || { w: cv.width, h: cv.height };
  }
  function sizeCanvas(cv, lw, lh) {
    const s = state.screenScale || 1;
    const dpr = window.devicePixelRatio || 1;
    const bw = Math.max(1, Math.round(lw * s * dpr));
    const bh = Math.max(1, Math.round(lh * s * dpr));
    if (cv.width !== bw) cv.width = bw;
    if (cv.height !== bh) cv.height = bh;
    cv.style.width = lw + "px";
    cv.style.height = lh + "px";
    logical.set(cv, { w: lw, h: lh });
    return cv.width / Math.max(1, lw);
  }
  function context2d(cv) {
    const ctx = cv.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    const L = logicalSize(cv);
    ctx.setTransform(
      cv.width / Math.max(1, L.w),
      0,
      0,
      cv.height / Math.max(1, L.h),
      0,
      0
    );
    return { ctx, W: L.w, H: L.h };
  }

  // src/render/cache.ts
  var bgLayer = { cv: document.createElement("canvas"), sig: "" };
  var hexLayer = { cv: document.createElement("canvas"), sig: "" };
  var gridLayer = { cv: document.createElement("canvas"), sig: "" };
  var roadLayer = { cv: document.createElement("canvas"), sig: "" };
  var layerStats = { bg: 0, hex: 0, grid: 0, road: 0 };
  function sceneDeviceScale() {
    const cv = document.getElementById("mapCanvas");
    if (!cv || !cv.width) return 1;
    const L = logicalSize(cv);
    return cv.width / Math.max(1, L.w);
  }
  function begin(L, sig, bw, bh) {
    if (L.sig === sig && L.cv.width === bw && L.cv.height === bh) return { ctx: null, hit: true };
    if (L.cv.width !== bw) L.cv.width = bw;
    if (L.cv.height !== bh) L.cv.height = bh;
    const ctx = L.cv.getContext("2d");
    if (!ctx) return { ctx: null, hit: false };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, bw, bh);
    L.sig = sig;
    return { ctx, hit: false };
  }
  function geoKey(p) {
    return [p.mapType, p.mapWidth, p.mapHeight, p.ceilWidth, p.ceilHeight].join("|");
  }
  function layerSize(p, k) {
    return {
      bw: Math.max(1, Math.round(p.mapWidth * k)),
      bh: Math.max(1, Math.round(p.mapHeight * k))
    };
  }
  function blitScene(ctx) {
    const p = state.params;
    if (!p) return;
    const k = sceneDeviceScale();
    const { bw, bh } = layerSize(p, k);
    const bg = getBgLayer(p, bw, bh);
    if (bg) ctx.drawImage(bg, 0, 0, p.mapWidth, p.mapHeight);
    const road = getRoadLayer(p, bw, bh);
    if (road) ctx.drawImage(road, 0, 0, p.mapWidth, p.mapHeight);
    const grid = getGridLayer(p, bw, bh);
    if (grid) ctx.drawImage(grid, 0, 0, p.mapWidth, p.mapHeight);
  }
  function invalidateScene() {
    bgLayer.sig = hexLayer.sig = gridLayer.sig = roadLayer.sig = "\0";
    invalidateHexPath();
  }
  var invalidateAll = invalidateScene;
  function getBgLayer(p, bw, bh) {
    if (!state.layers.map) return null;
    const img = p.bgImage;
    if (!img || !img.complete || !img.naturalWidth) return null;
    const r = begin(bgLayer, "bg|" + (p.bgSrc || "") + "|" + bw + "x" + bh, bw, bh);
    if (!r.hit) {
      layerStats.bg++;
      if (!r.ctx) return null;
      r.ctx.setTransform(bw / p.mapWidth, 0, 0, bh / p.mapHeight, 0, 0);
      try {
        r.ctx.drawImage(img, 0, 0, p.mapWidth, p.mapHeight);
      } catch {
      }
    }
    return bgLayer.cv;
  }
  function getHexLayer(p, bw, bh) {
    if (p.mapType !== 2 /* honeycomb */ && p.mapType !== 3 /* honeycomb2 */) return null;
    const g = state.geom;
    const rows = state.road.length, cols = state.road[0]?.length ?? 0;
    if (!rows || !cols) return null;
    const sig = "hex|" + geoKey(p) + "|" + cols + "x" + rows + "|" + bw + "x" + bh;
    const r = begin(hexLayer, sig, bw, bh);
    if (!r.hit) {
      layerStats.hex++;
      if (!r.ctx) return null;
      r.ctx.setTransform(bw / p.mapWidth, 0, 0, bh / p.mapHeight, 0, 0);
      r.ctx.lineWidth = 1.5;
      r.ctx.strokeStyle = hexToRgba(GRID_BORDER);
      r.ctx.stroke(hexOutlinePath(g, cols, rows));
    }
    return hexLayer.cv;
  }
  function getGridLayer(p, bw, bh) {
    if (!state.layers.grid) return null;
    const hex = getHexLayer(p, bw, bh);
    if (hex && !state.showAuxLine) return hex;
    const sig = "grid|" + geoKey(p) + "|" + (state.showAuxLine ? 1 : 0) + "|" + bw + "x" + bh;
    const r = begin(gridLayer, sig, bw, bh);
    if (!r.hit) {
      layerStats.grid++;
      if (!r.ctx) return null;
      r.ctx.setTransform(bw / p.mapWidth, 0, 0, bh / p.mapHeight, 0, 0);
      drawGridInto(r.ctx, bw / p.mapWidth, hex);
    }
    return gridLayer.cv;
  }
  function drawGridInto(ctx, k, hex) {
    const g = state.geom, t = g.mapType;
    const nw = g.nodeWidth, nh = g.nodeHeight;
    const pw = state.params.mapWidth, ph = state.params.mapHeight;
    if (t === 1 /* angle90 */) {
      const r = angle90Lines(pw, ph, nw, nh, state.showAuxLine);
      drawAuxLines(ctx, r.horizontal, false, pw, k);
      drawAuxLines(ctx, r.vertical, true, ph, k);
      return;
    }
    if (t === 0 /* angle45 */) {
      const r = angle45Lines(pw, ph, nw, nh, state.showAuxLine);
      drawAuxLines(ctx, r.horizontal, false, pw, k);
      drawAuxLines(ctx, r.vertical, true, ph, k);
      ctx.strokeStyle = hexToRgba(GRID_BORDER);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (const s of r.diagonals) {
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
      }
      ctx.stroke();
      return;
    }
    if (state.showAuxLine) {
      const aux = honeycombAuxLines(nw, nh, pw, ph, t);
      drawAuxLines(ctx, aux.vertical, true, ph, k);
      drawAuxLines(ctx, aux.horizontal, false, pw, k);
    }
    if (hex && hex.width) ctx.drawImage(hex, 0, 0, pw, ph);
  }
  function drawAuxLines(ctx, lines, vertical, span, k) {
    const buckets = /* @__PURE__ */ new Map();
    for (const l of lines) {
      const key = l.color + "|" + l.width;
      let b = buckets.get(key);
      if (!b) {
        b = { color: l.color, width: l.width, pos: [] };
        buckets.set(key, b);
      }
      b.pos.push(l.pos);
    }
    for (const b of buckets.values()) {
      ctx.strokeStyle = hexToRgba(b.color);
      const dw = Math.max(1, Math.round(b.width * k));
      ctx.lineWidth = dw / k;
      const snap = (v) => (Math.floor(v * k) + dw / 2) / k;
      ctx.beginPath();
      for (const p of b.pos) {
        const q = snap(p);
        if (vertical) {
          ctx.moveTo(q, 0);
          ctx.lineTo(q, span);
        } else {
          ctx.moveTo(0, q);
          ctx.lineTo(span, q);
        }
      }
      ctx.stroke();
    }
  }
  function getRoadLayer(p, bw, bh) {
    if (!state.layers.road) return null;
    const sets = state.setting.roadSetDatas;
    const sig = "road|" + geoKey(p) + "|" + bw + "x" + bh + "|" + state.roadVersion + "|" + state.painted.size + "|" + sets.map((d) => d && d.color).join(",");
    const r = begin(roadLayer, sig, bw, bh);
    if (!r.hit) {
      layerStats.road++;
      if (!r.ctx) return null;
      r.ctx.setTransform(bw / p.mapWidth, 0, 0, bh / p.mapHeight, 0, 0);
      drawRoadInto(r.ctx);
    }
    return roadLayer.cv;
  }
  function drawRoadInto(ctx) {
    const sets = state.setting.roadSetDatas;
    const g = state.geom, t = g.mapType;
    const cols = state.road[0]?.length || 1;
    const buckets = sets.map(() => []);
    for (const key of state.painted) {
      const dy = Math.floor(key / cols), dx = key % cols;
      const v = state.road[dy]?.[dx];
      if (v === void 0 || v < 0 || v >= buckets.length) continue;
      buckets[v].push(key);
    }
    for (let v = 0; v < buckets.length; v++) {
      const s = sets[v];
      if (!s || !buckets[v].length) continue;
      ctx.fillStyle = roadRenderColor(v, s.color);
      ctx.beginPath();
      for (const key of buckets[v]) {
        const dy = Math.floor(key / cols), dx = key % cols;
        const c = g.cellCenter(dx, dy);
        cellPath(
          ctx,
          c.x,
          c.y,
          g.nodeWidth,
          g.nodeHeight,
          g.halfNodeWidth,
          g.halfNodeHeight,
          t
        );
      }
      ctx.fill();
    }
  }

  // src/render/minimap.ts
  var canvas = () => document.getElementById("miniMapCanvas");
  function drawMiniMap() {
    const cv = canvas();
    if (!cv) return;
    const lw = 540, lh = 450;
    sizeCanvas(cv, lw, lh);
    const { ctx, W, H } = context2d(cv);
    ctx.fillStyle = "#333";
    ctx.fillRect(0, 0, W, H);
    const p = state.params;
    if (!p) return;
    const s = Math.min((W - 4) / p.mapWidth, (H - 4) / p.mapHeight);
    const dw = p.mapWidth * s, dh = p.mapHeight * s;
    const dx = (W - dw) / 2, dy = (H - dh) / 2;
    if (p.bgImage && p.bgImage.complete) {
      try {
        ctx.drawImage(p.bgImage, dx, dy, dw, dh);
      } catch {
      }
    }
    if (state.layers.road) {
      const sets = state.setting.roadSetDatas;
      const cols = state.road[0]?.length || 1;
      const cell = Math.max(1, state.geom.nodeWidth * s);
      for (let v = 0; v < sets.length; v++) {
        if (!sets[v]) continue;
        ctx.fillStyle = roadRenderColor(v, sets[v].color);
        for (const key of state.painted) {
          const y = Math.floor(key / cols), x = key % cols;
          if (state.road[y]?.[x] !== v) continue;
          const c = state.geom.cellCenter(x, y);
          ctx.fillRect(dx + c.x * s, dy + c.y * s, cell, cell);
        }
      }
    }
    const mapCv = document.getElementById("mapCanvas");
    const z = state.view.zoom || 1;
    const viewW = mapCv.width, viewH = mapCv.height;
    const vw = viewW / z * s, vh = viewH / z * s;
    const vx = -state.view.offsetX / z * s, vy = -state.view.offsetY / z * s;
    if (p.mapWidth > viewW || p.mapHeight > viewH) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.strokeRect(dx + vx, dy + vy, vw, vh);
    }
    state.minimapRect = { dx, dy, s, vx, vy, vw, vh };
  }

  // src/render/canvas.ts
  var el = (id) => document.getElementById(id);
  var canvas2 = () => document.getElementById("mapCanvas");
  var tintCache = /* @__PURE__ */ new Map();
  function tintedSprite(img, hex) {
    const key = img.src + "|" + hex;
    const hit = tintCache.get(key);
    if (hit) return hit;
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const x = c.getContext("2d");
    if (!x) return null;
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = "multiply";
    x.fillStyle = hex;
    x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = "destination-in";
    x.drawImage(img, 0, 0);
    tintCache.set(key, c);
    return c;
  }
  function entityLabel(e) {
    const detail = String(e.detailName ?? "").trim();
    const prefix = detail ? "【" + detail + "】" : "";
    if (e.type === "spawnPoint") {
      return prefix + (e.defaultSpawn ? "【默认】" : "") + ".本地图出生点Id：" + (Number(e.spawnId) || 0);
    }
    return String(e.objName || TYPE_LABEL[e.type] || "");
  }
  function resizeCanvas() {
    const stage = el("editAreaView");
    const cv = canvas2();
    sizeCanvas(cv, stage.clientWidth, stage.clientHeight);
    render();
  }
  function render() {
    const cv = canvas2();
    if (!cv.width) return;
    const { ctx, W, H } = context2d(cv);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, W, H);
    const p = state.params;
    if (!p) return;
    const z = state.view.zoom;
    ctx.save();
    ctx.translate(state.view.offsetX, state.view.offsetY);
    ctx.scale(z, z);
    blitScene(ctx);
    if (state.layers.entity) drawEntities(ctx);
    if (state.pathPreview && state.pathPreview.length) drawPathPreview(ctx);
    if (state.cursorNode && state.mode === "edit") drawBrushFocus(ctx);
    ctx.restore();
    updateScrollBars(W, H, p.mapWidth, p.mapHeight, z);
    if (state.activeView === "miniMap") drawMiniMap();
  }
  function drawEntities(ctx) {
    if (!state.entities.length && !state.brushEntity) return;
    const now = Date.now();
    const list = state.entities.slice().sort((a, b) => (Number(b.y) || 0) - (Number(a.y) || 0));
    if (state.brushEntity) list.push(state.brushEntity);
    for (const e of list) {
      const isGhost = e === state.brushEntity;
      const x = Number(e.x) || 0, y = Number(e.y) || 0;
      const skin = Number(e.skin) || 0;
      const defs = ENTITY_SKINS[e.type];
      const def = defs ? defs[skin % defs.length] : void 0;
      const sets = state.sprites[e.type] || [];
      const frames = sets[skin % Math.max(1, sets.length)] || [];
      const ft = def?.frameTime || 0.1;
      const frame = frames.length > 1 ? Math.floor(now / (ft * 1e3)) % frames.length : 0;
      const img = frames.length ? frames[frame] : null;
      ctx.save();
      ctx.translate(x, y);
      if (isGhost) ctx.globalAlpha = 0.75;
      let drew = false;
      if (img && img.complete && img.naturalWidth) {
        const dw = def?.w || img.naturalWidth;
        const dh = def?.h || img.naturalHeight;
        const src = e.type === "spawnPoint" && e.defaultSpawn ? tintedSprite(img, "#ffff00") : img;
        try {
          ctx.drawImage(src || img, -dw / 2, -dh, dw, dh);
          drew = true;
        } catch {
        }
      }
      if (!drew) {
        ctx.fillStyle = entityColor(e.type, skin);
        ctx.strokeStyle = "#222";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-22, -72, 44, 72, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#f5d8a8";
        ctx.beginPath();
        ctx.arc(0, -78, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(0,0,0,.30)";
      ctx.beginPath();
      ctx.ellipse(0, 3, 24, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      if (!drew) {
        ctx.fillStyle = entityColor(e.type, skin);
        ctx.strokeStyle = "#222";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-22, -72, 44, 72, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#f5d8a8";
        ctx.beginPath();
        ctx.arc(0, -78, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      if (state.showEntityTitle) {
        const topY = -(def?.h || 99) - 10;
        const label = entityLabel(e);
        ctx.fillStyle = e.type === "npc" ? "#ff3535" : e.type === "monster" ? "#5599ff" : e.type === "transfer" ? "#40e0e0" : "#ffd040";
        ctx.font = 'bold 20px "Microsoft YaHei",sans-serif';
        ctx.textAlign = "center";
        ctx.strokeStyle = "#2e2e2e";
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.strokeText(label, 0, topY);
        ctx.fillText(label, 0, topY);
      }
      if (state.selectedEntity === e) {
        const ring = entityRing(String(e.type), skin);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.arc(ring.cx, ring.cy, ring.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (state.showAnchor) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(-3, -3, 6, 6);
      }
      ctx.restore();
    }
  }
  function drawPathPreview(ctx) {
    const g = state.geom;
    ctx.fillStyle = "rgba(255,180,0,.55)";
    for (const p of state.pathPreview) {
      const c = g.cellCenter(p.x, p.y);
      ctx.beginPath();
      ctx.arc(c.x, c.y, Math.min(g.nodeWidth, g.nodeHeight) / 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function drawBrushFocus(ctx) {
    const g = state.geom, t = g.mapType;
    ctx.fillStyle = "rgba(67,67,67,0.56)";
    ctx.beginPath();
    for (const [ox, oy] of g.getStroke(state.brushSize)) {
      const n = state.cursorNode;
      const cell = g.getNodeByWorldPoint(n.cx + ox, n.cy + oy);
      const c = g.cellCenter(cell.cx, cell.cy);
      cellPath(
        ctx,
        c.x,
        c.y,
        g.nodeWidth,
        g.nodeHeight,
        g.halfNodeWidth,
        g.halfNodeHeight,
        t
      );
    }
    ctx.fill();
  }
  var sbW = -1;
  var sbH = -1;
  var sbX = -1;
  var sbY = -1;
  function updateScrollBars(W, H, pw, ph, z) {
    const sw = Math.min(1, W / (pw * z)), sh = Math.min(1, H / (ph * z));
    const tw = Math.max(30, sw * W), th = Math.max(30, sh * H);
    const tx = Math.max(0, Math.min(W - tw, -state.view.offsetX / (pw * z) * W));
    const ty = Math.max(0, Math.min(H - th, -state.view.offsetY / (ph * z) * H));
    const hb = el("hScrollThumb"), vb = el("vScrollThumb");
    if (tw !== sbW) {
      hb.style.width = tw + "px";
      sbW = tw;
    }
    if (tx !== sbX) {
      hb.style.left = tx + "px";
      sbX = tx;
    }
    if (th !== sbH) {
      vb.style.height = th + "px";
      sbH = th;
    }
    if (ty !== sbY) {
      vb.style.top = ty + "px";
      sbY = ty;
    }
  }

  // src/ui/dom.ts
  var $ = (id) => document.getElementById(id);
  var $$ = (sel) => Array.from(document.querySelectorAll(sel));
  function el2(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== void 0) e.textContent = text;
    return e;
  }
  function inputValue(id) {
    return $(id).value;
  }
  function setInputValue(id, v) {
    $(id).value = v;
  }

  // src/ui/property.ts
  function buildPropertyPanel() {
    const e = state.selectedEntity;
    const c = $("propertyContent");
    c.innerHTML = "";
    $("propertyName").textContent = e ? TYPE_LABEL[e.type] || "" : "";
    if (!e) return;
    for (const a of schemaFor(e)) {
      if (!a.visible) continue;
      const row = el2("div", "prop-row");
      const lab = el2("div", "prop-label", a.label || a.attribute);
      lab.title = a.tip;
      lab.appendChild(el2("div", "prop-tip", a.tip));
      row.appendChild(lab);
      if (a.type === "bool") {
        const chk = el2("input", "prop-bool");
        chk.type = "checkbox";
        chk.checked = !!e[a.attribute];
        chk.disabled = !a.editable;
        chk.addEventListener("change", () => setProp(e, a.attribute, chk.checked));
        row.appendChild(chk);
      } else {
        const inp = el2("input", "prop-value");
        inp.type = "text";
        inp.value = String(e[a.attribute] ?? "");
        inp.disabled = !a.editable;
        if (!a.editable) inp.title = "该属性不可编辑";
        inp.addEventListener("change", () => {
          const v = a.type === "number" ? Number(inp.value) || 0 : inp.value;
          setProp(e, a.attribute, v);
        });
        row.appendChild(inp);
      }
      c.appendChild(row);
    }
  }
  function setProp(e, key, val) {
    const old = e[key];
    const cleared = key === "defaultSpawn" && val ? state.entities.filter((o) => o !== e && o.type === "spawnPoint" && !!o.defaultSpawn) : [];
    e[key] = val;
    for (const o of cleared) o.defaultSpawn = false;
    state.undo.push({
      undo: () => {
        e[key] = old;
        for (const o of cleared) o.defaultSpawn = true;
        buildPropertyPanel();
        render();
      },
      redo: () => {
        e[key] = val;
        for (const o of cleared) o.defaultSpawn = false;
        buildPropertyPanel();
        render();
      }
    });
    render();
  }

  // src/ui/overlay.ts
  var toastTimer = null;
  function toast(msg) {
    const t = document.getElementById("toast");
    if (!t) {
      console.warn("[toast]", msg);
      return;
    }
    t.textContent = msg;
    t.classList.remove("hidden");
    if (toastTimer !== null) clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => t.classList.add("hidden"), 2200);
  }
  function alertBox(msg) {
    $("alertMsg").textContent = msg;
    $("alertBox").classList.remove("hidden");
  }
  function bindOverlay() {
    const btn = el2("button", "", "确定");
    $("alertOk").addEventListener("click", () => $("alertBox").classList.add("hidden"));
  }

  // src/app/editing.ts
  function paintAt(node, value, erase = false) {
    const g = state.geom;
    const cols = state.road[0]?.length || 0;
    const changes = [];
    for (const [ox, oy] of g.getStroke(state.brushSize)) {
      const n = g.getNodeByWorldPoint(node.cx + ox, node.cy + oy);
      if (n.dy < 0 || n.dy >= state.road.length || n.dx < 0 || n.dx >= state.road[0].length) continue;
      const key = n.dy * cols + n.dx;
      const old = state.road[n.dy][n.dx];
      const oldPainted = state.painted.has(key);
      const next = erase ? state.setting.defaultRoadValue : value;
      const nextPainted = !erase;
      if (old === next && oldPainted === nextPainted) continue;
      changes.push({ dy: n.dy, dx: n.dx, old, next, oldPainted, nextPainted });
    }
    if (!changes.length) return;
    const apply = (which) => {
      for (const c of changes) {
        state.road[c.dy][c.dx] = which === "old" ? c.old : c.next;
        const k = c.dy * cols + c.dx;
        const painted = which === "old" ? c.oldPainted : c.nextPainted;
        if (painted) state.painted.add(k);
        else state.painted.delete(k);
      }
      state.roadVersion++;
      render();
    };
    apply("next");
    state.undo.push({ undo: () => apply("old"), redo: () => apply("next") });
  }
  function makeCurrentEntity(type, x, y) {
    const e = defaultEntity(type, x, y);
    const skins = ENTITY_SKINS[type] || [];
    const skinDef = skins[state.entitySkin] || skins[0];
    e.skin = String(state.entitySkin);
    e.objName = skinDef ? skinDef.objName : type === "npc" ? "NPC" : type === "monster" ? "怪物" : "出生点";
    if (type === "npc") e.npcType = state.entitySkin;
    if (type === "monster") e.monsterType = state.entitySkin;
    if (type === "transfer") e.transferType = state.entitySkin;
    return e;
  }
  function armBrush(type) {
    const cx = state.cursorNode ? state.cursorNode.cx : 200;
    const cy = state.cursorNode ? state.cursorNode.cy : 200;
    state.brushEntity = makeCurrentEntity(type, cx, cy);
    state.entityType = type;
    render();
  }
  function moveBrush(wx, wy) {
    if (!state.brushEntity) return;
    state.brushEntity.x = Math.round(wx * 1e3) / 1e3;
    state.brushEntity.y = Math.round(wy * 1e3) / 1e3;
    render();
  }
  function commitBrush(wx, wy) {
    const e = state.brushEntity;
    if (!e) return;
    if (wx <= 0 || wy <= 0 || wx >= (state.params?.mapWidth || 0) || wy >= (state.params?.mapHeight || 0)) {
      cancelBrush();
      return;
    }
    e.x = Math.round(wx * 1e3) / 1e3;
    e.y = Math.round(wy * 1e3) / 1e3;
    const n = state.geom.getNodeByPixel(wx, wy);
    const wp = state.geom.getWorldPointByPixel(n.px, n.py);
    e.cx = wp.x;
    e.cy = wp.y;
    state.brushEntity = null;
    state.entityType = null;
    state.entities.push(e);
    state.undo.push({
      undo: () => {
        const i = state.entities.indexOf(e);
        if (i >= 0) state.entities.splice(i, 1);
        buildPropertyPanel();
        render();
      },
      redo: () => {
        state.entities.push(e);
        buildPropertyPanel();
        render();
      }
    });
    selectEntity(e);
    toast("已放置：" + String(e.objName));
  }
  function cancelBrush() {
    if (!state.brushEntity) return;
    state.brushEntity = null;
    state.entityType = null;
    render();
  }
  function entityAt(wx, wy) {
    for (let i = state.entities.length - 1; i >= 0; i--) {
      const e = state.entities[i];
      const ring = entityRing(String(e.type), Number(e.skin) || 0);
      const dx = wx - (Number(e.x) || 0) - ring.cx;
      const dy = wy - (Number(e.y) || 0) - ring.cy;
      if (dx * dx + dy * dy <= ring.r * ring.r) return e;
    }
    return null;
  }
  function selectEntity(e) {
    state.selectedEntity = e;
    buildPropertyPanel();
    render();
  }
  function deleteSelectedEntity() {
    const e = state.selectedEntity;
    if (!e) return;
    const i = state.entities.indexOf(e);
    if (i < 0) return;
    state.entities.splice(i, 1);
    state.selectedEntity = null;
    buildPropertyPanel();
    render();
    state.undo.push({
      undo: () => {
        state.entities.splice(i, 0, e);
        buildPropertyPanel();
        render();
      },
      redo: () => {
        state.entities.splice(i, 1);
        state.selectedEntity = null;
        buildPropertyPanel();
        render();
      }
    });
  }
  function cutEntity() {
    if (!state.selectedEntity) return;
    state.clipboard = JSON.parse(JSON.stringify(state.selectedEntity));
    deleteSelectedEntity();
  }
  function copyEntity() {
    if (state.selectedEntity) state.clipboard = JSON.parse(JSON.stringify(state.selectedEntity));
  }
  function pasteEntity() {
    if (!state.clipboard) return;
    const e = JSON.parse(JSON.stringify(state.clipboard));
    e.x = (Number(e.x) || 0) + 40;
    e.y = (Number(e.y) || 0) + 40;
    state.entities.push(e);
    selectEntity(e);
  }

  // src/ui/menus.ts
  function buildMenus(onAction) {
    for (const mi of document.querySelectorAll(".menu-item")) {
      mi.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        const name = mi.dataset.menu || "";
        if (state.openMenu === name) {
          closeMenu();
          return;
        }
        state.openMenu = name;
        document.querySelectorAll(".menu-item").forEach((x) => x.classList.toggle("active", x === mi));
        const p = $("menuPanel");
        p.innerHTML = "";
        p.style.left = mi.offsetLeft + "px";
        for (const [label, act] of MENUS[name]) {
          if (label === "sep") {
            p.appendChild(el2("div", "menu-panel-sep"));
            continue;
          }
          const it = el2("div", "menu-panel-item", liveLabel(act, label));
          it.addEventListener("mousedown", (ev) => {
            ev.stopPropagation();
            closeMenu();
            onAction(act);
          });
          p.appendChild(it);
        }
        p.classList.add("open");
      });
    }
  }
  function liveLabel(act, fallback) {
    if (act === "toggleAuxLine") return (state.showAuxLine ? "隐藏辅助线" : "显示辅助线") + "（J）";
    if (act === "showAnchor") return (state.showAnchor ? "隐藏" : "显示") + "锚点(Y)";
    if (act === "showEntityTitle") return (state.showEntityTitle ? "隐藏" : "显示") + "物体标题";
    return fallback;
  }
  function closeMenu() {
    state.openMenu = null;
    $("menuPanel").classList.remove("open");
    document.querySelectorAll(".menu-item").forEach((x) => x.classList.remove("active"));
  }

  // src/app/input.ts
  var canvas3 = () => document.getElementById("mapCanvas");
  function canvasPoint(ev) {
    const r = canvas3().getBoundingClientRect();
    const s = state.screenScale || 1;
    return { x: (ev.clientX - r.left) / s, y: (ev.clientY - r.top) / s };
  }
  function worldPoint(ev) {
    const p = canvasPoint(ev);
    return {
      x: (p.x - state.view.offsetX) / state.view.zoom,
      y: (p.y - state.view.offsetY) / state.view.zoom
    };
  }
  function nodeAt(x, y) {
    return state.geom.getNodeByPixel(x, y);
  }
  function updateInfoBar(n) {
    const px = "(" + Math.floor(n.px) + "," + Math.floor(n.py) + ")";
    const grid = "(" + n.dx + "," + n.dy + ")";
    const world = "(" + n.cx + "," + n.cy + ")";
    $("infoPixel").textContent = px;
    $("infoGrid").textContent = grid;
    $("infoWorld").textContent = world;
    $("testInfoPixel").textContent = px;
    $("testInfoGrid").textContent = grid;
    $("testInfoWorld").textContent = world;
    const align = $("infoAlign");
    if (align) align.textContent = state.params && state.params.alignment ? "基于左上角" : "基于左下角";
    const rv = $("infoRoadValue");
    if (rv) {
      const v = state.road[n.dy]?.[n.dx];
      rv.textContent = "(" + (v === void 0 ? "-" : v) + ")";
    }
  }
  function clampView() {
    const cv = canvas3(), z = state.view.zoom;
    const L = logicalSize(cv);
    const pw = state.params ? state.params.mapWidth * z : 1920;
    const ph = state.params ? state.params.mapHeight * z : 1080;
    state.view.offsetX = Math.min(0, Math.max(L.w - pw, state.view.offsetX));
    state.view.offsetY = Math.min(0, Math.max(L.h - ph, state.view.offsetY));
  }
  function bindScrollDrag(thumb, axis) {
    thumb.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      const start = axis === "x" ? e.clientX : e.clientY;
      const ox = state.view.offsetX, oy = state.view.offsetY;
      const move = (ev) => {
        const d = (axis === "x" ? ev.clientX - start : ev.clientY - start) / (state.screenScale || 1);
        if (axis === "x") state.view.offsetX = ox - d;
        else state.view.offsetY = oy - d;
        clampView();
        render();
      };
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    });
  }
  function bindMapInput() {
    const cv = canvas3();
    cv.addEventListener("contextmenu", (e) => e.preventDefault());
    cv.addEventListener("mousedown", (e) => {
      closeMenu();
      if (state.mode !== "edit") return;
      const wp = worldPoint(e), n = nodeAt(wp.x, wp.y);
      if (e.button === 2) {
        const hitR = entityAt(wp.x, wp.y);
        if (hitR) {
          selectEntity(hitR);
          return;
        }
        state.drawing = true;
        paintAt(n, state.setting.defaultRoadValue, true);
        return;
      }
      if (e.button === 1 || state.spaceDown) {
        state.panning = true;
        state.lastMouse = { x: e.clientX, y: e.clientY };
        return;
      }
      if (e.button !== 0) return;
      if (state.brushEntity) {
        commitBrush(wp.x, wp.y);
        return;
      }
      const hit = entityAt(wp.x, wp.y);
      if (hit) {
        selectEntity(hit);
        state.draggingEntity = hit;
        state.dragOffset = { x: wp.x - Number(hit.x || 0), y: wp.y - Number(hit.y || 0) };
        state.dragStart = { x: Number(hit.x || 0), y: Number(hit.y || 0) };
        return;
      }
      if (state.editRoadModel && state.roadValue >= 0) {
        paintAt(n, state.roadValue);
        return;
      }
      if (state.roadValue === -2) return;
      state.drawing = true;
      if (state.roadValue === -1) paintAt(n, state.setting.defaultRoadValue, true);
      else paintAt(n, state.roadValue);
    });
    window.addEventListener("mousemove", (e) => {
      if (state.mode !== "edit") return;
      const r = cv.getBoundingClientRect(), s = state.screenScale || 1;
      const lx = (e.clientX - r.left) / s, ly = (e.clientY - r.top) / s;
      const L = logicalSize(cv), LW = L.w, LH = L.h;
      if (state.panning) {
        state.view.offsetX += (e.clientX - state.lastMouse.x) / s;
        state.view.offsetY += (e.clientY - state.lastMouse.y) / s;
        state.lastMouse = { x: e.clientX, y: e.clientY };
        clampView();
        render();
        return;
      }
      if (state.draggingEntity) {
        const wp2 = {
          x: (lx - state.view.offsetX) / state.view.zoom,
          y: (ly - state.view.offsetY) / state.view.zoom
        };
        state.draggingEntity.x = Math.round((wp2.x - state.dragOffset.x) * 1e3) / 1e3;
        state.draggingEntity.y = Math.round((wp2.y - state.dragOffset.y) * 1e3) / 1e3;
        buildPropertyPanel();
        render();
        return;
      }
      if (state.brushEntity) {
        const wpb = {
          x: (lx - state.view.offsetX) / state.view.zoom,
          y: (ly - state.view.offsetY) / state.view.zoom
        };
        const nb = nodeAt(wpb.x, wpb.y);
        moveBrush(nb.px, nb.py);
        state.cursorNode = nb;
        updateInfoBar(nb);
        return;
      }
      if (lx < 0 || ly < 0 || lx > LW || ly > LH) {
        state.cursorNode = null;
        render();
        return;
      }
      const wp = {
        x: (lx - state.view.offsetX) / state.view.zoom,
        y: (ly - state.view.offsetY) / state.view.zoom
      };
      const node = nodeAt(wp.x, wp.y);
      state.cursorNode = node;
      updateInfoBar(node);
      if (state.drawing) {
        if (state.roadValue === -1) paintAt(node, state.setting.defaultRoadValue, true);
        else paintAt(node, state.roadValue);
      }
      render();
    });
    window.addEventListener("mouseup", () => {
      state.drawing = false;
      state.panning = false;
      if (state.draggingEntity) {
        const ent = state.draggingEntity;
        const from = state.dragStart;
        const n = state.geom.getNodeByPixel(Number(ent.x) || 0, Number(ent.y) || 0);
        const wp = state.geom.getWorldPointByPixel(n.px, n.py);
        ent.cx = wp.x;
        ent.cy = wp.y;
        const to = { x: Number(ent.x), y: Number(ent.y) };
        state.undo.push({
          undo: () => {
            ent.x = from.x;
            ent.y = from.y;
            buildPropertyPanel();
            render();
          },
          redo: () => {
            ent.x = to.x;
            ent.y = to.y;
            buildPropertyPanel();
            render();
          }
        });
        state.draggingEntity = null;
        buildPropertyPanel();
      }
    });
    cv.addEventListener("mouseleave", () => {
      state.cursorNode = null;
      render();
    });
    cv.addEventListener("wheel", (e) => {
      e.preventDefault();
      const p = canvasPoint(e), old = state.view.zoom;
      let nz = old * (e.deltaY < 0 ? 1.1 : 0.9);
      nz = Math.max(0.2, Math.min(4, nz));
      state.view.offsetX = p.x - (p.x - state.view.offsetX) * (nz / old);
      state.view.offsetY = p.y - (p.y - state.view.offsetY) * (nz / old);
      state.view.zoom = nz;
      clampView();
      render();
    }, { passive: false });
    bindScrollDrag($("hScrollThumb"), "x");
    bindScrollDrag($("vScrollThumb"), "y");
    $("miniMapCanvas").addEventListener("click", (e) => {
      const mcv = $("miniMapCanvas");
      const r = mcv.getBoundingClientRect(), s = state.screenScale || 1;
      const x = (e.clientX - r.left) / s, y = (e.clientY - r.top) / s;
      const m = state.minimapRect;
      if (!m) return;
      const wx = (x - m.dx) / m.s, wy = (y - m.dy) / m.s;
      const L = logicalSize(cv);
      state.view.offsetX = L.w / 2 - wx * state.view.zoom;
      state.view.offsetY = L.h / 2 - wy * state.view.zoom;
      clampView();
      render();
      drawMiniMap();
    });
    window.addEventListener("resize", () => {
      fitStage();
      resizeCanvas();
    });
  }
  function fitStage() {
    const s = window.innerWidth / 1920;
    $("app").style.transform = "scale(" + s + ")";
    state.screenScale = s;
  }

  // src/render/playmode.ts
  var canvas4 = () => document.getElementById("testCanvas");
  var el3 = (id) => document.getElementById(id);
  function renderTestSize() {
    const st = el3("testStage"), cv = canvas4();
    sizeCanvas(cv, st.clientWidth, st.clientHeight);
  }
  function renderTest() {
    const cv = canvas4();
    if (!cv.width) return;
    const { ctx, W, H } = context2d(cv);
    const T = state.test;
    if (!T || !state.params) return;
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, W, H);
    const p = T.player, pw = state.params.mapWidth, ph = state.params.mapHeight;
    let ox = 0, oy = 0;
    if (T.follow) {
      ox = W / 2 - p.x;
      oy = H / 2 - p.y;
      ox = Math.min(0, Math.max(W - pw, ox));
      oy = Math.min(0, Math.max(H - ph, oy));
      const now = performance.now();
      const dt = T.lastT ? Math.min(0.1, (now - T.lastT) / 1e3) : 1 / 60;
      T.lastT = now;
      const k = T.camReady ? 1 - Math.exp(-9 * dt) : 1;
      T.camX += (ox - T.camX) * k;
      T.camY += (oy - T.camY) * k;
      if (Math.abs(ox - T.camX) < 0.3) T.camX = ox;
      if (Math.abs(oy - T.camY) < 0.3) T.camY = oy;
      ox = T.camX;
      oy = T.camY;
      T.camReady = true;
    } else {
      T.camX = 0;
      T.camY = 0;
      T.camReady = false;
      T.lastT = 0;
    }
    ctx.save();
    ctx.translate(ox, oy);
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, pw, ph);
    blitScene(ctx);
    if (state.layers.entity) drawEntities(ctx);
    if (T.showPath) drawSeek(ctx);
    drawPlayer(ctx, p);
    ctx.save();
    ctx.translate(p.x, p.y);
    drawPlayerLabels(ctx);
    ctx.restore();
    ctx.restore();
    const n = state.geom.getNodeByPixel(p.x, p.y);
    el3("testInfoPixel").textContent = "(" + Math.floor(p.x) + "," + Math.floor(p.y) + ")";
    el3("testInfoGrid").textContent = "(" + n.dx + "," + n.dy + ")";
    el3("testInfoWorld").textContent = "(" + n.cx + "," + n.cy + ")";
  }
  function drawSeek(ctx) {
    const T = state.test;
    if (!T || !T.seek || !state.params) return;
    const S = T.seek, g = state.geom;
    const dot = (n) => {
      const c = g.cellCenter(n.x, n.y);
      ctx.moveTo(c.x + 10, c.y);
      ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
    };
    if (S.step < S.frames.length) {
      const f = S.frames[Math.max(0, Math.min(S.step, S.frames.length - 1))];
      ctx.fillStyle = "#d4d4d4";
      ctx.beginPath();
      for (const n of f.open) dot(n);
      ctx.fill();
      ctx.fillStyle = "#ffcc00";
      ctx.beginPath();
      for (let i = 0; i < f.closed; i++) dot(S.closed[i]);
      ctx.fill();
      return;
    }
    if (!S.path) {
      const f = S.frames[S.frames.length - 1];
      if (!f) return;
      ctx.fillStyle = "#d4d4d4";
      ctx.beginPath();
      for (const n of f.open) dot(n);
      ctx.fill();
      ctx.fillStyle = "#ffcc00";
      ctx.beginPath();
      for (let i = 0; i < f.closed; i++) dot(S.closed[i]);
      ctx.fill();
      return;
    }
    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    for (const n of S.path) dot(n);
    ctx.fill();
    if (S.lineStep > 0 && state.seekSettings.navLine) {
      ctx.strokeStyle = "#2b2b2b";
      ctx.lineWidth = 4;
      ctx.beginPath();
      const c0 = g.cellCenter(S.path[0].x, S.path[0].y);
      ctx.moveTo(c0.x, c0.y);
      for (let i = 1; i <= Math.min(S.lineStep, S.path.length - 1); i++) {
        const c = g.cellCenter(S.path[i].x, S.path[i].y);
        ctx.lineTo(c.x, c.y);
      }
      ctx.stroke();
    }
  }
  function drawPlayer(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.alpha !== void 0 && p.alpha < 1) ctx.globalAlpha = p.alpha;
    const sheet = state.charSheet;
    const f = playerFrame(p.dir, p.state, p.frame);
    const S = PLAYER_FRAME_SIZE;
    let drew = false;
    if (sheet && sheet.complete && sheet.naturalWidth) {
      ctx.save();
      if (f.flip) ctx.scale(-1, 1);
      try {
        ctx.drawImage(
          sheet,
          f.col * S,
          f.row * S,
          S,
          S,
          PLAYER_DRAW_OFFSET.x,
          PLAYER_DRAW_OFFSET.y,
          S,
          S
        );
        drew = true;
      } catch {
      }
      ctx.restore();
    }
    if (!drew) {
      ctx.fillStyle = "rgba(0,0,0,.35)";
      ctx.beginPath();
      ctx.ellipse(0, 4, 20, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      fallbackPlayer(ctx);
    }
    ctx.restore();
  }
  function drawPlayerLabels(ctx) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = '24px "Microsoft YaHei",sans-serif';
    ctx.fillStyle = "#E7DE07";
    ctx.strokeStyle = "#2e2e2e";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.strokeText("玩家", 0, -100);
    ctx.fillText("玩家", 0, -100);
    const hint = "点击我可以拖曳位置";
    ctx.font = '20px "Microsoft YaHei",sans-serif';
    const w = ctx.measureText(hint).width;
    ctx.fillStyle = "rgba(0,0,0,.62)";
    ctx.beginPath();
    ctx.roundRect(-w / 2 - 8, -144, w + 16, 26, 4);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(hint, 0, -124);
    ctx.restore();
  }
  function fallbackPlayer(ctx) {
    ctx.fillStyle = "#f0c020";
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -52, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#e8b020";
    ctx.beginPath();
    ctx.roundRect(-14, -36, 28, 32, 6);
    ctx.fill();
    ctx.stroke();
  }

  // src/ui/toolbars.ts
  function buildToolBar(container, items, onClick) {
    container.innerHTML = "";
    for (const it of items) {
      const b = el2("div", "tb-btn" + (it.hidden ? " hidden" : ""), it.label);
      b.style.width = it.w + "px";
      b.dataset.act = it.act;
      b.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        onClick(it.act, b, e);
      });
      container.appendChild(b);
    }
  }
  var ALWAYS_VISIBLE = /* @__PURE__ */ new Set([
    "createNewFile",
    "openFile",
    "saveFile",
    "saveAsFile",
    "showProjectSetting",
    "importEditAssets",
    "testProject",
    "showMiniMap",
    "openExcelExportTool",
    "showTeach",
    "showIntroduce",
    "openSaleMapEditor",
    "gotoMoreGame"
  ]);
  function setToolbarMode(roadMode) {
    for (const b of document.querySelectorAll("#toolBar1 .tb-btn")) {
      const act = b.dataset.act || "";
      const isNormal = ALWAYS_VISIBLE.has(act);
      b.classList.toggle("hidden", roadMode ? isNormal : !isNormal);
    }
  }
  function buildToolBars(onClick) {
    buildToolBar($("toolBar1"), TOOLBAR1, onClick);
    buildToolBar($("toolBar2"), TOOLBAR2, onClick);
    buildToolBar($("toolBar3"), TOOLBAR3, onClick);
    buildToolBar($("testToolBar"), TEST_TOOLBAR, onClick);
  }
  function syncLayerBtns(layers) {
    const map = {
      showMapLayer: ["隐藏地图（U）", "显示地图（U）", layers.map],
      showRoadLayer: ["隐藏路点(I)", "显示路点(I)", layers.road],
      showEntityLayer: ["隐藏物体(O)", "显示物体(O)", layers.entity],
      showGridLayer: ["隐藏网格(P)", "显示网格(P)", layers.grid]
    };
    for (const [act, [hide, show, on]] of Object.entries(map)) {
      for (const b of document.querySelectorAll('.tb-btn[data-act="' + act + '"]')) {
        b.textContent = on ? hide : show;
      }
    }
  }
  function syncSwitchBtns(showAnchor, showTitle) {
    for (const b of document.querySelectorAll('.tb-btn[data-act="showAnchor"]')) {
      b.textContent = showAnchor ? "隐藏物体锚点(Y)" : "显示物体锚点(Y)";
    }
    for (const b of document.querySelectorAll('.tb-btn[data-act="showEntityTitle"]')) {
      b.textContent = showTitle ? "隐藏物体标题" : "显示物体标题";
    }
  }

  // src/app/document.ts
  function rebuildPainted() {
    state.painted = /* @__PURE__ */ new Set();
    const cols = state.road[0]?.length || 0;
    const def = state.setting.defaultRoadValue;
    for (let dy = 0; dy < state.road.length; dy++) {
      const row = state.road[dy];
      for (let dx = 0; dx < row.length; dx++) {
        if (row[dx] !== def) state.painted.add(dy * cols + dx);
      }
    }
  }
  function defaultBg(cb) {
    if (state.bgImage && state.bgImage.complete && state.bgImage.naturalWidth) {
      cb(state.bgImage);
      return;
    }
    const img = new Image();
    img.onload = () => {
      state.bgImage = img;
      cb(img);
    };
    img.onerror = () => cb(null);
    img.src = "assets/map_bg.jpg";
  }
  function initDocument(params, data) {
    state.params = params;
    const g = state.geom.updateMapInfo(
      params.mapWidth,
      params.mapHeight,
      params.ceilWidth,
      params.ceilHeight,
      params.mapType
    );
    const roadRows = roadRowCount(params.mapType, g.row);
    const blank = () => new Array(g.col).fill(state.setting.defaultRoadValue);
    state.road = [];
    for (let y = 0; y < roadRows; y++) state.road.push(blank());
    state.painted = /* @__PURE__ */ new Set();
    state.entities = [];
    if (data) {
      if (Array.isArray(data.roadDataArr)) {
        state.road = data.roadDataArr.map((r) => Array.isArray(r) ? r.slice() : blank());
        while (state.road.length < roadRows) state.road.push(blank());
      }
      if (Array.isArray(data.mapItems)) state.entities = data.mapItems.map(normalizeEntity);
    }
    rebuildPainted();
    state.roadVersion++;
    invalidateAll();
    state.selectedEntity = null;
    state.undo.clear();
    state.view.offsetX = 0;
    state.view.offsetY = 0;
    state.view.zoom = 1;
    state.layers = { map: true, road: true, entity: true, grid: true };
    syncLayerBtns(state.layers);
    buildPropertyPanel();
    resizeCanvas();
    render();
  }
  function createSampleMap() {
    const p = new MapParamsModel({ ...LAUNCH_PARAMS, bgSrc: "assets/map_bg.jpg" });
    initDocument(p, null);
    state.view.zoom = 1;
    state.view.offsetX = -9;
    state.view.offsetY = -553;
    render();
    renderTestSize();
    defaultBg((img) => {
      if (state.params !== p) return;
      if (!img) {
        toast("底图 assets/map_bg.jpg 加载失败：地图仍可编辑，请确认文件存在（用 npm run serve 打开更稳妥）");
        return;
      }
      p.bgImage = img;
      invalidateAll();
      render();
      renderTestSize();
    });
  }

  // src/ui/wizard.ts
  function readAlignment() {
    const el4 = document.querySelector('input[name="nmAlign"]:checked');
    return el4 ? Number(el4.value) || 0 : 0;
  }
  function buildNewMapToggles() {
    const c = $("nmToggles");
    c.innerHTML = "";
    MAP_TYPE_NAMES.forEach((name, i) => {
      const l = el2("label", "nm-toggle" + (i === state.nmMapType ? " active" : ""));
      const r = el2("input");
      r.type = "radio";
      r.name = "nmType";
      r.checked = i === state.nmMapType;
      r.addEventListener("change", () => {
        state.nmMapType = i;
        checkToggle(i);
      });
      l.append(r, el2("span", "", name));
      c.appendChild(l);
    });
  }
  function checkToggle(type) {
    const rw = $("nmRoadW");
    const rh = $("nmRoadH");
    const regLabel = $("nmRegular").parentElement;
    const detail = $("nmDetail");
    if (type === 0 /* angle45 */) {
      rw.value = "60";
      rh.value = "30";
      rh.disabled = false;
      regLabel.classList.add("hidden");
      detail.classList.add("hidden");
    } else if (type === 1 /* angle90 */) {
      rw.value = "40";
      rh.value = "40";
      rh.disabled = false;
      regLabel.classList.add("hidden");
      detail.classList.add("hidden");
    } else {
      rw.value = "40";
      rh.value = (40 / 2 * 1.732).toFixed(2);
      rh.disabled = true;
      regLabel.classList.remove("hidden");
      detail.classList.remove("hidden");
    }
    buildNewMapToggles();
    drawGridPreview();
  }
  function drawGridPreview() {
    const cv = $("nmGridPreview");
    sizeCanvas(cv, 280, 280);
    const { ctx, W, H } = context2d(cv);
    const t = state.nmMapType;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#bbb";
    ctx.lineWidth = 1;
    const nw = t === 0 /* angle45 */ ? 28 : t === 1 /* angle90 */ ? 28 : 28;
    const nh = t === 0 /* angle45 */ ? 14 : t === 1 /* angle90 */ ? 28 : 24.25;
    ctx.beginPath();
    if (t === 0 /* angle45 */) {
      for (let i = -20; i < 30; i++) {
        ctx.moveTo(i * nw, 0);
        ctx.lineTo(i * nw + H * (nw / nh), H);
        ctx.moveTo(i * nw, 0);
        ctx.lineTo(i * nw - H * (nw / nh), H);
      }
    } else if (t === 1 /* angle90 */) {
      for (let x = 0; x <= W; x += nw) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
      }
      for (let y = 0; y <= H; y += nh) {
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
      }
    } else {
      const rows = Math.ceil(H / nh) + 2, cols = Math.ceil(W / (nw * 3 / 4)) + 2;
      for (let dy = 0; dy < rows; dy++) for (let dx = 0; dx < cols; dx++) {
        let cx, cy, ww, hh, vert;
        if (t === 2 /* honeycomb */) {
          cx = dx * nw * 3 / 4 + nw / 2;
          cy = dy * nh + (dx & 1 ? nh / 2 : 0) + nh / 2;
          ww = nw;
          hh = nh;
          vert = true;
        } else {
          cx = dx * nh + (dy & 1 ? nh / 2 : 0) + nh / 2;
          cy = dy * nw * 3 / 4 + nw / 2;
          ww = nh;
          hh = nw;
          vert = false;
        }
        hexPath(ctx, cx, cy, ww, hh, vert);
      }
    }
    ctx.stroke();
  }
  function confirmNewMap(initDocument2) {
    if (!state.nmBgImage) {
      alertBox("还没选择底图");
      return;
    }
    const mw = Number(inputValue("nmWidth")) || state.nmBgImage.width;
    const mh = Number(inputValue("nmHeight")) || state.nmBgImage.height;
    const nw = Number(inputValue("nmRoadW")) || 60;
    const nh = Number(inputValue("nmRoadH")) || 30;
    const t = state.nmMapType;
    const { col, row } = computeGridSize(mw, mh, nw, nh, t);
    if (col * row > MAX_CEIL_COUNT) {
      alertBox("路点格子数不能超过" + MAX_CEIL_COUNT + ",创建失败，请重新调整路点格子大小");
      return;
    }
    const p = new MapParamsModel({
      name: inputValue("nmName") || "未命名",
      mapType: t,
      mapWidth: mw,
      mapHeight: mh,
      ceilWidth: nw,
      ceilHeight: nh,
      bgName: state.nmBgName || "map_bg",
      bgImage: state.nmBgImage,
      bgSrc: state.nmBgSrc,
      alignment: readAlignment()
    });
    state.bgImage = state.nmBgImage;
    initDocument2(p, null);
    closeView();
  }
  function bindNewMap(initDocument2) {
    $("nmBrowseBtn").addEventListener("click", () => $("nmBgFile").click());
    $("nmBgFile").addEventListener("change", (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => {
          state.nmBgImage = img;
          state.nmBgName = f.name.replace(/\.[^.]+$/, "");
          state.nmBgSrc = String(r.result);
          setInputValue("nmBgPath", f.name);
          setInputValue("nmWidth", String(img.width));
          setInputValue("nmHeight", String(img.height));
        };
        img.src = String(r.result);
      };
      r.readAsDataURL(f);
    });
    $("nmConfirmBtn").addEventListener("click", () => confirmNewMap(initDocument2));
    $("nmCancelBtn").addEventListener("click", closeView);
    $("nmRegular").addEventListener("change", (e) => {
      const rh = $("nmRoadH");
      const checked = e.target.checked;
      rh.disabled = checked;
      if (checked) rh.value = (Number(inputValue("nmRoadW")) / 2 * 1.732).toFixed(2);
    });
    $("nmRoadW").addEventListener("input", () => {
      if ((state.nmMapType === 2 /* honeycomb */ || state.nmMapType === 3 /* honeycomb2 */) && $("nmRegular").checked) {
        setInputValue("nmRoadH", (Number(inputValue("nmRoadW")) / 2 * 1.732).toFixed(2));
      }
      drawGridPreview();
    });
    $("nmRoadH").addEventListener("input", drawGridPreview);
  }
  function bindOpenMap(initDocument2) {
    $("omDataBrowse").addEventListener("click", () => $("omDataFile").click());
    $("omBgBrowse").addEventListener("click", () => $("omBgFile").click());
    $("omDataFile").addEventListener("change", (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        state.omData = String(r.result);
        setInputValue("omDataPath", f.name);
      };
      r.readAsText(f);
    });
    $("omBgFile").addEventListener("change", (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => {
          state.omBgImage = img;
          state.omBgSrc = String(r.result);
        };
        img.src = String(r.result);
        setInputValue("omBgPath", f.name);
      };
      r.readAsDataURL(f);
    });
    $("omConfirm").addEventListener("click", () => {
      if (!state.omData) {
        alertBox("请选择地图数据文件");
        return;
      }
      let d;
      try {
        d = JSON.parse(state.omData);
      } catch (err) {
        alertBox("地图数据解析失败：" + err.message);
        return;
      }
      initDocument2(paramsFromMapData(d), d);
      closeView();
    });
    $("omCancel").addEventListener("click", closeView);
  }
  function paramsFromMapData(d) {
    return new MapParamsModel({
      name: String(d.name || "未命名"),
      bgName: String(d.bgName || "map_bg"),
      mapType: d.type === void 0 || d.type === null ? 0 /* angle45 */ : Number(d.type),
      mapWidth: Number(d.mapWidth) || 1920,
      mapHeight: Number(d.mapHeight) || 1080,
      ceilWidth: Number(d.nodeWidth) || 60,
      ceilHeight: Number(d.nodeHeight) || 30,
      // 原版 v2.0.2 把原点模式写在 MapData.alignment 里，打开时必须原样带回来，
      // 否则「基于左上角」的地图会被当成「基于左下角」重新导出。
      alignment: Number(d.alignment) || 0,
      bgImage: state.omBgImage || state.bgImage,
      bgSrc: state.omBgSrc
    });
  }

  // src/ui/settings-table.ts
  var HEADERS = ["编号", "路点值", "颜色", "透明度", "颜色值", "是否显示", "是否可走"];
  function buildSettingTable() {
    const t = $("stRoadTable");
    t.innerHTML = "";
    const head = el2("div", "st-thead");
    for (const h of HEADERS) head.appendChild(el2("div", "st-th", h));
    t.appendChild(head);
    state.setting.roadSetDatas.forEach((s, i) => {
      const row = el2("div", "st-tr");
      row.appendChild(el2("div", "st-td", String(i)));
      const v = makeText(String(s.value), i, "value");
      row.appendChild(tdOf(v));
      const col = el2("div", "st-td");
      const sw = el2("span", "st-color");
      sw.style.background = hexToRgba(s.color);
      sw.addEventListener("click", () => openColorPicker(i, sw));
      col.appendChild(sw);
      row.appendChild(col);
      row.appendChild(tdOf(makeText(String(parseColor(s.color).a), i, "alpha")));
      const hx = makeText((s.color || "").toUpperCase(), i, "hex", "wide");
      row.appendChild(tdOf(hx));
      for (const k of ["isShow", "isPass"]) {
        const cb = el2("input");
        cb.type = "checkbox";
        cb.checked = !!s[k];
        cb.dataset.i = String(i);
        cb.dataset.k = k;
        row.appendChild(tdOf(cb));
      }
      t.appendChild(row);
    });
    t.querySelectorAll("input[type=text]").forEach((inp) => {
      inp.addEventListener("change", () => {
        const s = state.setting.roadSetDatas[Number(inp.dataset.i)];
        const k = inp.dataset.k;
        if (k === "value") s.value = Number(inp.value) || 0;
        else if (k === "hex") {
          s.color = inp.value;
          buildSettingTable();
        } else if (k === "alpha") {
          const c = parseColor(s.color);
          c.a = Math.max(0, Math.min(255, Number(inp.value) || 0));
          s.color = rgbaToHex(c.r, c.g, c.b, c.a);
          buildSettingTable();
        }
      });
    });
    t.querySelectorAll("input[type=checkbox]").forEach((cb) => {
      cb.addEventListener("change", () => {
        const s = state.setting.roadSetDatas[Number(cb.dataset.i)];
        s[cb.dataset.k || ""] = cb.checked;
      });
    });
  }
  function makeText(value, i, k, cls = "") {
    const inp = el2("input", cls);
    inp.type = "text";
    inp.value = value;
    inp.dataset.i = String(i);
    inp.dataset.k = k;
    return inp;
  }
  function tdOf(child) {
    const td = el2("div", "st-td");
    td.appendChild(child);
    return td;
  }
  function openColorPicker(i, sw) {
    const inp = el2("input");
    inp.type = "color";
    const c = parseColor(state.setting.roadSetDatas[i].color);
    inp.value = rgbHex(c.r, c.g, c.b);
    inp.style.position = "absolute";
    inp.style.opacity = "0";
    document.body.appendChild(inp);
    inp.click();
    inp.addEventListener("input", () => {
      const v = inp.value;
      const cc = parseColor(state.setting.roadSetDatas[i].color);
      state.setting.roadSetDatas[i].color = rgbaToHex(
        parseInt(v.slice(1, 3), 16),
        parseInt(v.slice(3, 5), 16),
        parseInt(v.slice(5, 7), 16),
        cc.a
      );
      sw.style.background = hexToRgba(state.setting.roadSetDatas[i].color);
      buildSettingTable();
    });
    inp.addEventListener("change", () => {
      buildSettingTable();
      inp.remove();
    });
  }
  function resetSettings() {
    state.setting.defaultRoadValue = 1;
    state.setting.roadSetDatas = defaultRoadSets();
    $("stDefaultValue").value = "1";
    buildSettingTable();
  }

  // src/ui/views.ts
  var teachDots = null;
  function startTeach() {
    const v = $("teachVideo");
    if (!v) return;
    const loading = document.getElementById("teachLoading");
    const dots = ["Loading.", "Loading..", "Loading..."];
    let i = 0;
    if (teachDots !== null) clearInterval(teachDots);
    if (loading) {
      loading.classList.remove("hidden");
      teachDots = window.setInterval(() => {
        i = (i + 1) % dots.length;
        loading.textContent = dots[i];
      }, 300);
    }
    try {
      v.currentTime = 0;
    } catch {
    }
    try {
      v.load();
    } catch {
    }
    v.play().catch(() => {
    });
    const reveal = () => {
      if (loading) loading.classList.add("hidden");
      if (teachDots !== null) {
        clearInterval(teachDots);
        teachDots = null;
      }
    };
    v.onloadeddata = () => {
      reveal();
      v.play().catch(() => {
      });
    };
    v.oncanplay = reveal;
  }
  function stopTeach() {
    const v = $("teachVideo");
    if (v) {
      try {
        v.pause();
        v.currentTime = 0;
      } catch {
      }
    }
    if (teachDots !== null) {
      clearInterval(teachDots);
      teachDots = null;
    }
    const loading = document.getElementById("teachLoading");
    if (loading) loading.classList.add("hidden");
  }
  function openView(name) {
    closeView();
    const id = VIEW_IDS[name];
    if (!id) return;
    $(id).classList.remove("hidden");
    state.activeView = name;
    if (name === "newMap") {
      state.nmBgImage = null;
      state.nmBgName = "";
      state.nmBgSrc = null;
      $("nmName").value = "未命名";
      $("nmWidth").value = "";
      $("nmHeight").value = "";
      $("nmBgPath").value = "";
      const align = state.params ? state.params.alignment || 0 : 0;
      for (const r of document.querySelectorAll('input[name="nmAlign"]')) {
        r.checked = Number(r.value) === align;
      }
      buildNewMapToggles();
      checkToggle(state.nmMapType);
    } else if (name === "setting") {
      $("stName").value = state.params ? state.params.name : "未命名";
      $("stDefaultValue").value = String(state.setting.defaultRoadValue);
      buildSettingTable();
    } else if (name === "miniMap") {
      drawMiniMap();
    } else if (name === "teach") {
      startTeach();
    }
  }
  function closeView() {
    if (!state.activeView) return;
    if (state.activeView === "teach") stopTeach();
    const id = VIEW_IDS[state.activeView];
    if (id) $(id).classList.add("hidden");
    state.activeView = null;
  }
  function bindViews(applySettings2) {
    $$(".view-close").forEach((b) => {
      const close = (e) => {
        e.stopPropagation();
        closeView();
      };
      b.addEventListener("mousedown", close);
      b.addEventListener("click", close);
    });
    $("stReset").addEventListener("click", resetSettings);
    $("stApply").addEventListener("click", applySettings2);
    $("stCancel").addEventListener("click", closeView);
  }

  // src/ui/toolpanel.ts
  function updateToolPanel() {
    const c = $("toolContent");
    c.innerHTML = "";
    if (state.tool === "road") buildRoadPanel(c);
    else if (state.tool === "brush") buildBrushPanel(c);
    else buildEntityPanel(c, state.tool);
    updateToolTitle();
  }
  function buildRoadPanel(c) {
    for (const s of ROAD_SWATCHES) {
      const item = el2("div", "tool-item" + (state.roadValue === s.value ? " selected" : ""));
      const sw = el2("div", "tool-swatch" + (s.del ? " del" : ""));
      if (!s.del) sw.style.background = s.color;
      sw.appendChild(el2("div", "sel-frame"));
      const lab = el2("div", "tool-label");
      lab.textContent = s.label;
      if (s.sub) lab.appendChild(el2("small", "", s.sub));
      item.append(sw, lab);
      item.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        selectRoad(s.value);
      });
      c.appendChild(item);
    }
  }
  function buildBrushPanel(c) {
    for (const sz of BRUSH_SIZES) {
      const item = el2("div", "tool-item" + (state.brushSize === sz ? " selected" : ""));
      const sw = el2("div", "tool-swatch");
      sw.style.background = "#f0f0f0";
      sw.style.display = "flex";
      sw.style.alignItems = "center";
      sw.style.justifyContent = "center";
      const inner = el2("div");
      inner.style.width = 20 + sz * 13 + "px";
      inner.style.height = 20 + sz * 13 + "px";
      inner.style.background = "#434343";
      sw.append(inner, el2("div", "sel-frame"));
      item.append(sw, el2("div", "tool-label", sz === 0 ? "单个路点" : "笔刷 " + sz));
      item.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        state.brushSize = sz;
        updateToolPanel();
      });
      c.appendChild(item);
    }
  }
  function buildEntityPanel(c, tool) {
    const skins = ENTITY_SKINS[tool] || [{ label: "默认", icon: "" }];
    const sprites = state.sprites[tool] || [];
    skins.forEach((def, i) => {
      const item = el2("div", "tool-item" + (state.entitySkin === i ? " selected" : ""));
      const sw = el2("div", "tool-swatch");
      sw.style.background = "#292929";
      sw.style.display = "flex";
      sw.style.alignItems = "center";
      sw.style.justifyContent = "center";
      const img = sprites[i] && sprites[i][0] || null;
      if (img && img.complete && img.naturalWidth) {
        const icon = el2("img");
        icon.src = img.src;
        const def2 = skins[i];
        const dw = def2?.w || img.naturalWidth;
        const dh = def2?.h || img.naturalHeight;
        const scale = Math.min(1, 86 / dh, 88 / dw);
        icon.style.width = Math.round(dw * scale) + "px";
        icon.style.height = Math.round(dh * scale) + "px";
        icon.style.objectFit = "contain";
        sw.appendChild(icon);
      } else {
        const fallback = el2("div");
        fallback.style.width = "52px";
        fallback.style.height = "86px";
        fallback.style.background = entityColor(tool, i);
        fallback.style.borderRadius = "6px 6px 0 0";
        sw.appendChild(fallback);
      }
      sw.appendChild(el2("div", "sel-frame"));
      item.append(sw, el2("div", "tool-label", def.label));
      item.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        state.entitySkin = i;
        state.entityType = tool;
        updateToolPanel();
        if (tool !== "road" && tool !== "brush") {
          armBrush(tool);
        }
      });
      c.appendChild(item);
    });
    state.entityType = tool;
  }
  function selectRoad(v) {
    state.roadValue = v;
    state.tool = "road";
    state.entityType = null;
    updateToolPanel();
  }
  function setTool(tool) {
    state.tool = tool;
    state.entityType = null;
    if (tool === "road") state.roadValue = 0;
    if (tool === "brush" && state.roadValue < 0) state.roadValue = 0;
    updateToolPanel();
  }
  function updateToolTitle() {
    $("toolTitle").textContent = TOOL_TITLES[state.tool] || "工具栏";
    for (const b2 of document.querySelectorAll("#toolBar2 .tb-btn")) b2.classList.remove("active");
    const act = TOOL_TO_ACTION[state.tool];
    const b = document.querySelector('#toolBar2 .tb-btn[data-act="' + act + '"]');
    if (b) b.classList.add("active");
  }

  // src/app/io.ts
  function getMapData() {
    if (!state.params) return null;
    const m = new MapDataModel();
    Object.assign(m, buildMapData(state.params, state.road, state.entities, state.setting));
    return m;
  }
  function download(name, text, type = "application/json") {
    const blob = new Blob([text], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  }
  var SMALL_EXPORT_MAX = 512;
  function buildMapExport(scale = 1) {
    const p = state.params;
    if (!p) return null;
    const w = Math.max(1, Math.round(p.mapWidth * scale));
    const h = Math.max(1, Math.round(p.mapHeight * scale));
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    const bg = p.bgImage;
    if (bg && bg.complete && bg.naturalWidth) {
      ctx.drawImage(bg, 0, 0, w, h);
    } else {
      ctx.fillStyle = "#222222";
      ctx.fillRect(0, 0, w, h);
    }
    return cv;
  }
  function saveCanvasPNG(cv, name) {
    let url;
    try {
      url = cv.toDataURL("image/png");
    } catch {
      toast("浏览器不允许从 file:// 页面导出画布（跨源污染）。请用 npm run serve 打开后再导出");
      return false;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 500);
    return true;
  }
  function saveFile() {
    const d = getMapData();
    if (!d) return;
    download(d.name + ".json", JSON.stringify(d.toJson()));
    toast("已保存 " + d.name + ".json");
  }
  async function saveAsFile() {
    const d = getMapData();
    if (!d) return;
    const text = JSON.stringify(d.toJson());
    const name = d.name + ".json";
    const picker = window.showSaveFilePicker;
    if (typeof picker === "function") {
      try {
        const handle = await picker({
          suggestedName: name,
          types: [{ description: "地图数据", accept: { "application/json": [".json"] } }]
        });
        const w = await handle.createWritable();
        await w.write(text);
        await w.close();
        toast("已另存为 " + name);
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }
    download(name, text);
    toast("浏览器不支持「另存为」对话框，已按普通下载保存 " + name);
  }
  function importEditAssets() {
    const input = document.createElement("input");
    input.type = "file";
    input.setAttribute("webkitdirectory", "");
    input.setAttribute("directory", "");
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener("change", () => {
      const files = Array.from(input.files || []);
      input.remove();
      if (!files.length) return;
      const root = String(files[0].webkitRelativePath || "").split("/")[0];
      if (root !== "MapEditorAssets" && root !== "mapAssets" && root !== "MapAssets") {
        toast("上传本地资源只支持命名为 MapEditorAssets 或 mapAssets 或 MapAssets 的根文件目录");
        return;
      }
      const images = files.filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f.name));
      state.importedAssets = images.map((f) => f.name);
      toast("已读取 " + images.length + " 张图片（" + root + "）。本版尚未实现「资源预设规则」导入，图片暂未进入可选皮肤列表");
    });
    input.click();
  }
  function exportTiles() {
    const p = state.params;
    if (!p) return;
    const cv = buildMapExport(1);
    if (!cv) return;
    if (!saveCanvasPNG(cv, p.name + ".png")) return;
    toast("地图切片导出：" + cv.width + "×" + cv.height + " 原图 PNG（不含路点/网格）");
  }
  function exportSmall() {
    const p = state.params;
    if (!p) return;
    const longest = Math.max(p.mapWidth, p.mapHeight) || 1;
    const scale = Math.min(1, SMALL_EXPORT_MAX / longest);
    const cv = buildMapExport(scale);
    if (!cv) return;
    if (!saveCanvasPNG(cv, p.name + "_small.png")) return;
    toast("地图缩小导出：" + cv.width + "×" + cv.height + " 缩略 PNG（不含路点/网格）");
  }
  function saveSettings() {
    try {
      localStorage.setItem("wmc_settings", JSON.stringify(state.setting));
    } catch {
    }
  }
  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem("wmc_settings") || "null");
      if (s && Array.isArray(s.roadSetDatas)) state.setting = s;
    } catch {
    }
  }
  function applySettings() {
    state.setting.defaultRoadValue = Number($("stDefaultValue").value) || 0;
    if (state.params) state.params.name = $("stName").value || state.params.name;
    saveSettings();
    state.roadVersion++;
    closeView();
    render();
    toast("设置已应用");
  }

  // src/app/playmode.ts
  var MOVE_SPEED = 200;
  var TICK_MS = 1e3 / 60;
  function seekStepS() {
    const v = state.seekSettings.tpr;
    return Math.min(1, Math.max(0.1, v || 0.1));
  }
  function pathLineInterval() {
    return seekStepS();
  }
  var fpsFrames = 0;
  var fpsLast = 0;
  function fpsTick() {
    fpsFrames++;
    const now = performance.now();
    if (now - fpsLast < 500) return;
    const fps = Math.round(fpsFrames * 1e3 / (now - fpsLast));
    fpsFrames = 0;
    fpsLast = now;
    const el4 = document.getElementById("testFps");
    if (el4) el4.textContent = "FPS " + fps;
  }
  function startTest() {
    if (!state.params) return;
    state.mode = "test";
    $("editUI").classList.add("hidden");
    $("testView").classList.remove("hidden");
    void getMapData();
    const spawns = state.entities.filter((e) => e.type === "spawnPoint");
    const def = spawns.find((e) => !!e.defaultSpawn) || spawns[0];
    let px = def ? Number(def.x) : 606;
    let py = def ? Number(def.y) : 440;
    const snap = state.geom.getNodeByPixel(px, py);
    if (!state.cellPass(snap.dx, snap.dy)) {
      let best = null, bd = Infinity;
      for (let dy = 0; dy < state.road.length; dy++) {
        for (let dx = 0; dx < state.road[0].length; dx++) {
          if (!state.cellPass(dx, dy)) continue;
          const c = state.geom.cellCenter(dx, dy);
          const d = (c.x - px) ** 2 + (c.y - py) ** 2;
          if (d < bd) {
            bd = d;
            best = c;
          }
        }
      }
      if (best) {
        px = best.x;
        py = best.y;
      }
    }
    state.test = {
      // Charactor.start(): direction = 0, state = 3 (sitdown_run) — the player
      // idles in the crouched animation until the first walk.
      player: { x: px, y: py, dir: 0, state: "sitrun", frame: 0, animT: 0, moving: false, alpha: 1, moveAngle: 0 },
      path: [],
      follow: false,
      showPath: false,
      tick: 0,
      dragPlayer: false,
      seek: null,
      target: { x: px, y: py },
      camX: 0,
      camY: 0,
      camReady: false,
      lastT: 0
    };
    syncTestButtons();
    renderTestSize();
    renderTest();
    if (state.testLoop === null) state.testLoop = window.setInterval(testTick, TICK_MS);
    toast("运行测试：点击地图寻路移动，按住玩家可拖动，F3 跟随，F4 查看寻路过程");
  }
  function closeTest() {
    state.mode = "edit";
    $("testView").classList.add("hidden");
    $("editUI").classList.remove("hidden");
    if (state.testLoop !== null) {
      clearInterval(state.testLoop);
      state.testLoop = null;
    }
    render();
  }
  function toggleFollow() {
    if (!state.test) return;
    state.test.follow = !state.test.follow;
    syncTestButtons();
    renderTest();
  }
  function toggleShowPath() {
    if (!state.test) return;
    state.test.showPath = !state.test.showPath;
    if (!state.test.showPath) state.test.seek = null;
    syncTestButtons();
    renderTest();
  }
  function syncTestButtons() {
    const T = state.test;
    if (!T) return;
    setButtonLabel("t_followPlayer", T.follow ? "屏幕不跟随玩家(F3)" : "屏幕跟随玩家(F3)");
    setButtonLabel("t_showPath", T.showPath ? "正常寻路(F4)" : "查看寻路过程(F4)");
  }
  function setButtonLabel(act, label) {
    const b = document.querySelector('#testToolBar .tb-btn[data-act="' + act + '"]');
    if (b) b.textContent = label;
  }
  function testTick() {
    const T = state.test;
    if (!T) return;
    fpsTick();
    const p = T.player;
    const dt = TICK_MS / 1e3;
    stepPlayer(T, dt);
    T.tick++;
    p.animT += dt;
    while (p.animT >= PLAYER_FRAME_TIME) {
      p.animT -= PLAYER_FRAME_TIME;
      p.frame = (p.frame + 1) % 6;
    }
    tickSeek(T, dt);
    updatePlayerAlpha(p);
    renderTest();
  }
  function stepPlayer(T, dt) {
    const p = T.player;
    if (!T.path.length) return;
    const nxt = T.path[0], c = state.geom.cellCenter(nxt.x, nxt.y);
    const dx = c.x - p.x, dy = c.y - p.y;
    const step = MOVE_SPEED * dt;
    if (dx * dx + dy * dy > step * step) {
      if (!p.moveAngle) {
        p.moveAngle = Math.atan2(dy, dx);
        p.dir = playerDirectionFromAngle(-p.moveAngle);
      }
      p.x += Math.cos(p.moveAngle) * step;
      p.y += Math.sin(p.moveAngle) * step;
    } else {
      p.moveAngle = 0;
      if (T.path.length === 1) {
        p.x = c.x;
        p.y = c.y;
        T.path.length = 0;
        p.moving = false;
        p.state = "stand";
      } else {
        T.path.shift();
      }
    }
  }
  function startWalk(T, path) {
    T.path = path.slice(1);
    T.player.moveAngle = 0;
    T.player.moving = true;
    T.player.state = "run";
  }
  function stopPlayer(T) {
    T.path.length = 0;
    T.player.moving = false;
    T.player.moveAngle = 0;
    T.player.state = "stand";
  }
  function tickSeek(T, dt) {
    const S = T.seek;
    if (!S) return;
    if (S.step < S.frames.length) {
      S.seekT += dt;
      const step = seekStepS();
      while (S.seekT >= step && S.step < S.frames.length) {
        S.seekT -= step;
        S.step++;
      }
      return;
    }
    if (!S.path) return;
    if (!S.started) {
      S.started = true;
      startWalk(T, S.path);
      S.lineStep = Math.min(1, Math.max(0, S.path.length - 1));
    }
    S.lineT += dt;
    const interval = pathLineInterval();
    while (S.lineT >= interval) {
      S.lineT -= interval;
      if (S.lineStep < S.path.length - 1) S.lineStep++;
    }
  }
  function updatePlayerAlpha(p) {
    const n = state.geom.getNodeByPixel(p.x, p.y);
    const v = state.road[n.dy]?.[n.dx];
    if (v === 2) p.alpha = 0.4;
    else if (v === 3) p.alpha = 0;
    else p.alpha = 1;
  }
  function pathTo(wx, wy) {
    if (!state.params) return null;
    const from = state.geom.getNodeByPixel(state.test.player.x, state.test.player.y);
    const t = state.geom.getNodeByPixel(wx, wy);
    const cols = state.road[0]?.length || 1;
    const key = (dx, dy) => dy * cols + dx;
    const tryPath = (dx, dy) => findPath(
      state.road,
      from.dx,
      from.dy,
      dx,
      dy,
      state.params.mapType,
      (v) => state.pass(v),
      void 0,
      4e5,
      state.seekSettings.optimize
    );
    if (state.cellPass(t.dx, t.dy)) {
      const p = tryPath(t.dx, t.dy);
      if (p && p.length > 1) return p;
    }
    const cands = [];
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
  function bindTest() {
    $("testCloseBtn").addEventListener("click", closeTest);
    const cv = $("testCanvas");
    const toMap = (e) => {
      const r = cv.getBoundingClientRect(), s = state.screenScale || 1;
      let x = (e.clientX - r.left) / s, y = (e.clientY - r.top) / s;
      const T = state.test;
      if (T && T.follow) {
        const L = logicalSize(cv);
        x += T.player.x - L.w / 2;
        y += T.player.y - L.h / 2;
      }
      return { x, y };
    };
    cv.addEventListener("mousedown", (e) => {
      const T = state.test;
      if (!T || e.button !== 0) return;
      const m = toMap(e);
      if (Math.hypot(m.x - T.player.x, m.y - T.player.y) < 44) {
        T.dragPlayer = true;
        T.path.length = 0;
        return;
      }
      if (T.showPath) {
        const from = state.geom.getNodeByPixel(T.player.x, T.player.y);
        const t = state.geom.getNodeByPixel(m.x, m.y);
        if (!state.cellPass(t.dx, t.dy)) return;
        stopPlayer(T);
        const dbg = { open: [], closed: [], frames: [] };
        const path2 = findPath(
          state.road,
          from.dx,
          from.dy,
          t.dx,
          t.dy,
          state.params.mapType,
          (v) => state.pass(v),
          dbg,
          state.seekSettings.maxStep,
          state.seekSettings.optimize
        );
        T.seek = {
          frames: dbg.frames || [],
          closed: dbg.closed,
          step: 0,
          seekT: 0,
          path: path2,
          lineStep: 0,
          lineT: 0,
          started: false
        };
        renderTest();
        return;
      }
      const path = pathTo(m.x, m.y);
      if (path) {
        startWalk(T, path);
        T.target = { x: m.x, y: m.y };
        toast("寻路成功，共 " + path.length + " 步");
      } else toast("无法到达目标（路点不可通行）");
    });
    window.addEventListener("mousemove", (e) => {
      const T = state.test;
      if (!T || !T.dragPlayer) return;
      const m = toMap(e);
      T.player.x = Math.max(0, Math.min(state.params.mapWidth, m.x));
      T.player.y = Math.max(0, Math.min(state.params.mapHeight, m.y));
      updatePlayerAlpha(T.player);
      renderTest();
    });
    window.addEventListener("mouseup", () => {
      if (state.test) state.test.dragPlayer = false;
    });
  }

  // src/app/actions.ts
  var TOOL_BY_ACTION = {
    openBrushWin: "brush",
    openRoadWin: "road",
    openNpcWin: "npc",
    openMonsterWin: "monster",
    openTransferWin: "transfer",
    openSpawnWin: "spawnPoint",
    openObjWin: "obj",
    openPropWin: "prop",
    openEventWin: "event"
  };
  var ROAD_BY_ACTION = {
    addEnableNode: 0,
    addDisableNode: 1,
    addTransParentNode: 2,
    addTransferNode: 3,
    deleteNode: -1,
    notDrawNode: -2
  };
  function action(act) {
    if (!act) return;
    closeMenu();
    const views = {
      createNewFile: "newMap",
      openFile: "openMap",
      showProjectSetting: "setting",
      showMiniMap: "miniMap",
      showTeach: "teach",
      showCopyright: "copyright",
      showSaleView: "sale",
      openSaleMapEditor: "sale",
      showAbout: "about",
      openExcelExportTool: "excel"
    };
    if (views[act]) {
      openView(views[act]);
      if (act === "showMiniMap") drawMiniMap();
      return;
    }
    if (act === "saveFile") {
      saveFile();
      return;
    }
    if (act === "saveAsFile") {
      saveAsFile();
      return;
    }
    if (act === "importEditAssets") {
      importEditAssets();
      return;
    }
    if (act === "testProject") {
      startTest();
      return;
    }
    const layerMap = {
      showMapLayer: "map",
      showRoadLayer: "road",
      showEntityLayer: "entity",
      showGridLayer: "grid",
      t_showMapLayer: "map",
      t_showRoadLayer: "road",
      t_showEntityLayer: "entity",
      t_showGridLayer: "grid"
    };
    if (layerMap[act]) {
      const key = layerMap[act];
      state.layers[key] = !state.layers[key];
      syncLayerBtns(state.layers);
      if (act.startsWith("t_")) renderTest();
      else render();
      return;
    }
    if (TOOL_BY_ACTION[act]) {
      setTool(TOOL_BY_ACTION[act]);
      render();
      return;
    }
    if (ROAD_BY_ACTION[act]) {
      selectRoad(ROAD_BY_ACTION[act]);
      return;
    }
    switch (act) {
      case "clearAllEditorAreaExecute":
        state.roadValue = -2;
        state.entityType = null;
        updateToolPanel();
        render();
        break;
      case "switchRoadStyle":
        state.roadStyle = (state.roadStyle + 1) % 3;
        toast("路点风格 " + (state.roadStyle + 1));
        render();
        break;
      case "hideBlockRoad":
        state.setting.roadSetDatas[1].isShow = !state.setting.roadSetDatas[1].isShow;
        render();
        break;
      case "showAnchor":
        state.showAnchor = !state.showAnchor;
        syncSwitchBtns(state.showAnchor, state.showEntityTitle);
        render();
        break;
      case "showEntityTitle":
        state.showEntityTitle = !state.showEntityTitle;
        syncSwitchBtns(state.showAnchor, state.showEntityTitle);
        render();
        break;
      case "toggleAuxLine":
        state.showAuxLine = !state.showAuxLine;
        toast(state.showAuxLine ? "辅助线：显示" : "辅助线：隐藏");
        render();
        break;
      case "cut":
        cutEntity();
        break;
      case "copy":
        copyEntity();
        break;
      case "paste":
        pasteEntity();
        break;
      case "exportTiles":
        exportTiles();
        break;
      case "exportSmall":
        exportSmall();
        break;
      case "showIntroduce":
        window.open("https://forum.cocos.org/t/topic/171642", "_blank");
        break;
      case "gotoMoreGame":
        window.open("https://game-1258223435.cos.ap-guangzhou.myqcloud.com/gameAD/v1.0.0/web-mobile/index.html", "_blank");
        break;
      case "downloadSource":
      case "downloadImageClipTool":
      case "dl_creator_base_2":
      case "dl_creator_base_3":
      case "dl_laya_base_3":
      case "dl_unity_base": {
        const url = DOWNLOAD_LINKS[act];
        if (url) window.open(url, "_blank");
        break;
      }
      // 付费框架没有公开下载地址 —— 原版是打开商店窗口 (`showSaleView`)。
      case "dl_creator_pro_2":
      case "dl_creator_pro_3":
      case "dl_laya_pro_3":
        openView("sale");
        break;
      case "setEditRoadModel":
        setEditRoadModel(true);
        break;
      case "setNormalRoadModel":
        setEditRoadModel(false);
        break;
      case "t_followPlayer":
        toggleFollow();
        break;
      case "t_showPath":
        toggleShowPath();
        break;
    }
  }
  function setEditRoadModel(editRoad) {
    state.editRoadModel = editRoad;
    setToolbarMode(editRoad);
    toast(editRoad ? "已切换到路点编辑模式(N)：点击格子直接写入路点" : "已切换到普通编辑模式(M)");
    render();
  }

  // src/app/shortcuts.ts
  function bindKeyboard(action2) {
    window.addEventListener("keydown", (e) => {
      const tag = e.target.tagName?.toLowerCase() || "";
      const typing = tag === "input" || tag === "textarea" || e.target.isContentEditable;
      if (e.ctrlKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        action2("openFile");
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        action2("saveFile");
        return;
      }
      if (e.shiftKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        action2("saveAsFile");
        return;
      }
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        action2("testProject");
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === "x") {
        e.preventDefault();
        if (!typing) cutEntity();
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        if (!typing) copyEntity();
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        if (!typing) pasteEntity();
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (state.mode === "edit") {
          state.undo.undo();
          render();
        }
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === "y") {
        e.preventDefault();
        if (state.mode === "edit") {
          state.undo.redo();
          render();
        }
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        if (state.mode === "edit") action2("switchRoadStyle");
        return;
      }
      if (e.key === "Escape") {
        if (state.activeView) closeView();
        else if (state.mode === "test") closeTest();
        else closeMenu();
        return;
      }
      if (state.mode === "test") {
        if (e.key === "F3") {
          e.preventDefault();
          toggleFollow();
        }
        if (e.key === "F4") {
          e.preventDefault();
          toggleShowPath();
        }
        return;
      }
      if (typing) return;
      if (e.key === "Shift") {
        if (!state.shiftBrush) {
          state.shiftBrush = true;
          state.shiftBrushPrev = state.brushSize;
          state.brushSize = SHIFT_BRUSH_SIZE;
          updateToolPanel();
        }
        return;
      }
      if (e.key === " ") {
        state.spaceDown = true;
        e.preventDefault();
        return;
      }
      const k = e.key.toLowerCase();
      if (k in ROAD_KEYS) {
        selectRoad(ROAD_KEYS[k]);
        return;
      }
      if (k === "s") {
        state.roadValue = -2;
        state.entityType = null;
        updateToolPanel();
        return;
      }
      if (k === "u") {
        action2("showMapLayer");
        return;
      }
      if (k === "i") {
        action2("showRoadLayer");
        return;
      }
      if (k === "o") {
        action2("showEntityLayer");
        return;
      }
      if (k === "p") {
        action2("showGridLayer");
        return;
      }
      if (k === "n") {
        action2("setEditRoadModel");
        return;
      }
      if (k === "m") {
        action2("setNormalRoadModel");
        return;
      }
      if (k === "y" || k === "k") {
        action2("showAnchor");
        return;
      }
      if (k === "j") {
        action2("toggleAuxLine");
        return;
      }
      if (k === "f1") {
        e.preventDefault();
        action2("hideBlockRoad");
        return;
      }
      if (k === "f2") {
        e.preventDefault();
        openView("miniMap");
        drawMiniMap();
        return;
      }
      if (k === "f5") {
        e.preventDefault();
        action2("testProject");
        return;
      }
      if (k === "delete" || k === "backspace") {
        deleteSelectedEntity();
        return;
      }
      if (k === "a") {
        astarTest();
        return;
      }
    });
    window.addEventListener("keyup", (e) => {
      if (e.key === " ") state.spaceDown = false;
      if (e.key === "Shift" && state.shiftBrush) {
        state.shiftBrush = false;
        state.brushSize = state.shiftBrushPrev;
        updateToolPanel();
      }
    });
  }
  function astarTest() {
    const r = state.road;
    if (!r.length || !state.params) return;
    const pass = (v) => state.pass(v);
    const mid = Math.floor(r.length / 2);
    let sx = -1, sy = -1, tx = -1, ty = -1;
    for (let x = 0; x < r[0].length; x++) {
      if (pass(r[mid][x])) {
        if (sx < 0) {
          sx = x;
          sy = mid;
        }
        tx = x;
        ty = mid;
      }
    }
    if (sx < 0) {
      for (let y = 0; y < r.length; y++) for (let x = 0; x < r[0].length; x++) if (pass(r[y][x]) && sx < 0) {
        sx = x;
        sy = y;
      }
      for (let y = r.length - 1; y >= 0; y--) for (let x = r[0].length - 1; x >= 0; x--) if (pass(r[y][x]) && tx < 0) {
        tx = x;
        ty = y;
      }
    }
    if (sx < 0 || tx < 0) {
      toast("没有可行走路点");
      return;
    }
    const path = findPath(r, sx, sy, tx, ty, state.params.mapType, pass);
    state.pathPreview = path;
    toast(path ? "A* 寻路：" + path.length + " 步" : "A* 寻路：无路径");
    render();
  }

  // src/ui/seekpanel.ts
  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }
  function applyMaxStep(raw) {
    let n = Math.floor(Number(raw) || 0);
    if (n === 0) n = 1e3;
    n = Math.max(1, n);
    state.seekSettings.maxStep = n;
    $("seekMaxStep").value = String(n);
  }
  function applyTpr(raw) {
    const n = clamp(Number(raw) || 0.1, 0.1, 1);
    state.seekSettings.tpr = n;
    $("seekTpr").value = String(n);
  }
  function syncSeekPanel() {
    const S = state.seekSettings;
    $("seekMaxStep").value = String(S.maxStep);
    $("seekTpr").value = String(S.tpr);
    $("seekNavLine").checked = S.navLine;
    $("seekRoadCorner").checked = S.roadCorner;
    for (const r of document.querySelectorAll('input[name="seekType"]')) {
      r.checked = Number(r.value) === (S.useRCA ? 1 : 0);
    }
    for (const r of document.querySelectorAll('input[name="seekOptimize"]')) {
      r.checked = Number(r.value) === S.optimize;
    }
  }
  function bindSeekPanel() {
    const maxStep = $("seekMaxStep");
    maxStep.addEventListener("change", () => applyMaxStep(maxStep.value));
    maxStep.addEventListener("blur", () => applyMaxStep(maxStep.value));
    const tpr = $("seekTpr");
    tpr.addEventListener("change", () => applyTpr(tpr.value));
    tpr.addEventListener("blur", () => applyTpr(tpr.value));
    $("seekNavLine").addEventListener("change", (e) => {
      state.seekSettings.navLine = e.target.checked;
      renderTest();
    });
    for (const r of document.querySelectorAll('input[name="seekType"]')) {
      r.addEventListener("change", () => {
        if (r.disabled) return;
        state.seekSettings.useRCA = Number(r.value) === 1;
      });
    }
    for (const r of document.querySelectorAll('input[name="seekOptimize"]')) {
      r.addEventListener("change", () => {
        if (r.disabled) return;
        state.seekSettings.optimize = Number(r.value);
      });
    }
    syncSeekPanel();
  }

  // src/app/excel.ts
  var TEXT = new TextDecoder("utf-8");
  function findEocd(dv) {
    const min = Math.max(0, dv.byteLength - 65557);
    for (let i = dv.byteLength - 22; i >= min; i--) {
      if (dv.getUint32(i, true) === 101010256) return i;
    }
    return -1;
  }
  function readZipIndex(buf2) {
    const dv = new DataView(buf2);
    const eocd = findEocd(dv);
    if (eocd < 0) throw new Error("不是有效的 xlsx（找不到 zip 目录）");
    const count = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const out = /* @__PURE__ */ new Map();
    for (let i = 0; i < count; i++) {
      if (dv.getUint32(p, true) !== 33639248) break;
      const method = dv.getUint16(p + 10, true);
      const compSize = dv.getUint32(p + 20, true);
      const nameLen = dv.getUint16(p + 28, true);
      const extraLen = dv.getUint16(p + 30, true);
      const commentLen = dv.getUint16(p + 32, true);
      const localOff = dv.getUint32(p + 42, true);
      const name = TEXT.decode(new Uint8Array(buf2, p + 46, nameLen));
      const lNameLen = dv.getUint16(localOff + 26, true);
      const lExtraLen = dv.getUint16(localOff + 28, true);
      out.set(name, { name, method, compSize, dataStart: localOff + 30 + lNameLen + lExtraLen });
      p += 46 + nameLen + extraLen + commentLen;
    }
    return out;
  }
  async function unzipText(buf2, entry) {
    if (!entry) return null;
    const raw = new Uint8Array(buf2, entry.dataStart, entry.compSize);
    if (entry.method === 0) return TEXT.decode(raw);
    if (entry.method !== 8) return null;
    const ds = new DecompressionStream("deflate-raw");
    const stream = new Blob([raw]).stream().pipeThrough(ds);
    return new Response(stream).text();
  }
  function xmlDoc(text) {
    return new DOMParser().parseFromString(text, "application/xml");
  }
  function colIndex(ref) {
    let n = 0;
    for (const ch of ref) {
      const c = ch.charCodeAt(0);
      if (c >= 65 && c <= 90) n = n * 26 + (c - 64);
      else break;
    }
    return n - 1;
  }
  function parseSharedStrings(xml) {
    if (!xml) return [];
    const doc = xmlDoc(xml);
    return Array.from(doc.getElementsByTagName("si")).map((si) => Array.from(si.getElementsByTagName("t")).map((t) => t.textContent || "").join(""));
  }
  function parseSheet(xml, shared) {
    const doc = xmlDoc(xml);
    const rows = [];
    for (const row of Array.from(doc.getElementsByTagName("row"))) {
      const cells = [];
      for (const c of Array.from(row.getElementsByTagName("c"))) {
        const ref = c.getAttribute("r") || "";
        const idx = ref ? colIndex(ref) : cells.length;
        const t = c.getAttribute("t");
        let val = "";
        if (t === "s") {
          const v = c.getElementsByTagName("v")[0];
          val = v ? shared[Number(v.textContent)] ?? "" : "";
        } else if (t === "inlineStr") {
          val = Array.from(c.getElementsByTagName("t")).map((x) => x.textContent || "").join("");
        } else {
          const v = c.getElementsByTagName("v")[0];
          val = v ? v.textContent || "" : "";
        }
        while (cells.length < idx) cells.push("");
        cells[idx] = val;
      }
      rows.push(cells);
    }
    return rows;
  }
  async function readXlsx(buf2) {
    const index = readZipIndex(buf2);
    const shared = parseSharedStrings(await unzipText(buf2, index.get("xl/sharedStrings.xml")));
    const wbXml = await unzipText(buf2, index.get("xl/workbook.xml"));
    const names = [];
    if (wbXml) {
      const doc = xmlDoc(wbXml);
      for (const s of Array.from(doc.getElementsByTagName("sheet"))) {
        names.push(s.getAttribute("name") || "");
      }
    }
    const sheets2 = [];
    for (let i = 1; i <= Math.max(1, names.length); i++) {
      const xml = await unzipText(buf2, index.get(`xl/worksheets/sheet${i}.xml`));
      if (xml == null) continue;
      const rows = parseSheet(xml, shared);
      if (!rows.length) continue;
      sheets2.push({ name: names[i - 1] || "Sheet" + i, rows });
    }
    if (!sheets2.length) throw new Error("这个 xlsx 里没有可读的工作表");
    return sheets2;
  }
  function parseDelimited(text, sep) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            cell += '"';
            i++;
          } else quoted = false;
        } else cell += ch;
        continue;
      }
      if (ch === '"') {
        quoted = true;
        continue;
      }
      if (ch === sep) {
        row.push(cell);
        cell = "";
        continue;
      }
      if (ch === "\r") continue;
      if (ch === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
        continue;
      }
      cell += ch;
    }
    if (cell.length || row.length) {
      row.push(cell);
      rows.push(row);
    }
    return rows.filter((r) => r.some((c) => c.trim() !== ""));
  }
  var TYPES = ["int", "number", "string", "bool", "any"];
  function toType(raw) {
    const s = (raw || "").trim().toLowerCase();
    if (s === "int" || s === "integer") return "int";
    if (s === "number" || s === "float" || s === "double") return "number";
    if (s === "string" || s === "str" || s === "text") return "string";
    if (s === "bool" || s === "boolean") return "bool";
    return TYPES.includes(s) ? s : "any";
  }
  function readFields(rows) {
    if (rows.length < 3) throw new Error("最少3行：第一行是描述，第二行是字段名，第三行是字段类型");
    const desc = rows[0], names = rows[1], types = rows[2];
    const fields = [];
    const seen = /* @__PURE__ */ new Set();
    for (let c = 0; c < names.length; c++) {
      const name = (names[c] || "").trim();
      if (!name) continue;
      if (seen.has(name)) throw new Error("出现重复值：字段名「" + name + "」重复");
      seen.add(name);
      fields.push({ name, type: toType(types[c] || ""), desc: (desc[c] || "").trim() });
    }
    if (!fields.length) throw new Error("第二行没有读到任何字段名");
    return { fields, dataRows: rows.slice(3) };
  }
  function coerce(v, t) {
    const s = (v ?? "").trim();
    if (t === "int") {
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? n : 0;
    }
    if (t === "number") {
      const n = Number(s);
      return Number.isFinite(n) ? n : 0;
    }
    if (t === "bool") return /^(1|true|yes|是)$/i.test(s);
    return s;
  }
  function toJson(fields, dataRows) {
    const arr = dataRows.map((r) => {
      const o = {};
      fields.forEach((f, i) => {
        o[f.name] = coerce(r[i], f.type);
      });
      return o;
    });
    return JSON.stringify(arr, null, 2);
  }
  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function toXml(fields, dataRows) {
    const body = dataRows.map((r) => {
      const inner = fields.map((f, i) => "    <" + f.name + ">" + esc(r[i] ?? "") + "</" + f.name + ">").join("\n");
      return "  <item>\n" + inner + "\n  </item>";
    }).join("\n");
    return '<?xml version="1.0" encoding="utf-8"?>\n<root>\n' + body + "\n</root>\n";
  }
  var TS_TYPE = {
    int: "number",
    number: "number",
    string: "string",
    bool: "boolean",
    any: "any"
  };
  function toTs(fields, dataRows, tableName) {
    const iface = "export interface " + tableName + " {\n" + fields.map((f) => "  /** " + (f.desc || f.name) + " */\n  " + f.name + ": " + TS_TYPE[f.type] + ";").join("\n") + "\n}\n";
    const arr = dataRows.map((r) => {
      const o = fields.map((f, i) => {
        const v = coerce(r[i], f.type);
        return f.name + ": " + (typeof v === "string" ? JSON.stringify(v) : String(v));
      }).join(", ");
      return "  { " + o + " },";
    }).join("\n");
    return iface + "\nexport const " + tableName + "List: " + tableName + "[] = [\n" + arr + "\n];\n";
  }
  var DEMO = [
    ["道具名称", "道具编号", "售价", "可否堆叠", "说明"],
    ["name", "id", "price", "stackable", "desc"],
    ["string", "int", "number", "bool", "string"],
    ["小血瓶", "1001", "15", "true", "恢复 30 点生命"],
    ["大血瓶", "1002", "45", "true", "恢复 120 点生命"],
    ["铁剑", "2001", "120", "false", "攻击力 +8"],
    ["钥匙", "3001", "0", "false", "开启地牢大门"]
  ];
  var sheets = [];
  function $2(id) {
    return document.getElementById(id);
  }
  function currentTable() {
    const sel = $2("excelSheet");
    const i = Number(sel.value) || 0;
    return sheets[i] || null;
  }
  function renderSheetSelect() {
    const sel = $2("excelSheet");
    sel.innerHTML = "";
    sheets.forEach((s, i) => {
      const o = document.createElement("option");
      o.value = String(i);
      o.textContent = s.name;
      sel.appendChild(o);
    });
    sel.value = "0";
  }
  function renderPreview() {
    const box = $2("excelPreview");
    const t = currentTable();
    if (!t) {
      box.innerHTML = '<div class="excel-empty">还没有数据</div>';
      return;
    }
    const rows = t.rows.slice(0, 40);
    const html = ["<table>"];
    rows.forEach((r, ri) => {
      const tag = ri === 0 ? "th" : "td";
      html.push("<tr>" + r.map((c) => "<" + tag + ">" + esc(c ?? "") + "</" + tag + ">").join("") + "</tr>");
    });
    html.push("</table>");
    if (t.rows.length > 40) html.push('<div class="excel-empty">仅预览前 40 行，共 ' + t.rows.length + " 行</div>");
    box.innerHTML = html.join("");
  }
  function setSheets(next, note) {
    sheets = next;
    renderSheetSelect();
    renderPreview();
    $2("excelStatus").textContent = note;
  }
  async function loadFile(file) {
    const buf2 = await file.arrayBuffer();
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".xlsx")) {
      const s = await readXlsx(buf2);
      setSheets(s, "已加载 " + file.name + "（" + s.length + " 个表单）");
      return;
    }
    const text = TEXT.decode(new Uint8Array(buf2));
    const sep = lower.endsWith(".tsv") ? "	" : text.indexOf("	") >= 0 && text.indexOf(",") < 0 ? "	" : ",";
    setSheets(
      [{ name: file.name.replace(/\.[^.]+$/, ""), rows: parseDelimited(text, sep) }],
      "已加载 " + file.name
    );
  }
  function bindExcel() {
    const file = $2("excelFile");
    $2("excelPick").addEventListener("click", () => file.click());
    file.addEventListener("change", () => {
      const f = file.files && file.files[0];
      if (!f) return;
      loadFile(f).catch((err) => {
        $2("excelStatus").textContent = "读取文件失败：" + err.message;
      });
      file.value = "";
    });
    $2("excelDemo").addEventListener("click", () => {
      setSheets([{ name: "道具表", rows: DEMO.map((r) => r.slice()) }], "已载入示例表（道具表）");
    });
    $2("excelSheet").addEventListener("change", renderPreview);
    $2("excelExport").addEventListener("click", () => {
      const t = currentTable();
      if (!t) {
        $2("excelStatus").textContent = "还没选择Excel文件";
        return;
      }
      let fields, dataRows;
      try {
        const parsed = readFields(t.rows);
        fields = parsed.fields;
        dataRows = parsed.dataRows;
      } catch (err) {
        $2("excelStatus").textContent = "导出数据发生异常：" + err.message;
        return;
      }
      const kind = $2("excelType").value;
      const tableName = (t.name || "Table").replace(/[^\w\u4e00-\u9fff]/g, "") || "Table";
      const base = tableName.replace(/[\u4e00-\u9fff]/g, "") || "data";
      let text, name, mime;
      if (kind === "xml") {
        text = toXml(fields, dataRows);
        name = base + ".xml";
        mime = "application/xml";
      } else if (kind === "ts") {
        text = toTs(fields, dataRows, base.charAt(0).toUpperCase() + base.slice(1));
        name = base + ".ts";
        mime = "text/plain";
      } else {
        text = toJson(fields, dataRows);
        name = base + ".json";
        mime = "application/json";
      }
      const blob = new Blob([text], { type: mime + ";charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 500);
      $2("excelStatus").textContent = "完成导出 " + name + "（" + dataRows.length + " 行 / " + fields.length + " 个字段）";
    });
    renderPreview();
  }

  // src/main.ts
  function loadAssets() {
    const cs = new Image();
    cs.onload = () => {
      state.charSheet = cs;
      render();
    };
    cs.src = "assets/character_sheet.png";
    for (const [type, defs] of Object.entries(ENTITY_SKINS)) {
      state.sprites[type] = defs.map((def) => {
        const files = def.frames && def.frames.length ? def.frames : [def.icon];
        return files.map((src) => {
          const im = new Image();
          im.onload = () => render();
          im.src = src;
          return im;
        });
      });
    }
  }
  function init() {
    const w = window;
    w.__errs = [];
    window.addEventListener("error", (ev) => w.__errs.push(String(ev.message)));
    window.addEventListener("unhandledrejection", (ev) => w.__errs.push("rej: " + String(ev.reason)));
    fitStage();
    loadSettings();
    state.nmMapType = 0 /* angle45 */;
    buildToolBars(action);
    buildMenus(action);
    updateToolPanel();
    buildPropertyPanel();
    bindMapInput();
    bindNewMap(initDocument);
    bindOpenMap(initDocument);
    bindViews(applySettings);
    bindKeyboard(action);
    bindTest();
    bindSeekPanel();
    bindOverlay();
    bindExcel();
    document.addEventListener("mousedown", closeMenu);
    window.addEventListener("resize", () => {
      fitStage();
      resizeCanvas();
      renderTestSize();
    });
    loadAssets();
    createSampleMap();
    window.setInterval(() => {
      if (state.mode === "edit" && state.params) render();
    }, 240);
    exposeGlobals({
      WMAction: action,
      WMGetMapData: getMapData,
      WMRender: render,
      WMRenderTest: renderTest,
      WMExport: { buildMapExport },
      WMCore: { entitySize, entityRing },
      /** Test seam: 寻路设置（v2.0.2 SeekPathSetRoot）。直接引用，改字段即生效。 */
      WMSeekSettings: state.seekSettings,
      /** Test seam: per-layer rebuild counters (see render/cache.ts). */
      WMLayerStats: layerStats,
      /** Test seam: build a fresh document of any map type (used by tests/e2e.cjs). */
      WMNewMap: (o) => initDocument(new MapParamsModel(o), null),
      /**
       * Test seam: paint one cell by map pixel. Same call shape as `input.ts`
       * (`paintAt(getNodeByPixel(...), value)`), so probes can exercise the real
       * brush path — including the out-of-bounds guard — without a mouse.
       */
      WMPaintAtPixel: (px, py, value) => paintAt(state.geom.getNodeByPixel(px, py), value),
      /**
       * Test seam: load a MapData JSON exactly like 文件 → 打开 does
       * (same `paramsFromMapData` path, so a probe can't drift from the UI).
       */
      WMLoadData: (d) => {
        initDocument(paramsFromMapData(d), d);
        return getMapData().toJson();
      },
      /** Test seam: append a normalized entity (used by tests + interop probes). */
      WMAddEntity: (o) => {
        state.entities.push(normalizeEntity(o));
        render();
      }
    });
    document.documentElement.classList.add("wm-booted");
    const banner = document.getElementById("bootBanner");
    if (banner) banner.style.display = "none";
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
