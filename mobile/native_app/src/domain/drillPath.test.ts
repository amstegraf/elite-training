import { describe, expect, it } from "vitest";
import { deriveDrillPathProgress, parseDrillPathDefinition } from "./drillPath";
import { DrillResultRecord } from "./types";

const knownDrillIds = new Set(["drill_a", "drill_b", "drill_c"]);

const basePayload = {
  version: 1,
  chapters: [
    {
      id: "c1",
      tier: "Bronze",
      name: "Bronze Path",
      tagline: "Start",
      order: 1,
      nodes: [
        { id: "n1", title: "First", kind: "drill", drillId: "drill_a", maxStars: 3 },
        {
          id: "n2",
          title: "Second",
          kind: "drill",
          drillId: "drill_b",
          maxStars: 3,
          unlock: { requiresNodeId: "n1" },
        },
      ],
    },
    {
      id: "c2",
      tier: "Silver",
      name: "Silver Path",
      tagline: "Continue",
      order: 2,
      unlock: { requiresChapterId: "c1", minStars: 2 },
      nodes: [{ id: "n3", title: "Third", kind: "drill", drillId: "drill_c", maxStars: 3 }],
    },
  ],
};

describe("drillPath domain", () => {
  it("validates unknown drill references", () => {
    const payload = {
      ...basePayload,
      chapters: [
        {
          ...basePayload.chapters[0],
          nodes: [{ id: "x", title: "X", kind: "drill", drillId: "missing_drill", maxStars: 3 }],
        },
      ],
    };
    expect(() => parseDrillPathDefinition(payload, knownDrillIds)).toThrow(/unknown drillId/i);
  });

  it("derives node statuses and current node from results", () => {
    const definition = parseDrillPathDefinition(basePayload, knownDrillIds);
    const results: DrillResultRecord[] = [
      {
        id: "r1",
        profileId: "p1",
        drillId: "drill_a",
        drillName: "First",
        attempts: 5,
        completed: 3,
        stars: 2,
        durationSeconds: 300,
        successPct: 60,
        finishedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const progress = deriveDrillPathProgress(definition, results);
    const [chapter1, chapter2] = progress.chapters;

    expect(chapter1.nodes[0].status).toBe("completed");
    expect(chapter1.nodes[1].status).toBe("current");
    expect(chapter2.nodes[0].status).toBe("available");
    expect(progress.totalStars).toBe(2);
    expect(progress.currentTier).toBe("Bronze");
  });
});
