import { PrecisionSession, RackRecord } from "./types";

export interface SessionDerived {
  totalRacks: number;
  totalBallsCleared: number;
  racksCompleted: number;
  potMissCount: number;
  positionRelatedMisses: number;
}

export interface GlobalMetrics {
  potRate: number | null;
  positionRate: number | null;
  rackConversionRate: number | null;
  potMade: number;
  potAttempts: number;
  positionMisses: number;
  positionCleared: number;
  racksCompleted: number;
  totalRacks: number;
}

export const isoNow = (): string => new Date().toISOString();
export const uid = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function missBreaksRun(outcome: string): boolean {
  return outcome === "pot_miss";
}

export function inferBallsCleared(rack: RackRecord): number {
  if (typeof rack.ballsCleared === "number") return rack.ballsCleared;
  const breaking = rack.misses
    .filter((m) => missBreaksRun(m.outcome))
    .map((m) => m.ballNumber);
  if (breaking.length > 0) return Math.max(0, Math.min(9, Math.min(...breaking) - 1));
  return 9;
}

export function deriveSession(session: PrecisionSession): SessionDerived {
  const endedRacks = session.racks.filter((r) => r.endedAt);
  let totalBallsCleared = 0;
  let racksCompleted = 0;
  let potMissCount = 0;
  let positionRelatedMisses = 0;

  endedRacks.forEach((r) => {
    const bc = inferBallsCleared(r);
    totalBallsCleared += bc;
    if (bc >= 9) racksCompleted += 1;
    r.misses.forEach((m) => {
      if (m.outcome === "pot_miss") potMissCount += 1;
      if (
        m.outcome === "no_shot_position" ||
        m.types.includes("position") ||
        m.types.includes("speed")
      ) {
        positionRelatedMisses += 1;
      }
    });
  });

  return {
    totalRacks: endedRacks.length,
    totalBallsCleared,
    racksCompleted,
    potMissCount,
    positionRelatedMisses,
  };
}

export function computeGlobalMetrics(sessions: PrecisionSession[]): GlobalMetrics {
  const done = sessions.filter((s) => s.status === "completed");
  let potMade = 0;
  let potAttempts = 0;
  let positionMisses = 0;
  let positionCleared = 0;
  let racksCompleted = 0;
  let totalRacks = 0;

  done.forEach((s) => {
    const d = deriveSession(s);
    potMade += d.totalBallsCleared;
    potAttempts += d.totalBallsCleared + d.potMissCount;
    positionMisses += d.positionRelatedMisses;
    positionCleared += d.totalBallsCleared;
    racksCompleted += d.racksCompleted;
    totalRacks += d.totalRacks;
  });

  const potRate = potAttempts > 0 ? potMade / potAttempts : null;
  const rawPos = positionCleared > 0 ? 1 - positionMisses / positionCleared : null;
  const positionRate = rawPos === null ? null : Math.max(0, Math.min(1, rawPos));
  const rackConversionRate = totalRacks > 0 ? racksCompleted / totalRacks : null;

  return {
    potRate,
    positionRate,
    rackConversionRate,
    potMade,
    potAttempts,
    positionMisses,
    positionCleared,
    racksCompleted,
    totalRacks,
  };
}

export function baselineComparison(
  sessions: PrecisionSession[],
  days = 30
): {
  potDiff: number | null;
  posDiff: number | null;
  convDiff: number | null;
} {
  const done = sessions
    .filter((s) => s.status === "completed")
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  if (done.length === 0) return { potDiff: null, posDiff: null, convDiff: null };

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const baseline = done.filter((s) => new Date(s.startedAt) <= cutoff);
  const baselineSessions = baseline.length > 0 ? baseline : [done[0]];

  const current = computeGlobalMetrics(done);
  const old = computeGlobalMetrics(baselineSessions);

  const diff = (a: number | null, b: number | null): number | null =>
    a === null || b === null ? null : (a - b) * 100;

  return {
    potDiff: diff(current.potRate, old.potRate),
    posDiff: diff(current.positionRate, old.positionRate),
    convDiff: diff(current.rackConversionRate, old.rackConversionRate),
  };
}
