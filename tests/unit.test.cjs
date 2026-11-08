/* WebMobileClone core unit tests  - run with: node tests/unit.test.cjs */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'dist', 'core.js'), 'utf8'), sandbox);
const C = sandbox.window.WMCore;

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); }
}
function eq(name, a, b) { ok(name, a === b, { got: a, want: b }); }

console.log('== MapType / colors ==');
eq('MapType.angle45', C.MapType.angle45, 0);
eq('MapType.honeycomb2', C.MapType.honeycomb2, 3);
eq('MAP_TYPE_NAMES length', C.MAP_TYPE_NAMES.length, 4);
eq('hexToRgba #00ff0065', C.hexToRgba('#00ff0065'), 'rgba(0,255,0,0.396)');
eq('hexToRgba #ffffffff', C.hexToRgba('#ffffffff'), 'rgba(255,255,255,1.000)');
eq('parseColor alpha', C.parseColor('#00ff0065').a, 101);
eq('rgbaToHex roundtrip', C.rgbaToHex(0, 255, 0, 101), '#00FF0065');
const ds = C.DEFAULT_ROAD_SETS();
eq('road sets count', ds.length, 4);
eq('road set 0 color', ds[0].color, '#00ff0065');
eq('road set 1 isShow', ds[1].isShow, false);
eq('road set 1 isPass', ds[1].isPass, false);
eq('road set 2 desc', ds[2].desc, '遮挡路点(E)');

console.log('== Geometry: row/col formulas ==');
const g = new C.MapRoadUtils();
let r;
r = g.updateMapInfo(1920, 1080, 60, 30, C.MapType.angle45);
eq('angle45 col', r.col, 32); eq('angle45 row = 2*ceil(h/nh)', r.row, 72);
r = g.updateMapInfo(1920, 1080, 40, 40, C.MapType.angle90);
eq('angle90 col', r.col, 48); eq('angle90 row', r.row, 27);
r = g.updateMapInfo(1920, 1440, 40, 34.64, C.MapType.honeycomb);
eq('honeycomb col', r.col, 2 * Math.ceil((1920 - 10) / 60));
eq('honeycomb row', r.row, Math.ceil((1440 - 17.32) / 34.64));
r = g.updateMapInfo(1920, 1440, 40, 34.64, C.MapType.honeycomb2);
eq('honeycomb2 col', r.col, Math.ceil((1920 - 17.32) / 34.64));
eq('honeycomb2 row', r.row, 2 * Math.ceil((1440 - 10) / 60));

console.log('== Geometry: coordinate round trips ==');
for (const t of [C.MapType.angle45, C.MapType.angle90, C.MapType.honeycomb, C.MapType.honeycomb2]) {
  const gg = new C.MapRoadUtils();
  gg.updateMapInfo(1920, 1440, 60, 30, t);
  let good = 0, total = 0;
  for (let dy = 2; dy < Math.min(gg.row - 2, 20); dy += 3) {
    for (let dx = 2; dx < Math.min(gg.col - 2, 20); dx += 3) {
      const p = gg.getPixelByWorldPoint(dx, dy);
      const w = gg.getWorldPointByPixel(p.x, p.y);
      total++; if (w.x === dx && w.y === dy) good++;
    }
  }
  ok('world<->pixel round trip type ' + t + ' (' + good + '/' + total + ')', good === total, { good, total });
}

console.log('== MapData JSON shape ==');
const d = new C.MapData();
Object.assign(d, { name: 'm', bgName: 'bg', type: 3, mapWidth: 1920, mapHeight: 1440,
  nodeWidth: 40, nodeHeight: 34.64, alignment: 0, offsetX: 0, offsetY: 0,
  roadDataArr: [[0, 1], [2, 3]], mapItems: [{ type: 'npc', objId: '0' }] });
const keys = Object.keys(d.toJson());
eq('12 fields', keys.length, 12);
eq('field order', keys.join(','), 'name,bgName,type,mapWidth,mapHeight,nodeWidth,nodeHeight,alignment,offsetX,offsetY,roadDataArr,mapItems');
ok('compact JSON no spaces', !JSON.stringify(d.toJson()).includes(': '));
ok('read back', C.MapData.fromJson(JSON.parse(JSON.stringify(d.toJson()))).mapItems[0].type === 'npc');

console.log('== classDic / entity schema ==');
eq('base attributes', C.CLASS_DIC.EditorElement.length, 9);
eq('NPC attributes', C.CLASS_DIC.EditorNPC.length, 15);
eq('NPC last attr', C.CLASS_DIC.EditorNPC[14].attribute, 'funcId');
eq('monster fightId label', C.CLASS_DIC.EditorMonster.find(a => a.attribute === 'fightId').label, '战斗Id');
eq('transfer targetMapId type', C.CLASS_DIC.EditorTransfer.find(a => a.attribute === 'targetMapId').type, 'normal');
eq('spawn defaultSpawn type', C.CLASS_DIC.EditorSpawnPoint.find(a => a.attribute === 'defaultSpawn').type, 'bool');
const npc = C.defaultEntity('npc', 123.4567, 89.12345);
eq('entity objId default', npc.objId, '0');
eq('entity objType default', npc.objType, '0');
eq('entity x rounded 3dp', npc.x, 123.457);
eq('entity y rounded 3dp', npc.y, 89.123);
eq('entity className', npc.className, 'EditorNPC');
eq('entity isPatrol default', npc.isPatrol, false);

console.log('== A* ==');
const open = [];
for (let y = 0; y < 10; y++) open.push(new Array(10).fill(0));
let p = C.findPath(open, 0, 0, 9, 9, C.MapType.angle90, v => v === 0);
// getPath() optimization collapses the straight diagonal run to start + target.
ok('open field path found (' + (p ? p.length : 0) + ')', !!p && p.length === 2);
ok('open field path keeps the endpoints',
  !!p && p[0].x === 0 && p[0].y === 0 && p[p.length - 1].x === 9 && p[p.length - 1].y === 9, p);
for (let y = 0; y < 10; y++) open[y][5] = 1;
open[2][5] = 0;
p = C.findPath(open, 0, 0, 9, 0, C.MapType.angle90, v => v === 0);
ok('wall with gap path found', !!p && p.some(n => n.x === 5 && n.y === 2));
ok('optimized path keeps the gap corner', !!p && p.length < 6, p && p.length);
for (let y = 0; y < 10; y++) open[y][5] = 1;
p = C.findPath(open, 0, 0, 9, 0, C.MapType.angle90, v => v === 0);
ok('sealed wall -> null', p === null);
const hex = [];
for (let y = 0; y < 8; y++) hex.push(new Array(8).fill(0));
p = C.findPath(hex, 0, 0, 7, 7, C.MapType.honeycomb, v => v === 0);
ok('hex path found', !!p && p.length > 0);

console.log('== A* debug frames (F4 overlay) ==');
const dbg = { open: [], closed: [], frames: [] };
p = C.findPath(open.map(r => r.slice()), 0, 0, 9, 0, C.MapType.angle90, v => v === 0, dbg, 1000);
ok('frames recorded', dbg.frames.length > 0, dbg.frames.length);
ok('closed list grows monotonically',
  dbg.frames.every((f, i) => i === 0 || f.closed >= dbg.frames[i - 1].closed));
ok('every frame exposes an open frontier', dbg.frames.every(f => Array.isArray(f.open)));
const capped = { open: [], closed: [], frames: [] };
C.findPath(open.map(r => r.slice()), 0, 0, 9, 0, C.MapType.angle90, v => v === 0, capped, 3);
ok('maxSteps limits the replay length', capped.frames.length <= 3, capped.frames.length);

console.log('== optimizePath ==');
const flat = [];
for (let y = 0; y < 6; y++) flat.push(new Array(10).fill(0));
let op = C.optimizePath(flat, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }], v => v === 0);
ok('collinear run collapses to 2 nodes', op.length === 2, op.length);
op = C.optimizePath(flat, [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }], v => v === 0);
ok('straight diagonal collapses to 2 nodes', op.length === 2, op.length);
op = C.optimizePath(flat, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }], v => v === 0);
ok('open corner may be cut diagonally (matches the original)', op.length === 2, op.length);
const turn = flat.map(r => r.slice());
turn[1][0] = 1;                                   // block (0,1) so the corner cannot be cut
op = C.optimizePath(turn, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }], v => v === 0);
ok('a forced turn is preserved', op.length === 3, op.length);
const blocked = flat.map(r => r.slice());
blocked[1][1] = 1;                                // block (1,1): no diagonal shortcut
op = C.optimizePath(blocked, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }], v => v === 0);
ok('no shortcut through a blocked cell', op.length === 3, op.length);

console.log('== player sprite sheet (Charactor + MovieClip) ==');
const PF = C.playerFrame(0, 'sitrun', 0);
ok('idle frame = col 18 row 0', PF.col === 18 && PF.row === 0 && PF.flip === false, PF);
ok('sitrun frame 3 = col 21', C.playerFrame(0, 'sitrun', 3).col === 21);
ok('frame wraps inside the 6-frame range', C.playerFrame(0, 'sitrun', 6).col === 18);
ok('stand range starts at 0', C.playerFrame(0, 'stand', 0).col === 0);
ok('run range starts at 6', C.playerFrame(0, 'run', 0).col === 6);
ok('sitdown range starts at 12', C.playerFrame(0, 'sitdown', 0).col === 12);
ok('direction 2 -> row 2', C.playerFrame(2, 'stand', 0).row === 2);
ok('direction 4 -> row 4', C.playerFrame(4, 'stand', 0).row === 4);
ok('direction 5 -> row 3 mirrored', C.playerFrame(5, 'stand', 0).row === 3 && C.playerFrame(5, 'stand', 0).flip === true);
ok('direction 6 -> row 2 mirrored', C.playerFrame(6, 'stand', 0).row === 2 && C.playerFrame(6, 'stand', 0).flip === true);
ok('direction 7 -> row 1 mirrored', C.playerFrame(7, 'stand', 0).row === 1 && C.playerFrame(7, 'stand', 0).flip === true);
ok('frame size is 105', C.PLAYER_FRAME_SIZE === 105);
ok('sprite anchor y is 0.25', C.PLAYER_ANCHOR_Y === 0.25);
ok('draw offset puts the frame above the player',
  C.PLAYER_DRAW_OFFSET.x === -52.5 && C.PLAYER_DRAW_OFFSET.y === -78.75, C.PLAYER_DRAW_OFFSET);

console.log('== Charactor.direction from the move vector ==');
// Cocos space (y up): right / left / up / down
eq('moving right -> dir 6', C.playerDirectionFromVector(1, 0), 6);
eq('moving left -> dir 2', C.playerDirectionFromVector(-1, 0), 2);
eq('moving up -> dir 4', C.playerDirectionFromVector(0, 1), 4);
eq('moving down -> dir 0', C.playerDirectionFromVector(0, -1), 0);
eq('no movement -> dir 0', C.playerDirectionFromVector(0, 0), 0);

console.log('== Undo/Redo ==');
let v = 0;
const u = new C.UndoRedo();
u.push({ undo: () => v = 0, redo: () => v = 1 }); v = 1;
u.undo(); eq('undo', v, 0);
u.redo(); eq('redo', v, 1);
u.push({ undo: () => v = 1, redo: () => v = 2 }); v = 2;
eq('push clears old redo', u.redoStack.length, 0);
u.undo(); eq('undo of new action', v, 1);
eq('redo stack has the undone action', u.redoStack.length, 1);
u.redo(); eq('redo of new action', v, 2);

console.log('== honeycomb auxiliary grid (original GridLayer) ==');
// honeycomb2 (pointy-top): vertical lines carry the 4-per-period offsets,
// horizontal lines are uniform every ceilWidth/4. Source of truth:
// GridLayer.drawHoneycombGrid2 in web-mobile/src/project.js.
const A2 = C.honeycombAuxLines(40, 34.64, 1920, 1440, C.MapType.honeycomb2);
eq('hc2 vertical count', A2.vertical.length, 193);
eq('hc2 horizontal count', A2.horizontal.length, 145);
eq('hc2 v[0] pos', +A2.vertical[0].pos.toFixed(2), 0);
eq('hc2 v[1] pos = halfW-halfH', +A2.vertical[1].pos.toFixed(2), 2.68);
eq('hc2 v[2] pos = halfW', +A2.vertical[2].pos.toFixed(2), 20);
eq('hc2 v[3] pos = halfW+halfH', +A2.vertical[3].pos.toFixed(2), 37.32);
eq('hc2 v[4] pos = next period', A2.vertical[4].pos, 40);
eq('hc2 only the period start is the 40% blue', A2.vertical[0].color, '#11115566');
eq('hc2 v[1] is the faint green', A2.vertical[1].color, C.AUX_FAINT);
eq('hc2 v[2] is the faint green', A2.vertical[2].color, C.AUX_FAINT);
eq('hc2 v[3] is the faint green', A2.vertical[3].color, C.AUX_FAINT);
eq('hc2 v widths 1/1.2/1.2/1.2 (only the period start is 1px)',
   A2.vertical.slice(0, 4).map(l => l.width).join(','), '1,1.2,1.2,1.2');
eq('hc2 h step = ceilWidth/4', A2.horizontal[2].pos - A2.horizontal[1].pos, 10);
eq('hc2 h strong every 4th', A2.horizontal[4].color, '#11115566');
eq('hc2 h faint otherwise', A2.horizontal[5].color, C.AUX_FAINT);
eq('hc2 h width is 1', A2.horizontal[5].width, 1);
// 原版 lingColor1 = #00550025（alpha 0.145）。实测原版落在黑底上 96% 的绿线是 (0,12,0)
// —— 12/85 = 0.141，就是单遍 0.145；(0,23,0) 只出现在两族线重合的位置（4%）。
// 所以克隆保持 0.145，靠「按设备像素对齐」把线画实，而不是把 alpha 调亮。
eq('AUX_FAINT is the original 14.5% green', C.AUX_FAINT, '#00550025');
ok('hc2 is not a plain 20px lattice',
   A2.vertical.some(l => Math.abs(l.pos - 2.68) < 0.01) && A2.vertical.some(l => l.pos === 20));

// honeycomb (flat-top) swaps the two families
const A1 = C.honeycombAuxLines(40, 34.64, 1920, 1440, C.MapType.honeycomb);
eq('hc vertical is uniform', A1.vertical[1].pos, 10);
eq('hc horizontal carries the offsets', +A1.horizontal[1].pos.toFixed(2), 2.68);
eq('hc v count', A1.vertical.length, 193);
eq('hc h count', A1.horizontal.length, 145);

console.log('== hex vertices (regular hexagon, both orientations) ==');
const HW = 40, HH = 34.64;
const Vp = C.hexVertices(100, 100, HW, HH, false);   // honeycomb2, pointy-top
const Vf = C.hexVertices(100, 100, HW, HH, true);    // honeycomb, flat-top
eq('6 vertices', Vp.length, 6);
eq('6 vertices (flat-top)', Vf.length, 6);
const near = (a, b) => Math.abs(a - b) < 0.01;
const spanX = v => Math.max(...v.map(p => p[0])) - Math.min(...v.map(p => p[0]));
const spanY = v => Math.max(...v.map(p => p[1])) - Math.min(...v.map(p => p[1]));
ok('pointy-top is 34.64 wide', near(spanX(Vp), HH), spanX(Vp));
ok('pointy-top is 40 tall', near(spanY(Vp), HW), spanY(Vp));
ok('flat-top is 40 wide', near(spanX(Vf), HW), spanX(Vf));
ok('flat-top is 34.64 tall', near(spanY(Vf), HH), spanY(Vf));
// every vertex must sit on the circumcircle -> it is a REGULAR hexagon
const radii = v => v.map(p => Math.hypot(p[0] - 100, p[1] - 100));
ok('pointy-top vertices all r=20', radii(Vp).every(r => near(r, 20)), radii(Vp));
ok('flat-top vertices all r=20', radii(Vf).every(r => near(r, 20)), radii(Vf));
// centred on the cell centre (the old code shifted the apexes right by halfW-halfH)
ok('pointy-top apexes are x-centred',
   near(Vp[1][0], 100) && near(Vp[4][0], 100), [Vp[1], Vp[4]]);
ok('flat-top apexes are y-centred',
   near(Vf[2][1], 100) && near(Vf[5][1], 100), [Vf[2], Vf[5]]);

console.log('== 90 度网格（原版 draw90AngleGrid：半格间距）==');
// 60x30 格子 + 1920x1440 地图 -> cols=32, rows=48
const N90 = C.angle90Lines(1920, 1440, 60, 30, true);
eq('90: horizontal count = 2*rows+2', N90.horizontal.length, 98);
eq('90: vertical count = 2*cols+2', N90.vertical.length, 66);
eq('90: first line at y=0', N90.horizontal[0].pos, 0);
eq('90: step is half a cell (15)', N90.horizontal[1].pos - N90.horizontal[0].pos, 15);
eq('90: even lines are cell borders', N90.horizontal[0].color, '#bbbbbbaa');
eq('90: even lines are 2px', N90.horizontal[0].width, 2);
eq('90: odd lines are the faint aux', N90.horizontal[1].color, C.AUX_FAINT);
eq('90: odd lines are 1px', N90.horizontal[1].width, 1);
eq('90: no diagonals', N90.diagonals.length, 0);

const N90off = C.angle90Lines(1920, 1440, 60, 30, false);
// 原版关掉辅助线时，奇数条因为 `&&` 短路沿用了上一条（偶数条）的 lingColor3 / 2px，
// 所以仍然是**半格**的灰色 2px 线 —— 看着「关不掉」。克隆严格照抄这个行为。
eq('90 aux off: still half-cell pitch (original short-circuit)',
   N90off.horizontal.length, 98);
eq('90 aux off: pitch is still 15', N90off.horizontal[1].pos - N90off.horizontal[0].pos, 15);
ok('90 aux off: every line is a 2px border',
   N90off.horizontal.every(l => l.color === '#bbbbbbaa' && l.width === 2) &&
   N90off.vertical.every(l => l.color === '#bbbbbbaa' && l.width === 2));
eq('90 aux off: vertical count matches ON', N90off.vertical.length, 66);

console.log('== 45 度网格（原版 draw45AngleGrid：矩形辅助线 + 斜线）==');
const N45 = C.angle45Lines(1920, 1440, 60, 30, true);
eq('45: horizontal count = t+1', N45.horizontal.length, 98);        // t = 2*48+1
eq('45: vertical count = e+1', N45.vertical.length, 66);             // e = 2*32+1
eq('45: even aux is the 40% blue', N45.horizontal[0].color, '#11115566');
eq('45: odd aux is the faint green', N45.horizontal[1].color, C.AUX_FAINT);
eq('45: aux is 1px', N45.horizontal[0].width, 1);
eq('45: diagonal count = e+t-1', N45.diagonals.length, 161);
eq('45: first diagonal (a=1) starts on the top edge',
   [N45.diagonals[0].x1, N45.diagonals[0].y1, N45.diagonals[0].x2, N45.diagonals[0].y2].join(','),
   '30,0,0,15');
eq('45: second diagonal (a=2) starts on the bottom edge',
   [N45.diagonals[1].x1, N45.diagonals[1].y1, N45.diagonals[1].x2, N45.diagonals[1].y2].join(','),
   '60,1455,0,1425');
// both diagonal families have the same |slope| = nh/nw
const slopeOf = d => Math.abs((d.y2 - d.y1) / (d.x2 - d.x1));
ok('45: every diagonal has slope nh/nw',
   N45.diagonals.every(d => Math.abs(slopeOf(d) - 30 / 60) < 1e-9),
   [slopeOf(N45.diagonals[0]), slopeOf(N45.diagonals[1])]);

const N45off = C.angle45Lines(1920, 1440, 60, 30, false);
eq('45 aux off: no horizontal aux', N45off.horizontal.length, 0);
eq('45 aux off: no vertical aux', N45off.vertical.length, 0);
eq('45 aux off: diagonals stay', N45off.diagonals.length, 161);


console.log('== roadDataArr 行数（对齐原版 getRoadPointInfo）==');
// Measured on the real Cocos build: 1920x1440, cell 40x34.64
eq('angle45  rowCount = 168 (4*ceil(1440/34.64))', C.roadRowCount(C.MapType.angle45, 84), 168);
eq('angle90  rowCount = 42', C.roadRowCount(C.MapType.angle90, 42), 42);
eq('honeycomb rowCount = 42', C.roadRowCount(C.MapType.honeycomb, 42), 42);
eq('honeycomb2 rowCount = 48', C.roadRowCount(C.MapType.honeycomb2, 48), 48);
// grid.row for the same map, straight from updateMapInfo
{
  const g = new C.MapRoadUtils();
  const r45 = g.updateMapInfo(1920, 1440, 40, 34.64, C.MapType.angle45);
  eq('angle45 grid.row = 84, col = 48', r45.row + 'x' + r45.col, '84x48');
  eq('angle45 export rows = 2 * grid.row', C.roadRowCount(C.MapType.angle45, r45.row), 2 * r45.row);
  const r90 = g.updateMapInfo(1920, 1440, 40, 34.64, C.MapType.angle90);
  eq('angle90 grid = 42x48', r90.row + 'x' + r90.col, '42x48');
  const rh = g.updateMapInfo(1920, 1440, 40, 34.64, C.MapType.honeycomb);
  eq('honeycomb grid = 42x64', rh.row + 'x' + rh.col, '42x64');
  const rh2 = g.updateMapInfo(1920, 1440, 40, 34.64, C.MapType.honeycomb2);
  eq('honeycomb2 grid = 48x55', rh2.row + 'x' + rh2.col, '48x55');
  // the angle45 diamond really does reach past grid.row
  // (fresh instance — `g` is on honeycomb2 by now)
  const g45 = new C.MapRoadUtils();
  g45.updateMapInfo(1920, 1440, 40, 34.64, C.MapType.angle45);
  const n = g45.getNodeByPixel(20, 1400);
  ok('angle45 (20,1400) -> dy=87 > grid.row 84', n.dy === 87 && n.dy > r45.row, n.dy);
  ok('  ... and dx=40 stays inside col', n.dx === 40 && n.dx < r45.col, n.dx);
}

console.log('== buildMapData 字段与顺序 ==');
{
  const params = new C.MapParamsModel({
    name: 'rt', mapType: C.MapType.angle90, mapWidth: 1920, mapHeight: 1440,
    ceilWidth: 60, ceilHeight: 30,
  });
  const road = [];
  for (let y = 0; y < 48; y++) road.push(new Array(32).fill(1));
  road[3][1] = 0;
  const ents = [
    { type: 'spawnPoint', className: 'EditorSpawnPoint', objId: '14', objName: 'S', x: 900, y: 1000,
      cx: 40, cy: 60, params: '', spawnId: 3, defaultSpawn: true, skin: '0', objType: '5' },
    { type: 'npc', className: 'EditorNPC', objId: '11', objName: 'N', x: 300, y: 400,
      cx: 12, cy: 34, params: '', direction: 5, npcType: 1, isPatrol: true,
      dialogueId: 1, taskId: 2, funcId: 3, skin: '1', objType: '2' },
  ];
  const d = C.buildMapData(params, road, ents, C.defaultSettings());
  eq('12 fields, original key order',
     Object.keys(d).join(','),
     'name,bgName,type,mapWidth,mapHeight,nodeWidth,nodeHeight,alignment,offsetX,offsetY,roadDataArr,mapItems');
  eq('nodeWidth/nodeHeight come from ceilWidth/ceilHeight', d.nodeWidth + 'x' + d.nodeHeight, '60x30');
  eq('alignment/offset are 0 like the original', d.alignment + ',' + d.offsetX + ',' + d.offsetY, '0,0,0');
  eq('mapItems sorted by y descending (setDepthRand order)',
     d.mapItems.map(i => i.objName).join(','), 'S,N');
  eq('spawnPoint item keys follow classDic',
     Object.keys(d.mapItems[0]).join(','),
     'type,objId,objName,objType,skin,x,y,cx,cy,params,spawnId,defaultSpawn');
  eq('npc item keys follow classDic',
     Object.keys(d.mapItems[1]).join(','),
     'type,objId,objName,objType,skin,x,y,cx,cy,params,direction,npcType,isPatrol,dialogueId,taskId,funcId');
  eq('road copied, not shared', d.roadDataArr[3][1] + '|' + (d.roadDataArr[3] === road[3]), '0|false');
  // export -> import -> export must be a fixed point
  const back = C.MapDataModel.fromJson(JSON.parse(JSON.stringify(d)));
  const again = C.buildMapData(
    new C.MapParamsModel({ name: back.name, mapType: back.type, mapWidth: back.mapWidth,
      mapHeight: back.mapHeight, ceilWidth: back.nodeWidth, ceilHeight: back.nodeHeight }),
    back.roadDataArr, back.mapItems.map(C.normalizeEntity), C.defaultSettings());
  eq('export -> import -> export is a fixed point',
     JSON.stringify(again) === JSON.stringify(d), true);
}

console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
