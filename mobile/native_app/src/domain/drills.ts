export type DrillPocket =
  | "top_left"
  | "top_middle"
  | "top_right"
  | "bottom_left"
  | "bottom_middle"
  | "bottom_right";

export type DrillDifficulty = 1 | 2 | 3;

export interface DrillTable {
  type: string;
  coordinateSystem: {
    origin: "bottom_left" | "top_left";
    width: number;
    height: number;
  };
}

export interface DrillBall {
  id: string;
  type: "cue" | "object";
  number?: number;
  x: number;
  y: number;
  targetPocket?: DrillPocket;
}

export interface DrillRules {
  order: string[];
  attemptLimit: number;
  successCondition: string;
}

export interface DrillMetadata {
  createdBy: string;
  isPublic: boolean;
  version: number;
  estMinutes?: number;
  focus?: string[];
  objective?: string;
  goal?: string;
  hue?: number;
}

export interface DrillDefinition {
  id: string;
  name: string;
  difficulty: DrillDifficulty;
  category: string;
  description: string;
  table: DrillTable;
  balls: DrillBall[];
  rules: DrillRules;
  metadata: DrillMetadata;
}

export interface DrillListItem {
  id: string;
  name: string;
  difficulty: DrillDifficulty;
  category: string;
  attemptLimit: number;
  estMinutes: number;
  hue: number;
}

const toRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const toString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const toNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const toBoolean = (value: unknown): boolean | null =>
  typeof value === "boolean" ? value : null;

const POCKETS: DrillPocket[] = [
  "top_left",
  "top_middle",
  "top_right",
  "bottom_left",
  "bottom_middle",
  "bottom_right",
];

function parseBall(ball: unknown, idx: number): DrillBall {
  const row = toRecord(ball);
  if (!row) throw new Error(`Ball at index ${idx} must be an object.`);
  const id = toString(row.id);
  const type = toString(row.type);
  const x = toNumber(row.x);
  const y = toNumber(row.y);
  if (!id) throw new Error(`Ball at index ${idx} is missing id.`);
  if (type !== "cue" && type !== "object") {
    throw new Error(`Ball '${id}' must have type 'cue' or 'object'.`);
  }
  if (x === null || y === null) {
    throw new Error(`Ball '${id}' must include numeric x/y coordinates.`);
  }
  const number = toNumber(row.number);
  const pocket = toString(row.targetPocket);
  return {
    id,
    type,
    number: number === null ? undefined : Math.round(number),
    x,
    y,
    targetPocket:
      pocket && POCKETS.includes(pocket as DrillPocket)
        ? (pocket as DrillPocket)
        : undefined,
  };
}

export function parseDrillDefinition(input: unknown): DrillDefinition {
  const row = toRecord(input);
  if (!row) throw new Error("Drill entry must be an object.");

  const id = toString(row.id);
  const name = toString(row.name);
  const category = toString(row.category);
  const description = toString(row.description);
  const difficultyRaw = toNumber(row.difficulty);
  if (!id || !name || !category || !description) {
    throw new Error("Drill must include id, name, category and description.");
  }
  const difficulty: DrillDifficulty =
    difficultyRaw === 1 || difficultyRaw === 2 || difficultyRaw === 3
      ? difficultyRaw
      : 1;

  const table = toRecord(row.table);
  const coordinateSystem = table ? toRecord(table.coordinateSystem) : null;
  const tableType = table ? toString(table.type) : null;
  const origin = coordinateSystem ? toString(coordinateSystem.origin) : null;
  const width = coordinateSystem ? toNumber(coordinateSystem.width) : null;
  const height = coordinateSystem ? toNumber(coordinateSystem.height) : null;
  if (!table || !coordinateSystem || !tableType || !origin || !width || !height) {
    throw new Error(`Drill '${id}' has an invalid table definition.`);
  }
  if (origin !== "bottom_left" && origin !== "top_left") {
    throw new Error(`Drill '${id}' coordinate origin must be bottom_left or top_left.`);
  }

  const ballsRaw = Array.isArray(row.balls) ? row.balls : null;
  if (!ballsRaw || ballsRaw.length === 0) {
    throw new Error(`Drill '${id}' must include balls.`);
  }
  const balls = ballsRaw.map(parseBall);

  const cueBalls = balls.filter((ball) => ball.type === "cue");
  const objectBalls = balls.filter((ball) => ball.type === "object");
  if (cueBalls.length !== 1) {
    throw new Error(`Drill '${id}' must include exactly one cue ball.`);
  }
  if (objectBalls.length < 1) {
    throw new Error(`Drill '${id}' must include at least one object ball.`);
  }

  const rules = toRecord(row.rules);
  const orderRaw = rules && Array.isArray(rules.order) ? rules.order : null;
  const attemptLimitRaw = rules ? toNumber(rules.attemptLimit) : null;
  const successCondition = rules ? toString(rules.successCondition) : null;
  if (!rules || !orderRaw || orderRaw.length === 0 || !attemptLimitRaw || !successCondition) {
    throw new Error(`Drill '${id}' has invalid rules.`);
  }
  const order = orderRaw
    .map((item) => toString(item))
    .filter((item): item is string => Boolean(item));
  if (order.length === 0) {
    throw new Error(`Drill '${id}' rules.order cannot be empty.`);
  }
  const objectIds = new Set(objectBalls.map((ball) => ball.id));
  order.forEach((ballId) => {
    if (!objectIds.has(ballId)) {
      throw new Error(`Drill '${id}' rules.order references unknown ball '${ballId}'.`);
    }
  });

  const metadataRaw = toRecord(row.metadata) ?? {};
  const metadata: DrillMetadata = {
    createdBy: toString(metadataRaw.createdBy) ?? "admin",
    isPublic: toBoolean(metadataRaw.isPublic) ?? true,
    version: Math.max(1, Math.round(toNumber(metadataRaw.version) ?? 1)),
    estMinutes: Math.max(1, Math.round(toNumber(metadataRaw.estMinutes) ?? 8)),
    focus: Array.isArray(metadataRaw.focus)
      ? metadataRaw.focus.map((item) => toString(item)).filter((item): item is string => Boolean(item))
      : [],
    objective: toString(metadataRaw.objective) ?? undefined,
    goal: toString(metadataRaw.goal) ?? undefined,
    hue: Math.max(0, Math.min(360, Math.round(toNumber(metadataRaw.hue) ?? 280))),
  };

  return {
    id,
    name,
    difficulty,
    category,
    description,
    table: {
      type: tableType,
      coordinateSystem: {
        origin,
        width,
        height,
      },
    },
    balls,
    rules: {
      order,
      attemptLimit: Math.max(1, Math.round(attemptLimitRaw)),
      successCondition,
    },
    metadata,
  };
}

export function toDrillListItem(drill: DrillDefinition): DrillListItem {
  return {
    id: drill.id,
    name: drill.name,
    difficulty: drill.difficulty,
    category: drill.category,
    attemptLimit: drill.rules.attemptLimit,
    estMinutes: drill.metadata.estMinutes ?? 8,
    hue: drill.metadata.hue ?? 280,
  };
}
