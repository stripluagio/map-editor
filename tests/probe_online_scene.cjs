/* Dump the live Cocos scene graph of the online v2.0.2 editor.
 *
 * The online build is Cocos Creator 2.x (WebGL canvas), so DOM inspection is
 * useless — but `cc.director.getScene()` gives the whole node tree, and
 * `getComponent(cc.Class)` gives us the actual runtime values (brush sizes,
 * map params, window list). That is how we get exact numbers instead of guesses.
 *
 * Usage: node tests/probe_online_scene.cjs [--out=C:/tmp/v200/scene.json]
 */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { spawn } = require('child_process');
const WS = require('./wsmini.cjs');

const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = process.env.URL ||
  'https://easymapeditor-1258223435.cos.ap-guangzhou.myqcloud.com/v2.0.0/web-mobile/index.html';
const OUT = (process.argv.find(a => a.startsWith('--out=')) || '').slice(6) || 'C:\\tmp\\v200\\scene.json';
const PORT = 9361;
const PROFILE = path.join(require('os').tmpdir(), 'wm-online-' + Date.now());
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = p => new Promise((res, rej) => {
  http.get({ host: '127.0.0.1', port: PORT, path: p }, r => {
    let d = ''; r.on('data', c => (d += c)); r.on('end', () => res(JSON.parse(d)));
  }).on('error', rej);
});

(async () => {
  const ch = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--window-size=1920,1080', '--no-proxy-server',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, 'about:blank',
  ], { stdio: 'ignore' });

  let pages = null;
  for (let i = 0; i < 80; i++) {
    try { pages = await get('/json/list'); if (pages.some(p => p.type === 'page')) break; } catch {}
    await sleep(300);
  }
  const page = pages.find(p => p.type === 'page');
  const ws = new WS(page.webSocketDebuggerUrl); await ws.ready();
  let id = 0; const pend = new Map();
  ws.onMessage(m => { const o = JSON.parse(m); if (o.id && pend.has(o.id)) { pend.get(o.id)(o); pend.delete(o.id); } });
  const send = (m, p = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });

  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: URL });
  await sleep(16000);   // engine + bundles + splash

  const ev = async e => {
    const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) return { __exc: String(r.result.exceptionDetails.text) };
    return r.result && r.result.result ? r.result.result.value : null;
  };

  // 1. Close the "关于" dialog if it is open (it covers the editor).
  await ev(`(function(){
    var s = cc.director.getScene();
    function walk(n, f){ f(n); n.children.forEach(function(c){ walk(c, f); }); }
    walk(s, function(n){ if (n.name && /^(About|VersionDetail)/i.test(n.name)) n.active = false; });
  })()`);
  await sleep(400);

  // 2. Whole scene tree with component names.
  const tree = await ev(`(function(){
    var s = cc.director.getScene();
    function comps(n){
      return (n._components || []).map(function(c){
        var k = cc.js.getClassName(c) || (c.constructor && c.constructor.name) || '?';
        return k;
      });
    }
    function walk(n, d){
      var o = { name: n.name, active: n.active, comps: comps(n), children: [] };
      if (d < 14) n.children.forEach(function(c){ o.children.push(walk(c, d + 1)); });
      return o;
    }
    return walk(s, 0);
  })()`);

  // 3. Brush selector sizes (the Shift "big brush" is itemList[2]).
  const brush = await ev(`(function(){
    var s = cc.director.getScene();
    var found = null;
    function walk(n){
      (n._components || []).forEach(function(c){
        if (!found && cc.js.getClassName(c) === 'EditBrush') found = c;
      });
      n.children.forEach(walk);
    }
    walk(s);
    if (!found) return 'no EditBrush';
    return {
      count: found.itemList.length,
      sizes: found.itemList.map(function(i){ return i.size; }),
      current: found.currentItem ? found.currentItem.size : null,
      last: found.lastItem ? found.lastItem.size : null,
      shiftTarget: found.itemList[2] ? found.itemList[2].size : null
    };
  })()`);

  // 4. Map params actually in use (alignment = origin mode).
  const params = await ev(`(function(){
    var s = cc.director.getScene();
    var out = null;
    function walk(n){
      (n._components || []).forEach(function(c){
        if (out) return;
        var k = cc.js.getClassName(c);
        if (k === 'MapEditor') {
          out = { cls: k, keys: Object.keys(c).filter(function(x){ return /map|align|origin|ceil/i.test(x); }) };
        }
      });
      n.children.forEach(walk);
    }
    walk(s);
    return out;
  })()`);

  const res = { url: URL, brush, params, tree };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  console.log('brush :', JSON.stringify(brush));
  console.log('params:', JSON.stringify(params));
  console.log('tree  :', JSON.stringify(tree).length, 'bytes ->', OUT);

  ch.kill();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
