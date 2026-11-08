/** Core-only entry: exposes the pure-logic API on window.WMCore for Node tests. */
import * as Core from './core/index';

// Copy into a plain object (module namespace objects have read-only getters).
const api: Record<string, unknown> = {};
for (const k of Object.keys(Core)) api[k] = (Core as unknown as Record<string, unknown>)[k];

// Backwards-compatible aliases (the original JS core used these names).
api.DEFAULT_ROAD_SETS = Core.defaultRoadSets;
api.MapData = Core.MapDataModel;
api.MapParams = Core.MapParamsModel;

(window as unknown as Record<string, unknown>).WMCore = api;
