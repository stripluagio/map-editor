/* Probe: what happens when assets/map_bg.jpg is missing/blocked?
 *
 * The reported symptom was "a copy downloaded from GitHub opens with no default
 * scene and no example image". Two very different failures produced that:
 *   (a) the document itself never got created  -> truly blank, nothing to edit
 *   (b) only the background image was missing  -> grid only, still editable
 *
 * After the fix, (b) must be the outcome, plus a visible toast. This probe
 * blocks the image at the network layer (no files touched) and asserts:
 *   - WMApp.params exists (document created)
 *   - road grid is 48x55 all-default
 *   - the canvas actually has content (hexagons + road, not a flat fill)
 *   - a toast names the missing file
 *   - no JS errors
 */
'use strict';
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const WS = require('./wsmini.cjs');

const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = process.env.URL || 'http://127.0.0.1:8900/index.html';
const PORT = 9351;
const PROFILE = path.join(require('os').tmpdir(), 'wmc-degraded-' + Date.now());
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = p => new Promise((res, rej) => {
  http.get({ host: '127.0.0.1', port: PORT, path: p }, r => {
    let d = ''; r.on('data', c => (d += c)); r.on('end', () => res(JSON.parse(d)));
  }).on('error', rej);
});

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); }
}
function eq(name, a, b) { ok(name, a === b, { got: a, want: b }); }

(async () => {
  const ch = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--window-size=1920,1080', '--no-proxy-server',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE,
    'about:blank',
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
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });

  await send('Page.enable'); await send('Runtime.enable');
  await send('Network.enable');
  // Block ONLY the background image — everything else must load normally.
  await send('Network.setBlockedURLs', { urls: ['*map_bg.jpg*'] });
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: URL });
  await sleep(3000);

  const ev = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) return { __exc: String(r.result.exceptionDetails.text) };
    return r.result && r.result.result ? r.result.result.value : null;
  };

  console.log('== degraded boot: background image blocked ==');
  ok('no JS errors', JSON.stringify(await ev('window.__errs')) === '[]', await ev('window.__errs'));
  ok('WMApp exists (init() finished)', (await ev('typeof WMApp')) === 'object', await ev('typeof WMApp'));
  eq('document created anyway', await ev('WMApp.params && WMApp.params.name'), 'mapData');
  eq('map type kept', await ev('WMApp.params && WMApp.params.mapType'), 3);
  const dims = await ev('JSON.stringify({r:WMApp.road.length,c:WMApp.road[0].length})');
  eq('grid allocated 48x55', dims, '{"r":48,"c":55}');
  eq('no background image attached', await ev('!!(WMApp.params && WMApp.params.bgImage)'), false);
  eq('menu bar still rendered',
     await ev("getComputedStyle(document.getElementById('menuBar')).backgroundColor"), 'rgb(199, 199, 199)');
  ok('canvas has a real size',
     (await ev("document.getElementById('mapCanvas').width")) > 1400,
     await ev("document.getElementById('mapCanvas').width"));

  // Canvas must not be a flat fill: sample a horizontal band and count distinct colours.
  const variety = await ev(`(function(){
    var cv = document.getElementById('mapCanvas');
    var ctx = cv.getContext('2d');
    var w = cv.width, h = cv.height;
    var d = ctx.getImageData(0, Math.floor(h/2), w, 1).data;
    var seen = {};
    for (var i = 0; i < d.length; i += 4) seen[d[i]+','+d[i+1]+','+d[i+2]] = 1;
    return Object.keys(seen).length;
  })()`);
  ok('canvas draws hexagon outlines without the image (>3 colours)', variety > 3, { distinctColours: variety });

  // NOTE: the test seams are bare globals (`WMLayerStats`, `WMPaintAtPixel`);
  // `WMApp` is the state object itself, so `WMApp.WMLayerStats` is undefined.
  eq('hex layer was built', (await ev('WMLayerStats.hex')) > 0, true);

  const toastText = await ev(`(function(){
    var n = document.querySelectorAll('.toast, #toast, .wm-toast');
    return [].map.call(n, function(e){return e.textContent}).join('|');
  })()`);
  ok('toast names the missing background', /map_bg\.jpg/.test(toastText || ''), toastText);

  const boot = await ev("document.getElementById('bootBanner').style.display");
  eq('boot banner stays hidden (init did run)', boot, 'none');

  // Editing must still work — paint one cell through the real UI path.
  const painted = await ev(`(function(){
    WMPaintAtPixel(300, 300, 0);
    return WMApp.road.some(function(r){return r.some(function(v){return v===0})});
  })()`);
  eq('road can still be painted with no background', painted, true);

  /* ---- scenario 2: dist/app.js missing -------------------------------------
   * The other way to get a blank page: the bundle never loads (incomplete
   * download, or an unzip tool that skipped dist/). The inline boot guard in
   * index.html must replace the blank page with a red banner naming the cause.
   */
  console.log('\n== degraded boot: dist/app.js blocked ==');
  await send('Network.setBlockedURLs', { urls: ['*dist/app.js*'] });
  await send('Page.navigate', { url: URL + '?noapp=1' });
  await sleep(3400);                       // boot guard fires at 2500 ms

  const bannerShown = await ev("document.getElementById('bootBanner').style.display");
  eq('boot banner is visible', bannerShown, 'block');
  const bannerText = await ev("document.getElementById('bootBanner').textContent");
  ok('banner says the bundle failed to load', /dist\/app\.js 没能加载/.test(bannerText || ''), bannerText);
  ok('banner tells the user how to fix it',
     /npm run serve/.test(bannerText || '') && /assets\/map_bg\.jpg/.test(bannerText || ''), bannerText);
  eq('no app booted', await ev('typeof WMApp'), 'undefined');

  console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed');
  ch.kill();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
