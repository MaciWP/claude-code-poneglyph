import { describe, test, expect } from "bun:test";
import {
  mineSpawnSuccessPatterns,
  toExpertiseBucket,
  type SpawnRecord,
  type SpawnScoreRecord,
} from "./pattern-learning-spawn";

describe("toExpertiseBucket", () => {
  test("buckets", () => {
    expect(toExpertiseBucket(0)).toBe("none");
    expect(toExpertiseBucket(500)).toBe("small");
    expect(toExpertiseBucket(1000)).toBe("small");
    expect(toExpertiseBucket(1001)).toBe("medium");
    expect(toExpertiseBucket(5000)).toBe("medium");
    expect(toExpertiseBucket(5001)).toBe("large");
  });
});

describe("mineSpawnSuccessPatterns", () => {
  test("only emits combos with >= 3 samples", () => {
    const spawns: SpawnRecord[] = [
      {
        sessionId: "s1",
        agentType: "builder",
        expertiseBytes: 500,
        skillsInjected: ["a", "b"],
      },
      {
        sessionId: "s2",
        agentType: "builder",
        expertiseBytes: 600,
        skillsInjected: ["b", "a"],
      },
      {
        sessionId: "s3",
        agentType: "builder",
        expertiseBytes: 900,
        skillsInjected: ["a", "b"],
      },
      {
        sessionId: "s4",
        agentType: "builder",
        expertiseBytes: 900,
        skillsInjected: ["c"],
      },
    ];
    const scores: SpawnScoreRecord[] = [
      { sessionId: "s1", agentType: "builder", success: true },
      { sessionId: "s2", agentType: "builder", success: true },
      { sessionId: "s3", agentType: "builder", success: false },
      { sessionId: "s4", agentType: "builder", success: true },
    ];

    const patterns = mineSpawnSuccessPatterns(spawns, scores);
    expect(patterns).toHaveLength(1);
    expect(patterns[0].agentType).toBe("builder");
    expect(patterns[0].skillCombo).toEqual(["a", "b"]);
    expect(patterns[0].expertiseBucket).toBe("small");
    expect(patterns[0].sampleSize).toBe(3);
    expect(patterns[0].successRate).toBeCloseTo(2 / 3);
  });

  test("joins by sessionId + agentType (ignores unmatched spawns)", () => {
    const spawns: SpawnRecord[] = [
      {
        sessionId: "s1",
        agentType: "builder",
        expertiseBytes: 0,
        skillsInjected: [],
      },
      {
        sessionId: "s1",
        agentType: "reviewer",
        expertiseBytes: 0,
        skillsInjected: [],
      },
    ];
    const scores: SpawnScoreRecord[] = [
      { sessionId: "s1", agentType: "builder", success: true },
    ];
    const patterns = mineSpawnSuccessPatterns(spawns, scores, 1);
    expect(patterns).toHaveLength(1);
    expect(patterns[0].agentType).toBe("builder");
    expect(patterns[0].expertiseBucket).toBe("none");
  });

  test("separates by expertise bucket", () => {
    const mk = (session: string, bytes: number): SpawnRecord => ({
      sessionId: session,
      agentType: "scout",
      expertiseBytes: bytes,
      skillsInjected: ["x"],
    });
    const spawns: SpawnRecord[] = [
      mk("a", 100),
      mk("b", 200),
      mk("c", 300),
      mk("d", 2000),
      mk("e", 3000),
      mk("f", 4000),
    ];
    const scores: SpawnScoreRecord[] = spawns.map((s) => ({
      sessionId: s.sessionId,
      agentType: s.agentType,
      success: true,
    }));
    const patterns = mineSpawnSuccessPatterns(spawns, scores);
    const buckets = patterns.map((p) => p.expertiseBucket).sort();
    expect(buckets).toEqual(["medium", "small"]);
  });
});
