import type { ToolName, ViewName } from '../core/types';
import { DOWNLOAD_LINKS } from '../core/constants';
import { state } from './state';
import { render } from '../render/canvas';
import { renderTest } from '../render/playmode';
import { drawMiniMap } from '../render/minimap';
import { closeMenu } from '../ui/menus';
import { openView } from '../ui/views';
import { setTool, selectRoad, updateToolPanel } from '../ui/toolpanel';
import { syncLayerBtns, syncSwitchBtns, setToolbarMode } from '../ui/toolbars';
import { cutEntity, copyEntity, pasteEntity } from './editing';
import { saveFile, saveAsFile, exportTiles, exportSmall, importEditAssets } from './io';
import { startTest, toggleFollow, toggleShowPath } from './playmode';
import { toast } from '../ui/overlay';

const TOOL_BY_ACTION: Record<string, ToolName> = {
  openBrushWin: 'brush', openRoadWin: 'road', openNpcWin: 'npc',
  openMonsterWin: 'monster', openTransferWin: 'transfer', openSpawnWin: 'spawnPoint',
  openObjWin: 'obj', openPropWin: 'prop', openEventWin: 'event',
};
const ROAD_BY_ACTION: Record<string, number> = {
  addEnableNode: 0, addDisableNode: 1, addTransParentNode: 2, addTransferNode: 3,
  deleteNode: -1, notDrawNode: -2,
};

export function action(act: string): void {
  if (!act) return;
  closeMenu();

  // simple view openings
  const views: Record<string, ViewName> = {
    createNewFile: 'newMap', openFile: 'openMap', showProjectSetting: 'setting',
    showMiniMap: 'miniMap', showTeach: 'teach', showCopyright: 'copyright', showSaleView: 'sale',
    openSaleMapEditor: 'sale', showAbout: 'about', openExcelExportTool: 'excel',
  };
  if (views[act]) {
    openView(views[act]);
    if (act === 'showMiniMap') drawMiniMap();
    return;
  }
  if (act === 'saveFile') { saveFile(); return; }
  if (act === 'saveAsFile') { saveAsFile(); return; }
  if (act === 'importEditAssets') { importEditAssets(); return; }
  if (act === 'testProject') { startTest(); return; }

  // layer toggles
  const layerMap: Record<string, 'map' | 'road' | 'entity' | 'grid'> = {
    showMapLayer: 'map', showRoadLayer: 'road', showEntityLayer: 'entity', showGridLayer: 'grid',
    t_showMapLayer: 'map', t_showRoadLayer: 'road', t_showEntityLayer: 'entity', t_showGridLayer: 'grid',
  };
  if (layerMap[act]) {
    const key = layerMap[act];
    state.layers[key] = !state.layers[key];
    syncLayerBtns(state.layers);
    if (act.startsWith('t_')) renderTest(); else render();
    return;
  }
  if (TOOL_BY_ACTION[act]) { setTool(TOOL_BY_ACTION[act]); render(); return; }
  if (ROAD_BY_ACTION[act]) { selectRoad(ROAD_BY_ACTION[act]); return; }

  switch (act) {
    case 'clearAllEditorAreaExecute':
      state.roadValue = -2; state.entityType = null; updateToolPanel(); render(); break;
    case 'switchRoadStyle':
      state.roadStyle = (state.roadStyle + 1) % 3;
      toast('路点风格 ' + (state.roadStyle + 1)); render(); break;
    case 'hideBlockRoad':
      state.setting.roadSetDatas[1].isShow = !state.setting.roadSetDatas[1].isShow; render(); break;
    case 'showAnchor':
      state.showAnchor = !state.showAnchor;
      syncSwitchBtns(state.showAnchor, state.showEntityTitle);
      render(); break;
    case 'showEntityTitle':
      state.showEntityTitle = !state.showEntityTitle;
      syncSwitchBtns(state.showAnchor, state.showEntityTitle);
      render(); break;
    case 'toggleAuxLine':
      state.showAuxLine = !state.showAuxLine;
      toast(state.showAuxLine ? '辅助线：显示' : '辅助线：隐藏');
      render(); break;
    case 'cut': cutEntity(); break;
    case 'copy': copyEntity(); break;
    case 'paste': pasteEntity(); break;
    case 'exportTiles': exportTiles(); break;
    case 'exportSmall': exportSmall(); break;
    case 'showIntroduce':
      // Original: `window.open('https://forum.cocos.org/t/topic/171642', '_blank')`
      window.open('https://forum.cocos.org/t/topic/171642', '_blank');
      break;
    case 'gotoMoreGame':
      window.open('https://game-1258223435.cos.ap-guangzhou.myqcloud.com/gameAD/v1.0.0/web-mobile/index.html', '_blank');
      break;
    case 'downloadSource':
    case 'downloadImageClipTool':
    case 'dl_creator_base_2': case 'dl_creator_base_3':
    case 'dl_laya_base_3': case 'dl_unity_base': {
      const url = DOWNLOAD_LINKS[act];
      if (url) window.open(url, '_blank');
      break;
    }
    // 付费框架没有公开下载地址 —— 原版是打开商店窗口 (`showSaleView`)。
    case 'dl_creator_pro_2': case 'dl_creator_pro_3':
    case 'dl_laya_pro_3':
      openView('sale');
      break;
    case 'setEditRoadModel': setEditRoadModel(true); break;
    case 'setNormalRoadModel': setEditRoadModel(false); break;
    case 't_followPlayer': toggleFollow(); break;
    case 't_showPath': toggleShowPath(); break;
  }
}

function setEditRoadModel(editRoad: boolean): void {
  state.editRoadModel = editRoad;
  // Original swaps ToolBar1 between the normal 8 buttons and the road-point
  // buttons (添加可走路点(Q) / 添加不可走路点(W) / ... ) in road-edit mode.
  setToolbarMode(editRoad);
  toast(editRoad ? '已切换到路点编辑模式(N)：点击格子直接写入路点' : '已切换到普通编辑模式(M)');
  render();
}
