/* 决定性互通测试：本项目导出的 JSON 喂给线上 v2.0.2，看它能不能正确读回。
 *
 * 为什么不用文件选择器：线上 openFile 走 window.showOpenFilePicker（需要真实用户
 * 激活 + 系统弹窗），headless 里不可用。但 MapEditor.openMap(data, bgTex) 是同一
 * 条导入路径（内部调 editArea.initMapData），直接喂数据对象即可。
 *
 * 流程：
 *   ① 在本地克隆（8900）取 WMGetMapData() 的 JSON
 *   ② 导航到线上 v2.0.2，调 openMap(该 JSON)
 *   ③ 再 getMapData() 回来，逐字段比对
 *
 * Usage: node tests/probe_interop_v202.cjs
 */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { spawn } = require('child_process');
const WS = require('./wsmini.cjs');

const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CLONE = process.env.CLONE || 'http://127.0.0.1:8900/index.html';
const HOSTED = process.env.HOSTED ||
  'https://easymapeditor-1258223435.cos.ap-guangzhou.myqcloud.com/v2.0.0/web-mobile/index.html';
const PORT = 9371;
const PROFILE = path.join(require('os').tmpdir(), 'wm-interop-' + Date.now());
const OUT = 'C:\\tmp\\wmc\\interop';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = p => new Promise((res, rej) => http.get({ host: '127.0.0.1', port: PORT, path: p }, r => {
  let d = ''; r.on('data', c => (d += c)); r.on('end', () => res(JSON.parse(d)));
}).on('error', rej));

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (x !== undefined ? '  -> ' + JSON.stringify(x).slice(0, 300) : '')); }
};
const eq = (n, a, b) => ok(n, JSON.stringify(a) === JSON.stringify(b), { got: a, want: b });

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--window-size=1920,1080', '--no-proxy-server', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + PROFILE, 'about:blank'], { stdio: 'ignore' });
  let pages = null;
  for (let i = 0; i < 80; i++) { try { pages = await get('/json/list'); if (pages.some(p => p.type === 'page')) break; } catch { } await sleep(300); }
  if (!pages) { console.error('cannot connect'); process.exit(1); }
  const page = pages.find(p => p.type === 'page');
  const ws = new WS(page.webSocketDebuggerUrl); await ws.ready();
  let id = 0; const pend = new Map();
  ws.onMessage(m => { const o = JSON.parse(m); if (o.id && pend.has(o.id)) { pend.get(o.id)(o); pend.delete(o.id); } });
  const send = (m, p = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });

  const ev = async e => {
    const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) {
      const ed = r.result.exceptionDetails;
      return 'EXC:' + (ed.exception && ed.exception.description ? ed.exception.description : ed.text);
    }
    return r.result && r.result.result ? r.result.result.value : null;
  };

  // ---------- ① 从克隆取导出 JSON ----------
  console.log('== ① 克隆导出（8900）==');
  await send('Page.navigate', { url: CLONE });
  await sleep(2600);
  eq('clone booted', await ev('!!window.WMGetMapData'), true);

  // 先真放 7 类实体（样例地图本身是空的，不造就等于空转）
  const placed = await ev(`(function(){
    var out = [];
    function place(tool, skinIdx, x, y, extra){
      WMAction(tool);
      var items = document.querySelectorAll('#toolContent .tool-item');
      if (!items[skinIdx]) return tool + ':no-item';
      items[skinIdx].dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
      var e = WMApp.brushEntity;
      if (!e) return tool + ':not-armed';
      e.x = x; e.y = y;
      if (extra) for (var k in extra) e[k] = extra[k];
      WMApp.entities.push(e); WMApp.brushEntity = null;
      out.push({type: e.type, objName: e.objName, skin: e.skin});
      return 'ok';
    }
    var r = [
      place('openNpcWin', 0, 300.5, 400.25, {dialogueId: 7, taskId: 9, funcId: 2, direction: 3, isPatrol: true}),
      place('openMonsterWin', 1, 500, 600, {fightId: 4, direction: 5, isPatrol: false}),
      place('openTransferWin', 0, 700, 800, {targetMapId: 'map_002', targetMapSpawnId: 3}),
      place('openSpawnWin', 0, 900, 1000, {spawnId: 1}),
      place('openObjWin', 0, 1100, 1200, {}),
      place('openPropWin', 0, 1300, 1400, {isTreasure: true, itemId: 1001, itemNum: 5}),
      place('openEventWin', 0, 1500, 1600, {})
    ];
    // 顺便把 alignment 设成 1（左上角），验证这个字段能不能活着回来
    WMApp.params.alignment = 1;
    return JSON.stringify({results: r, n: WMApp.entities.length, align: WMApp.params.alignment});
  })()`);
  console.log('  placed     : ' + placed);

  const cloneJson = await ev('JSON.stringify(WMGetMapData().toJson())');
  if (typeof cloneJson !== 'string' || cloneJson.startsWith('EXC')) {
    console.error('clone export failed: ' + cloneJson); ws.close(); ch.kill(); process.exit(1);
  }
  fs.writeFileSync(path.join(OUT, 'clone_export.json'), cloneJson, 'utf8');
  const C = JSON.parse(cloneJson);
  console.log('  clone keys : ' + Object.keys(C).join(','));
  console.log('  clone items: ' + (C.mapItems || []).length
    + '  road rows: ' + (C.roadDataArr || []).length
    + '  ' + C.mapWidth + 'x' + C.mapHeight + ' align=' + C.alignment);
  ok('克隆导出确实带了 7 条实体', (C.mapItems || []).length === 7, (C.mapItems || []).length);

  // ---------- ② 喂给线上 v2.0.2 ----------
  console.log('\n== ② 线上 v2.0.2 导入同一份 JSON ==');
  await send('Page.navigate', { url: HOSTED });
  for (let i = 0; i < 70; i++) { if (await ev('!!(window.cc && cc.director && cc.director.getScene())')) break; await sleep(500); }
  await sleep(2500);
  await ev(`(function(){var s=cc.director.getScene();
    (function w(x){ if(/^(VersionDetailView|AboutView|CopyrightView)$/.test(x.name)&&x.active) x.active=false;
      x.children.slice().forEach(w); })(s);})()`);

  const opened = await ev(`(function(){
    var s=cc.director.getScene(), me=null;
    (function w(x){ (x._components||[]).forEach(function(c){
      if(!me && cc.js.getClassName(c)==='MapEditor') me=c; }); x.children.slice().forEach(w); })(s);
    if(!me) return 'no MapEditor';
    window.__me = me;
    try {
      me.openMap(${cloneJson}, null);
      return 'ok';
    } catch(e) { return 'throw: ' + (e && e.message); }
  })()`);
  ok('openMap() 接受本项目的 JSON', opened === 'ok', opened);
  if (opened !== 'ok') { ws.close(); ch.kill(); process.exit(1); }
  await sleep(2500);

  // ---------- ③ 线上再导出 ----------
  const hostedJson = await ev('JSON.stringify(window.__me.getMapData())');
  if (typeof hostedJson !== 'string' || hostedJson.startsWith('EXC')) {
    console.error('hosted export failed: ' + hostedJson); ws.close(); ch.kill(); process.exit(1);
  }
  fs.writeFileSync(path.join(OUT, 'hosted_reexport.json'), hostedJson, 'utf8');
  const H = JSON.parse(hostedJson);
  console.log('  hosted keys : ' + Object.keys(H).join(','));

  console.log('\n== ③ 逐字段比对（克隆导出 → 线上读回）==');
  eq('name 保留', H.name, C.name);
  eq('bgName 保留', H.bgName, C.bgName);
  eq('type 保留', H.type, C.type);
  eq('mapWidth 保留', H.mapWidth, C.mapWidth);
  eq('mapHeight 保留', H.mapHeight, C.mapHeight);
  eq('nodeWidth 保留', H.nodeWidth, C.nodeWidth);
  eq('nodeHeight 保留', H.nodeHeight, C.nodeHeight);
  eq('alignment 保留', H.alignment, C.alignment);
  eq('roadDataArr 行数保留', (H.roadDataArr || []).length, (C.roadDataArr || []).length);
  eq('roadDataArr 首行长度保留', ((H.roadDataArr || [])[0] || []).length, ((C.roadDataArr || [])[0] || []).length);
  eq('mapItems 数量保留', (H.mapItems || []).length, (C.mapItems || []).length);

  // 路点内容整体一致
  eq('roadDataArr 内容完全一致',
    JSON.stringify(H.roadDataArr), JSON.stringify(C.roadDataArr));

  // 逐条实体：只比业务字段（v2.0.2 会补它自己的 anchor/width 等，不应改变原值）
  const FIELDS = ['type', 'objId', 'objName', 'objType', 'skin', 'x', 'y', 'cx', 'cy', 'params',
    'direction', 'isPatrol', 'dialogueId', 'taskId', 'funcId', 'monsterType', 'fightId',
    'targetMapId', 'targetMapSpawnId', 'transferType', 'spawnId', 'defaultSpawn',
    'isTreasure', 'itemId', 'itemNum'];
  let itemBad = 0; const badDetail = [];
  const n = Math.min((H.mapItems || []).length, (C.mapItems || []).length);
  for (let i = 0; i < n; i++) {
    const a = C.mapItems[i], b = H.mapItems[i];
    for (const f of FIELDS) {
      if (a[f] === undefined && b[f] === undefined) continue;
      if (String(a[f]) !== String(b[f])) {
        itemBad++; if (badDetail.length < 8) badDetail.push({ i, f, clone: a[f], hosted: b[f] });
      }
    }
  }
  ok('实体业务字段全部原样读回（' + n + ' 条）', itemBad === 0, badDetail);

  // v2.0.2 会补出它自己的字段 —— 记录但不算失败
  const firstH = (H.mapItems || [])[0];
  const firstC = (C.mapItems || [])[0];
  if (firstH && firstC) {
    const added = Object.keys(firstH).filter(k => !(k in firstC));
    const dropped = Object.keys(firstC).filter(k => !(k in firstH));
    console.log('  v2.0.2 补充的字段: ' + (added.join(', ') || '(无)'));
    console.log('  读回时丢掉的字段  : ' + (dropped.join(', ') || '(无)'));
    ok('克隆导出的字段没有被 v2.0.2 丢掉', dropped.length === 0, dropped);
  }

  console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed');
  console.log('artifacts -> ' + OUT);
  ws.close(); ch.kill();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
