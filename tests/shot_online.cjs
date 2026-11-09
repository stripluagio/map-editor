/* Screenshot the online editor with modal dialogs dismissed, and crop regions.
 *
 * The online build opens an "about / changelog" dialog on first load, which
 * covers the editor. This clicks its 关闭 button, then captures:
 *   online_full.png   — whole viewport
 *   online_top.png    — top bars (menus + 3 toolbars)
 *   online_bottom.png — info bar
 *   online_left.png   — left tool panel tabs
 *
 * Usage: node tests/shot_online.cjs [outDir]
 */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { spawn } = require('child_process');
const WS = require('./wsmini.cjs');

const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = process.env.URL ||
  'https://easymapeditor-1258223435.cos.ap-guangzhou.myqcloud.com/v2.0.0/web-mobile/index.html';
const OUT = process.argv[2] || 'C:\\tmp\\v200';
const PORT = 9362;
const PROFILE = path.join(require('os').tmpdir(), 'wm-shot-online-' + Date.now());
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = p => new Promise((res, rej) => {
  http.get({ host: '127.0.0.1', port: PORT, path: p }, r => {
    let d = ''; r.on('data', c => (d += c)); r.on('end', () => res(JSON.parse(d)));
  }).on('error', rej);
});

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
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
  await sleep(15000);

  const ev = async e => {
    const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) return 'EXC: ' + r.result.exceptionDetails.text;
    return r.result && r.result.result ? r.result.result.value : null;
  };

  // Close every popup view the UIManager has open.
  const closed = await ev(`(function(){
    if (!window.cc || !cc.director) return 'no cc';
    var s = cc.director.getScene();
    var n = 0;
    function walk(node){
      if (/^(VersionDetailView|AboutView|CopyrightView)$/.test(node.name) && node.active) { node.active = false; n++; }
      node.children.slice().forEach(walk);
    }
    walk(s);
    return 'closed ' + n;
  })()`);
  console.log('popups:', closed);
  await sleep(600);

  const shot = async (name, clip) => {
    const r = await send('Page.captureScreenshot', Object.assign({ format: 'png' },
      clip ? { clip: Object.assign({ scale: 1 }, clip) } : {}));
    fs.writeFileSync(path.join(OUT, name), Buffer.from(r.result.data, 'base64'));
    console.log('  ' + name);
  };

  await shot('online_full.png');
  await shot('online_top.png', { x: 0, y: 0, width: 1920, height: 190 });
  await shot('online_bottom.png', { x: 0, y: 1030, width: 1920, height: 50 });
  await shot('online_left.png', { x: 0, y: 40, width: 300, height: 1000 });

  ch.kill();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
