/** Shared type definitions for Map Editor. */

export enum MapType {
  angle45 = 0,
  angle90 = 1,
  honeycomb = 2,
  honeycomb2 = 3,
}

/** Point in pixel/world coordinates. */
export interface Point { x: number; y: number }

/** A road node: (cx,cy)=world, (px,py)=pixel, (dx,dy)=grid. */
export interface RoadNode {
  cx: number; cy: number;
  px: number; py: number;
  dx: number; dy: number;
}

export interface Rgba { r: number; g: number; b: number; a: number }

/** One road-point setting row (SettingData.RoadSetData). */
export interface RoadSetData {
  id: number;
  value: number;
  color: string;
  isShow: boolean;
  isPass: boolean;
  desc: string;
}

export interface Settings {
  defaultRoadValue: number;
  roadSetDatas: RoadSetData[];
}

export interface MapParams {
  name: string;
  mapType: MapType;
  mapWidth: number;
  mapHeight: number;
  ceilWidth: number;
  ceilHeight: number;
  bgName: string;
  bgImage: HTMLImageElement | null;
  bgSrc: string | null;
  /**
   * 坐标原点模式 —— 原版 v2.0.2 新增。
   * 0 = 基于左下角（原版旧行为，y 轴向上），1 = 基于左上角（y 轴向下）。
   * 会原样写进 MapData.alignment，前端框架按它决定世界坐标的换算方向。
   */
  alignment: number;
}

export interface MapData {
  name: string;
  bgName: string;
  type: MapType;
  mapWidth: number;
  mapHeight: number;
  nodeWidth: number;
  nodeHeight: number;
  alignment: number;
  offsetX: number;
  offsetY: number;
  roadDataArr: number[][];
  mapItems: MapItem[];
}

/** Entity / map item; index signature keeps dynamic classDic attributes typed. */
export interface MapItem {
  [key: string]: unknown;
  type: EntityType | 'item';
  className?: string;
  objId?: string | number;
  objName?: string;
  objType?: string | number;
  skin?: string | number;
  x?: number;
  y?: number;
  cx?: number;
  cy?: number;
  params?: string;
  width?: number;
  height?: number;
}

export type EntityType = 'npc' | 'monster' | 'transfer' | 'spawnPoint' | 'obj' | 'prop' | 'event';

export interface AttributeDef {
  attribute: string;
  tip: string;
  type: 'normal' | 'number' | 'bool';
  visible: boolean;
  editable: boolean;
  label: string;
}

export interface UndoAction {
  undo(): void;
  redo(): void;
}

/** Minimal shape of the DOM elements the app binds to. */
export type ToolName = 'road' | 'brush' | 'npc' | 'monster' | 'transfer' | 'spawnPoint'
                      | 'obj' | 'prop' | 'event';
export type ViewName = 'newMap' | 'openMap' | 'setting' | 'miniMap' | 'teach' | 'copyright'
                     | 'sale' | 'about' | 'excel';
export type LayerKey = 'map' | 'road' | 'entity' | 'grid';
