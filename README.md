# WebMobileClone — EasyMapEditor 高保真复刻（新项目）

对 `web-mobile`（Cocos Creator 2.x 的 **EasyMapEditor 路点地图编辑器**）的 **UI 界面、布局、功能** 的 1:1 复刻。
项目新建于 `E:\plan\test29\WebMobileClone`，不修改 `web-mobile` / `WoOOLToOOLsSharp` 原仓库。

## 一、技术选型说明（对应你的要求）

你要求「用 [WoOOLToOOLsSharp](https://github.com/AndrewChien/WoOOLToOOLsSharp) 的 UI 框架和渲染」，
同时也允许「Cocos Creator / Pixi / 不用引擎」作为备选，并强调 **性能要过得去**、**UI 与 web-mobile 一模一样**。

实际核对后的结论：

- **WoOOLToOOLsSharp 的 UI 是 Vulkan + Dear ImGui 的 dock 多面板编辑器**
  （深色主题、主菜单 `MAP EDITOR/文件/编辑/图层/光照/视图/...`、左 文件浏览器、右 格子检查器、下 Console）。
  它的窗口体系/配色/菜单/标签与原版 web-mobile（浅灰 1920×1080 定宽舞台、
  `文件/编辑/命令/窗口/帮助` 菜单、左右固定工具/属性面板、3 套坐标读数）**完全不同**，
  用 ImGui 去「画成 web-mobile 的样子」等于重写一套自绘控件，反而更慢、更难做到像素一致。
- 因此采用你明确允许的**最后一档「不用引擎」**：**原生 HTML/CSS 做 UI 外壳 + Canvas2D 做地图渲染**。

这个选择同时满足：
1. **像素级一致**：Cocos 的 1920×1080 设计分辨率 + `_fitWidth` 缩放、所有面板的
   尺寸/颜色/字号/文案都按 `res/import/0c/0cd514f0e.json`（mapEditor.fire 场景）与
   `src/project.js` 逆向结果还原；文字用 DOM 渲染，比 ImGui 位图字体更清晰。
2. **性能过得去**：地图画布只在数据变化时重绘，路点按值分组批量 `fill()`，
   网格/路点/实体均做**视口裁剪**（`inView`），不遍历屏幕外格子；
   底图与实体精灵直接用原版 `res/raw-assets` 资源（GPU 合成），
   240ms 的实体待机帧动画用 `setInterval` 轻量驱动，不跑 60fps 全量重绘。
3. **零运行时依赖、直接可跑**：TypeScript 只用于开发期类型检查与模块化，构建产物是一个普通
   `<script>`（`dist/app.js`），不需要 dotnet / Vulkan / Cocos / 运行时 npm 包；
   `file://` 双击 `index.html` 即可运行。

> **v2 重构**：源码已由原来的两个大文件（`core.js` + `app.js`）改为
> **TypeScript ES modules + 分层目录**（`core / app / render / ui`），见第三节。

> 参考依据：`WEBMOBILE_UI_SPEC.md`（本工作区，945 行，由 Cocos 场景 JSON +
> `modules_extract/*.js` + `project.js` 逆向生成），以及 `_gt3_*.png` 系列
> （headless Chrome 对**原版** `web-mobile` 在 1920×1080 下拍摄的基准截图）。

## 二、运行

```powershell
cd E:\plan\test29\WebMobileClone
npm install            # 仅开发期：typescript + esbuild
npm run build          # 类型检查 + 打包 -> dist/app.js, dist/core.js, dist/style.css
python -m http.server 8900
# 浏览器打开 http://127.0.0.1:8900/index.html
```

也可以直接双击 `index.html`（`file://` 下同样可用；保存会触发浏览器下载）。
推荐窗口 ≥ 1920×1080；窗口变小时按 Cocos `_fitWidth=true` 的规则等比缩放，底部可滚动。

| 命令 | 作用 |
|---|---|
| `npm run typecheck` | 只跑 `tsc --noEmit`（strict 模式） |
| `npm run build` | 类型检查 + esbuild 打两份 bundle（应用 / 纯核心） |
| `npm run dev` | esbuild watch 模式，改 TS 源码自动重打包 |
| `npm run test:unit` | 核心逻辑单测（加载 `dist/core.js`） |
| `npm run test:e2e` | 浏览器端到端（需先起 8900 服务） |

## 三、文件结构（TS 模块化）

```
WebMobileClone/
├── index.html                  # UI 骨架（4 顶栏 / 左工具 / 中央画布 / 右属性 / TestView / 8 模态视图）
├── package.json / tsconfig.json / package-lock.json
├── scripts/
│   └── build.mjs               # tsc --noEmit + esbuild 打包
├── src/
│   ├── main.ts                 # 组合根：装配所有模块、加载资源、启动
│   ├── core-entry.ts           # 纯核心入口（给 Node 单测用，挂 window.WMCore）
│   ├── style.css               # 全部尺寸/颜色/字号，逻辑 1920×1080 舞台
│   ├── core/                   # ★ 纯逻辑层（无 DOM，可单测）
│   │   ├── index.ts
│   │   ├── types.ts            # 全部接口/枚举：MapType / MapData / MapItem / Settings ...
│   │   ├── constants.ts        # 菜单树、工具条、路点/实体定义、启动参数
│   │   ├── color.ts            # hex<->rgba、路点渲染色、实体配色
│   │   ├── geometry.ts         # MapRoadUtils 4 种几何 + 行列公式 + 菱形笔刷
│   │   ├── schema.ts           # AttributeUtils.classDic 属性 schema
│   │   ├── model.ts            # MapParams / MapData / 实体工厂 / 导出模型
│   │   ├── pathfinding.ts      # A* + 二叉堆（方形 10/14、六边形 10/10）
│   │   └── undo.ts             # Caretaker/Memento 撤销重做栈
│   ├── app/                    # ★ 应用状态与业务动作层
│   │   ├── state.ts            # AppState 单例（唯一数据源，含类型化字段）
│   │   ├── document.ts         # 文档初始化 / 启动示例地图
│   │   ├── editing.ts          # 画笔、实体放置/选中/删除、剪贴板
│   │   ├── input.ts            # 画布鼠标/滚轮/滚动条/坐标读数
│   │   ├── io.ts               # MapData 导入导出、PNG 导出、设置持久化
│   │   ├── playmode.ts         # TestView 控制器、点击寻路、玩家动画
│   │   ├── shortcuts.ts        # 全部键盘快捷键
│   │   └── actions.ts          # 菜单/工具条动作分发器
│   ├── render/                 # ★ 渲染层（Canvas2D）
│   │   ├── index.ts
│   │   ├── context.ts          # 2D 上下文 / 视口裁剪
│   │   ├── shapes.ts           # 六边形 / 菱形 / 矩形路点路径
│   │   ├── canvas.ts           # 主画布：底图 + 路点 + 网格 + 实体 + 路径预览
│   │   ├── minimap.ts          # 地图缩略图 + 视口矩形
│   │   └── playmode.ts         # TestView 画布 + 玩家精灵
│   └── ui/                     # ★ DOM UI 层
│       ├── index.ts
│       ├── dom.ts              # DOM 小工具
│       ├── overlay.ts          # alert / toast
│       ├── toolbars.ts         # 3 条工具条构建 + 图层按钮同步
│       ├── menus.ts            # 5 个下拉菜单
│       ├── toolpanel.ts        # 左侧工具面板（路点/笔刷/实体选择器）
│       ├── property.ts         # 右侧属性面板
│       ├── views.ts            # 8 个模态视图开/关
│       ├── wizard.ts           # 新建地图向导 / 打开地图 / 网格预览
│       └── settings-table.ts   # 设置里的路点配置表 / 颜色选择器
├── dist/                       # 构建产物（app.js / core.js / style.css）
├── assets/                     # 竹林底图、角色图集、对照图
│   └── original/               # 原版运行时实际引用的 12 个素材（见第七节）
└── tests/                      # unit.test.cjs / e2e.cjs / wsmini.cjs
```

依赖方向单向：`core ← app/render/ui ← main`，`core` 不 import 任何上层模块；
`render` 与 `ui` 只依赖 `core` 类型 + `app/state`，互不直接耦合。

## 四、已复刻的 UI（与基准截图逐项对照）

- 顶栏 1 `文件 / 编辑 / 命令 / 窗口 / 帮助`（含完整下拉菜单，25 个叶子项）
- 顶栏 2 `新建 / 打开 / 保存 / 设置 / 运行（ctr + enter）/ 显示小地图(F2) / 教程 / 帮助`
- 顶栏 3 `隐藏地图（U）/ 隐藏路点(I) / 隐藏物体(O) / 隐藏网格(P) / 设置笔刷 / 编辑路点 / 放置npc / 放置怪物 / 放置传送门 / 放置出生点`
- 信息栏 `像素坐标 / 网格坐标 / 世界坐标` 三套读数（鼠标移动实时更新）
- 左侧「编辑路点」工具面板（删除路点 / 绿 行走路点(Q) / 红 障碍路点(W) / 蓝 遮挡路点(E) / 黄 隐藏路点(R)）
  + 「设置笔刷」6 档 / NPC·怪物·传送门·出生点 精灵选择器
- 右侧「属性面板 .」按 `AttributeUtils.classDic` 全量显示实体可编辑属性
- 中央画布：竹林底图 + 4 种网格几何 + 半透明路点 + 真实精灵实体 + 视口矩形/滚动条
- 8 个视图：新建地图、打开地图、设置、地图缩略图、教程、联系我们、购买、运行测试
- TestView（全屏）：`测试地图` 标题栏 + 6 个按钮 + 3 套坐标 + 可行走的玩家角色

## 五、已复刻的功能

| 分类 | 功能 |
|---|---|
| 新建地图 | 必选底图（自动取宽高）、4 种类型（45°/90°/纵六边形/横六边形）、各类型默认格尺寸、正六边形锁高、250 万格上限校验、实时网格预览、备注文案 |
| 地图数据 | 12 字段 `MapData`；`roadDataArr[dy][dx]`（angle45 为 2×row 行）；`mapItems[]` 按 classDic 顺序全量导出 |
| 路点 | 0/1/2/3 四种值 + 颜色设置（`#00ff0065` 等）+ 菱形笔刷 0–5（1/5/13/25/41 格）+ Q/W/E/R/D/T/S 快捷键 + 右键删除 |
| 实体 | npc / monster / transfer / spawnPoint / item；放置、选中、拖拽、删除、属性编辑、导出 |
| 寻路 | A\*（方形 8 邻域 10/14，六边形 6 邻域 10/10）+ 二叉堆 + 通行判定 + 路径预览 |
| 视图 | 4 层显隐 U/I/O/P、小地图（底图+视口矩形+点击定位）、撤销重做 Ctrl+Z/Y、缩放/平移/滚动条 |
| 设置 | 路点颜色/透明度/是否显示/是否可走/默认路点值，重置 + 应用 + localStorage 持久化 |
| 试玩 | Ctrl+Enter 进入 TestView，点击寻路行走，8 方向角色图集动画，F3 跟随、F4 路径、U/I/O/P 图层切换 |
| 文件 | 打开 MapData JSON + 底图、保存/导出 JSON（紧凑、字段顺序与原版一致）、PNG 切片/缩小导出 |
| 菜单 | 文件/编辑/命令/窗口/帮助 全部动作 + Ctrl+O / Ctrl+S / Ctrl+Enter / Ctrl+B / Ctrl+X·C·V / Ctrl+Z·Y / F1 / F2 / J 等快捷键 |

## 六、验证

```powershell
cd E:\plan\test29\WebMobileClone
npm run build                   # 先构建 dist/
npm run test:unit               # 核心逻辑单测：159 passed, 0 failed
npm run test:e2e                # 浏览器端到端：182 passed, 0 failed（需先起 8900 服务）
# 或：npm test                  # 两个一起跑
```

测试文件为 `.cjs`（CommonJS），因为 `package.json` 使用 `"type":"module"` 供构建脚本用。
`unit.test.cjs` 通过 `vm` 加载 `dist/core.js`（纯逻辑，无 DOM）；`e2e.cjs` 用 Chrome DevTools
Protocol 直接驱动真实浏览器点击并断言，不依赖 puppeteer/playwright。

基准对比截图：`assets/comparison.png`（原版 vs 复刻，均为 1920×1080）。
原版状态截图另见工作区 `_gt3_04_newmap.png`、`_gt3_08_run.png` 等。

### 实体交互与试玩（v5 修复）

对照原版 `EditObject.setBrush` / `EntityLayer` / `SceneMap` / `Charactor` 实现：

**放置实体（幽灵跟手）**

原版点选左侧选择器后会调用 `EditObject.setBrush(element, true)`，实体被挂到 `dragLayer`，
每帧 `update()` 里 `node.x = dragLayer.mouseX + dragDir.x`，即**实体跟着鼠标走**，
松手（`onDropDown`）时才加入 `entityLayer` 并选中。本项目复刻为：

| 步骤 | 行为 |
|---|---|
| 点选择器 | `armBrush()` 生成幽灵实体（半透明），跟随鼠标 |
| 移动鼠标 | 幽灵实时吸附到当前网格（`moveBrush`） |
| 左键点击 | `commitBrush()` 落点、写入 `mapItems`、自动选中并打开属性面板 |
| 点在地图外 | 丢弃幽灵（原版 `clearBrush`） |

**已放置实体的选中与拖动**

原版 `EntityLayer.onMouseDown` 左键按下时置顶该实体并挂 `MOUSE_MOVE`，
移动时 `setBrush` 把它变成跟手的幽灵（保留抓取偏移），松手再落点。
本项目：左键按住实体 → 选中 + 开始拖动（保留抓取偏移）→ 移动 → 松手落点，
并把 `cx/cy` 同步到落点所在网格；整段拖动记为一条撤销记录。
**右键点实体只做选中**（原版 `onRightClickObject`），右键点空地才是删除路点。
实体按 `y` 倒序绘制（原版 `setDepthRand`），下方的压在上方。

**命中区 = 白圈**（v6 修复）：之前用 80×140 的矩形判定，鼠标离实体很远也会被抓住。
现在与渲染出的白色选中圈完全一致 —— 圆心在实体原点下方 40px、半径 44px，
圈外点击不再选中/拖动（`SELECTION_RADIUS` / `SELECTION_CY` 与渲染共用常量）。

### 性能：离屏合成（v6）

原来每帧都要重建网格路径（honeycomb 48×55 个六边形 ≈ 1.6 万条线段）＋重画路点，
隐藏网格后立刻变流畅就是这个原因。现在把**底图 + 路点 + 网格**一次性合成到
一张与地图等大的离屏 canvas（1920×1440），每帧只做 **一次 `drawImage`**：

| 场景 | 优化前 | 优化后 |
|---|---|---|
| 编辑视图 120 次 `render()` | — | **< 120 ms**（约 0.5 ms/帧） |
| 试玩 FPS（无 GPU 的 headless 环境） | **14** | **63** |

缓存失效条件：地图参数、图层开关、路点版本号（`state.roadVersion`）、
路点颜色或已绘制格子数变化时自动重建；平移/缩放/角色行走**不触发重建**。

### 试玩（TestView / SceneMap）

| 项 | 原版 | 本项目 |
|---|---|---|
| 初始跟随 | `isFollowPlayer = false` | ✓ 默认不跟随 |
| 跟随平滑 | `position.lerp(target, 2*dt)` | ✓ 时间无关缓动 `1-e^(-9dt)` |
| 按钮文案 | `屏幕跟随玩家(F3)` ⇄ `屏幕不跟随玩家(F3)` | ✓ 动态切换 |
| F4 | `查看寻路过程(F4)` ⇄ `正常寻路(F4)`，逐步动画展示 A\* 探索 | ✓ 灰色 closed + 黄色 open，按步推进，`maxStep=220` |
| 点击地图 | `movePlayer` → `seekPath2` 寻路后沿节点行走，速度 **200 px/s** | ✓ |
| 目标被阻挡 | `seekPath2` 限制步数后回退到最近可达节点（尽量走近） | ✓ 候选点排序取首个可达 |
| 拖动玩家 | 按住玩家 `_startDrag`，移动时 `player.node.position = mouse` | ✓ |
| 玩家朝向/动画 | `direction` 8 方向（>4 镜像缩放）+ `run/stand` 帧段 | ✓ 角色图集 24×5 |
| 玩家透明度 | 路点值 2 → α0.4，值 3 → α0 | ✓ |
| 出生点 | `getSpainPoint()` 优先 `defaultSpawn`，否则第一个；无则 (606,440) | ✓ |
| FPS | — | ✓ 右下角 `FPS nn` 实时显示 |

## 七、与原版运行时状态逐项核对（v3/v4 校准）

用 Chrome DevTools Protocol 直接读取**原版 Cocos 2.1.3** 的运行时场景图与组件状态
（结果存于工作区 `_uispec/orig_state2.json`、`_uispec/orig_skins.json`），据此校准：

| 项 | 原版真实值 | 本项目 |
|---|---|---|
| 引擎 / 场景 | Cocos Creator 2.1.3 / `mapEditor` | — |
| `mapName` / `bgName` | `mapData` / `map_bg` | ✓ |
| `mapType` | `3`（honeycomb2 横六边形） | ✓ |
| `mapWidth`×`mapHeight` | 1920×1440 | ✓ |
| `ceilWidth`×`ceilHeight` | 40×34.64 | ✓ |
| `roadDataArr` | **48×55 全部 = 1**（`dist={"1":2640}`），启动时不画任何路点 | ✓ |
| `mapItems`（实体） | **0 个**（`getMapUnits()` 返回 `[]`） | ✓ |
| 底图 | `692bacd5-….jpg` 1920×1440，`spriteFrame.name = "mapBg"` | ✓ 同一文件 |
| 默认相机 | 由红幡位置反推：zoom=1, offset≈(-9,-553) | ✓ 误差 <1px |
| 网格色 | `#00550025` / `#11115566` / `#bbbbbbaa`，辅助线开启 | ✓ |
| 路点色 | `_colorHexList` + `SettingData` `#…65` 覆盖 | ✓ |
| 菜单项 | 5 个，节点宽 78×40、间距 5、左内边距 10 | ✓ |
| ToolBar1 | 场景 16 个按钮，启动 8 个 active | ✓ 8 可见 + 8 隐藏（路点编辑模式切换显示） |
| ToolBar2 | 12 个按钮，启动 10 个 active | ✓ |
| 版权文案 | 策划设计：**小唐**、开发人员：小唐、技术支持：小唐、QQ：583051842 | ✓ |
| TestView 玩家 | 名字「玩家」、提示「点击我可以拖曳位置」、色 `#E7DE07` | ✓ |
| **NPC 选择器** | **4 个**：商人.NPC / 任务.NPC / 剧情.NPC / 特殊.NPC，图标各自不同 | ✓ |
| **怪物选择器** | **4 个**：小怪 / 精英怪 / Boss / 特殊怪，图标各自不同 | ✓ |
| **传送门选择器** | **3 个**：类型1.传送们 / 类型2.传送们 / 不可视.传送们（原版即有此"传送们"笔误） | ✓ |
| **出生点选择器** | **1 个**：出生点 | ✓ |
| **教程视频** | `Teach.mp4`（15.5MB，时长 2:00），打开即播、加载时显示 `Loading...`、关闭停止 | ✓ 同一视频文件 |

### 路点涂抹语义（v4 修复）

原版 `RoadPointLayer` 用 `_roadNodeDic` 记录**被显式编辑过的格子**，
而 `defaultRoadValue = 1` 的格子「未被存过就不画」。这带来一个关键细节：

- 启动时全图 48×55 都是 1，字典为空 → **一个格子都不画**；
- 按 `W`（障碍路点，值 1）涂抹时，`addRoadPoint` **会**把该格存进字典，
  于是它被画成红色 —— 即使它的值等于默认值 1；
- 按 `D` / 右键 `removeRoadPoint` 从字典删除 → 回到默认、不再显示；
- `SettingData.isShow` 只影响「设置」面板的显示，渲染器用的是
  `_roadTypeShowDic`（对应 4 种值全部为 true），**不过滤 isShow**。

本项目用 `state.painted: Set<number>`（键 = `dy * cols + dx`）精确复刻该字典：
`paintAt(node, value, erase)` 同时维护值与 painted 标记，渲染层只遍历 painted 集合。
之前版本的三个问题（W 涂抹无效、`isShow:false` 导致红色永不显示、启动被误画色块）均已修复。

### 使用的原版素材

**底图与角色图集**

| 文件 | 尺寸 | 原版用途 |
|---|---|---|
| `assets/map_bg.jpg`（= `692bacd5-….jpg`） | 1920×1440 | 地图底图 `mapBg` + 小地图缩略 |
| `assets/character_sheet.png` | 2520×525 | 24×5 角色图集：TestView 玩家 8 方向/4 状态动画 |
| `assets/teach.mp4` | 15.5MB / 2:00 | 原版教程视频（`Teach.mp4`） |

**选择器图标（`assets/skins/`，12 个，均为原版 SpriteFrame 对应的原图）**

| 文件 | 原尺寸 | 原版 SpriteFrame | 标签 |
|---|---|---|---|
| `npc_1_shangren.png` | 108×108 | `avatar_bodhi_1_Icon` | 商人.NPC |
| `npc_2_renwu.png` | 114×114 | `avatar_bodhi_2_Icon` | 任务.NPC |
| `npc_3_juqing.png` | 100×100 | `avatar_bodhi_3_Icon` | 剧情.NPC |
| `npc_4_teshu.png` | 114×114 | `avatar_bodhi_4_Icon` | 特殊.NPC |
| `monster_1_xiaoguai.png` | 143×143 | `monster_1_icon` | 小怪 |
| `monster_2_jingying.png` | 198×198 | `monster_2_icon` | 精英怪 |
| `monster_3_boss.png` | 200×200 | `monster_3_icon2` | Boss |
| `monster_4_teshu.png` | 187×187 | `monster_8_icon` | 特殊怪 |
| `transfer_1.png` | 200×200 | `传送点0001` | 类型1.传送们 |
| `transfer_2.png` | 71296B | `1 (1)` | 类型2.传送们 |
| `transfer_3_invisible.png` | 171×225 | `Transfer_Invisible` | 不可视.传送们 |
| `spawn_1.png` | 171×225 | `location` | 出生点 |

**其他 UI 贴图（`assets/original/`）**：`default_sprite_splash`(2×2 纯色底)、
`default_panel`、`default_editbox_bg`、单选/复选 normal·on·checkmark、SaleView 配图 `icon_1`。

**「默认图」说明**：原版启动画面上的红幡、鸟居、暗绿水潭、石阶、竹林
全部来自 `map_bg.jpg` 底图本身；叠加的只有六边形网格线，
**没有**已绘制的路点、**没有**放置任何实体。

## 八、已知取舍

- 原版 `TeachView` 播放的教程视频已随仓库提供（`assets/teach.mp4`，15MB），
  教程窗口可直接播放。
- 原版 `MapLayer` 的切片函数是空实现（整图渲染），本项目同样整图渲染，等价。
- 网格辅助线**已按原版 `GridLayer` 逐参数复刻**，不再是简化版：
  - 六边形（`honeycomb` / `honeycomb2`）：两族矩形线 —— 带偏移族每 `ceilWidth` 周期
    4 条（`0 / halfW-halfH / halfW / halfW+halfH`），等距族每 `ceilWidth/4` 一条；
    只有周期起点是 `#11115566`(40% 蓝, 1px)，其余 `#00550025`(14.5% 深绿, 1.2px)。
  - 90 度：半格间距，偶数条是格子边界 `#bbbbbbaa`(2px)，奇数条是辅助线 `#00550025`(1px)。
  - 45 度：半格矩形辅助线（偶数蓝/奇数绿，1px）+ 两族斜线 `#bbbbbbaa`(2px)。
  - 可用 **编辑 → 显示隐藏辅助线（J）** 关闭（对应原版 `GridLayer._isShowAuxiliaryLine`）。
  - ⚠️ **90 度关掉辅助线时「关不掉」是原版行为，这里严格照抄，不做修正**。
    原版 `draw90AngleGrid` 写的是

    ```js
    n % 2 == 0 ? (strokeColor = lingColor3, lineWidth = 2)
               : this._isShowAuxiliaryLine && (strokeColor = lingColor1, lineWidth = 1)
    ```

    关掉时 `else if` 整个短路，`strokeColor` / `lineWidth` 保持上一条（偶数条）的
    `lingColor3` / 2px，于是奇数条变成**灰色的半格线** —— 间距没变，只是从绿变灰。
    实测确认过：原版 OFF 时同一列上 `y=157/184/211` 这些奇数位从 `(0,12,0)` 变成
    `(125,125,125)` 两行，**一条都没少**。克隆现在也是这样。
  - 以上结论不是从源码推的，是**对着原版截图量出来的**（原版按 0.8972 px/单位渲染，
    克隆截图时窗口 1904 宽、`screenScale` 0.9917）：

    | 场景 | 原版实测 | 克隆实测 |
    | --- | --- | --- |
    | 90° 辅助线 ON | 半格 15 单位，`(125,125,125)` 两行 + `(0,12,0)` 一行交替 | 半格 15 单位，`(136,136,136)` 两行 + `(29,41,29)` 一行交替 |
    | 90° 辅助线 OFF | **仍是半格**，全部 `(125,125,125)`（短路） | **仍是半格**，全部 `(136,136,136)`（照抄） |
    | 45° 辅助线 ON | 半格 15 单位，绿 `#00550025` / 蓝 `#11115566` 交替 | 同左 |
    | 45° 辅助线 OFF | 整行扫描 0 条水平线，只剩斜线 | 同左 |

    两种灰的绝对值不同只是因为底色不同：原版把底图关掉是纯黑（`#bbbbbbaa` → 125），
    克隆的画布底色是 `#222`（`#bbbbbbaa` → 136）。反推 alpha 都是 0.667，一致。
  - **绿线不要调亮**。原版 `lingColor1 = #00550025`（alpha 0.145），实测落在黑底上：
    96% 的绿线是 `(0,12,0)`（12/85 = 0.141，单遍），只有 4% 是 `(0,23,0)` —— 那是
    「带偏移族」和「等距族」在某几个位置**重合**、同一处画了两遍的结果（`1-(1-0.145)² = 0.269`）。
    克隆的两族线同样会重合，所以 0.145 自动复现这两个值。把 alpha 提到 0.27 会让
    96% 的线变成原版的 1.86 倍亮，反而不像。
  - **细线要按设备像素对齐，不能靠调 alpha**。画布位图现在按 `fitScale × dpr` 放大
    （见下面那条），1 地图单位 ≈ 0.99 设备像素，于是 `lineWidth = 1` + `+0.5` 的老写法会把线
    摊到两列、每列 ~0.6 覆盖率，实测有效 alpha 摊在 0.03–0.12，比原版暗三成、看着发虚。
    现在按设备像素取整：宽度 `round(width × k)` 个设备像素、中心对齐到像素中心
    （`(floor(pos × k) + dw/2) / k`）。实测每条竖线都只占**一列**、峰值 `(29,41,29)`
    = alpha 0.147，和原版 `(0,12,0)` = 0.141 对上了。
- 「下载前端框架 / 下载大地图切图工具 / 地图切片导出」等联网功能，
  在浏览器里以本地 PNG 导出/提示代替（原版是跳到腾讯云 COS 下载）。
- ✅ **画布不再被二次重采样**（这条以前是已知缺陷，已修）。
  `fitStage()` 用 `#app { transform: scale(innerWidth / 1920) }` 做「按宽适配」（等价原版
  `_fitWidth`），而 `resizeCanvas()` 以前按**缩放前**的布局尺寸建位图 —— 实测位图 1464×884
  却显示成 1451.8×876.6（比例 0.9917），浏览器每帧把整块画布缩一次，线条文字都发虚。
  现在三处一起改了：
  1. `sizeCanvas()`：位图 = `布局尺寸 × fitScale × dpr`，CSS 尺寸仍是布局单位；
  2. `context2d()`：用 `setTransform(k,0,0,k,0,0)` 打底，`k = 位图宽 / 逻辑宽`，
     所有绘制代码继续用 app 单位坐标，`W/H` 返回逻辑尺寸（`logicalSize()`）；
  3. 离屏场景层（底图+路点+网格）也按设备分辨率渲染 —— 否则它仍会被 `drawImage`
     双线性缩一次，1px 线又被抹平（实测绿线有效 alpha 被摊成 0.03–0.18 一片）。
  判据（e2e 里有回归）：`位图宽 == round(显示宽 × dpr)`，窗口缩到 1600 宽时
  `screenScale = 0.8333`、`k = 0.8333`，竖线仍落在同一设备像素上。

## 九、与原版的数据互通（实测，不是推导）

结论：**字段、键序、路点矩阵、实体属性全部一致；四种地图、三种格子尺寸、双向导入
得到的 `JSON.stringify()` 文本逐字节相同。** 唯一的例外是 `type: "item"`（见 9.5），
而那正是原版自己也读不回来的一种实体。

验证方式是真的跑一遍：克隆导出 → 原版 `initMapData()` 导入 → 原版
`getRoadPointInfo()` + `unitDataConversion()` 导出 → 克隆 `WMLoadData()` 导入 → 再导出，
每个环节都拿 `JSON.stringify()` 的整串文本做比较，而不是逐字段“看起来一样”。

### 9.1 顶层 12 个字段

原版 `MapData` 构造函数的键顺序与克隆 `MapDataModel` 完全一致：

```text
name, bgName, type, mapWidth, mapHeight, nodeWidth, nodeHeight,
alignment, offsetX, offsetY, roadDataArr, mapItems
```

注意 `nodeWidth` / `nodeHeight` 就是界面上的路点格子宽高（`ceilWidth` / `ceilHeight`）。
`alignment` / `offsetX` / `offsetY` 在原版 `getMapData()` 里**根本没有被赋值**，始终是构造函数默认的 `0`，
克隆同样写 `0`。

### 9.2 `roadDataArr` 的行数——最容易错的一处

原版 `RoadPointLayer.getRoadPointInfo()`：

```js
var c = mapType == MapType.angle45 ? 2 * i : i;   // i = MapRoadUtils.row
```

而 `MapRoadUtils.updateMapInfo` 对 angle45 已经算过 `_row = 2 * ceil(h / nh)`，
所以**angle45 的导出行数是 `4 * ceil(h / nh)`，是网格行数的两倍**。
1920×1440、格子 40×34.64 实测：

| 地图类型 | 网格 rows×cols | 导出 rows×cols |
| --- | --- | --- |
| angle45 | 84 × 48 | **168 × 48** |
| angle90 | 42 × 48 | 42 × 48 |
| honeycomb | 42 × 64 | 42 × 64 |
| honeycomb2 | 48 × 55 | 48 × 55 |

这不是无害的冗余：angle45 的菱形真的会越过 `grid.row`。
例如 (20,1400) 这个像素落在 `dy = 87`，而网格只有 84 行。
之前克隆按网格行数分配数组，`paintAt` 的边界检查会把它**静默跳过**（画不上，也导不出）。
现在按 `roadRowCount()` 分配与导出的行数，可画区域恰好等于原版可保存区域。

### 9.3 实体属性（`classDic`）

克隆 `schema.ts` 与原版 `AttributeUtils.classDic` 逐字段、逐顺序一致：

| type | 属性（`type` 之后的键序） |
| --- | --- |
| npc | objId, objName, objType, skin, x, y, cx, cy, params, direction, npcType, isPatrol, dialogueId, taskId, funcId |
| monster | objId, objName, objType, skin, x, y, cx, cy, params, direction, monsterType, isPatrol, dialogueId, fightId |
| transfer | objId, objName, objType, skin, x, y, cx, cy, params, targetMapId, targetMapSpawnId, transferType |
| spawnPoint | objId, objName, objType, skin, x, y, cx, cy, params, spawnId, defaultSpawn |

`x`/`y` 是**像素坐标**，`cx`/`cy` 是网格坐标，两边都会写入；
实测往返后 `x/y/cx/cy` 逐位不差（包括 `300.5` / `400.25` 这种小数）。

**`mapItems` 的数组顺序**：原版 `unitDataConversion()` 读的是 `entityLayer.getMapUnits()`，
而 `setDepthRand()` 把它按 `y` 降序排过（为了 zIndex）。克隆导出也按 `y` 降序排，
否则导出→导入→导出 不是不动点（阵列顺序会变）。平手时保持插入顺序。

### 9.4 双向导入实测结果

判据不是“字段值相等”，而是 **`JSON.stringify()` 出来的整串字节相等** —— 连键序、数字的
`34.64` 写法、数组换行都不许差。只要整串相同，任何 JSON 解析器读到的就是同一份数据。

正方向（克隆导出 → 原版 `initRoadPointInfo()`/`initMapUintInfo()` → 原版 `getMapData()` 等价物）：

| 地图类型 | rows×cols（克隆/原版） | 整串 JSON | 字节数 |
| --- | --- | --- | --- |
| angle45 | 168×48 / 168×48 | **相同** | 17372 / 17372 |
| angle90 | 42×48 / 42×48 | **相同** | 5024 / 5024 |
| honeycomb | 42×64 / 42×64 | **相同** | 6368 / 6368 |
| honeycomb2 | 48×55 / 48×55 | **相同** | 6284 / 6284 |

反方向（原版导出的 JSON 原文 → 克隆 `WMLoadData()` → 克隆再导出）也是**整串相同**，四种地图全过。

### 9.4.1 几何扫描（24 组，0 处不一致）

只测一组尺寸容易漏掉“行数公式只在某个尺寸下凑巧相等”。所以按
`4 种地图类型 × 3 组格子尺寸 × 有内容/空图` 跑了 24 组，每组都做整串比对：

| 尺寸 | 地图 | rows×cols | 整串 |
| --- | --- | --- | --- |
| 1920×1080 @ 60×30 | angle45 | 144×32 | 相同 |
| 1920×1080 @ 60×30 | angle90 | 36×32 | 相同 |
| 1920×1080 @ 60×30 | honeycomb | 36×44 | 相同 |
| 1920×1080 @ 60×30 | honeycomb2 | 24×64 | 相同 |
| 1920×1440 @ 40×34.64 | angle45 | 168×48 | 相同 |
| 1920×1440 @ 40×34.64 | angle90 | 42×48 | 相同 |
| 1920×1440 @ 40×34.64 | honeycomb | 42×64 | 相同 |
| 1920×1440 @ 40×34.64 | honeycomb2 | 48×55 | 相同 |
| 1600×1200 @ 50×43.3 | angle45 | 112×32 | 相同 |
| 1600×1200 @ 50×43.3 | angle90 | 28×32 | 相同 |
| 1600×1200 @ 50×43.3 | honeycomb | 28×44 | 相同 |
| 1600×1200 @ 50×43.3 | honeycomb2 | 32×37 | 相同 |

（每行都有对应的“空图”版本，同样整串相同。）

### 9.5 两个已知的边界（原版就如此，不是克隆缺失）

- **angle45 的 `dx >= col` 格子无法保存**。原版的 `_roadNodeDic` 是个不限边的字典，
  画笔能把 `dx = 68` 的格子存进去、也能画出来，但 `getRoadPointInfo()`
  只遍历 `0..col-1`，所以存盘时**静默丢掉**（实测 `dx=68/80` 导出后不在数组里）。
  克隆选择在画笔层就拒绝越界格子（`paintAt` 边界检查）—— 宁可画不上，也不生成“看得见但存不下”的数据。
- **`type: "item"` 的实体原版导入不了**。`initMapUintInfo()` 只处理
  npc / monster / transfer / spawnPoint，其他类型 `i` 保持 `undefined`，`initUnit(undefined, a)` 直接返回。
  原版 `unitDataConversion()` 的 `else` 分支也只写四个字段（实测）：

  ```json
  {"type":"item","x":123,"y":456,"width":0,"height":0}
  ```

  也就是说原版对 `item` 是「导得出、读不回」。克隆导入后会按 `classDic` 的基类属性规范化，
  再导出会变成 `{type,objId,objName,objType,skin,x,y,cx,cy,params,width,height}` ——
  `x/y/width/height` 一个不丢，只是多了基类字段。这是**唯一**一处整串字节不相等的情况，
  而且原版本来就会把这种实体丢掉，所以不影响互通。
  克隆自己不会产生 `item`（新建只有 npc / monster / transfer / spawnPoint 四种）。

### 9.6 面向交互的测试钩子

为了能把上面这些跑成自动化用例，`main.ts` 多暴露了三个入口（与 `WMNewMap` / `WMExport` 同一套路）：

| 入口 | 用途 |
| --- | --- |
| `WMPaintAtPixel(px, py, value)` | 走真实笔刷路径涂一格（含边界检查） |
| `WMAddEntity(obj)` | 追加一个经 `normalizeEntity` 规范化的实体 |
| `WMLoadData(json)` | 和「文件 → 打开」走**同一个** `paramsFromMapData()`，返回导出结果 |
