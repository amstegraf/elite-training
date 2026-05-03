import { describe, expect, it } from "vitest";
import {
  baselineComparison,
  computeGlobalMetrics,
  currentTrainingStreak,
  deriveSession,
  monthHeatmapData,
  progressionSeries,
} from "./metrics";
import { computeTier } from "./tier";
import { PrecisionSession } from "./types";
import { DEFAULT_TIER_SETTINGS } from "./types";

function mkSession(id: string, startedAt: string, ballsCleared: number, potMiss = 0): PrecisionSession {
  return {
    id,
    profileId: "p1",
    startedAt,
    status: "completed",
    racks: [
      {
        id: `r-${id}`,
        rackNumber: 1,
        startedAt,
        endedAt: startedAt,
        ballsCleared,
        misses: Array.from({ length: potMiss }, (_, i) => ({
          id: `m-${id}-${i}`,
          ballNumber: i + 1,
          types: ["alignment"],
          outcome: "pot_miss",
          createdAt: startedAt,
        })),
      },
    ],
  };
}

describe("metrics parity", () => {
  it("derives session aggregates", () => {
    const s = mkSession("a", "2026-01-01T00:00:00.000Z", 8, 2);
    const d = deriveSession(s);
    expect(d.totalBallsCleared).toBe(8);
    expect(d.potMissCount).toBe(2);
    expect(d.totalRacks).toBe(1);
  });

  it("computes weighted global rates", () => {
    const m = computeGlobalMetrics([
      mkSession("a", "2026-01-01T00:00:00.000Z", 9, 1),
      mkSession("b", "2026-01-02T00:00:00.000Z", 8, 2),
    ]);
    expect(m.potAttempts).toBe(20);
    expect(m.potMade).toBe(17);
    expect(m.potRate).toBeCloseTo(0.85, 5);
  });

  it("compares against 30-day or oldest baseline", () => {
    const out = baselineComparison([
      mkSession("old", "2026-01-01T00:00:00.000Z", 9, 0),
      mkSession("new", new Date().toISOString(), 6, 3),
    ]);
    expect(out.potDiff).not.toBeNull();
  });

  it("builds month heatmap counts and streak", () => {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(now.getUTCDate()).padStart(2, "0");
    const dayKey = `${yyyy}-${mm}-${dd}`;
    const s1 = mkSession("m1", `${dayKey}T10:00:00.000Z`, 9, 0);
    const s2 = mkSession("m2", `${dayKey}T18:00:00.000Z`, 8, 1);
    const month = monthHeatmapData([s1, s2], now);
    expect(month.totalSessions).toBe(2);
    expect(month.totalDaysTrained).toBe(1);
    expect(currentTrainingStreak([s1, s2], now)).toBeGreaterThanOrEqual(1);
  });

  it("generates progression points for selected range", () => {
    const sessions = [
      mkSession("a", "2026-01-01T00:00:00.000Z", 4, 3),
      mkSession("b", "2026-01-10T00:00:00.000Z", 6, 2),
      mkSession("c", "2026-01-20T00:00:00.000Z", 8, 1),
      mkSession("d", "2026-01-30T00:00:00.000Z", 9, 0),
    ];
    const points = progressionSeries(sessions, 3650, (g) => {
      const tier = computeTier(g.potRate, g.positionRate, g.rackConversionRate, DEFAULT_TIER_SETTINGS);
      return tier?.points ?? 0;
    });
    expect(points.length).toBeGreaterThanOrEqual(2);
    expect(points.at(-1)?.pts ?? 0).toBeGreaterThanOrEqual(points[0]?.pts ?? 0);
  });
});
