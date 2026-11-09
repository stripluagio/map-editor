import type { AttributeDef, EntityType } from './types';

/** AttributeUtils.classDic — exact schema order and visibility. */
function attr(attribute: string, tip: string, type: AttributeDef['type'] = 'normal',
              visible = true, editable = true, label?: string): AttributeDef {
  return { attribute, tip, type, visible, editable, label: label || tip };
}

const BASE: AttributeDef[] = [
  attr('objId', '物体Id'), attr('objName', '物体名称'), attr('objType', '物体类型'),
  attr('skin', '物体皮肤'), attr('x', 'x坐标', 'number'), attr('y', 'y坐标', 'number'),
  attr('cx', '世界坐标x轴', 'number', false), attr('cy', '世界坐标y轴', 'number', false),
  attr('params', '自定义参数'),
];

export const CLASS_DIC: Record<string, AttributeDef[]> = {
  EditorElement: BASE.slice(),
  EditorNPC: BASE.concat([
    attr('direction', '角色方向,值的范围为 0-7', 'number'),
    attr('npcType', 'npc类型', 'number', false, false),
    attr('isPatrol', '是否巡逻', 'bool'),
    attr('dialogueId', '对话Id,用于npc的对话内容', 'number', true, true, '对话Id'),
    attr('taskId', '用于npc发布任务', 'number', true, true, '任务Id'),
    attr('funcId', '用于识别npc具备什么功能', 'number', true, true, '功能Id'),
  ]),
  EditorMonster: BASE.concat([
    attr('direction', '角色方向,值的范围为 0-7', 'number'),
    attr('monsterType', 'monster类型', 'number', false, false),
    attr('isPatrol', '是否巡逻', 'bool'),
    attr('dialogueId', '对话Id,用于怪物的对话内容', 'number', true, true, '对话Id'),
    attr('fightId', '在需要跳转到战斗副本时使用', 'number', true, true, '战斗Id'),
  ]),
  EditorTransfer: BASE.concat([
    attr('targetMapId', '传送到目标地图Id', 'normal', true, true, '目标地图Id'),
    attr('targetMapSpawnId', '目标地图的出生点Id', 'number', true, true, '目标出生点Id'),
    attr('transferType', 'transfer类型', 'number', false, false),
  ]),
  EditorSpawnPoint: BASE.concat([
    attr('spawnId', '在当前地图出生点的Id', 'number', true, true, '地图出生点Id'),
    attr('defaultSpawn', '设置是否是默认出生点', 'bool', true, true, '默认出生点'),
  ]),
  // v2.0.2 新增的三种放置类型。`EditorObjElement` / `EditorEventObjElement`
  // 在原版里就是 `baseAttributes.concat([])` —— 一个字段都不加，靠 `objName` /
  // `assetsPath` 区分具体资源；只有道具多了「是否宝箱 / 道具id / 道具数量」。
  EditorObjElement: BASE.slice(),
  EditorPropElement: BASE.concat([
    attr('isTreasure', '是否是宝箱', 'bool', true, true, '是否是宝箱'),
    attr('itemId', '拾取到的道具id', 'number', true, true, '道具id'),
    attr('itemNum', '拾取到的道具数量', 'number', true, true, '道具数量'),
  ]),
  EditorEventObjElement: BASE.slice(),
};

export const TYPE_TO_CLASS: Record<string, string> = {
  npc: 'EditorNPC', monster: 'EditorMonster',
  transfer: 'EditorTransfer', spawnPoint: 'EditorSpawnPoint',
  obj: 'EditorObjElement', prop: 'EditorPropElement', event: 'EditorEventObjElement',
};

export const ENTITY_TYPES: EntityType[] = [
  'npc', 'monster', 'transfer', 'spawnPoint', 'obj', 'prop', 'event',
];

export function schemaFor(entity: { className?: string } | null): AttributeDef[] {
  return CLASS_DIC[entity?.className || 'EditorElement'] || CLASS_DIC.EditorElement;
}
