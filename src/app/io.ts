import { MapDataModel, buildMapData } from '../core/model';
import { IMPORTED_SKINS, TYPE_LABEL, clearImportedSkins } from '../core/constants';
import type { SkinDef } from '../core/constants';
import type { EntityType } from '../core/types';
import { loadEntitySprites } from './sprites';
import { updateToolPanel } from '../ui/toolpanel';
import { state } from './state';
import { render } from '../render/canvas';
import { toast } from '../ui/overlay';
import { closeView } from '../ui/views';
import { $ } from '../ui/dom';

/** Returns a MapDataModel (so `.toJson()` stays available, matching the JS API). */
export function getMapData(): MapDataModel | null {
  if (!state.params) return null;
  const m = new MapDataModel();
  Object.assign(m, buildMapData(state.params, state.road, state.entities, state.setting));
  return m;
}

function download(name: string, text: string, type = 'application/json'): void {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/** Longest side of the 地图缩小导出 thumbnail. */
export const SMALL_EXPORT_MAX = 512;

/**
 * Build the exported map image.
 *
 * 地图切片导出 / 地图缩小导出 export the **map asset**, i.e. the background
 * image stretched over `mapWidth × mapHeight` — exactly what the editor's
 * `MapLayer` shows when every helper layer is off.
 *
 * They must NOT reuse `#mapCanvas`: that is the *editor viewport*, so it carries
 * the road points, the grid, the entity layer and only covers the visible part
 * of a panned/zoomed map. Dumping it baked all of that into the PNG (and cut
 * the map off at the current scroll position).
 *
 * `scale` is applied to the full map, independent of the current view.
 */
export function buildMapExport(scale = 1): HTMLCanvasElement | null {
  const p = state.params;
  if (!p) return null;
  const w = Math.max(1, Math.round(p.mapWidth * scale));
  const h = Math.max(1, Math.round(p.mapHeight * scale));
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  const bg = p.bgImage;
  if (bg && bg.complete && bg.naturalWidth) {
    ctx.drawImage(bg, 0, 0, w, h);
  } else {
    // no background yet — keep the same "empty map" look as the editor
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, w, h);
  }
  return cv;
}

/**
 * Save a canvas as a PNG download.
 *
 * `toDataURL` throws on a **tainted** canvas, which is exactly what happens when
 * the page is opened straight from disk (`file://`): the background image is
 * same-directory but still counts as cross-origin, so the canvas can never be
 * read back. Report it instead of throwing into the void — otherwise the export
 * menu entry just does nothing.
 */
function saveCanvasPNG(cv: HTMLCanvasElement, name: string): boolean {
  let url: string;
  try {
    url = cv.toDataURL('image/png');
  } catch {
    toast('浏览器不允许从 file:// 页面导出画布（跨源污染）。请用 npm run serve 打开后再导出');
    return false;
  }
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 500);
  return true;
}

export function saveFile(): void {
  const d = getMapData();
  if (!d) return;
  download(d.name + '.json', JSON.stringify(d.toJson()));
  toast('已保存 ' + d.name + '.json');
}

/**
 * 另存为（Shift + S）—— v2.0.2 新增。
 *
 * Same bytes as 保存, but it asks the user where to put them. The original calls
 * `WebFileHandler.saveFile(text, name, ".json", "保存地图数据")`, which prefers the
 * File System Access API and falls back to a plain download. We do the same:
 * `showSaveFilePicker` when the browser has it (Chrome/Edge on a secure origin),
 * otherwise the normal download path — never a dead button.
 */
export async function saveAsFile(): Promise<void> {
  const d = getMapData();
  if (!d) return;
  const text = JSON.stringify(d.toJson());
  const name = d.name + '.json';
  const picker = (window as unknown as {
    showSaveFilePicker?: (o: unknown) => Promise<{
      createWritable(): Promise<{ write(s: string): Promise<void>; close(): Promise<void> }>;
    }>;
  }).showSaveFilePicker;

  if (typeof picker === 'function') {
    try {
      const handle = await picker({
        suggestedName: name,
        types: [{ description: '地图数据', accept: { 'application/json': ['.json'] } }],
      });
      const w = await handle.createWritable();
      await w.write(text);
      await w.close();
      toast('已另存为 ' + name);
      return;
    } catch (err) {
      // AbortError = the user cancelled the dialog; anything else falls back.
      if ((err as { name?: string })?.name === 'AbortError') return;
    }
  }
  download(name, text);
  toast('浏览器不支持「另存为」对话框，已按普通下载保存 ' + name);
}

/**
 * 导入编辑资源 —— v2.0.2 toolbar button.
 *
 * 原版：选一个文件夹，根目录必须叫 `MapEditorAssets` / `mapAssets` / `MapAssets`；
 * 里面按类型分子目录（`NPC` / `Monster` / `Transfer` / `SpawnPoint` /
 * `SceneObject` / `PropObject` / `EventObject`），另有一个 `Presets/Presets.xlsx`
 * 提供每个资源的名字与尺寸。
 *
 * 本版：目录结构和根目录校验照抄，图片直接变成可选皮肤；`Presets.xlsx` 不解析，
 * 名称取文件名、尺寸取图片自然尺寸。这是有意的简化 —— 原版那套预设规则表
 * （`ImportEditAssetsPresetsRuleView`）是给美术流程用的，没有它也能正常工作。
 */
export function importEditAssets(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.setAttribute('webkitdirectory', '');
  input.setAttribute('directory', '');
  input.style.display = 'none';
  document.body.appendChild(input);

  input.addEventListener('change', () => {
    const files = Array.from(input.files || []);
    input.remove();
    if (!files.length) return;
    const root = String((files[0] as File & { webkitRelativePath?: string }).webkitRelativePath || '')
      .split('/')[0];
    if (!ASSET_ROOTS.has(root)) {
      toast('上传本地资源只支持命名为 MapEditorAssets 或 mapAssets 或 MapAssets 的根文件目录');
      return;
    }
    void applyImportedAssets(files, root);
  });
  input.click();
}

/** 允许的根目录名（原版三个）。 */
const ASSET_ROOTS = new Set(['MapEditorAssets', 'mapAssets', 'MapAssets']);

/**
 * 类型子目录 → 本项目的实体类型。
 * 原版常量是 `NPC` / `Monster` / `Transfer` / `SpawnPoint` / `SceneObject` /
 * `PropObject` / `EventObject`；这里大小写不敏感，也接受本项目自己的类型名。
 */
const ASSET_TYPE_BY_FOLDER: Record<string, EntityType> = {
  npc: 'npc',
  monster: 'monster',
  transfer: 'transfer',
  spawnpoint: 'spawnPoint',
  sceneobject: 'obj',
  propobject: 'prop',
  eventobject: 'event',
};

const IMAGE_RE = /\.(png|jpe?g|webp|gif)$/i;

/** 读一张图，只为拿自然尺寸；失败返回 null（坏图不该拖垮整次导入）。 */
function imageSize(url: string): Promise<{ w: number; h: number } | null> {
  return new Promise(resolve => {
    const im = new Image();
    im.onload = () => resolve({ w: im.naturalWidth || im.width, h: im.naturalHeight || im.height });
    im.onerror = () => resolve(null);
    im.src = url;
  });
}

/**
 * 把文件夹里的图片挂成可选皮肤。返回每个类型新增了多少张。
 * 同一个类型重复导入时**覆盖**上一批（而不是无限累加）。
 */
export async function applyImportedAssets(
  files: File[], root: string,
): Promise<Record<string, number>> {
  const added: Record<string, number> = {};
  const urls: string[] = [];

  // 先按类型分组
  const groups = new Map<EntityType, File[]>();
  for (const f of files) {
    if (!IMAGE_RE.test(f.name)) continue;
    const rel = String((f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name);
    const parts = rel.split('/');
    if (parts.length < 3) continue;                       // 必须 Root/Type/文件
    const type = ASSET_TYPE_BY_FOLDER[parts[1].toLowerCase()];
    if (!type) continue;                                  // Presets/ 之类直接跳过
    const list = groups.get(type) || [];
    list.push(f);
    groups.set(type, list);
  }

  for (const [type, list] of groups) {
    list.sort((a, b) => a.name.localeCompare(b.name));
    const defs: SkinDef[] = [];
    for (const f of list) {
      const url = URL.createObjectURL(f);
      const size = await imageSize(url);
      if (!size) { URL.revokeObjectURL(url); continue; }
      urls.push(url);
      const name = f.name.replace(/\.[^.]+$/, '');
      defs.push({ label: name, icon: url, objName: name, w: size.w, h: size.h });
    }
    if (!defs.length) continue;
    // 覆盖这一类的导入皮肤（内置的仍在前面，索引不受影响）
    clearImportedSkins(type);
    IMPORTED_SKINS[type] = defs;
    added[type] = defs.length;
  }

  if (urls.length) {
    loadEntitySprites();
    state.importedAssets = urls;
    updateToolPanel();
    render();
    const summary = Object.entries(added)
      .map(([t, n]) => TYPE_LABEL[t] + ' ' + n).join('、');
    toast('已导入 ' + urls.length + ' 张图片（' + root + '）：' + summary);
  } else {
    toast('在 ' + root + ' 里没找到可用的图片。'
        + '请按 MapEditorAssets/NPC/xxx.png 这样的「根目录/类型/图片」结构放文件');
  }
  return added;
}

/** 地图切片导出（ctrl + W）— full-size map image, no editor overlays. */
export function exportTiles(): void {
  const p = state.params;
  if (!p) return;
  const cv = buildMapExport(1);
  if (!cv) return;
  if (!saveCanvasPNG(cv, p.name + '.png')) return;
  toast('地图切片导出：' + cv.width + '×' + cv.height + ' 原图 PNG（不含路点/网格）');
}
/** 地图缩小导出（ctrl + T）— the same clean map, scaled down for a thumbnail. */
export function exportSmall(): void {
  const p = state.params;
  if (!p) return;
  const longest = Math.max(p.mapWidth, p.mapHeight) || 1;
  const scale = Math.min(1, SMALL_EXPORT_MAX / longest);
  const cv = buildMapExport(scale);
  if (!cv) return;
  if (!saveCanvasPNG(cv, p.name + '_small.png')) return;
  toast('地图缩小导出：' + cv.width + '×' + cv.height + ' 缩略 PNG（不含路点/网格）');
}

export function saveSettings(): void {
  try { localStorage.setItem('wmc_settings', JSON.stringify(state.setting)); } catch { /* ignore */ }
}
export function loadSettings(): void {
  try {
    const s = JSON.parse(localStorage.getItem('wmc_settings') || 'null');
    if (s && Array.isArray(s.roadSetDatas)) state.setting = s;
  } catch { /* ignore */ }
}

export function applySettings(): void {
  state.setting.defaultRoadValue = Number(($('stDefaultValue') as HTMLInputElement).value) || 0;
  if (state.params) state.params.name = ($('stName') as HTMLInputElement).value || state.params.name;
  saveSettings();
  state.roadVersion++;
  closeView();
  render();
  toast('设置已应用');
}
