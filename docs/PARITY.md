# 实现细节与基准对照

这份文档记录的是**实现过程中实测出来的细节**：与原版 EasyMapEditor（Cocos Creator 2.x）
逐项对照得到的结论、量到的具体数值，以及那些"看起来像 bug、其实是原版行为"的地方。

README 讲的是这个项目**是什么、怎么搭起来的**；这里讲的是**为什么这么写**。
如果你只是想跑起来、或者看架构，看 README 就够了。

## 一、运行时状态逐项核对

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
| 网格色 | `#00550025` / `#11115566` / `#bbbbbbaa`；原版 `_isShowAuxiliaryLine` 默认开启 | ✓ 色值与线宽逐参数一致；**本项目默认关闭辅助线**（见 README「与原版不同之处」） |
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

## 二、与基准的差异清单

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
  3. 离屏图层（底图 / 网格 / 路点，现在是三张独立缓存）也按设备分辨率渲染 —— 否则它仍会被
     `drawImage` 双线性缩一次，1px 线又被抹平（实测绿线有效 alpha 被摊成 0.03–0.18 一片）。
  判据（e2e 里有回归）：`位图宽 == round(显示宽 × dpr)`，窗口缩到 1600 宽时
  `screenScale = 0.8333`、`k = 0.8333`，竖线仍落在同一设备像素上。

### 2.1 顶部三条的底色（对着原版 1920×1080 截图逐像素量的）

| 元素 | 原版实测 | 克隆（修正后） |
| --- | --- | --- |
| 菜单条 / 工具条 / 信息条底 | `#c7c7c7` (199) | `#c7c7c7` ✔ |
| 工具条按钮（未选中） | `#a7a7a7` (167) | `#a7a7a7` ✔ |
| 工具条按钮（当前工具） | `#cccccc` (204) | `#cccccc` ✔ |
| 条与条之间的分隔线 | `#9b9b9b` (155) | `#9b9b9b` ✔ |
| 信息条文字起点 / 标题与数值的墨迹间距 | 28px / 29px | 28px / 29px ✔ |

之前克隆写的是菜单条 `#f6f0f0`（偏粉的白）、按钮 `#c5c5c5` —— 按钮和底条只差 2 级，
按钮"糊"成一片，看不出是按钮。`#c5c5c5` 那个值其实来自原版 `EditToolPanel.setTabBtnColor`
里给**未选中 tab** 的 tint `#C5C5C5`，不是工具条按钮的渲染色。

顺带确认了一件事：**原版确实有「当前工具」高亮**，而且是**变亮**（204 > 167）。
`EditToolPanel.openWin(i, e)` 里对 `tabBtns`（就是 ToolBar2 上那 6 个按钮）调
`setTabBtnColor(i, "#f0f0f0")`，其余 `"#C5C5C5"`。我第一次探针调 `openWin()` 时漏传了
第二个参数 `e`，于是 `i == e` 永远不成立、全部被置成未选中色，差点得出"原版没有高亮"的错结论。

按钮边界也量过：`2-102 / 107-207 / 212-312 / 317-417 / 422-602 / 607-787 / 792-912 / 917-1037`，
原版和克隆**逐像素一致**，剩下的差异只有字体渲染。

### 2.2 测试模式工具条：原版第 5 个按钮是禁用状态

原版 `TestView/ToolBar` 场景里有 7 个按钮，但 `Button5`（`显示小地图(F2)`）的 `active`
就是 `false`，而且它的处理函数 `TestView.showMinMap` 是**空实现**（`function(t){}`）。
实测截图也只显示 6 个 —— 克隆照抄「可见的 6 个」，`e2e` 里有断言钉住这个数量。

（顺带：测试模式下 `KeyBoardUtils._focusTarget` 被 `setFocus(TestView)` 钉住，
`EditArea` 上注册的 q/w/e/.../F2 监听全部被跳过，所以测试模式里按 F2 也不会有反应 ——
这也是原版行为。）

## 三、数据互通（实测，不是推导）

结论：**字段、键序、路点矩阵、实体属性全部一致；四种地图、三种格子尺寸、双向导入
得到的 `JSON.stringify()` 文本逐字节相同。** 唯一的例外是 `type: "item"`（见 9.5），
而那正是原版自己也读不回来的一种实体。

验证方式是真的跑一遍：克隆导出 → 原版 `initMapData()` 导入 → 原版
`getRoadPointInfo()` + `unitDataConversion()` 导出 → 克隆 `WMLoadData()` 导入 → 再导出，
每个环节都拿 `JSON.stringify()` 的整串文本做比较，而不是逐字段“看起来一样”。

### 3.1 顶层 12 个字段

原版 `MapData` 构造函数的键顺序与克隆 `MapDataModel` 完全一致：

```text
name, bgName, type, mapWidth, mapHeight, nodeWidth, nodeHeight,
alignment, offsetX, offsetY, roadDataArr, mapItems
```

注意 `nodeWidth` / `nodeHeight` 就是界面上的路点格子宽高（`ceilWidth` / `ceilHeight`）。
`alignment` / `offsetX` / `offsetY` 在原版 `getMapData()` 里**根本没有被赋值**，始终是构造函数默认的 `0`，
克隆同样写 `0`。

### 3.2 `roadDataArr` 的行数——最容易错的一处

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

### 3.3 实体属性（`classDic`）

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

### 3.4 双向导入实测结果

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

### 3.5 几何扫描（24 组，0 处不一致）

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

### 3.6 两个已知的边界（原版就如此，不是本项目的缺失）

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

### 3.7 面向交互的测试钩子

为了能把上面这些跑成自动化用例，`main.ts` 多暴露了三个入口（与 `WMNewMap` / `WMExport` 同一套路）：

| 入口 | 用途 |
| --- | --- |
| `WMPaintAtPixel(px, py, value)` | 走真实笔刷路径涂一格（含边界检查） |
| `WMAddEntity(obj)` | 追加一个经 `normalizeEntity` 规范化的实体 |
| `WMLoadData(json)` | 和「文件 → 打开」走**同一个** `paramsFromMapData()`，返回导出结果 |
