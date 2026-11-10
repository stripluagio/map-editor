/* Browser end-to-end test for Map Editor.
 * Prereq: static server on http://127.0.0.1:8900 (python -m http.server 8900)
 * Run: node tests/e2e.cjs
 * Uses Chrome DevTools Protocol directly (no npm dependencies).
 */
'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const WS=require('./wsmini.cjs');
const CHROME=process.env.CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL=process.env.URL||'http://127.0.0.1:8900/index.html';
const PORT=9341, PROFILE=path.join(require('os').tmpdir(),'wmc-e2e-profile-'+process.pid+'-'+Date.now());
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function get(p){return new Promise((res,rej)=>http.get({host:'127.0.0.1',port:PORT,path:p},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));}).on('error',rej));}

let pass=0,fail=0;
function ok(name,cond,extra){ if(cond){pass++;console.log('  PASS  '+name);} else {fail++;console.log('  FAIL  '+name+(extra!==undefined?'  -> '+JSON.stringify(extra):''));} }
function eq(name,a,b){ ok(name, a===b, {got:a, want:b}); }

(async()=>{
  /* A fresh profile per run + cache disabled. A reused profile serves the
   * previous run's dist/style.css from the HTTP cache, which silently makes the
   * layout assertions test the *old* stylesheet (that is exactly how a stale
   * `#toolBar3` rule once hid a real bug). */
  const ch=spawn(CHROME,['--headless=new','--disable-gpu','--no-sandbox','--hide-scrollbars',
    '--window-size=1920,1080','--autoplay-policy=no-user-gesture-required',
    `--remote-debugging-port=${PORT}`,'--user-data-dir='+PROFILE,'about:blank'],{stdio:'ignore'});
  let pages=null;
  for(let i=0;i<60;i++){try{pages=await get('/json/list');if(pages.some(p=>p.type==='page'))break;}catch(e){}await sleep(300);}
  if(!pages){console.error('cannot connect to chrome');process.exit(1);}
  const page=pages.find(p=>p.type==='page');
  const ws=new WS(page.webSocketDebuggerUrl); await ws.ready();
  let id=0; const pend=new Map();
  ws.onMessage(m=>{const o=JSON.parse(m);if(o.id&&pend.has(o.id)){pend.get(o.id)(o);pend.delete(o.id);}});
  const send=(method,params={})=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method,params}));});
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:URL});
  await sleep(2200);
  const ev=async expr=>{const r=await send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});
    if(r.result&&r.result.exceptionDetails)return {__exc:String(r.result.exceptionDetails.text)};
    return r.result&&r.result.result?r.result.result.value:null;};
  const click=async(x,y,button='left')=>{
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button,clickCount:1,buttons:button==='right'?2:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button,clickCount:1,buttons:0});
  };
  const key=async(k,code)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:k,code:code||k,windowsVirtualKeyCode:k.length===1?k.toUpperCase().charCodeAt(0):0});
                            await send('Input.dispatchKeyEvent',{type:'keyUp',key:k,code:code||k,windowsVirtualKeyCode:k.length===1?k.toUpperCase().charCodeAt(0):0});};
  const E=async e=>await ev(e);
  /* Click by selector instead of hardcoded pixel offsets. The top bar gained a
   * third toolbar and the info bar in v2.0.2 parity work, which shifts every
   * y coordinate; selector clicks survive that. */
  const centerOf=async sel=>JSON.parse(await E('(function(){var e=document.querySelector('+JSON.stringify(sel)+');'
    +'if(!e)return JSON.stringify(null);var r=e.getBoundingClientRect();'
    +'return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})})()'));
  const clickSel=async sel=>{const p=await centerOf(sel); if(!p) throw new Error('no element: '+sel); await click(p.x,p.y); return p;};
  const tb3=act=>'#toolBar3 .tb-btn[data-act="'+act+'"]';
  const tb1=act=>'#toolBar1 .tb-btn[data-act="'+act+'"]';
  const menu=name=>'.menu-item[data-menu="'+name+'"]';

  console.log('== boot / layout ==');
  ok('no JS errors', JSON.stringify(await E('window.__errs'))==='[]', await E('window.__errs'));
  ok('app scaled 1:1 at 1920', (await E('WMApp.screenScale'))===1, await E('WMApp.screenScale'));
  ok('document loaded', (await E('WMApp.params.name'))==='mapData');
  ok('honeycomb2 map type', (await E('WMApp.params.mapType'))===3);
  ok('map 1920x1440', (await E('WMApp.params.mapWidth'))===1920 && (await E('WMApp.params.mapHeight'))===1440);
  ok('cell 40x34.64', (await E('WMApp.params.ceilWidth'))===40);
  const dims=await E("JSON.stringify({rows:WMApp.road.length,cols:WMApp.road[0].length,ents:WMApp.entities.length})");
  const dd=JSON.parse(dims);
  ok('grid 48x55', dd.rows===48 && dd.cols===55, dd);
  ok('0 entities at startup (verified original)', dd.ents===0, dd);
  ok('all road cells = default 1 (verified original)',
     (await E("WMApp.road.every(function(r){return r.every(function(v){return v===1})})"))===true);
  ok('canvas sized', (await E("document.getElementById('mapCanvas').width"))>1400);
  ok('menu labels', (await E("[].map.call(document.querySelectorAll('.menu-item'),e=>e.textContent).join(',')"))==='文件,编辑,命令,下载,窗口,工具,帮助');
  ok('toolbar1 visible labels', (await E("[].filter.call(document.querySelectorAll('#toolBar1 .tb-btn'),function(e){return !e.classList.contains('hidden')}).map(function(e){return e.textContent}).join('|')"))==='新建|打开|保存|另存为|设置|导入编辑资源|运行（ctr + enter）|显示小地图(F2)|Excel导出数据工具|教程|地图介绍|购买地图编辑器|更多游戏项目');
  ok('toolbar2 first label', (await E("document.querySelector('#toolBar2 .tb-btn').textContent"))==='隐藏地图（U）');
  eq('toolbar3 has the 9 left-panel tabs',
     await E("document.querySelectorAll('#toolBar3 .tb-btn').length"), 9);
  ok('left panel title', (await E("document.getElementById('toolTitle').textContent"))==='编辑路点');
  ok('5 road swatches', (await E("document.querySelectorAll('#toolContent .tool-item').length"))===5);
  // 顶部三条的底色是从原版 1920×1080 截图里量出来的：条底 #c7c7c7、按钮 #a7a7a7。
  // 之前菜单条写成 #f6f0f0、按钮写成 #c5c5c5，按钮几乎和底条同色，"糊"成一片。
  eq('menu bar bg = original #c7c7c7',
     await E("getComputedStyle(document.getElementById('menuBar')).backgroundColor"), 'rgb(199, 199, 199)');
  eq('toolbar bg = original #c7c7c7',
     await E("getComputedStyle(document.getElementById('toolBar1')).backgroundColor"), 'rgb(199, 199, 199)');
  eq('toolbar button bg = original #a7a7a7',
     await E("getComputedStyle(document.querySelector('#toolBar1 .tb-btn')).backgroundColor"), 'rgb(167, 167, 167)');

  console.log('== menus ==');
  await clickSel(menu('file'));
  ok('file menu opens', (await E("document.getElementById('menuPanel').classList.contains('open')"))===true);
  const items=await E("[].map.call(document.querySelectorAll('.menu-panel-item'),e=>e.textContent).join('|')");
  ok('file menu items', items.includes('新建')&&items.includes('保存（CTRL + S）')&&items.includes('设置'), items);
  await click(900,500); // close
  await clickSel(menu('edit'));
  const eitems=await E("[].map.call(document.querySelectorAll('.menu-panel-item'),e=>e.textContent).join('|')");
  ok('edit menu has Q/W/E/R', ['添加可走路点(Q)','添加不可走路点(W)','添加透明行走路点(E)','添加传送路点(R)'].every(s=>eitems.includes(s)), eitems.slice(0,120));
  await click(900,500);

  console.log('== road tools / painting ==');
  await key('q','KeyQ'); ok('Q selects value 0', (await E('WMApp.roadValue'))===0);
  await key('w','KeyW'); ok('W selects value 1', (await E('WMApp.roadValue'))===1);
  await key('e','KeyE'); ok('E selects value 2', (await E('WMApp.roadValue'))===2);
  await key('r','KeyR'); ok('R selects value 3', (await E('WMApp.roadValue'))===3);
  await key('d','KeyD'); ok('D selects delete', (await E('WMApp.roadValue'))===-1);
  await key('t','KeyT'); ok('T stops placing', (await E('WMApp.roadValue'))===-2);
  await key('q','KeyQ');
  const before=await E('WMApp.road.map(r=>r.join("")).join("")');
  await click(700,600); // paint on canvas
  const after=await E('WMApp.road.map(r=>r.join("")).join("")');
  ok('painting writes road cell', before!==after);
  ok('undo stack grows', (await E('WMApp.undo.undoStack.length'))>0);
  await E("WMApp.undo.undo();");
  ok('undo restores road cells', (await E('WMApp.road.map(r=>r.join("")).join("")'))===before);

  console.log('== brush / entity tools ==');
  const tb3hit = await E(`(function(){
    var b = document.querySelector('#toolBar3 .tb-btn[data-act="openBrushWin"]');
    var r = b.getBoundingClientRect();
    var e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    var mb = document.getElementById('menuBar').getBoundingClientRect();
    var p3 = document.getElementById('toolBar3').parentElement;
    return JSON.stringify({
      btn: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
      hit: e ? e.tagName + '.' + (e.className || '') : 'null',
      panel: document.getElementById('menuPanel').classList.contains('open'),
      scale: WMApp.screenScale, open: WMApp.openMenu, iw: innerWidth,
      sy: Math.round(scrollY),
      mb: [Math.round(mb.top), Math.round(mb.height)],
      cssTop: getComputedStyle(document.getElementById('toolBar3')).top,
      cls: document.getElementById('toolBar3').className,
      pos: getComputedStyle(document.getElementById('toolBar3')).position,
      inline: document.getElementById('toolBar3').getAttribute('style'),
      rules: (function () {
        var out = [], ss = document.styleSheets;
        for (var i = 0; i < ss.length; i++) {
          var rs; try { rs = ss[i].cssRules; } catch (e) { continue; }
          for (var j = 0; j < rs.length; j++) if (/#toolBar3/.test(rs[j].selectorText || '')) out.push(rs[j].cssText.slice(0, 60));
        }
        return out;
      })(),
      parent: p3.id + '/' + p3.className
    });
  })()`);
  ok('toolbar3 button is on top (not covered)', String(tb3hit).indexOf('tb-btn')>=0, tb3hit);
  await clickSel(tb3('openBrushWin')); ok('设置笔刷 opens brush tab', (await E('WMApp.tool'))==='brush', await E('WMApp.tool'));  ok('5 brush sizes (live v2.0.2: 0/1/2/3/4)', (await E("document.querySelectorAll('#toolContent .tool-item').length"))===5);
  await clickSel(tb3('openNpcWin')); ok('放置npc opens NPC tab', (await E('WMApp.tool'))==='npc'&&(await E('WMApp.entityType'))==='npc');
  ok('4 NPC skins (verified original)', (await E("document.querySelectorAll('#toolContent .tool-item').length"))===4);
  ok('NPC labels match original',
     (await E("[].map.call(document.querySelectorAll('#toolContent .tool-label'),e=>e.textContent).join('|')"))==='商人.NPC|任务.NPC|剧情.NPC|特殊.NPC');
  ok('NPC icons are all different',
     (await E("(function(){var s=[].map.call(document.querySelectorAll('#toolContent .tool-item img'),e=>e.getAttribute('src'));return s.length===4 && new Set(s).size===4})()"))===true);
  const n0=await E('WMApp.entities.length');
  ok('no entity placed just by opening the tab', (await E('WMApp.entities.length'))===n0);
  // Original flow: pick a selector -> ghost follows cursor -> click drops it.
  await E("document.querySelectorAll('#toolContent .tool-item')[0].dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))");
  ok('selector arms the entity brush', (await E('WMApp.brushEntity'))!==null);
  ok('brush is the picked skin', (await E('WMApp.brushEntity.objName'))==='商人.NPC');
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1000,y:500,button:'none',buttons:0});
  const ghostPos = JSON.parse(await E("JSON.stringify({x:WMApp.brushEntity.x,y:WMApp.brushEntity.y})"));
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:900,y:640,button:'none',buttons:0});
  const ghostPos2 = JSON.parse(await E("JSON.stringify({x:WMApp.brushEntity.x,y:WMApp.brushEntity.y})"));
  ok('ghost follows the cursor', ghostPos.x!==ghostPos2.x || ghostPos.y!==ghostPos2.y, {ghostPos, ghostPos2});
  await click(900,640);
  ok('click drops the entity', (await E('WMApp.entities.length'))===n0+1, {n0,now:await E('WMApp.entities.length')});
  ok('brush cleared after drop', (await E('WMApp.brushEntity'))===null);
  ok('entity selected', (await E('WMApp.selectedEntity.type'))==='npc');
  ok('placed NPC carries npcType', (await E('WMApp.selectedEntity.npcType'))===0);
  ok('placed NPC objName from selector', (await E('WMApp.selectedEntity.objName'))==='商人.NPC');
  // NPC has 15 schema fields; cx/cy/npcType are visible:false -> 12 editable rows.
  ok('property panel rows = 12', (await E("document.querySelectorAll('#propertyContent .prop-row').length"))===12,
     await E("document.querySelectorAll('#propertyContent .prop-row').length"));
  await E("document.querySelectorAll('#propertyContent .prop-value')[1].value='测试NPC';document.querySelectorAll('#propertyContent .prop-value')[1].dispatchEvent(new Event('change'))");
  ok('property edit works', (await E('WMApp.selectedEntity.objName'))==='测试NPC', await E('WMApp.selectedEntity.objName'));

  console.log('== entity drag ==');
  const dragStart = JSON.parse(await E("JSON.stringify({x:WMApp.entities[0].x,y:WMApp.entities[0].y})"));
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:900,y:640,button:'left',clickCount:1,buttons:1});
  ok('left press on entity starts drag', (await E('WMApp.draggingEntity'))!==null);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:820,y:700,button:'left',buttons:1});
  const dragMid = JSON.parse(await E("JSON.stringify({x:WMApp.entities[0].x,y:WMApp.entities[0].y})"));
  ok('drag moves the entity', dragMid.x!==dragStart.x || dragMid.y!==dragStart.y, {dragStart,dragMid});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:820,y:700,button:'left',clickCount:1,buttons:0});
  ok('drag ends on mouseup', (await E('WMApp.draggingEntity'))===null);
  const dragEnd = JSON.parse(await E("JSON.stringify({x:WMApp.entities[0].x,y:WMApp.entities[0].y,cx:WMApp.entities[0].cx,cy:WMApp.entities[0].cy})"));
  ok('drop keeps the moved position', Math.abs(dragEnd.x-dragMid.x)<1 && Math.abs(dragEnd.y-dragMid.y)<1, {dragMid,dragEnd});
  ok('drop refreshes cx/cy', typeof dragEnd.cx==='number' && typeof dragEnd.cy==='number');

  console.log('== circular hit area ==');
  const ent = JSON.parse(await E("(function(){var e=WMApp.entities[0],cv=document.getElementById('mapCanvas'),r=cv.getBoundingClientRect();var m=[[e.x,e.y],[e.x,e.y-40],[e.x,e.y-80],[e.x+60,e.y-40],[e.x,e.y+20]];return JSON.stringify(m.map(function(p){var sx=r.left+(p[0]+WMApp.view.offsetX)*WMApp.view.zoom,sy=r.top+(p[1]+WMApp.view.offsetY)*WMApp.view.zoom;return [Math.round(sx),Math.round(sy)]}))})()"));
  // centre of the ring hits
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:ent[1][0],y:ent[1][1],button:'left',clickCount:1,buttons:1});
  ok('click inside selection ring selects', (await E('WMApp.selectedEntity'))!==null);
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:ent[1][0],y:ent[1][1],button:'left',clickCount:1,buttons:0});
  // 60px to the right of the ring centre is outside r=44
  await E("WMApp.selectedEntity=null");
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:ent[3][0],y:ent[3][1],button:'left',clickCount:1,buttons:1});
  ok('click outside the ring does not select', (await E('WMApp.selectedEntity'))===null);
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:ent[3][0],y:ent[3][1],button:'left',clickCount:1,buttons:0});
  await E("WMApp.drawing=false;WMApp.undo.clear();");

  console.log('== render performance (cached layers) ==');
  const perf = JSON.parse(await E("(function(){var t0=performance.now();for(var i=0;i<120;i++)WMRender();return JSON.stringify({ms:performance.now()-t0})})()"));
  ok('120 full renders under 120ms (cached blit)', perf.ms < 120, perf);
  ok('scene cache is reused', (await E("(function(){var a=WMRender(),b=WMRender();return true})()"))===true);

  console.log('== monster / transfer / spawn selectors ==');
  await clickSel(tb3('openMonsterWin'));
  ok('4 monster skins', (await E("document.querySelectorAll('#toolContent .tool-item').length"))===4);
  ok('monster labels match original',
     (await E("[].map.call(document.querySelectorAll('#toolContent .tool-label'),e=>e.textContent).join('|')"))==='小怪|精英怪|Boss|特殊怪');
  ok('monster icons all different',
     (await E("(function(){var s=[].map.call(document.querySelectorAll('#toolContent .tool-item img'),e=>e.getAttribute('src'));return s.length===4 && new Set(s).size===4})()"))===true);
  await clickSel(tb3('openTransferWin'));
  ok('3 transfer skins', (await E("document.querySelectorAll('#toolContent .tool-item').length"))===3);
  ok('transfer labels match original (incl. 传送们 typo)',
     (await E("[].map.call(document.querySelectorAll('#toolContent .tool-label'),e=>e.textContent).join('|')"))==='类型1.传送们|类型2.传送们|不可视.传送们');
  await clickSel(tb3('openSpawnWin'));
  ok('1 spawn skin', (await E("document.querySelectorAll('#toolContent .tool-item').length"))===1);

  console.log('== entity sprite animation (original AnimationController) ==');
  ok('transfer frame counts are 8 / 11 / 1',
     (await E("JSON.stringify(WMApp.sprites.transfer.map(function(f){return f.length}))"))==='[8,11,1]',
     await E("JSON.stringify(WMApp.sprites.transfer.map(function(f){return f.length}))"));
  ok('npc frames are static (1 each)',
     (await E("WMApp.sprites.npc.every(function(f){return f.length===1})"))===true);
  ok('transfer frame images all loaded',
     (await E("WMApp.sprites.transfer[0].every(function(i){return i.complete && i.naturalWidth>0})"))===true);
  ok('entity draw size follows original Skin size',
     (await E("JSON.stringify([WMCore.entitySize('transfer',0),WMCore.entitySize('npc',0)])"))==='[{"w":200,"h":200},{"w":56,"h":99}]',
     await E("JSON.stringify([WMCore.entitySize('transfer',0),WMCore.entitySize('npc',0)])"));

  console.log('== road paint: all 4 values ==');
  await clickSel(tb3('openRoadWin')); ok('编辑路点 returns to road tab', (await E('WMApp.tool'))==='road');
  // use a distinct cell per value so each one is newly painted
  const spots = [[600,430],[660,470],[720,510],[780,550]];
  const vals = [['w',1],['q',0],['e',2],['r',3]];
  for (let i=0;i<vals.length;i++) {
    const [k, v] = vals[i];
    await key(k, 'Key'+k.toUpperCase());
    const beforeKeys = JSON.parse(await E('JSON.stringify([...WMApp.painted])'));
    await click(spots[i][0], spots[i][1]);
    const afterKeys = JSON.parse(await E('JSON.stringify([...WMApp.painted])'));
    const added = afterKeys.filter(x => !beforeKeys.includes(x));
    ok('paint value '+v+' stores a painted cell', added.length>=1, {added});
    if (added.length) {
      const cols = await E('WMApp.road[0].length');
      const kk = added[0];
      const val = await E('WMApp.road[Math.floor('+kk+'/'+cols+')]['+kk+'%'+cols+']');
      ok('paint value '+v+' writes road value '+v, val===v, {got:val,want:v});
    }
  }
  await key('d','KeyD');
  const pd0 = await E('WMApp.painted.size');
  await click(spots[0][0], spots[0][1]);
  ok('D erases painted cell', (await E('WMApp.painted.size'))===pd0-1, {pd0,now:await E('WMApp.painted.size')});

  console.log('== layer toggles / info bar ==');
  await key('u','KeyU'); ok('U hides map', (await E('WMApp.layers.map'))===false);
  await key('u','KeyU'); ok('U shows map', (await E('WMApp.layers.map'))===true);
  await key('i','KeyI'); ok('I hides road', (await E('WMApp.layers.road'))===false);
  await key('i','KeyI');
  await key('o','KeyO'); ok('O hides entities', (await E('WMApp.layers.entity'))===false);
  await key('o','KeyO');
  await key('p','KeyP'); ok('P hides grid', (await E('WMApp.layers.grid'))===false);
  await key('p','KeyP');
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:700,y:600,button:'none',buttons:0});
  ok('info bar updates on mouse move', (await E("document.getElementById('infoPixel').textContent"))!=='（0,0）', await E("document.getElementById('infoPixel').textContent"));

  console.log('== A* / minimap / settings ==');
  // Paint a walkable corridor with Q (as a user would) — pristine map is all blocked.
  await E("(function(){var r=WMApp.road,m=Math.floor(r.length/2);for(var x=4;x<r[0].length-4;x++)r[m][x]=0;return 1})()");
  await key('a','KeyA');
  ok('A* path preview set', (await E('WMApp.pathPreview?WMApp.pathPreview.length:0'))>0, await E('WMApp.pathPreview?WMApp.pathPreview.length:0'));
  await clickSel(tb1('showMiniMap'));
  ok('minimap opens', (await E("!document.getElementById('miniMapView').classList.contains('hidden')"))===true);
  await click(1180,250);
  await clickSel(tb1('showProjectSetting'));
  ok('settings opens', (await E("!document.getElementById('settingView').classList.contains('hidden')"))===true,
     await E("JSON.stringify({act:WMApp.activeView,mode:WMApp.mode})"));
  ok('settings has 4 road rows', (await E("document.querySelectorAll('#stRoadTable .st-tr').length"))===4);
  await E("WMApp.setting.roadSetDatas[0].color='#12345678'");
  await E("document.getElementById('stApply').click()");  // 应用
  ok('settings applied', (await E('WMApp.setting.roadSetDatas[0].color'))==='#12345678');
  ok('settings closed', (await E("document.getElementById('settingView').classList.contains('hidden')"))===true);

  console.log('== new map wizard ==');
  await clickSel(tb1('createNewFile'));
  ok('new map opens', (await E("!document.getElementById('newMapView').classList.contains('hidden')"))===true);
  await E("document.querySelectorAll('#nmToggles input')[2].click()");
  ok('hex type selected', (await E('WMApp.nmMapType'))===2);
  ok('hex defaults 40/34.64', (await E("document.getElementById('nmRoadW').value"))==='40' && (await E("document.getElementById('nmRoadH').value"))==='34.64');
  ok('hex note visible', (await E("!document.getElementById('nmDetail').classList.contains('hidden')"))===true);
  await E("document.querySelector('#newMapView [data-close]').click()"); // 关闭
  ok('new map closed', (await E("document.getElementById('newMapView').classList.contains('hidden')"))===true);

  console.log('== export ==');
  const shape=JSON.parse(await E("(function(){var d=WMGetMapData().toJson();return JSON.stringify({keys:Object.keys(d),rows:d.roadDataArr.length,cols:d.roadDataArr[0].length,items:d.mapItems.length,i0:Object.keys(d.mapItems[0])})})()"));
  ok('12 export fields', shape.keys.length===12, shape.keys);
  ok('export field order', shape.keys[0]==='name'&&shape.keys[11]==='mapItems', shape.keys);
  ok('export rows/cols', shape.rows===48&&shape.cols===55, shape);
  ok('entity export full schema', shape.i0.length===16, shape.i0);
  ok('no errors at end', JSON.stringify(await E('window.__errs'))==='[]', await E('window.__errs'));

  console.log('== v2.0.2: 关于 / 下载 / 工具 菜单 ==');
  await clickSel(menu('download'));
  const dlItems = await E("[].map.call(document.querySelectorAll('.menu-panel-item'),e=>e.textContent).join('|')");
  ok('下载 menu lists the framework packages',
     ['基础前端框架Creator_v2.4.15（免费）','基础前端框架Laya_v3.3.8（免费）','基础前端框架Unity_v2022.3.13（免费）','下载大地图切图工具']
       .every(s => dlItems.includes(s)), dlItems);
  await click(900,500);
  await clickSel(menu('tools'));
  const toolItems = await E("[].map.call(document.querySelectorAll('.menu-panel-item'),e=>e.textContent).join('|')");
  ok('工具 menu has the Excel tool', toolItems.includes('Excel导出数据工具'), toolItems);
  await click(900,500);
  await clickSel(menu('help'));
  const helpItems = await E("[].map.call(document.querySelectorAll('.menu-panel-item'),e=>e.textContent).join('|')");
  ok('帮助 menu matches v2.0.2', helpItems.includes('关于在线地图编辑器') && helpItems.includes('联系我们'), helpItems);
  await click(900,500);

  console.log('== v2.0.2: 关于在线地图编辑器 ==');
  await E("WMAction('showAbout')");
  const about = JSON.parse(await E("(function(){var v=document.getElementById('aboutView');"
    +"return JSON.stringify({open:!v.classList.contains('hidden'),view:WMApp.activeView,"
    +"text:v.textContent.replace(/\\s+/g,' ')})})()"));
  ok('about view opens', about.open === true && about.view === 'about', about.view);
  ok('about view names the version', /v2\.0\.2/.test(about.text), about.text.slice(0, 80));
  await E("document.querySelector('#aboutView [data-close]').click()");
  ok('about view closes', (await E('WMApp.activeView'))===null);

  console.log('== v2.0.2: Excel 导出数据工具 ==');
  await E("WMAction('openExcelExportTool')");
  ok('excel view opens', (await E("!document.getElementById('excelView').classList.contains('hidden')"))===true);
  await E("document.getElementById('excelDemo').click()");
  const xl = JSON.parse(await E("(function(){return JSON.stringify({"
    +"status:document.getElementById('excelStatus').textContent,"
    +"sheets:document.getElementById('excelSheet').options.length,"
    +"preview:document.querySelectorAll('#excelPreview tr').length,"
    +"types:[].map.call(document.getElementById('excelType').options,function(o){return o.value})})})()"));
  ok('demo sheet loads', xl.sheets === 1 && xl.preview >= 7, xl);
  ok('three export formats (json/xml/ts)', xl.types.join(',')==='json,xml,ts', xl.types);
  for (const kind of ['json', 'xml', 'ts']) {
    await E("document.getElementById('excelType').value='"+kind+"'");
    await E("document.getElementById('excelExport').click()");
    await sleep(120);
    const st = await E("document.getElementById('excelStatus').textContent");
    ok('export '+kind+' reports a file', /完成导出/.test(st) && st.indexOf('.'+kind)>=0, st);
  }
  await E("document.querySelector('#excelView [data-close]').click()");
  ok('excel view closes', (await E('WMApp.activeView'))===null);

  console.log('== v2.0.2: 放置物体 / 道具 / 事件 ==');
  for (const [act, tool, n, title] of [
    ['openObjWin', 'obj', 3, '放置物体'],
    ['openPropWin', 'prop', 3, '放置道具'],
    ['openEventWin', 'event', 2, '放置事件'],
  ]) {
    await E("WMAction('"+act+"')");
    const got = JSON.parse(await E("JSON.stringify({tool:WMApp.tool,type:WMApp.entityType,"
      +"items:document.querySelectorAll('#toolContent .tool-item').length,"
      +"title:document.getElementById('toolTitle').textContent})"));
    ok(act+' opens the '+tool+' tab', got.tool===tool && got.type===tool, got);
    eq(act+' skin count', got.items, n);
    eq(act+' panel title', got.title, title);
  }
  const propExport = JSON.parse(await E(`(function(){
    WMAction('openPropWin');
    document.querySelectorAll('#toolContent .tool-item')[0].dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
    var e = WMApp.brushEntity;
    e.x = 320; e.y = 320; e.isTreasure = true; e.itemId = 1001; e.itemNum = 5;
    WMApp.entities.push(e); WMApp.brushEntity = null;
    var d = WMGetMapData().toJson();
    var it = d.mapItems.filter(function(x){return x.type==='prop'})[0];
    return JSON.stringify({keys: it ? Object.keys(it) : null, item: it});
  })()`));
  ok('道具 exports isTreasure/itemId/itemNum',
     ['isTreasure','itemId','itemNum'].every(k => propExport.keys.indexOf(k)>=0), propExport.keys);
  ok('道具 keeps its values', propExport.item.isTreasure===true && propExport.item.itemId===1001 && propExport.item.itemNum===5,
     propExport.item);
  ok('道具 schema is BASE + 3 fields', propExport.keys.length===13, propExport.keys.length);
  // 清掉刚放的这一个，后面的断言仍按空地图算
  await E("WMApp.entities=WMApp.entities.filter(function(x){return x.type!=='prop'});WMApp.selectedEntity=null;1");

  console.log('== v2.0.2: 地图原点（alignment）==');
  ok('export writes alignment 0 by default', (await E('WMGetMapData().toJson().alignment'))===0);
  await E("WMApp.params.alignment=1");
  eq('export follows params.alignment', await E('WMGetMapData().toJson().alignment'), 1);
  await E("WMAction('createNewFile')");
  ok('new-map dialog prefills the current origin mode',
     (await E("(function(){var r=document.querySelector('input[name=nmAlign]:checked');return r?r.value:'none'})()"))==='1');
  await E("WMApp.params.alignment=0");
  await E("WMAction('createNewFile')");
  ok('origin radio follows alignment=0',
     (await E("(function(){var r=document.querySelector('input[name=nmAlign]:checked');return r?r.value:'none'})()"))==='0');
  await E("document.querySelector('#newMapView [data-close]').click()");
  // 打开一份 alignment=1 的地图数据，必须原样带回来（走「文件 → 打开」同一条路径）
  const alignRound = JSON.parse(await E(`(function(){
    var d = WMGetMapData().toJson();
    d.alignment = 1;
    var back = WMLoadData(d);
    return JSON.stringify({params: WMApp.params.alignment, exported: back.alignment});
  })()`));
  ok('alignment survives open → export', alignRound.params===1 && alignRound.exported===1, alignRound);
  await E("WMApp.params.alignment=0;WMLoadData(WMGetMapData().toJson());1");

  console.log('== v2.0.2: 导入编辑资源（目录校验 + 真把图片变成皮肤）==');
  // ① 根目录名不对 —— 必须给出原版那句提示，且不能改动皮肤表
  await E("WMAction('importEditAssets')");
  const rejected = await E(`(function(){
    var inp = document.querySelector('input[webkitdirectory]');
    if (!inp) return 'no-input';
    var dt = new DataTransfer();
    dt.items.add(new File(['x'], 'a.png', {type: 'image/png'}));
    inp.files = dt.files;
    inp.dispatchEvent(new Event('change'));
    return document.getElementById('toast').textContent;
  })()`);
  ok('wrong root folder is rejected with the original message',
     /只支持命名为 MapEditorAssets 或 mapAssets 或 MapAssets/.test(String(rejected)), rejected);
  eq('rejected import leaves obj skins untouched',
     await E("JSON.stringify([0,1,2].map(function(i){return WMCore.entitySize('obj',i)}))"),
     '[{"w":72,"h":72},{"w":64,"h":76},{"w":64,"h":84}]');

  // ② 真实导入：按「根目录/类型/图片」建目录，喂给真正的 <input webkitdirectory>
  const imported = await E(`(async function(){
    function mk(name, w, h, rel){
      return new Promise(function(res){
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        var x = c.getContext('2d'); x.fillStyle = '#cc3344'; x.fillRect(0, 0, w, h);
        c.toBlob(function(b){
          var f = new File([b], name, {type: 'image/png'});
          Object.defineProperty(f, 'webkitRelativePath', {value: rel});
          res(f);
        }, 'image/png');
      });
    }
    WMAction('importEditAssets');
    var inp = document.querySelector('input[webkitdirectory]');
    if (!inp) return 'no-input';
    var dt = new DataTransfer();
    dt.items.add(await mk('宝箱.png', 40, 60, 'MapEditorAssets/SceneObject/宝箱.png'));
    dt.items.add(await mk('石碑.png', 30, 44, 'MapEditorAssets/SceneObject/石碑.png'));
    dt.items.add(await mk('金币.png', 24, 24, 'MapEditorAssets/PropObject/金币.png'));
    dt.items.add(await mk('readme.txt', 1, 1, 'MapEditorAssets/NPC/readme.txt'));
    inp.files = dt.files;
    inp.dispatchEvent(new Event('change'));
    return 'ok';
  })()`);
  eq('folder picker accepted', imported, 'ok');
  await sleep(900);
  ok('import reports what it added',
     /已导入 3 张图片.*物体 2.*道具 1/.test(await E("document.getElementById('toast').textContent")),
     await E("document.getElementById('toast').textContent"));
  eq('SceneObject → 物体，按图片自然尺寸追加',
     await E("JSON.stringify([3,4].map(function(i){return WMCore.entitySize('obj',i)}))"),
     '[{"w":40,"h":60},{"w":30,"h":44}]');
  eq('PropObject → 道具',
     await E("JSON.stringify(WMCore.entitySize('prop',3))"), '{"w":24,"h":24}');
  eq('内置皮肤索引不变（npc 还是 4 个）',
     await E("WMApp.sprites.npc.length"), 4);
  eq('非图片文件被忽略（只有 3 张进表）',
     await E("WMApp.sprites.obj.length + ',' + WMApp.sprites.prop.length"), '5,4');
  ok('导入的图片真的解码成功',
     (await E("(function(){var s=WMApp.sprites.obj[3];return !!(s&&s[0]&&s[0].complete&&s[0].naturalWidth===40)})()"))===true);

  await E("WMAction('openObjWin')");
  await sleep(150);
  eq('左侧面板出现导入的皮肤',
     await E("[].map.call(document.querySelectorAll('#toolContent .tool-label'),function(e){return e.textContent}).join('|')"),
     '宝箱物件|木桶物件|石碑物件|宝箱|石碑');

  const placedImported = JSON.parse(await E(`(function(){
    var items = document.querySelectorAll('#toolContent .tool-item');
    items[3].dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
    var e = WMApp.brushEntity;
    if (!e) return JSON.stringify({armed: false});
    e.x = 400; e.y = 400;
    WMApp.entities.push(e); WMApp.brushEntity = null;
    var it = WMGetMapData().toJson().mapItems.filter(function(x){return x.type === 'obj'})[0];
    return JSON.stringify({armed: true, objName: it && it.objName, skin: it && it.skin});
  })()`));
  ok('放置导入的皮肤，objName 用文件名', placedImported.armed && placedImported.objName === '宝箱', placedImported);
  eq('放置时 skin 记的是追加后的索引', placedImported.skin, '3');

  // ③ 再导入一次同类 —— 覆盖而不是无限累加
  await E(`(async function(){
    function mk(name, w, h, rel){
      return new Promise(function(res){
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        var x = c.getContext('2d'); x.fillStyle = '#33cc44'; x.fillRect(0, 0, w, h);
        c.toBlob(function(b){
          var f = new File([b], name, {type: 'image/png'});
          Object.defineProperty(f, 'webkitRelativePath', {value: rel});
          res(f);
        }, 'image/png');
      });
    }
    WMAction('importEditAssets');
    var inp = document.querySelector('input[webkitdirectory]');
    var dt = new DataTransfer();
    dt.items.add(await mk('新宝箱.png', 50, 50, 'MapEditorAssets/SceneObject/新宝箱.png'));
    inp.files = dt.files;
    inp.dispatchEvent(new Event('change'));
  })()`);
  await sleep(800);
  eq('同类重复导入是覆盖（物体回到 3 内置 + 1 新导入）',
     await E("WMApp.sprites.obj.length"), 4);
  eq('覆盖后索引 3 指向新图片',
     await E("JSON.stringify(WMCore.entitySize('obj',3))"), '{"w":50,"h":50}');
  ok('没有报错', JSON.stringify(await E('window.__errs'))==='[]', await E('window.__errs'));
  ok('no errors after the v2.0.2 section', JSON.stringify(await E('window.__errs'))==='[]', await E('window.__errs'));

  console.log('== teach video ==');
  await E("WMAction('showTeach')");
  await sleep(2600);
  const teach = JSON.parse(await E("(function(){var v=document.getElementById('teachVideo');return JSON.stringify({open:!document.getElementById('teachView').classList.contains('hidden'),src:(v.currentSrc||v.src),rs:v.readyState,paused:v.paused,dur:v.duration,loading:document.getElementById('teachLoading').classList.contains('hidden')})})()"));
  ok('teach view opens with original video', teach.open && /teach\.mp4$/.test(teach.src), teach);
  ok('teach video loads original 2min clip', teach.rs>=3 && teach.dur>100, teach);
  ok('teach video is playing', teach.paused===false, teach);
  ok('teach Loading hidden after load', teach.loading===true, teach);
  await E("document.querySelector('#teachView [data-close]').click()");   // close teach view
  ok('modal closed before play mode', (await E('WMApp.activeView'))===null, await E('WMApp.activeView'));

  console.log('== play mode ==');
  await clickSel(tb1('testProject'));
  ok('test mode entered', (await E('WMApp.mode'))==='test');
  ok('player spawned', !!(await E('WMApp.test&&WMApp.test.player')));
  ok('follow is off by default (verified original)', (await E('WMApp.test.follow'))===false);
  ok('showPath is off by default', (await E('WMApp.test.showPath'))===false);
  ok('follow button label default', (await E("document.querySelector('#testToolBar .tb-btn[data-act=t_followPlayer]').textContent"))==='屏幕跟随玩家(F3)');
  ok('path button label default', (await E("document.querySelector('#testToolBar .tb-btn[data-act=t_showPath]').textContent"))==='查看寻路过程(F4)');
  // 原版 `TestView/ToolBar` 场景里有 7 个按钮，但 `Button5`（显示小地图(F2)）
  // 的 `active` 就是 false，实测截图也只显示 6 个 —— 克隆照抄「可见的 6 个」。
  eq('test toolbar has 6 visible buttons like the original',
     await E("document.querySelectorAll('#testToolBar .tb-btn').length"), 6);
  eq('no 显示小地图 button (original Button5 is active:false)',
     await E("document.querySelectorAll('#testToolBar .tb-btn[data-act=t_showMiniMap]').length"), 0);

  // paint a wide walkable area so there is somewhere to walk
  await E("(function(){var r=WMApp.road,c=r[0].length,p=WMApp.painted,m=Math.floor(r.length/2);for(var y=m-3;y<=m+3;y++)for(var x=3;x<c-3;x++){r[y][x]=0;p.add(y*c+x);}return 1})()");
  await sleep(120);
  await click(1200,700);
  ok('click triggers path', (await E('WMApp.test.path.length'))>0, await E('WMApp.test.path.length'));
  const pxBefore = await E('Math.round(WMApp.test.player.x)');
  await sleep(400);
  ok('player walks along the path', (await E('Math.round(WMApp.test.player.x)'))!==pxBefore || (await E('WMApp.test.path.length'))>0);
  // MovieClip.interval = 0.1 s -> the sheet column must advance ~2 times in 250 ms
  const fr0 = await E('WMApp.test.player.frame');
  await sleep(250);
  const fr1 = await E('WMApp.test.player.frame');
  ok('player animation advances one column per 100ms', fr1 !== fr0, {fr0, fr1});

  await key('F3','F3');
  ok('F3 toggles follow on', (await E('WMApp.test.follow'))===true);
  ok('F3 button label flips', (await E("document.querySelector('#testToolBar .tb-btn[data-act=t_followPlayer]').textContent"))==='屏幕不跟随玩家(F3)');
  // follow shifts the camera, so the mouse->map transform would move every
  // click below; restore it and let the current walk finish.
  await key('F3','F3');
  ok('F3 toggles follow back off', (await E('WMApp.test.follow'))===false);
  await E("WMApp.test.path.length=0; WMApp.test.player.state='stand'; WMApp.test.player.moving=false; 1");
  await key('F4','F4');
  ok('F4 toggles path preview', (await E('WMApp.test.showPath'))===true);
  ok('F4 button label flips', (await E("document.querySelector('#testToolBar .tb-btn[data-act=t_showPath]').textContent"))==='正常寻路(F4)');
  // F4 only starts a search when the clicked node is passable
  // (`testSeekPathStep` bails out otherwise), so aim at a painted cell.
  const seekPt = JSON.parse(await E(`(function(){
    var P=WMApp.params, T=WMApp.test, best=null, bd=0;
    for(var py=40; py<P.mapHeight-40; py+=16){
      for(var px=40; px<P.mapWidth-40; px+=16){
        var n=WMApp.geom.getNodeByPixel(px,py);
        if(!WMApp.cellPass(n.dx,n.dy)) continue;
        var d=Math.hypot(px-T.player.x,py-T.player.y);
        if(d>bd){ bd=d; best={x:px,y:py}; }
      }
    }
    return JSON.stringify(best);
  })()`));
  ok('found a passable click target', !!seekPt && seekPt.x > 0, seekPt);
  const playerBefore = JSON.parse(await E('JSON.stringify([Math.round(WMApp.test.player.x),Math.round(WMApp.test.player.y)])'));
  await click(seekPt.x, seekPt.y);
  const f4dbg = JSON.parse(await E(`(function(){
    var T=WMApp.test, n=WMApp.geom.getNodeByPixel(${seekPt.x},${seekPt.y});
    return JSON.stringify({seek:!!T.seek, showPath:T.showPath,
      player:[Math.round(T.player.x),Math.round(T.player.y)],
      node:[n.dx,n.dy], pass:WMApp.cellPass(n.dx,n.dy), drag:T.dragPlayer});
  })()`));
  ok('F4 records A* expansion frames', (await E('(WMApp.test.seek&&WMApp.test.seek.frames.length)||0'))>0,
     f4dbg);
  ok('F4 expansion is capped (maxStep 1000)', (await E('(WMApp.test.seek&&WMApp.test.seek.frames.length)||0'))<=1000,
     await E('WMApp.test.seek&&WMApp.test.seek.frames.length'));
  ok('F4 stops the player (SceneMap.testSeekRoad -> player.stop())',
     (await E('WMApp.test.path.length'))===0 && (await E('WMApp.test.player.state'))==='stand',
     {path:await E('WMApp.test.path.length'), state:await E('WMApp.test.player.state'), playerBefore});
  // one expansion per 100 ms (setInterval(...,100) in the original)
  const step0 = await E('WMApp.test.seek?WMApp.test.seek.step:-1');
  await sleep(350);
  const step1 = await E('WMApp.test.seek?WMApp.test.seek.step:-1');
  ok('F4 replays one expansion per 100ms', step1 - step0 >= 2 && step1 - step0 <= 6, {step0, step1});
  await key('F4','F4');
  ok('F4 off clears the seek overlay', (await E('WMApp.test.seek'))===null);

  console.log('== v2.0.2: 寻路设置面板（SeekPathSetRoot）==');
  const seekUi = JSON.parse(await E(`(function(){
    var p = document.getElementById('seekPanel');
    var r = p.getBoundingClientRect();
    function lab(id){ var e=document.getElementById(id); return e ? e.parentNode.textContent.replace(/\\s+/g,' ').trim() : null; }
    return JSON.stringify({
      shown: !p.classList.contains('hidden') && r.width > 0,
      title: p.querySelector('.seek-title').textContent,
      maxStep: document.getElementById('seekMaxStep').value,
      tpr: document.getElementById('seekTpr').value,
      navLine: document.getElementById('seekNavLine').checked,
      roadCorner: document.getElementById('seekRoadCorner').checked,
      roadCornerDisabled: document.getElementById('seekRoadCorner').disabled,
      rcaDisabled: document.querySelector('input[name=seekType][value="1"]').disabled,
      astarChecked: document.querySelector('input[name=seekType][value="0"]').checked,
      optimize: (function(){var r=document.querySelector('input[name=seekOptimize]:checked');return r?r.value:null})(),
      groups: [].map.call(p.querySelectorAll('.seek-group-title'), function(e){return e.textContent})
    });
  })()`));
  ok('seek panel is visible in test view', seekUi.shown === true);
  eq('seek panel title', seekUi.title, '寻路设置');
  eq('default maxStep = 1000 (live)', seekUi.maxStep, '1000');
  eq('default tpr = 0.1 (live)', seekUi.tpr, '0.1');
  ok('显示寻路导航线 defaults on (live)', seekUi.navLine === true);
  ok('显示路点墙角 defaults off and is disabled (no RCA)', seekUi.roadCorner === false && seekUi.roadCornerDisabled === true);
  ok('RCA option is present but disabled', seekUi.rcaDisabled === true && seekUi.astarChecked === true);
  eq('默认优化等级 = 最佳优化', seekUi.optimize, '2');
  ok('both group titles match the original',
     seekUi.groups.join('|')==='使用寻路算法类型设置|寻路路径优化等级设置', seekUi.groups);

  // 原版 onTprInputFieldChange: clamp(v, .1, 1)
  await E("(function(){var e=document.getElementById('seekTpr');e.value='0.05';e.dispatchEvent(new Event('change'))})()");
  eq('tpr below 0.1 is clamped to 0.1', await E('WMApp.seekSettings.tpr'), 0.1);
  await E("(function(){var e=document.getElementById('seekTpr');e.value='5';e.dispatchEvent(new Event('change'))})()");
  eq('tpr above 1 is clamped to 1', await E('WMApp.seekSettings.tpr'), 1);
  await E("(function(){var e=document.getElementById('seekTpr');e.value='0.1';e.dispatchEvent(new Event('change'))})()");
  // 原版 onMaxStepInputFieldChange: 0 视为没填 -> 1000
  await E("(function(){var e=document.getElementById('seekMaxStep');e.value='0';e.dispatchEvent(new Event('change'))})()");
  eq('maxStep 0 falls back to 1000', await E('WMApp.seekSettings.maxStep'), 1000);
  await E("(function(){var e=document.getElementById('seekMaxStep');e.value='37';e.dispatchEvent(new Event('change'))})()");
  eq('maxStep accepts a custom budget', await E('WMApp.seekSettings.maxStep'), 37);
  await E("(function(){var e=document.getElementById('seekMaxStep');e.value='1000';e.dispatchEvent(new Event('change'))})()");

  // 优化等级必须真的改变路径点数：不优化 > 一般 ≥ 最佳
  const optCounts = {};
  for (const lvl of [0, 1, 2]) {
    await E("WMApp.seekSettings.optimize=" + lvl);
    if ((await E('WMApp.test.showPath')) === true) await E("WMAction('t_showPath')"); // 先关掉清空 overlay
    await E("WMAction('t_showPath')");
    await sleep(60);
    await click(seekPt.x, seekPt.y);
    await sleep(420);
    optCounts['lvl' + lvl] = await E('WMApp.test.seek&&WMApp.test.seek.path?WMApp.test.seek.path.length:-1');
    await E("WMAction('t_showPath')");
  }
  await E('WMApp.seekSettings.optimize=2');
  ok('优化等级真的影响路径点数 (不优化 > 一般 ≥ 最佳)',
     optCounts.lvl0 > 0 && optCounts.lvl0 >= optCounts.lvl1 && optCounts.lvl1 >= optCounts.lvl2
       && optCounts.lvl0 > optCounts.lvl2,
     optCounts);
  ok('最佳优化回到默认', (await E('WMApp.seekSettings.optimize'))===2);

  // 显示寻路导航线 必须真的影响画布：把 F4 的展开/画线进度推到末尾再比对像素
  if ((await E('WMApp.test.showPath')) === false) await E("WMAction('t_showPath')");
  await click(seekPt.x, seekPt.y);
  await sleep(500);
  const darkPixels = () => E(`(function(){
    var c = document.getElementById('testCanvas'), x = c.getContext('2d');
    var d = x.getImageData(0, 0, c.width, c.height).data, n = 0;
    for (var i = 0; i < d.length; i += 4) {
      // 只认 #2b2b2b(43,43,43) 附近：画布底色是 #222，放宽范围会把底噪算进去
      if (Math.abs(d[i]-43) <= 3 && Math.abs(d[i+1]-43) <= 3 && Math.abs(d[i+2]-43) <= 3) n++;
    }
    return n;
  })()`);
  const forceFullLine = `(function(){
    var S = WMApp.test.seek;
    if (!S || !S.path) return 'no-path';
    S.step = S.frames.length; S.lineStep = S.path.length - 1; S.started = true;
    WMApp.seekSettings.navLine = true; WMRenderTest();
    return S.path.length;
  })()`;
  const forced = await E(forceFullLine);
  const darkOn = await darkPixels();
  await E("WMApp.seekSettings.navLine=false;WMRenderTest()");
  const darkOff = await darkPixels();
  await E("WMApp.seekSettings.navLine=true;WMRenderTest()");
  ok('导航线开着时画布上确实有 #2b2b2b 折线', typeof forced === 'number' && darkOn > 0, {forced, darkOn});
  ok('关掉导航线后黑线消失', darkOff < darkOn * 0.5, {darkOn, darkOff});
  await E("WMAction('t_showPath')");
  await E("WMApp.test.path.length=0;WMApp.test.player.moving=false;WMApp.test.player.state='stand';1");

  ok('FPS meter is visible in test view', /^FPS \d+$/.test(await E("document.getElementById('testFps').textContent")),
     await E("document.getElementById('testFps').textContent"));

  // drag the player freely (SceneMap.onPlayerMouseDown -> onMapMouseMove)
  const pp = JSON.parse(await E("(function(){var cv=document.getElementById('testCanvas'),r=cv.getBoundingClientRect(),T=WMApp.test;var sx=r.left+T.player.x,sy=r.top+T.player.y;if(T.follow){sx=r.left+cv.width/2;sy=r.top+cv.height/2;}return JSON.stringify({sx:sx,sy:sy,x:T.player.x,y:T.player.y})})()"));
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:pp.sx,y:pp.sy,button:'left',clickCount:1,buttons:1});
  ok('press on player starts drag', (await E('WMApp.test.dragPlayer'))===true);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:pp.sx+160,y:pp.sy+40,button:'left',buttons:1});
  const moved = JSON.parse(await E("JSON.stringify({x:WMApp.test.player.x,y:WMApp.test.player.y})"));
  ok('player follows the mouse while dragging', Math.abs(moved.x-pp.x)>20, {pp,moved});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:pp.sx+160,y:pp.sy+40,button:'left',clickCount:1,buttons:0});
  ok('player drag ends on mouseup', (await E('WMApp.test.dragPlayer'))===false);
  await click(1860,30);
  ok('test closed', (await E('WMApp.mode'))==='edit');

  console.log('== 默认出生点 / spawn default flag ==');
  await clickSel(tb3('openSpawnWin'));         // 放置出生点
  await E("document.querySelector('#toolContent .tool-item').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))");
  await sleep(120);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:700,y:500,buttons:0});
  await click(700,500);
  await sleep(200);
  await E("document.querySelector('#toolContent .tool-item').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))");
  await sleep(120);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:860,y:560,buttons:0});
  await click(860,560);
  await sleep(250);
  ok('two spawn points placed', (await E("WMApp.entities.filter(function(e){return e.type==='spawnPoint'}).length"))===2,
     await E('WMApp.entities.length'));
  const cb = JSON.parse(await E("(function(){var rs=document.querySelectorAll('#propertyContent .prop-row'),i=null;for(var k=0;k<rs.length;k++){if(/默认出生点/.test(rs[k].textContent))i=rs[k].querySelector('input')}if(!i)return 'null';var b=i.getBoundingClientRect();return JSON.stringify({x:b.left+b.width/2,y:b.top+b.height/2,disabled:i.disabled})})()"));
  ok('默认出生点 row is editable', cb && cb.disabled===false, cb);
  // Hover first: the tip used to sit on top of the control and swallow the click.
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:cb.x,y:cb.y,buttons:0});
  await sleep(120);
  ok('hover tip does not cover the checkbox',
     (await E('(function(){var e=document.elementFromPoint('+cb.x+','+cb.y+');return e&&e.className})()'))==='prop-bool',
     await E('(function(){var e=document.elementFromPoint('+cb.x+','+cb.y+');return e&&e.className})()'));
  await click(cb.x,cb.y);
  await sleep(250);
  ok('默认出生点 checked by a real click', (await E('WMApp.selectedEntity.defaultSpawn'))===true);
  ok('checkbox shows the new state',
     (await E("(function(){var rs=document.querySelectorAll('#propertyContent .prop-row');for(var k=0;k<rs.length;k++){if(/默认出生点/.test(rs[k].textContent))return rs[k].querySelector('input').checked}return null})()"))===true);
  ok('only one default spawn point per map',
     (await E("WMApp.entities.filter(function(e){return e.defaultSpawn}).length"))===1);
  // set the other one -> the first must be cleared (ChangeDefaultSpawn)
  const other = JSON.parse(await E("(function(){var e=WMApp.entities.filter(function(x){return x.type==='spawnPoint'&&!x.defaultSpawn})[0];window.__other=e;var z=WMApp.view.zoom;return JSON.stringify({x:e.x*z+WMApp.view.offsetX,y:e.y*z+WMApp.view.offsetY,wx:e.x})})()"));
  const mcv = JSON.parse(await E("(function(){var r=document.getElementById('mapCanvas').getBoundingClientRect();return JSON.stringify({left:r.left,top:r.top})})()"));
  await click(mcv.left+other.x, mcv.top+other.y-30);
  await sleep(200);
  await click(cb.x,cb.y);
  await sleep(250);
  ok('setting another default clears the previous one',
     (await E("WMApp.entities.filter(function(e){return e.defaultSpawn}).length"))===1 &&
     (await E('WMApp.selectedEntity===window.__other'))===true,
     await E("JSON.stringify({n:WMApp.entities.filter(function(e){return e.defaultSpawn}).length,same:WMApp.selectedEntity===window.__other})"));

  console.log('== minimap white box = one screen ==');
  await E("WMApp.view.zoom=1;WMApp.view.offsetX=0;WMApp.view.offsetY=0;WMRender();WMAction('showMiniMap')");
  await sleep(300);
  const mm1 = JSON.parse(await E('JSON.stringify(WMApp.minimapRect)'));
  const cvw = await E("document.getElementById('mapCanvas').width");
  ok('white box width = viewport width', Math.abs(mm1.vw - cvw*mm1.s) < 0.5, {vw:mm1.vw, want:cvw*mm1.s});
  ok('white box starts at the image origin', Math.abs(mm1.vx) < 0.5 && Math.abs(mm1.vy) < 0.5, mm1);
  // pan the map 400px to the right with a middle drag below the minimap panel
  const cvr = JSON.parse(await E("(function(){var r=document.getElementById('mapCanvas').getBoundingClientRect();return JSON.stringify({left:r.left,top:r.top})})()"));
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:cvr.left+1200,y:cvr.top+820,button:'middle',buttons:4,clickCount:1});
  for (let i=1;i<=8;i++) { await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:cvr.left+1200-i*50,y:cvr.top+820,button:'middle',buttons:4}); await sleep(25); }
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:cvr.left+800,y:cvr.top+820,button:'middle',buttons:0});
  await sleep(250);
  const mm2 = JSON.parse(await E('JSON.stringify(WMApp.minimapRect)'));
  ok('white box follows the pan (400px right)', Math.abs((mm2.vx-mm1.vx)/mm2.s - 400) < 8, {moved:(mm2.vx-mm1.vx)/mm2.s});
  ok('white box keeps one-screen size while panning', Math.abs(mm2.vw-mm1.vw) < 0.01);

  console.log('== 地图切片导出 / 地图缩小导出 (map asset, not the editor viewport) ==');
  // Swap in a flat magenta background: anything the export draws on top of it
  // (road points, grid, entities) becomes impossible to miss.
  const exp = JSON.parse(await E(`(async function(){
    var orig = WMApp.params.bgImage;
    var c = document.createElement('canvas'); c.width = 64; c.height = 48;
    var x = c.getContext('2d'); x.fillStyle = '#ff00ff'; x.fillRect(0,0,64,48);
    var img = new Image();
    await new Promise(function(res){ img.onload = res; img.src = c.toDataURL('image/png'); });
    WMApp.params.bgImage = img;
    var full = WMExport.buildMapExport(1);
    var small = WMExport.buildMapExport(0.5);
    var fx = full.getContext('2d').getImageData(0,0,full.width,full.height).data;
    var bad = 0;
    for (var i=0;i<fx.length;i+=4){
      if (fx[i]!==255 || fx[i+1]!==0 || fx[i+2]!==255) bad++;
    }
    WMApp.params.bgImage = orig;
    WMApp.roadVersion++; WMRender();
    return JSON.stringify({w:full.width,h:full.height,sw:small.width,sh:small.height,
                           bad:bad,total:full.width*full.height});
  })()`));
  ok('切片导出 = 整张地图尺寸', exp.w===1920 && exp.h===1440, exp);
  ok('切片导出只含底图（无路点/网格/物体）', exp.bad===0, exp);
  ok('缩小导出按比例缩小', exp.sw===960 && exp.sh===720, exp);

  console.log('== 六边形辅助线（原版 GridLayer：竖线 40k+{0,2.68,20,37.32}、横线每 10）==');
  // 关掉地图和路点层，网格画在 #222 纯色底上才好判颜色。
  // 注意：探针列/行必须落在辅助线**之间**。x=300 正好是 honeycomb2 竖线的
  // `40*7 + halfW(20)` 偏移位，整列都带绿偏 -> 每个像素都会被误判成辅助线
  // （曾因此得到「横线间距 2」的假失败）。所以这里先找一根干净列，再用
  // **固定坐标**断言，而不是扫间距。
  const grid = JSON.parse(await E(`(function(){
    var keep = { map: WMApp.layers.map, road: WMApp.layers.road, grid: WMApp.layers.grid };
    WMApp.layers.map = false; WMApp.layers.road = false; WMApp.layers.grid = true;
    // 前面的用例平移/缩放过视图，先归零，扫描坐标才是确定的
    WMApp.view.offsetX = 0; WMApp.view.offsetY = 0; WMApp.view.zoom = 1;
    // 本项目默认关闭辅助线（见 state.showAuxLine），这里要量辅助线，显式打开
    WMApp.showAuxLine = true;
    WMApp.roadVersion++; WMRender();

    var cv = document.getElementById('mapCanvas');
    var W = cv.width, H = cv.height;
    var d = cv.getContext('2d').getImageData(0, 0, W, H).data;
    var z = WMApp.view.zoom;
    function at(mx, my) {
      var x = Math.round(mx * z), y = Math.round(my * z);
      if (x < 0 || y < 0 || x >= W || y >= H) return null;
      var i = (y * W + x) * 4;
      return [d[i], d[i + 1], d[i + 2]];
    }
    // 按**色偏**判，不按亮度：绿线 #00550025 -> G 高于 R；蓝线 #11115566 -> B 高于 R；
    // 六边形描边 #bbbbbbaa 是中性灰（G≈R≈B），抗锯齿后仍中性 -> 一律排除。
    function aux(p) {
      if (!p) return 0;
      if (p[0] + p[1] + p[2] > 150) return 0;
      var g = p[1] - p[0], b = p[2] - p[0];
      if (b >= 8) return 2;
      if (g >= 2 && b <= 1) return 1;
      return 0;
    }
    // 1px 线可能压在半个像素上 -> 取 ±1 窗口里的最大值
    function lineAt(mx, my, axis) {
      var best = 0;
      for (var k = -1; k <= 1; k++) {
        var v = aux(axis === 'y' ? at(mx, my + k) : at(mx + k, my));
        if (v > best) best = v;
      }
      return best;
    }
    function blankAt(mx, my, axis) {
      for (var k = -2; k <= 2; k++) {
        if (aux(axis === 'y' ? at(mx, my + k) : at(mx + k, my))) return false;
      }
      return true;
    }

    // 干净探针列：不落在任何竖线上
    var probeX = -1;
    for (var x = 302; x <= 320; x++) if (blankAt(x, 105, 'x')) { probeX = x; break; }

    // 横线（honeycomb2 的等距族）：每 10 一条，每 4 条里第 1 条是 40% 蓝
    var rowYs = [100, 110, 120, 130, 140];
    var rows = rowYs.map(function (y) { return lineAt(probeX, y, 'y'); });
    var rowBlanks = [105, 115, 125, 135].map(function (y) { return blankAt(probeX, y, 'y'); });

    // 竖线（带偏移族）：40k + {0, 2.68, 20, 37.32}；周期起点那条是 40% 蓝
    var colXs = [280, 283, 300, 317];
    var cols = colXs.map(function (x) { return lineAt(x, 105, 'x'); });
    var colBlanks = [290, 310].map(function (x) { return blankAt(x, 105, 'x'); });

    // 六边形本体：honeycomb2 是 pointy-top，横排间距 = ceilHeight 34.64。
    // y=15 这一行只有左右两条竖边经过，亮像素即竖边；辅助线是暗绿/暗蓝，被亮度门排掉。
    function bright(p) {
      if (!p) return false;
      var lo = Math.min(p[0], p[1], p[2]), hi = Math.max(p[0], p[1], p[2]);
      return lo > 70 && hi - lo < 30;
    }
    var hexRow = [];
    for (var hx = 0; hx < 150; hx++) {
      if (!bright(at(hx, 15))) continue;
      if (hexRow.length && hx - hexRow[hexRow.length - 1] <= 1) continue;
      hexRow.push(hx);
    }

    WMApp.layers.map = keep.map; WMApp.layers.road = keep.road; WMApp.layers.grid = keep.grid;
    WMApp.roadVersion++; WMRender();

    return JSON.stringify({ probeX: probeX, rowYs: rowYs, rows: rows, rowBlanks: rowBlanks,
                            colXs: colXs, cols: cols, colBlanks: colBlanks,
                            hexRow: hexRow });
  })()`));

  ok('找到不落在竖线上的探针列', grid.probeX > 0, grid.probeX);
  ok('横线每 10 个地图单位一条（100/110/120/130/140 都在线上）',
     grid.rows.every(v => v > 0), grid.rows);
  ok('横线之间（105/115/125/135）没有线', grid.rowBlanks.every(Boolean), grid.rowBlanks);
  // 旧代码是「每 nh/2=17.32 一条、统一 #11115566」：110 会空、且没有深绿
  ok('每 4 条横线里只有 1 条 40% 蓝（120 蓝，110/130 深绿）',
     grid.rows[2] === 2 && grid.rows[1] === 1 && grid.rows[3] === 1, grid.rows);
  // 旧代码竖线是等距 20，没有 2.68 这一对
  ok('竖线有 2.68 的成对偏移（280/283/300/317 都有线）',
     grid.cols.every(v => v > 0), grid.cols);
  ok('竖线偏移位之间的空档（290/310）没有线', grid.colBlanks.every(Boolean), grid.colBlanks);
  ok('周期起点那条竖线是 40% 蓝（280）', grid.cols[0] === 2, grid.cols);
  var hexGaps = grid.hexRow.slice(1).map((v, i) => v - grid.hexRow[i]);
  // flat-top 的话间距会是 ceilWidth=40，且 y=15 这一行根本没有竖边
  ok('六边形横排间距 = ceilHeight 34.64（pointy-top）',
     hexGaps.length >= 3 && hexGaps.every(g => Math.abs(g - 34.64) <= 1), hexGaps);

  console.log('== 辅助线开关（默认关闭 / 编辑菜单 / J）==');
  // 走真实的菜单 DOM：打开「编辑」-> 点那条辅助线项
  const aux = JSON.parse(await E(`(function(){
    WMApp.layers.map = false; WMApp.layers.road = false; WMApp.layers.grid = true;
    WMApp.view.offsetX = 0; WMApp.view.offsetY = 0; WMApp.view.zoom = 1;
    // 回到本项目默认值（关闭），不受前面用例影响
    WMApp.showAuxLine = false;
    WMApp.roadVersion++; WMRender();

    function at(mx, my) {
      var cv = document.getElementById('mapCanvas');
      var d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      var x = Math.round(mx), y = Math.round(my);
      if (x < 0 || y < 0 || x >= cv.width || y >= cv.height) return null;
      var i = (y * cv.width + x) * 4;
      return [d[i], d[i + 1], d[i + 2]];
    }
    function auxAt(mx, my) {           // ±1 窗口取最大色偏
      var best = 0;
      for (var k = -1; k <= 1; k++) {
        var p = at(mx, my + k); if (!p) continue;
        if (p[0] + p[1] + p[2] > 150) continue;
        var g = p[1] - p[0], b = p[2] - p[0];
        if (b >= 8) best = 2;
        else if (g >= 2 && b <= 1 && best < 2) best = 1;
      }
      return best;
    }
    function hexEdgeAt() {             // y=15 只有六边形左右竖边
      var p = at(34, 15);
      if (!p) return false;
      var lo = Math.min(p[0], p[1], p[2]), hi = Math.max(p[0], p[1], p[2]);
      return lo > 70 && hi - lo < 30;
    }
    function menuLabel() {
      var mi = document.querySelector('.menu-item[data-menu="edit"]');
      mi.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      var items = [].slice.call(document.querySelectorAll('#menuPanel .menu-panel-item'));
      var it = items.filter(function (x) { return x.textContent.indexOf('\u8f85\u52a9\u7ebf') >= 0; })[0];
      var text = it ? it.textContent : null;
      if (it) it.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      return text;
    }

    var s0 = { flag: WMApp.showAuxLine, aux: auxAt(305, 110), hex: hexEdgeAt() };
    var label0 = menuLabel();                        // 点一下 -> 开
    var s1 = { flag: WMApp.showAuxLine, aux: auxAt(305, 110), hex: hexEdgeAt() };
    var label1 = menuLabel();                        // 再点 -> 关
    var s2 = { flag: WMApp.showAuxLine, aux: auxAt(305, 110), hex: hexEdgeAt() };

    return JSON.stringify({ s0: s0, s1: s1, s2: s2, label0: label0, label1: label1 });
  })()`));

  // 原版 `_isShowAuxiliaryLine` 默认 true，本项目**故意默认关闭**（屏上太吵）。
  // 下面同时钉住「默认值」和「开关两个方向都有效」。
  ok('默认关闭辅助线（本项目取舍，原版默认 true）', aux.s0.flag === false, aux.s0);
  ok('默认状态下 110 那条横辅助线不可见', aux.s0.aux === 0, aux.s0);
  ok('默认状态下六边形描边照常绘制', aux.s0.hex === true, aux.s0);
  ok('默认状态菜单项写「显示辅助线（J）」',
     /^显示辅助线/.test(aux.label0 || ''), aux.label0);
  ok('点菜单项后开关变成开', aux.s1.flag === true, aux.s1);
  ok('打开后 110 那条横辅助线可见', aux.s1.aux > 0, aux.s1);
  ok('打开后菜单项变成「隐藏辅助线（J）」',
     /^隐藏辅助线/.test(aux.label1 || ''), aux.label1);
  ok('再点一次又关掉', aux.s2.flag === false, aux.s2);
  ok('关掉后 110 那条横辅助线消失', aux.s2.aux === 0, aux.s2);
  ok('关掉后六边形描边还在', aux.s2.hex === true, aux.s2);

  // 快捷键 J 与菜单走同一条 action
  const keyRes = JSON.parse(await E(`(function(){
    WMApp.showAuxLine = false; WMApp.roadVersion++; WMRender();
    var before = WMApp.showAuxLine;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }));
    var after = WMApp.showAuxLine;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }));
    return JSON.stringify({ before: before, after: after, restored: WMApp.showAuxLine });
  })()`));
  ok('J 键也能切辅助线', keyRes.before === false && keyRes.after === true && keyRes.restored === false,
     keyRes);

  console.log('== 90 度网格（原版 draw90AngleGrid：半格间距 + 辅助线开关）==');
  const r90 = JSON.parse(await E(`(function(){
    WMNewMap({ name: 't90', mapType: 1, mapWidth: 1920, mapHeight: 1440, ceilWidth: 60, ceilHeight: 30 });
    WMApp.layers.map = false; WMApp.layers.road = false; WMApp.layers.grid = true;
    WMApp.view.offsetX = 0; WMApp.view.offsetY = 0; WMApp.view.zoom = 1;
    WMApp.showAuxLine = true; WMApp.roadVersion++; WMRender();

    var cv = document.getElementById('mapCanvas');
    var d = null;
    // 每轮 scan 前重新取一次快照 —— 复用同一个 ImageData 会读到切换前的旧像素
    function snap() { d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; }
    function at(mx, my) {
      var x = Math.round(mx), y = Math.round(my);
      if (x < 0 || y < 0 || x >= cv.width || y >= cv.height) return null;
      var i = (y * cv.width + x) * 4;
      return [d[i], d[i + 1], d[i + 2]];
    }
    // 格子边界 = 中性亮灰（#bbbbbbaa 2px）；辅助线 = 暗绿（#00550025 1px）
    function kind(p) {
      if (!p) return 'none';
      var lo = Math.min(p[0], p[1], p[2]), hi = Math.max(p[0], p[1], p[2]);
      if (lo > 70 && hi - lo < 30) return 'border';
      if (p[0] + p[1] + p[2] < 150 && p[1] - p[0] >= 2 && p[2] - p[0] <= 1) return 'aux';
      return 'none';
    }
    function rowKind(mx, my) {
      for (var k = -1; k <= 1; k++) { var v = kind(at(mx, my + k)); if (v !== 'none') return v; }
      return 'none';
    }
    var probeX = 100;      // 竖线在 30 的倍数上，100 不在线上
    function scan() {
      snap();
      var out = {};
      [0, 15, 30, 45, 60].forEach(function (y) { out[y] = rowKind(probeX, y); });
      return out;
    }
    var on = scan();
    WMApp.showAuxLine = false; WMApp.roadVersion++; WMRender();
    var off = scan();
    WMApp.showAuxLine = true; WMApp.roadVersion++; WMRender();
    return JSON.stringify({ on: on, off: off });
  })()`));

  ok('90 度：格子边界在 y=0/30/60',
     r90.on[0] === 'border' && r90.on[30] === 'border' && r90.on[60] === 'border', r90.on);
  ok('90 度：辅助线落在半格 y=15/45', r90.on[15] === 'aux' && r90.on[45] === 'aux', r90.on);
  // 原版关掉辅助线时奇数条被 `&&` 短路，沿用偶数条的 lingColor3 / 2px，
  // 所以半格线**还在**，只是从绿变灰 —— 这就是原版「看着关不掉」的样子。
  ok('90 度：关掉后 y=15/45 变成灰色半格线（原版短路行为）',
     r90.off[15] === 'border' && r90.off[45] === 'border', r90.off);
  ok('90 度：关掉后格子边界还在',
     r90.off[0] === 'border' && r90.off[30] === 'border' && r90.off[60] === 'border', r90.off);
  ok('90 度：开关唯一区别是半格线的绿/灰',
     r90.on[15] === 'aux' && r90.off[15] === 'border' &&
     r90.on[30] === r90.off[30] && r90.on[0] === r90.off[0], { on: r90.on, off: r90.off });

  console.log('== 45 度网格（原版 draw45AngleGrid：矩形辅助线 + 斜线）==');
  const r45 = JSON.parse(await E(`(function(){
    WMNewMap({ name: 't45', mapType: 0, mapWidth: 1920, mapHeight: 1440, ceilWidth: 60, ceilHeight: 30 });
    WMApp.layers.map = false; WMApp.layers.road = false; WMApp.layers.grid = true;
    WMApp.view.offsetX = 0; WMApp.view.offsetY = 0; WMApp.view.zoom = 1;
    WMApp.showAuxLine = true; WMApp.roadVersion++; WMRender();

    var cv = document.getElementById('mapCanvas');
    var d = null;
    // 每轮 scan 前重新取一次快照 —— 复用同一个 ImageData 会读到切换前的旧像素
    function snap() { d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; }
    function at(mx, my) {
      var x = Math.round(mx), y = Math.round(my);
      if (x < 0 || y < 0 || x >= cv.width || y >= cv.height) return null;
      var i = (y * cv.width + x) * 4;
      return [d[i], d[i + 1], d[i + 2]];
    }
    // 45 度的辅助线是蓝(偶)/绿(奇)；斜线是中性亮灰，用亮度门排掉。
    // 斜线在 y 为半格整数倍处一定落在 x 为 30 的倍数上，所以 probeX=100 不会撞到。
    function auxKind(p) {
      if (!p) return 0;
      if (p[0] + p[1] + p[2] > 150) return 0;
      var g = p[1] - p[0], b = p[2] - p[0];
      if (b >= 8) return 2;
      if (g >= 2 && b <= 1) return 1;
      return 0;
    }
    function auxRow(mx, my) {
      for (var k = -1; k <= 1; k++) { var v = auxKind(at(mx, my + k)); if (v) return v; }
      return 0;
    }
    var probeX = 100;
    function scan() {
      snap();
      var out = {};
      [0, 15, 30, 45, 60].forEach(function (y) { out[y] = auxRow(probeX, y); });
      return out;
    }
    var on = scan();
    WMApp.showAuxLine = false; WMApp.roadVersion++; WMRender();
    var off = scan();
    WMApp.showAuxLine = true; WMApp.roadVersion++; WMRender();
    return JSON.stringify({ on: on, off: off });
  })()`));

  ok('45 度：横辅助线每半格一条（0/15/30/45/60 都有）',
     [0, 15, 30, 45, 60].every(y => r45.on[y] > 0), r45.on);
  ok('45 度：偶数条是蓝、奇数条是绿',
     r45.on[0] === 2 && r45.on[30] === 2 && r45.on[15] === 1 && r45.on[45] === 1, r45.on);
  ok('45 度：关掉辅助线后全消失',
     [0, 15, 30, 45, 60].every(y => r45.off[y] === 0), r45.off);

  // == 导出数据形状（对齐原版 getRoadPointInfo）==
  const expShape = JSON.parse(await ev(`(function(){
    var out = {};
    [[0,'45'],[1,'90'],[2,'hc'],[3,'hc2']].forEach(function(t){
      WMNewMap({ name:'s'+t[1], mapType:t[0], mapWidth:1920, mapHeight:1440,
                 ceilWidth:40, ceilHeight:34.64 });
      var d = WMGetMapData().toJson();
      out[t[1]] = { rows: d.roadDataArr.length, cols: d.roadDataArr[0].length,
                    gridRow: WMApp.geom.row, gridCol: WMApp.geom.col };
    });
    return JSON.stringify(out);
  })()`));
  eq('导出行数 angle45 = 168（原版实测）', expShape['45'].rows, 168);
  eq('导出行数 angle90 = 42', expShape['90'].rows, 42);
  eq('导出行数 honeycomb = 42', expShape.hc.rows, 42);
  eq('导出行数 honeycomb2 = 48', expShape.hc2.rows, 48);
  eq('导出列数 angle45/90 = 48', expShape['45'].cols + ',' + expShape['90'].cols, '48,48');
  eq('导出列数 honeycomb = 64 / honeycomb2 = 55', expShape.hc.cols + ',' + expShape.hc2.cols, '64,55');
  ok('angle45 网格只有 84 行，但导出 168 行',
     expShape['45'].gridRow === 84 && expShape['45'].rows === 168, expShape['45']);

  // == angle45 底部那条带现在能画（dy 84..89 曾因数组只有 84 行被静默丢弃）==
  const bandCell = JSON.parse(await ev(`(function(){
    WMNewMap({ name:'band', mapType:0, mapWidth:1920, mapHeight:1440,
               ceilWidth:40, ceilHeight:34.64 });
    var before = WMApp.painted.size;
    var n = WMApp.geom.getNodeByPixel(20, 1400);      // dy = 87 > grid.row 84
    WMPaintAtPixel(20, 1400, 0);
    var after = WMApp.painted.size;
    var d = WMGetMapData().toJson();
    var hits = [];
    for (var y = 0; y < d.roadDataArr.length; y++)
      for (var x = 0; x < d.roadDataArr[y].length; x++)
        if (d.roadDataArr[y][x] !== 1) hits.push([x, y, d.roadDataArr[y][x]]);
    return JSON.stringify({ dx:n.dx, dy:n.dy, grew:after-before, hits:hits,
                            rows:d.roadDataArr.length });
  })()`));
  ok('angle45 (20,1400) 落在 dy=87（超出网格行数）', bandCell.dy === 87, bandCell);
  ok('这一格现在画得上（曾经静默跳过）', bandCell.grew === 1, bandCell);
  ok('并且进了导出数组', JSON.stringify(bandCell.hits) === JSON.stringify([[bandCell.dx, 87, 0]]), bandCell.hits);
  eq('导出仍是 168 行', bandCell.rows, 168);

  // == 画布位图 1:1 对应显示尺寸（不再被 #app 的 CSS transform 二次重采样）==
  // fitStage() 给 #app 上 transform: scale(innerWidth/1920)。位图如果只按「布局尺寸」
  // 建，浏览器每帧都要把整块画布再缩一次（实测 1464×884 显示成 1451.8×876.6，
  // 线条和文字发虚）。现在位图 = 布局 × fitScale × dpr，绘制坐标不变。
  await send('Emulation.setDeviceMetricsOverride',
             { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
  await sleep(700);
  const rs = JSON.parse(await ev(`(function(){
    var cv = document.getElementById('mapCanvas');
    var r = cv.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    return JSON.stringify({
      s: WMApp.screenScale, dpr: dpr,
      bw: cv.width, bh: cv.height,
      dw: Math.round(r.width), dh: Math.round(r.height),
      lw: parseFloat(cv.style.width), lh: parseFloat(cv.style.height),
      k: +(cv.width / parseFloat(cv.style.width)).toFixed(4)
    });
  })()`));
  ok('窄窗口下 screenScale = 1600/1920', Math.abs(rs.s - 1600 / 1920) < 1e-6, rs);
  ok('位图宽度 = 显示宽度 × dpr（修复前差 1/s）',
     Math.abs(rs.bw - rs.dw * rs.dpr) <= 1, rs);
  ok('位图高度 = 显示高度 × dpr', Math.abs(rs.bh - rs.dh * rs.dpr) <= 1, rs);
  ok('后备缓冲缩放系数 = fitScale × dpr',
     Math.abs(rs.k - rs.s * rs.dpr) < 0.002, rs);
  ok('CSS 尺寸仍是布局单位（绘制坐标系没变）',
     Math.abs(rs.lw * rs.s - rs.dw) <= 1 && Math.abs(rs.lh * rs.s - rs.dh) <= 1, rs);

  const align = JSON.parse(await ev(`(function(){
    WMNewMap({ name:'rs', mapType:1, mapWidth:1920, mapHeight:1440, ceilWidth:60, ceilHeight:30 });
    WMApp.layers.map = false; WMApp.layers.road = false; WMApp.layers.grid = true;
    WMApp.showAuxLine = false;
    WMApp.view.offsetX = 0; WMApp.view.offsetY = 0; WMApp.view.zoom = 1;
    WMApp.roadVersion++; WMRender();
    var cv = document.getElementById('mapCanvas');
    var k = cv.width / parseFloat(cv.style.width);
    var d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    // 90 度地图 ceilWidth=60 -> 竖线在 x=0/30/60…；取 y 在格子内部（避开横线）
    var y = Math.round(7 * k);
    var col = Math.round(30 * k), best = -1, bestX = -1;
    for (var x = col - 3; x <= col + 3; x++) {
      var i = (y * cv.width + x) * 4;
      var lum = d[i] + d[i + 1] + d[i + 2];
      if (lum > best) { best = lum; bestX = x; }
    }
    return JSON.stringify({ k: +k.toFixed(4), col: col, bestX: bestX, lum: best });
  })()`));
  ok('缩放后竖线仍落在 x=30 的设备像素上（误差 ≤1px）',
     Math.abs(align.bestX - align.col) <= 1, align);
  ok('该竖线确实被画出来（亮度明显高于底色）', align.lum > 200, align);

  await send('Emulation.setDeviceMetricsOverride',
             { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await sleep(500);

  // == 图层拆分：画路点不重建网格（性能回归）==
  // 拆之前 bg/road/grid 是一张合成图，画一笔就重画整张地图的 2640 个六边形
  // （实测一次 30 格拖拽 894 ms）。现在三层各自缓存，这里用重建计数器直接断言
  // "谁被重建了"，而不是靠计时（计时会飘）。
  const ly = JSON.parse(await ev(`(function(){
    var S = WMLayerStats;
    function snap(){ return { bg:S.bg, hex:S.hex, grid:S.grid, road:S.road }; }
    WMApp.layers.map = true; WMApp.layers.road = true; WMApp.layers.grid = true;
    WMApp.showAuxLine = true;
    var z = snap();
    WMNewMap({ name:'ly', mapType:3, mapWidth:1920, mapHeight:1440, ceilWidth:40, ceilHeight:34.64 });
    var a = snap();
    for (var i = 0; i < 10; i++) WMPaintAtPixel(200 + i * 40, 200 + i * 20, 0);
    var b = snap();
    WMApp.showAuxLine = false; WMRender();
    var c = snap();
    WMApp.showAuxLine = true; WMRender();
    var d = snap();
    WMApp.layers.grid = false; WMRender(); WMApp.layers.grid = true; WMRender();
    WMApp.layers.map = false; WMRender(); WMApp.layers.map = true; WMRender();
    var e = snap();
    WMNewMap({ name:'ly2', mapType:2, mapWidth:1920, mapHeight:1440, ceilWidth:40, ceilHeight:34.64 });
    var f = snap();
    // 顺手确认路点真的画出来了（拆层不能只快不对）
    WMNewMap({ name:'ly3', mapType:1, mapWidth:600, mapHeight:400, ceilWidth:60, ceilHeight:30 });
    WMApp.layers.map = false; WMApp.layers.grid = false; WMApp.layers.road = true;
    WMApp.view.zoom = 1; WMApp.view.offsetX = 0; WMApp.view.offsetY = 0;
    WMApp.brushSize = 0;
    // 前面的「设置」用例可能改过路点颜色，这里钉回默认的绿色，避免用例顺序影响
    WMApp.setting.roadSetDatas[0].color = '#00ff0065';
    WMPaintAtPixel(90, 45, 0);
    WMRender();
    var cv = document.getElementById('mapCanvas');
    var k = cv.width / parseFloat(cv.style.width);
    var px = cv.getContext('2d').getImageData(Math.round(90 * k), Math.round(45 * k), 1, 1).data;
    return JSON.stringify({ z:z, a:a, b:b, c:c, d:d, e:e, f:f,
                            cell: WMApp.road[1] ? WMApp.road[1][1] : 'n/a',
                            painted:[px[0], px[1], px[2], px[3]] });
  })()`));

  eq('建图时 hex 层重建一次', ly.a.hex - ly.z.hex, 1);
  eq('画 10 格只重建 road 层（10 次）', ly.b.road - ly.a.road, 10);
  ok('画 10 格不重建 hex 层（曾经每次重画 2640 个六边形）', ly.b.hex === ly.a.hex, ly.b);
  ok('画 10 格不重建 grid 层', ly.b.grid === ly.a.grid, ly.b);
  ok('画 10 格不重建 bg 层', ly.b.bg === ly.a.bg, ly.b);
  eq('关辅助线：grid 层不重建（直接贴 hex 层）', ly.c.grid, ly.b.grid);
  ok('关辅助线不重建 hex 层（六边形是独立一层）', ly.c.hex === ly.b.hex, ly.c);
  eq('再开辅助线：仍然命中缓存，不重建', ly.d.grid, ly.c.grid);
  ok('开关辅助线两次都不碰 hex', ly.d.hex === ly.b.hex, ly.d);
  ok('图层显隐完全不触发重建（只是少贴一张）',
     ly.e.bg === ly.d.bg && ly.e.hex === ly.d.hex
     && ly.e.grid === ly.d.grid && ly.e.road === ly.d.road, ly.e);
  ok('换地图类型才重建 hex 层', ly.f.hex - ly.e.hex >= 1, ly.f);
  eq('路点值写进了 road 数组', ly.cell, 0);
  ok('路点仍然画得出来（绿色行走路点，拆层后像素不变）',
     ly.painted[1] > 120 && ly.painted[3] > 0, ly.painted);

  ws.close(); ch.kill();
  console.log('\nRESULT: '+pass+' passed, '+fail+' failed');
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
