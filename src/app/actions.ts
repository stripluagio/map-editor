import type { ToolName, ViewName } from '../core/types';
import { state } from './state';
import { render } from '../render/canvas';
import { renderTest } from '../render/playmode';
import { drawMiniMap } from '../render/minimap';
import { closeMenu } from '../ui/menus';
import { openView } from '../ui/views';
import { setTool, selectRoad, updateToolPanel } from '../ui/toolpanel';
import { syncLayerBtns, setToolbarMode } from '../ui/toolbars';
import { cutEntity, copyEntity, pasteEntity } from './editing';
import { saveFile, exportTiles, exportSmall } from './io';
import { startTest, toggleFollow, toggleShowPath } from './playmode';
import { toast } from '../ui/overlay';

const TOOL_BY_ACTION: Record<string, ToolName> = {
  openBrushWin: 'brush', openRoadWin: 'road', openNpcWin: 'npc',
  openMonsterWin: 'monster', openTransferWin: 'transfer', openSpawnWin: 'spawnPoint',
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
  };
  if (views[act]) {
    openView(views[act]);
    if (act === 'showMiniMap') drawMiniMap();
    return;
  }
  if (act === 'saveFile') { saveFile(); return; }
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
      state.showAnchor = !state.showAnchor; render(); break;
    case 'toggleAuxLine':
      state.showAuxLine = !state.showAuxLine;
      toast(state.showAuxLine ? '辅助线：显示' : '辅助线：隐藏');
      render(); break;
    case 'cut': cutEntity(); break;
    case 'copy': copyEntity(); break;
    case 'paste': pasteEntity(); break;
    case 'exportTiles': exportTiles(); break;
    case 'exportSmall': exportSmall(); break;
    case 'downloadSource':
      window.open('https://easymapeditor-1258223435.cos.ap-guangzhou.myqcloud.com/framework/cocos/RPGFramework_base_2.4.8.zip', '_blank');
      break;
    case 'downloadImageClipTool':
      window.open('https://easymapeditor-1258223435.cos.ap-guangzhou.myqcloud.com/tool/ImageClip.zip', '_blank');
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
