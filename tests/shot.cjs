/* Screenshot any page (http:// or file://) with optional URL blocking.
 *
 * This is the manual counterpart to tests/e2e.cjs: no assertions, just a PNG,
 * so a human can look at what the browser actually rendered.
 *
 * Usage:
 *   node tests/shot.cjs <url> <out.png> [--block=*map_bg.jpg*] [--wait=3000]
 *
 * Examples:
 *   # normal boot over the dev server
 *   node tests/shot.cjs http://127.0.0.1:8900/index.html C:/tmp/a.png
 *   # what a missing background image looks like
 *   node tests/shot.cjs http://127.0.0.1:8900/index.html C:/tmp/b.png --block=*map_bg.jpg*
 *   # the double-click index.html path
 *   node tests/shot.cjs file:///C:/tmp/ziptest/map-editor-main/index.html C:/tmp/c.png
 */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { spawn } = require('child_process');
const WS = require('./wsmini.cjs');

const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const argv = process.argv.slice(2);
const URL = argv[0];
const OUT = argv[1] || 'C:\\tmp\\wmc\\shot.png';
const opt = name => {
  const hit = argv.find(a => a.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : null;
};
const BLOCK = opt('block');
const WAIT = Number(opt('wait')) || 3000;

const PORT = 9354;
const PROFILE = path.join(require('os').tmpdir(), 'wmc-shot-' + Date.now());
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = p => new Promise((res, rej) => {
  http.get({ host: '127.0.0.1', port: PORT, path: p }, r => {
    let d = ''; r.on('data', c => (d += c)); r.on('end', () => res(JSON.parse(d)));
  }).on('error', rej);
});

(async () => {
  if (!URL) { console.error('usage: node tests/shot.cjs <url> <out.png> [--block=pat] [--wait=ms]'); process.exit(2); }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });

  const ch = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--window-size=1920,1080', '--no-proxy-server',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, 'about:blank',
  ], { stdio: 'ignore' });

  let pages = null;
  for (let i = 0; i < 60; i++) {
    try { pages = await get('/json/list'); if (pages.some(p => p.type === 'page')) break; } catch {}
    await sleep(300);
  }
  if (!pages) { console.error('cannot connect to chrome'); process.exit(1); }
  const page = pages.find(p => p.type === 'page');
  const ws = new WS(page.webSocketDebuggerUrl); await ws.ready();
  let id = 0; const pend = new Map();
  ws.onMessage(m => { const o = JSON.parse(m); if (o.id && pend.has(o.id)) { pend.get(o.id)(o); pend.delete(o.id); } });
  const send = (m, p = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });

  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  if (BLOCK) await send('Network.setBlockedURLs', { urls: [BLOCK] });
  await send('Page.navigate', { url: URL });
  await sleep(WAIT);

  const ev = async e => {
    const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) return 'EXC: ' + r.result.exceptionDetails.text;
    return r.result && r.result.result ? r.result.result.value : null;
  };

  console.log('url         :', URL);
  console.log('blocked     :', BLOCK || '(none)');
  console.log('typeof WMApp:', await ev('typeof WMApp'));
  console.log('map         :', await ev('WMApp.params ? WMApp.params.name + " / type " + WMApp.params.mapType : "(no document)"'));
  console.log('bg loaded   :', await ev('!!(WMApp.params && WMApp.params.bgImage && WMApp.params.bgImage.naturalWidth)'));
  console.log('grid        :', await ev('WMApp.road && WMApp.road.length ? WMApp.road.length + "x" + WMApp.road[0].length : "-"'));
  console.log('__errs      :', JSON.stringify(await ev('window.__errs')));
  console.log('banner      :', await ev(`(function(){
    var b = document.getElementById('bootBanner');
    return b ? 'display=' + b.style.display : '(no banner element)';
  })()`));
  console.log('toast       :', await ev("(document.getElementById('toast')||{}).textContent || '-'"));

  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(OUT, Buffer.from(r.result.data, 'base64'));
  console.log('saved       :', OUT);

  ch.kill();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
