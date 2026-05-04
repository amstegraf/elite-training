import {
  DrillPathDefinition,
  DrillPathProgress,
  deriveDrillPathProgress,
  parseDrillPathDefinition,
} from "../domain/drillPath";
import { DrillResultRecord } from "../domain/types";
import { listDrills } from "./drills";

let cachedPath: DrillPathDefinition | null = null;

function loadRawPath(): unknown {
  return require("./drills/path.json") as unknown;
}

export function getDrillPathDefinition(): DrillPathDefinition {
  if (cachedPath) return cachedPath;
  const drillIds = new Set(listDrills().map((drill) => drill.id));
  const parsed = parseDrillPathDefinition(loadRawPath(), drillIds);
  cachedPath = parsed;
  return parsed;
}

export function getDrillPathProgress(
  drillResults: DrillResultRecord[]
): DrillPathProgress {
  return deriveDrillPathProgress(getDrillPathDefinition(), drillResults);
}
