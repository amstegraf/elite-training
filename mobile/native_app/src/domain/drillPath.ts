import { DrillResultRecord } from "./types";

export type PathTier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Elite";
export type PathNodeKind = "drill" | "boss" | "chest" | "checkpoint";
export type PathNodeStatus = "locked" | "available" | "current" | "completed";
export type PathNodeIcon = "crosshair" | "crown" | "sparkles" | "medal";

export interface PathUnlockRule {
  requiresChapterId?: string;
  requiresNodeId?: string;
  minStars?: number;
}

export interface PathNodeDefinition {
  id: string;
  title: string;
  kind: PathNodeKind;
  maxStars: 3;
  drillId?: string;
  icon?: PathNodeIcon;
  offsetVariant?: 0 | 1 | 2 | 3 | 4;
  unlock?: PathUnlockRule;
}

export interface PathChapterDefinition {
  id: string;
  tier: PathTier;
  name: string;
  tagline: string;
  order: number;
  unlock?: PathUnlockRule;
  nodes: PathNodeDefinition[];
}

export interface DrillPathDefinition {
  version: number;
  chapters: PathChapterDefinition[];
}

export interface PathNodeProgress extends PathNodeDefinition {
  stars: 0 | 1 | 2 | 3;
  status: PathNodeStatus;
}

export interface PathChapterProgress extends Omit<PathChapterDefinition, "nodes"> {
  nodes: PathNodeProgress[];
  earnedStars: number;
  maxStars: number;
  pct: number;
  locked: boolean;
}

export interface DrillPathProgress {
  version: number;
  chapters: PathChapterProgress[];
  totalStars: number;
  maxStars: number;
  pct: number;
  completedNodes: number;
  currentTier: PathTier;
}

const TIERS: PathTier[] = ["Bronze", "Silver", "Gold", "Platinum", "Elite"];
const KINDS: PathNodeKind[] = ["drill", "boss", "chest", "checkpoint"];
const ICONS: PathNodeIcon[] = ["crosshair", "crown", "sparkles", "medal"];

const toRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const toString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const toNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

function parseUnlockRule(input: unknown): PathUnlockRule | undefined {
  const row = toRecord(input);
  if (!row) return undefined;
  const requiresChapterId = toString(row.requiresChapterId) ?? undefined;
  const requiresNodeId = toString(row.requiresNodeId) ?? undefined;
  const minStarsRaw = toNumber(row.minStars);
  const minStars =
    minStarsRaw === null ? undefined : Math.max(0, Math.round(minStarsRaw));
  if (!requiresChapterId && !requiresNodeId && typeof minStars !== "number") {
    return undefined;
  }
  return { requiresChapterId, requiresNodeId, minStars };
}

function parseNode(input: unknown, idx: number): PathNodeDefinition {
  const row = toRecord(input);
  if (!row) throw new Error(`Path node at index ${idx} must be an object.`);

  const id = toString(row.id);
  const title = toString(row.title);
  const kindRaw = toString(row.kind);
  const maxStarsRaw = toNumber(row.maxStars);
  const drillId = toString(row.drillId) ?? undefined;
  const iconRaw = toString(row.icon);
  const offsetRaw = toNumber(row.offsetVariant);
  const unlock = parseUnlockRule(row.unlock);

  if (!id || !title || !kindRaw) {
    throw new Error(`Path node at index ${idx} must include id/title/kind.`);
  }
  if (!KINDS.includes(kindRaw as PathNodeKind)) {
    throw new Error(`Path node '${id}' has invalid kind '${kindRaw}'.`);
  }
  if ((kindRaw as PathNodeKind) === "drill" && !drillId) {
    throw new Error(`Path drill node '${id}' must include drillId.`);
  }
  const maxStars: 3 = maxStarsRaw === 3 ? 3 : 3;
  const icon =
    iconRaw && ICONS.includes(iconRaw as PathNodeIcon)
      ? (iconRaw as PathNodeIcon)
      : undefined;
  const offsetVariant =
    typeof offsetRaw === "number"
      ? ((Math.max(0, Math.min(4, Math.round(offsetRaw))) as 0 | 1 | 2 | 3 | 4))
      : undefined;

  return {
    id,
    title,
    kind: kindRaw as PathNodeKind,
    maxStars,
    drillId,
    icon,
    offsetVariant,
    unlock,
  };
}

function parseChapter(input: unknown, idx: number): PathChapterDefinition {
  const row = toRecord(input);
  if (!row) throw new Error(`Path chapter at index ${idx} must be an object.`);
  const id = toString(row.id);
  const tierRaw = toString(row.tier);
  const name = toString(row.name);
  const tagline = toString(row.tagline);
  const orderRaw = toNumber(row.order);
  const unlock = parseUnlockRule(row.unlock);
  const nodesRaw = Array.isArray(row.nodes) ? row.nodes : null;

  if (!id || !tierRaw || !name || !tagline || orderRaw === null || !nodesRaw) {
    throw new Error(
      `Path chapter at index ${idx} must include id/tier/name/tagline/order/nodes.`
    );
  }
  if (!TIERS.includes(tierRaw as PathTier)) {
    throw new Error(`Path chapter '${id}' has invalid tier '${tierRaw}'.`);
  }
  if (nodesRaw.length === 0) {
    throw new Error(`Path chapter '${id}' must include at least one node.`);
  }

  return {
    id,
    tier: tierRaw as PathTier,
    name,
    tagline,
    order: Math.max(0, Math.round(orderRaw)),
    unlock,
    nodes: nodesRaw.map(parseNode),
  };
}

export function parseDrillPathDefinition(
  input: unknown,
  knownDrillIds: Set<string>
): DrillPathDefinition {
  const row = toRecord(input);
  if (!row) throw new Error("Drill path payload must be an object.");
  const versionRaw = toNumber(row.version);
  const chaptersRaw = Array.isArray(row.chapters) ? row.chapters : null;
  if (versionRaw === null || !chaptersRaw) {
    throw new Error("Drill path payload must include numeric version and chapters.");
  }

  const chapters = chaptersRaw.map(parseChapter).sort((a, b) => a.order - b.order);
  const chapterIds = new Set<string>();
  const nodeIds = new Set<string>();

  chapters.forEach((chapter) => {
    if (chapterIds.has(chapter.id)) {
      throw new Error(`Duplicate path chapter id '${chapter.id}'.`);
    }
    chapterIds.add(chapter.id);

    if (chapter.unlock?.requiresChapterId && !chapterIds.has(chapter.unlock.requiresChapterId)) {
      throw new Error(
        `Chapter '${chapter.id}' references unknown prior chapter '${chapter.unlock.requiresChapterId}'.`
      );
    }

    chapter.nodes.forEach((node) => {
      if (nodeIds.has(node.id)) {
        throw new Error(`Duplicate path node id '${node.id}'.`);
      }
      nodeIds.add(node.id);

      if (node.drillId && !knownDrillIds.has(node.drillId)) {
        throw new Error(
          `Path node '${node.id}' references unknown drillId '${node.drillId}'.`
        );
      }
      if (node.unlock?.requiresNodeId && !nodeIds.has(node.unlock.requiresNodeId)) {
        throw new Error(
          `Path node '${node.id}' references unknown prior node '${node.unlock.requiresNodeId}'.`
        );
      }
      if (node.unlock?.requiresChapterId && !chapterIds.has(node.unlock.requiresChapterId)) {
        throw new Error(
          `Path node '${node.id}' references unknown chapter '${node.unlock.requiresChapterId}'.`
        );
      }
    });
  });

  return {
    version: Math.max(1, Math.round(versionRaw)),
    chapters,
  };
}

export function deriveDrillPathProgress(
  definition: DrillPathDefinition,
  drillResults: DrillResultRecord[]
): DrillPathProgress {
  const bestStarsByDrillId = new Map<string, 0 | 1 | 2 | 3>();
  drillResults.forEach((result) => {
    const previous = bestStarsByDrillId.get(result.drillId) ?? 0;
    const current = Math.max(previous, result.stars) as 0 | 1 | 2 | 3;
    bestStarsByDrillId.set(result.drillId, current);
  });

  const chapterEarned = new Map<string, number>();
  const completedNodeIds = new Set<string>();
  let currentAssigned = false;
  let earnedStarsSoFar = 0;

  const chapterProgress = definition.chapters.map((chapter) => {
    const chapterUnlock = chapter.unlock;
    const chapterUnlocked =
      (!chapterUnlock?.requiresChapterId ||
        (chapterEarned.get(chapterUnlock.requiresChapterId) ?? 0) > 0) &&
      (!chapterUnlock?.minStars || earnedStarsSoFar >= chapterUnlock.minStars);

    const nodes = chapter.nodes.map((node) => {
      const stars = node.drillId ? bestStarsByDrillId.get(node.drillId) ?? 0 : 0;
      const completed = stars > 0;
      if (completed) completedNodeIds.add(node.id);

      const unlock = node.unlock;
      const unlockedByRules =
        (!unlock?.requiresChapterId ||
          (chapterEarned.get(unlock.requiresChapterId) ?? 0) > 0) &&
        (!unlock?.requiresNodeId || completedNodeIds.has(unlock.requiresNodeId)) &&
        (!unlock?.minStars || earnedStarsSoFar >= unlock.minStars);
      const unlocked = chapterUnlocked && unlockedByRules;

      let status: PathNodeStatus = "locked";
      if (completed) status = "completed";
      else if (unlocked && !currentAssigned) {
        status = "current";
        currentAssigned = true;
      } else if (unlocked) status = "available";

      return { ...node, stars, status };
    });

    const earnedStars = nodes.reduce((sum, node) => sum + node.stars, 0);
    const maxStars = nodes.reduce((sum, node) => sum + node.maxStars, 0);
    const pct = maxStars > 0 ? Math.round((earnedStars / maxStars) * 100) : 0;
    chapterEarned.set(chapter.id, earnedStars);
    earnedStarsSoFar += earnedStars;
    return {
      ...chapter,
      nodes,
      earnedStars,
      maxStars,
      pct,
      locked: nodes.every((node) => node.status === "locked"),
    };
  });

  const allNodes = chapterProgress.flatMap((chapter) => chapter.nodes);
  const totalStars = allNodes.reduce((sum, node) => sum + node.stars, 0);
  const maxStars = allNodes.reduce((sum, node) => sum + node.maxStars, 0);
  const pct = maxStars > 0 ? Math.round((totalStars / maxStars) * 100) : 0;
  const completedNodes = allNodes.filter((node) => node.status === "completed").length;
  const currentChapter =
    chapterProgress.find((chapter) =>
      chapter.nodes.some((node) => node.status === "current")
    ) ??
    chapterProgress.find((chapter) =>
      chapter.nodes.some((node) => node.status !== "completed")
    ) ??
    chapterProgress[chapterProgress.length - 1];

  return {
    version: definition.version,
    chapters: chapterProgress,
    totalStars,
    maxStars,
    pct,
    completedNodes,
    currentTier: currentChapter?.tier ?? "Bronze",
  };
}
