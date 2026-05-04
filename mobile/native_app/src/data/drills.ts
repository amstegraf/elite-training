import { DrillDefinition, DrillListItem, parseDrillDefinition, toDrillListItem } from "../domain/drills";

let cachedDrills: DrillDefinition[] | null = null;

function loadRawDrills(): unknown[] {
  const payload = require("./drills/drills.json") as unknown;
  if (!Array.isArray(payload)) {
    throw new Error("Drills JSON must be an array.");
  }
  return payload;
}

function ensureDrillsLoaded(): DrillDefinition[] {
  if (cachedDrills) return cachedDrills;
  const parsed = loadRawDrills().map((entry) => parseDrillDefinition(entry));
  cachedDrills = parsed;
  return parsed;
}

export function listDrills(): DrillListItem[] {
  return ensureDrillsLoaded().map((drill) => toDrillListItem(drill));
}

export function getDrillById(drillId: string): DrillDefinition | null {
  return ensureDrillsLoaded().find((drill) => drill.id === drillId) ?? null;
}
