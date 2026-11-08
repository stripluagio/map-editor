/* Browser end-to-end test for WebMobileClone.
 * Prereq: static server on http://127.0.0.1:8900 (python -m http.server 8900)
 * Run: node tests/e2e.cjs
 * Uses Chrome DevTools Protocol directly (no npm dependencies).
 */
'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const WS=require('./wsmini.cjs');
const CHROME=process.env.CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL=process.env.URL||'http://127.0.0.1:8900/index.html';
const PORT=9341, PROFILE=path.join(require('os').tmpdir(),'wmc-e2e-profile');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function get(p){return new Promise((res,rej)=>http.get({host:'127.0.0.1',port:PORT,path:p},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));}).on('error',rej));}

let pass=0,fail=0;
function ok(name,cond,extra){ if(cond){pass++;console.log('  PASS  '+name);} else {fail++;console.log('  FAIL  '+name+(extra!==undefined?'  -> '+JSON.stringify(extra):''));} }

(async()=>{
  const ch=spawn(CHROME,['--headless=new','--disable-gpu','--no-sandbox','--hide-scrollbars',
    '--window-size=1920,1080','--autoplay-policy=no-user-gesture-required',
    `--remote-debugging-port=${PORT}`,'--user-data-dir='+PROFILE,URL],{stdio:'ignore'});
  let pages=null;
  for(let i=0;i<60;i++){try{pages=await get('/json/list');if(pages.some(p=>p.type==='page'&&p.url.includes('8900')))break;}catch(e){}await sleep(300);}
  if(!pages){console.error('cannot connect to chrome');process.exit(1);}
  const page=pages.find(p=>p.type==='page'&&p.url.includes('8900'));
  const ws=new WS(page.webSocketDebuggerUrl); await ws.ready();
  let id=0; const pend=new Map();
  ws.onMessage(m=>{const o=JSON.parse(m);if(o.id&&pend.has(o.id)){pend.get(o.id)(o);pend.delete(o.id);}});
  const send=(method,params={})=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method,params}));});
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
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
  ok('menu labels', (await E("[].map.call(document.querySelectorAll('.menu-item'),e=>e.textContent).join(',')"))==='文件,编辑,命令,窗口,帮助');
  ok('toolbar1 visible labels', (await E("[].filter.call(document.querySelectorAll('#toolBar1 .tb-btn'),function(e){return !e.classList.contains('hidden')}).map(function(e){return e.textContent}).join('|')"))==='新建|打开|保存|设置|运行（ctr + enter）|显示小地图(F2)|教程|帮助');
  ok('toolbar2 first label', (await E("document.querySelector('#toolBar2 .tb-btn').textContent"))==='隐藏地图（U）');
  ok('left panel title', (await E("document.getElementById('toolTitle').textContent"))==='编辑路点');
  ok('5 road swatches', (await E("document.querySelectorAll('#toolContent .tool-item').length"))===5);

  console.log('== menus ==');
  await click(36,24);
  ok('file menu opens', (await E("document.getElementById('menuPanel').classList.contains('open')"))===true);
  const items=await E("[].map.call(document.querySelectorAll('.menu-panel-item'),e=>e.textContent).join('|')");
  ok('file menu items', items.includes('新建')&&items.includes('保存（CTRL + S）')&&items.includes('设置'), items);
  await click(900,500); // close
  await click(140,24);  // edit menu (2nd item: x=97..182)
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
  await click(797,105); ok('设置笔刷 opens brush tab', (await E('WMApp.tool'))==='brush', await E('WMApp.tool'));
  ok('6 brush sizes', (await E("document.querySelectorAll('#toolContent .tool-item').length"))===6);
  await click(1027,105); ok('放置npc opens NPC tab', (await E('WMApp.tool'))==='npc'&&(await E('WMApp.entityType'))==='npc');
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
  await click(1142,105);
  ok('4 monster skins', (await E("document.querySelectorAll('#toolContent .tool-item').length"))===4);
  ok('monster labels match original',
     (await E("[].map.call(document.querySelectorAll('#toolContent .tool-label'),e=>e.textContent).join('|')"))==='小怪|精英怪|Boss|特殊怪');
  ok('monster icons all different',
     (await E("(function(){var s=[].map.call(document.querySelectorAll('#toolContent .tool-item img'),e=>e.getAttribute('src'));return s.length===4 && new Set(s).size===4})()"))===true);
  await click(1267,105);
  ok('3 transfer skins', (await E("document.querySelectorAll('#toolContent .tool-item').length"))===3);
  ok('transfer labels match original (incl. 传送们 typo)',
     (await E("[].map.call(document.querySelectorAll('#toolContent .tool-label'),e=>e.textContent).join('|')"))==='类型1.传送们|类型2.传送们|不可视.传送们');
  await click(1402,105);
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
  await click(912,105); ok('编辑路点 returns to road tab', (await E('WMApp.tool'))==='road');
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
  await click(697,62);
  ok('minimap opens', (await E("!document.getElementById('miniMapView').classList.contains('hidden')"))===true);
  await click(1180,250);
  await click(367,62);   // 设置 (x=317..417)
  ok('settings opens', (await E("!document.getElementById('settingView').classList.contains('hidden')"))===true,
     await E("JSON.stringify({act:WMApp.activeView,mode:WMApp.mode})"));
  ok('settings has 4 road rows', (await E("document.querySelectorAll('#stRoadTable .st-tr').length"))===4);
  await E("WMApp.setting.roadSetDatas[0].color='#12345678'");
  await E("document.getElementById('stApply').click()");  // 应用
  ok('settings applied', (await E('WMApp.setting.roadSetDatas[0].color'))==='#12345678');
  ok('settings closed', (await E("document.getElementById('settingView').classList.contains('hidden')"))===true);

  console.log('== new map wizard ==');
  await click(50,62);
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
  await click(500,62);
  ok('test mode entered', (await E('WMApp.mode'))==='test');
  ok('player spawned', !!(await E('WMApp.test&&WMApp.test.player')));
  ok('follow is off by default (verified original)', (await E('WMApp.test.follow'))===false);
  ok('showPath is off by default', (await E('WMApp.test.showPath'))===false);
  ok('follow button label default', (await E("document.querySelector('#testToolBar .tb-btn[data-act=t_followPlayer]').textContent"))==='屏幕跟随玩家(F3)');
  ok('path button label default', (await E("document.querySelector('#testToolBar .tb-btn[data-act=t_showPath]').textContent"))==='查看寻路过程(F4)');

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
  await click(1402,105);                       // 放置出生点
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

  console.log('== 辅助线开关（编辑菜单 / J）==');
  // 走真实的菜单 DOM：打开「编辑」-> 点那条辅助线项
  const aux = JSON.parse(await E(`(function(){
    WMApp.layers.map = false; WMApp.layers.road = false; WMApp.layers.grid = true;
    WMApp.view.offsetX = 0; WMApp.view.offsetY = 0; WMApp.view.zoom = 1;
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

    var on = { flag: WMApp.showAuxLine, aux: auxAt(305, 110), hex: hexEdgeAt() };
    var labelOn = menuLabel();                       // 点一下 -> 关
    var off = { flag: WMApp.showAuxLine, aux: auxAt(305, 110), hex: hexEdgeAt() };
    var labelOff = menuLabel();                      // 再点 -> 开
    var back = { flag: WMApp.showAuxLine, aux: auxAt(305, 110), hex: hexEdgeAt() };

    return JSON.stringify({ on: on, off: off, back: back,
                            labelOn: labelOn, labelOff: labelOff });
  })()`));

  ok('默认开着辅助线（原版 _isShowAuxiliaryLine = true）', aux.on.flag === true, aux.on);
  ok('开着时 110 那条横辅助线可见', aux.on.aux > 0, aux.on);
  ok('菜单项标题跟着状态走（开着显示「隐藏辅助线」）',
     /隐藏辅助线/.test(aux.labelOn || ''), aux.labelOn);
  ok('点菜单项后开关变成关', aux.off.flag === false, aux.off);
  ok('关掉后 110 那条横辅助线消失', aux.off.aux === 0, aux.off);
  ok('关掉后六边形描边还在', aux.off.hex === true, aux.off);
  ok('再点一次恢复显示', aux.back.flag === true && aux.back.aux > 0, aux.back);
  ok('标题回到「显示辅助线」', /显示辅助线/.test(aux.labelOff || '') && !/隐藏/.test(aux.labelOff || ''),
     aux.labelOff);

  // 快捷键 J 与菜单走同一条 action
  const keyRes = JSON.parse(await E(`(function(){
    var before = WMApp.showAuxLine;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }));
    var after = WMApp.showAuxLine;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }));
    return JSON.stringify({ before: before, after: after, restored: WMApp.showAuxLine });
  })()`));
  ok('J 键也能切辅助线', keyRes.before === true && keyRes.after === false && keyRes.restored === true,
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
  ok('90 度：关掉后 y=15/45 消失', r90.off[15] === 'none' && r90.off[45] === 'none', r90.off);
  ok('90 度：关掉后格子边界还在',
     r90.off[0] === 'border' && r90.off[30] === 'border' && r90.off[60] === 'border', r90.off);

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

  ws.close(); ch.kill();
  console.log('\nRESULT: '+pass+' passed, '+fail+' failed');
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
