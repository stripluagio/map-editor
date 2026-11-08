/* ==========================================================================
 * Map Editor — application entry point (composition root)
 * Wires core / state / render / ui / app modules together.
 * ========================================================================== */
import { MapType } from './core/types';
import { ENTITY_SKINS, entitySize, entityRing } from './core/constants';
import { state, exposeGlobals } from './app/state';
import { fitStage, bindMapInput } from './app/input';
import { createSampleMap, initDocument } from './app/document';
import { paintAt } from './app/editing';
import { MapParamsModel, normalizeEntity } from './core/model';
import type { MapParams, MapItem, MapData } from './core/types';
import { action } from './app/actions';
import { bindKeyboard } from './app/shortcuts';
import { bindTest } from './app/playmode';
import { applySettings, loadSettings, getMapData, buildMapExport } from './app/io';
import { buildToolBars } from './ui/toolbars';
import { buildMenus, closeMenu } from './ui/menus';
import { updateToolPanel } from './ui/toolpanel';
import { buildPropertyPanel } from './ui/property';
import { bindNewMap, bindOpenMap, paramsFromMapData } from './ui/wizard';
import { bindViews } from './ui/views';
import { bindOverlay } from './ui/overlay';
import { render, resizeCanvas } from './render/canvas';
import { renderTest, renderTestSize } from './render/playmode';

function loadAssets(): void {
  const cs = new Image();
  cs.onload = () => { state.charSheet = cs; render(); };
  cs.src = 'assets/character_sheet.png';
  // One distinct sprite per selector; Transfer_1/2 are frame animations
  // (original AnimationController: 8 and 11 frames at 0.1s).
  for (const [type, defs] of Object.entries(ENTITY_SKINS)) {
    state.sprites[type] = defs.map(def => {
      const files = def.frames && def.frames.length ? def.frames : [def.icon];
      return files.map(src => {
        const im = new Image();
        im.onload = () => render();
        im.src = src;
        return im;
      });
    });
  }
}

function init(): void {
  // global error capture (used by the e2e harness)
  const w = window as unknown as Record<string, unknown>;
  w.__errs = [];
  window.addEventListener('error', ev => (w.__errs as string[]).push(String(ev.message)));
  window.addEventListener('unhandledrejection', ev => (w.__errs as string[]).push('rej: ' + String(ev.reason)));

  fitStage();
  loadSettings();
  state.nmMapType = MapType.angle45;

  buildToolBars(action);
  buildMenus(action);
  updateToolPanel();
  buildPropertyPanel();

  bindMapInput();
  bindNewMap(initDocument);
  bindOpenMap(initDocument);
  bindViews(applySettings);
  bindKeyboard(action);
  bindTest();
  bindOverlay();
  document.addEventListener('mousedown', closeMenu);
  window.addEventListener('resize', () => { fitStage(); resizeCanvas(); renderTestSize(); });

  loadAssets();
  createSampleMap();
  window.setInterval(() => {
    if (state.mode === 'edit' && state.params) render();
  }, 240);

  exposeGlobals({
    WMAction: action, WMGetMapData: getMapData, WMRender: render, WMRenderTest: renderTest,
    WMExport: { buildMapExport },
    WMCore: { entitySize, entityRing },
    /** Test seam: build a fresh document of any map type (used by tests/e2e.cjs). */
    WMNewMap: (o: Partial<MapParams>) => initDocument(new MapParamsModel(o), null),
    /**
     * Test seam: paint one cell by map pixel. Same call shape as `input.ts`
     * (`paintAt(getNodeByPixel(...), value)`), so probes can exercise the real
     * brush path — including the out-of-bounds guard — without a mouse.
     */
    WMPaintAtPixel: (px: number, py: number, value: number) =>
      paintAt(state.geom.getNodeByPixel(px, py), value),
    /**
     * Test seam: load a MapData JSON exactly like 文件 → 打开 does
     * (same `paramsFromMapData` path, so a probe can't drift from the UI).
     */
    WMLoadData: (d: Partial<MapData>) => {
      initDocument(paramsFromMapData(d as Record<string, unknown>), d);
      return getMapData()!.toJson();
    },
    /** Test seam: append a normalized entity (used by tests + interop probes). */
    WMAddEntity: (o: Partial<MapItem>) => {
      state.entities.push(normalizeEntity(o));
      render();
    },
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
