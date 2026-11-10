/* ==========================================================================
 * Map Editor — application entry point (composition root)
 * Wires core / state / render / ui / app modules together.
 * ========================================================================== */
import { MapType } from './core/types';
import { entitySize, entityRing } from './core/constants';
import { loadEntitySprites } from './app/sprites';
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
import { bindSeekPanel } from './ui/seekpanel';
import { buildMenus, closeMenu } from './ui/menus';
import { updateToolPanel } from './ui/toolpanel';
import { buildPropertyPanel } from './ui/property';
import { bindNewMap, bindOpenMap, paramsFromMapData } from './ui/wizard';
import { bindExcel } from './app/excel';
import { bindViews } from './ui/views';
import { bindOverlay } from './ui/overlay';
import { render, resizeCanvas } from './render/canvas';
import { layerStats } from './render/cache';
import { renderTest, renderTestSize } from './render/playmode';

function loadAssets(): void {
  const cs = new Image();
  cs.onload = () => { state.charSheet = cs; render(); };
  cs.src = 'assets/character_sheet.png';
  // One distinct sprite per selector; Transfer_1/2 are frame animations
  // (original AnimationController: 8 and 11 frames at 0.1s).
  loadEntitySprites();
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
  bindSeekPanel();
  bindOverlay();
  bindExcel();
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
    /** Test seam: 寻路设置（v2.0.2 SeekPathSetRoot）。直接引用，改字段即生效。 */
    WMSeekSettings: state.seekSettings,
    /** Test seam: per-layer rebuild counters (see render/cache.ts). */
    WMLayerStats: layerStats,
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

  // Reveal the UI. `index.html` keeps `#app` hidden (inline style, so it works
  // even when dist/style.css is the missing file) until this runs: a failed boot
  // must show the red banner alone, not the whole static skeleton dumped as
  // unstyled text. Reached only if every step above completed.
  document.documentElement.classList.add('wm-booted');
  const banner = document.getElementById('bootBanner');
  if (banner) banner.style.display = 'none';   // covers a slow boot past the 2.5 s guard
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
