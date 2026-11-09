import { MapType } from './types';
import type { MapParams, MapData, MapItem, Settings, EntityType } from './types';
import { CLASS_DIC, TYPE_TO_CLASS } from './schema';

export class MapParamsModel implements MapParams {
  name: string;
  mapType: MapType;
  mapWidth: number;
  mapHeight: number;
  ceilWidth: number;
  ceilHeight: number;
  bgName: string;
  bgImage: HTMLImageElement | null;
  bgSrc: string | null;
  alignment: number;

  constructor(o: Partial<MapParams> = {}) {
    this.name = o.name ?? '未命名';
    this.mapType = o.mapType ?? MapType.angle45;
    this.mapWidth = o.mapWidth || 1920;
    this.mapHeight = o.mapHeight || 1080;
    this.ceilWidth = o.ceilWidth || 60;
    this.ceilHeight = o.ceilHeight || 30;
    this.bgName = o.bgName || 'map_bg';
    this.bgImage = o.bgImage ?? null;
    this.bgSrc = o.bgSrc ?? null;
    this.alignment = o.alignment ?? 0;
  }
}

/** Exact 12-field MapData with the original constructor key order. */
export class MapDataModel implements MapData {
  name = '';
  bgName = '';
  type: MapType = MapType.angle45;
  mapWidth = 0;
  mapHeight = 0;
  nodeWidth = 0;
  nodeHeight = 0;
  alignment = 0;
  offsetX = 0;
  offsetY = 0;
  roadDataArr: number[][] = [];
  mapItems: MapItem[] = [];

  static fromJson(obj: Partial<MapData>): MapDataModel {
    const d = new MapDataModel();
    Object.assign(d, obj);
    if (!Array.isArray(d.roadDataArr)) d.roadDataArr = [];
    if (!Array.isArray(d.mapItems)) d.mapItems = [];
    return d;
  }

  toJson(): MapData {
    return {
      name: this.name, bgName: this.bgName, type: this.type,
      mapWidth: this.mapWidth, mapHeight: this.mapHeight,
      nodeWidth: this.nodeWidth, nodeHeight: this.nodeHeight,
      alignment: this.alignment, offsetX: this.offsetX, offsetY: this.offsetY,
      roadDataArr: this.roadDataArr, mapItems: this.mapItems,
    };
  }
}

/** Create an entity with all classDic attributes at their original defaults. */
const DEFAULT_OBJ_NAME: Record<string, string> = {
  npc: 'NPC', monster: '怪物', transfer: '传送门', spawnPoint: '出生点',
  obj: '物体', prop: '道具', event: '事件',
};

export function defaultEntity(type: EntityType | 'item', x: number, y: number): MapItem {
  const cls = TYPE_TO_CLASS[type] || 'EditorElement';
  const e: MapItem = { type: type || 'item', className: cls };
  for (const a of CLASS_DIC[cls]) {
    if (a.type === 'number') e[a.attribute] = 0;
    else if (a.type === 'bool') e[a.attribute] = false;
    else e[a.attribute] = '';
  }
  e.objId = '0'; e.objType = '0';
  e.objName = DEFAULT_OBJ_NAME[type] || 'item';
  e.skin = '0';
  e.x = Math.round((x || 0) * 1000) / 1000;
  e.y = Math.round((y || 0) * 1000) / 1000;
  e.cx = 0; e.cy = 0; e.params = '';
  e.width = 100; e.height = 100;
  return e;
}

export function normalizeEntity(raw: Partial<MapItem>): MapItem {
  const type = (raw.type || 'item') as EntityType | 'item';
  const d = defaultEntity(type, Number(raw.x) || 0, Number(raw.y) || 0);
  for (const k of Object.keys(raw)) if (k !== 'type') d[k] = raw[k];
  d.className = TYPE_TO_CLASS[type] || 'EditorElement';
  d.type = type;
  return d;
}

/** Build the export model from current editor state. */
export function buildMapData(params: MapParams, road: number[][], entities: MapItem[], settings: Settings): MapData {
  const d = new MapDataModel();
  d.name = params.name; d.bgName = params.bgName; d.type = params.mapType;
  d.mapWidth = params.mapWidth; d.mapHeight = params.mapHeight;
  d.nodeWidth = params.ceilWidth; d.nodeHeight = params.ceilHeight;
  // v2.0.2 exports the origin mode: 0 = 左下角, 1 = 左上角. `offsetX/offsetY`
  // stay 0 because the original never assigns them either.
  d.alignment = params.alignment || 0; d.offsetX = 0; d.offsetY = 0;
  d.roadDataArr = road.map(r => r.slice());
  // Original `unitDataConversion` reads `entityLayer.getMapUnits()`, and
  // `setDepthRand()` keeps that array sorted by y descending, so the exported
  // order is depth order — not the order the user dropped them in. Sorting here
  // makes export → import → export a fixed point and keeps the file comparable
  // with the original's byte-for-byte (ties keep insertion order, unlike the
  // original's `y > y ? -1 : 1` comparator which never returns 0).
  d.mapItems = entities
    .slice()
    .sort((a, b) => (Number(b.y) || 0) - (Number(a.y) || 0))
    .map(e => {
      const out: MapItem = { type: e.type || 'item' };
      const schema = CLASS_DIC[e.className || 'EditorElement'] || CLASS_DIC.EditorElement;
      for (const a of schema) out[a.attribute] = e[a.attribute];
      if (e.type === 'item' || !schema.length) {
        out.x = e.x; out.y = e.y; out.width = e.width || 100; out.height = e.height || 100;
      }
      return out;
    });
  void settings;
  return d.toJson();
}
