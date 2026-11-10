import { defaultEntity } from '../core/model';
import { skinsFor, entityRing } from '../core/constants';
import type { MapItem, RoadNode } from '../core/types';
import { state } from './state';
import { render } from '../render/canvas';
import { buildPropertyPanel } from '../ui/property';
import { toast } from '../ui/overlay';

interface Change {
  dy: number; dx: number;
  old: number; next: number;
  oldPainted: boolean; nextPainted: boolean;
}

/**
 * Paint a diamond brush stroke, with one undo action.
 *
 * Original RoadPointLayer semantics:
 *  - `addRoadPoint(node)` stores EVERY painted cell in `_roadNodeDic`, even
 *    when its value equals `defaultRoadValue` (W / value 1). Such a cell IS
 *    drawn (red) — `isShow` in SettingData only affects the settings dialog,
 *    not the renderer (`_roadTypeShowDic[0..9]` are all true).
 *  - `removeRoadPoint(node)` (D / right-click) deletes it from the dictionary,
 *    so the cell reverts to the default value and disappears.
 * Therefore a brush stroke must track the painted flag independently of the
 * numeric value, otherwise pressing W on a pristine map is a no-op.
 */
export function paintAt(node: RoadNode, value: number, erase = false): void {
  const g = state.geom;
  const cols = state.road[0]?.length || 0;
  const changes: Change[] = [];
  for (const [ox, oy] of g.getStroke(state.brushSize)) {
    const n = g.getNodeByWorldPoint(node.cx + ox, node.cy + oy);
    if (n.dy < 0 || n.dy >= state.road.length || n.dx < 0 || n.dx >= state.road[0].length) continue;
    const key = n.dy * cols + n.dx;
    const old = state.road[n.dy][n.dx];
    const oldPainted = state.painted.has(key);
    const next = erase ? state.setting.defaultRoadValue : value;
    const nextPainted = !erase;
    if (old === next && oldPainted === nextPainted) continue;
    changes.push({ dy: n.dy, dx: n.dx, old, next, oldPainted, nextPainted });
  }
  if (!changes.length) return;
  const apply = (which: 'old' | 'next') => {
    for (const c of changes) {
      state.road[c.dy][c.dx] = which === 'old' ? c.old : c.next;
      const k = c.dy * cols + c.dx;
      const painted = which === 'old' ? c.oldPainted : c.nextPainted;
      if (painted) state.painted.add(k); else state.painted.delete(k);
    }
    state.roadVersion++;
    render();
  };
  apply('next');
  state.undo.push({ undo: () => apply('old'), redo: () => apply('next') });
}

/** Build an entity of the currently-selected type + skin. */
function makeCurrentEntity(type: 'npc' | 'monster' | 'transfer' | 'spawnPoint', x: number, y: number): MapItem {
  const e = defaultEntity(type, x, y);
  const skins = skinsFor(type);
  const skinDef = skins[state.entitySkin] || skins[0];
  e.skin = String(state.entitySkin);
  e.objName = skinDef ? skinDef.objName : (type === 'npc' ? 'NPC' : type === 'monster' ? '怪物' : '出生点');
  if (type === 'npc') e.npcType = state.entitySkin;
  if (type === 'monster') e.monsterType = state.entitySkin;
  if (type === 'transfer') e.transferType = state.entitySkin;
  return e;
}

/**
 * Arm the entity brush (EditObject.setBrush): the entity follows the cursor
 * as a ghost until the next left click drops it.
 */
export function armBrush(type: 'npc' | 'monster' | 'transfer' | 'spawnPoint'): void {
  const cx = state.cursorNode ? state.cursorNode.cx : 200;
  const cy = state.cursorNode ? state.cursorNode.cy : 200;
  state.brushEntity = makeCurrentEntity(type, cx, cy);
  state.entityType = type;
  render();
}

/** Move the ghost brush to a world position (called on mousemove). */
export function moveBrush(wx: number, wy: number): void {
  if (!state.brushEntity) return;
  state.brushEntity.x = Math.round(wx * 1000) / 1000;
  state.brushEntity.y = Math.round(wy * 1000) / 1000;
  render();
}

/** Drop the ghost brush at a world position, adding it to the document. */
export function commitBrush(wx: number, wy: number): void {
  const e = state.brushEntity;
  if (!e) return;
  if (wx <= 0 || wy <= 0 || wx >= (state.params?.mapWidth || 0) || wy >= (state.params?.mapHeight || 0)) {
    cancelBrush();
    return;
  }
  e.x = Math.round(wx * 1000) / 1000;
  e.y = Math.round(wy * 1000) / 1000;
  const n = state.geom.getNodeByPixel(wx, wy);
  const wp = state.geom.getWorldPointByPixel(n.px, n.py);
  e.cx = wp.x; e.cy = wp.y;
  state.brushEntity = null;
  state.entityType = null;
  state.entities.push(e);
  state.undo.push({
    undo: () => { const i = state.entities.indexOf(e); if (i >= 0) state.entities.splice(i, 1); buildPropertyPanel(); render(); },
    redo: () => { state.entities.push(e); buildPropertyPanel(); render(); },
  });
  selectEntity(e);
  toast('已放置：' + String(e.objName));
}

export function cancelBrush(): void {
  if (!state.brushEntity) return;
  state.brushEntity = null;
  state.entityType = null;
  render();
}

/** Direct placement at a grid node (used by tests / keyboard-free flows). */
export function placeEntity(node: RoadNode): void {
  const raw = state.entityType;
  if (!raw || (raw !== 'npc' && raw !== 'monster' && raw !== 'transfer' && raw !== 'spawnPoint')) return;
  const g = state.geom;
  const c = g.cellCenter(node.dx, node.dy);
  const e = makeCurrentEntity(raw, c.x, c.y);
  const wp = g.getWorldPointByPixel(c.x, c.y);
  e.cx = wp.x; e.cy = wp.y;
  state.entities.push(e);
  state.undo.push({
    undo: () => { const i = state.entities.indexOf(e); if (i >= 0) state.entities.splice(i, 1); buildPropertyPanel(); render(); },
    redo: () => { state.entities.push(e); buildPropertyPanel(); render(); },
  });
  selectEntity(e);
  toast('已放置：' + String(e.objName));
}

/** Legacy constants kept for the e2e harness (ring is now per-skin). */
export const SELECTION_RADIUS = 44;
export const SELECTION_CY = -40;

/**
 * Hit-test entities by the visible selection ring, which is sized to the drawn
 * sprite (see `entityRing`). This keeps "click inside the white circle"
 * consistent for small NPCs and for large 200×200 portals.
 */
export function entityAt(wx: number, wy: number): MapItem | null {
  for (let i = state.entities.length - 1; i >= 0; i--) {
    const e = state.entities[i];
    const ring = entityRing(String(e.type), Number(e.skin) || 0);
    const dx = wx - (Number(e.x) || 0) - ring.cx;
    const dy = wy - (Number(e.y) || 0) - ring.cy;
    if (dx * dx + dy * dy <= ring.r * ring.r) return e;
  }
  return null;
}

export function selectEntity(e: MapItem | null): void {
  state.selectedEntity = e;
  buildPropertyPanel(); render();
}

export function deleteSelectedEntity(): void {
  const e = state.selectedEntity;
  if (!e) return;
  const i = state.entities.indexOf(e);
  if (i < 0) return;
  state.entities.splice(i, 1);
  state.selectedEntity = null;
  buildPropertyPanel(); render();
  state.undo.push({
    undo: () => { state.entities.splice(i, 0, e); buildPropertyPanel(); render(); },
    redo: () => { state.entities.splice(i, 1); state.selectedEntity = null; buildPropertyPanel(); render(); },
  });
}

export function cutEntity(): void {
  if (!state.selectedEntity) return;
  state.clipboard = JSON.parse(JSON.stringify(state.selectedEntity)) as MapItem;
  deleteSelectedEntity();
}
export function copyEntity(): void {
  if (state.selectedEntity) state.clipboard = JSON.parse(JSON.stringify(state.selectedEntity)) as MapItem;
}
export function pasteEntity(): void {
  if (!state.clipboard) return;
  const e = JSON.parse(JSON.stringify(state.clipboard)) as MapItem;
  e.x = (Number(e.x) || 0) + 40; e.y = (Number(e.y) || 0) + 40;
  state.entities.push(e);
  selectEntity(e);
}
