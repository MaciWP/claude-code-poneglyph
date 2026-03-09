import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import {
  loadTrust,
  saveTrust,
  getTrust,
  updateAfterSession,
  setTrustFilePath,
  resetTrustFilePath,
  checkPromotion,
  demote,
  classifyFailure,
  determineOversight,
  checkInactivity,
} from "./agent-trust";
import type { AgentTrust } from "./agent-trust";

function makeTrust(overrides: Partial<AgentTrust> = {}): AgentTrust {
  return {
    agent: "builder",
    taskType: "implementation",
    level: 0,
    score: 50,
    consecutiveSuccesses: 0,
    consecutiveFailures: 0,
    totalSessions: 0,
    criticalFailuresInLast50: 0,
    lastActivity: new Date().toISOString(),
    history: [],
    ...overrides,
  };
}

let tempFile: string;

beforeEach(() => {
  const dir = join(tmpdir(), "agent-trust-test-" + Date.now());
  mkdirSync(dir, { recursive: true });
  tempFile = join(dir, "agent-trust.jsonl");
  setTrustFilePath(tempFile);
});

afterEach(() => {
  try {
    if (existsSync(tempFile)) unlinkSync(tempFile);
  } catch {
    // cleanup best effort
  }
  resetTrustFilePath();
});

describe("agent-trust", () => {
  it("new agent starts at Level 0", () => {
    const result = getTrust("builder", "implementation");
    expect(result).toBeNull();

    const trust = updateAfterSession("builder", "implementation", true);
    expect(trust.level).toBe(0);
    expect(trust.totalSessions).toBe(1);
  });

  it("success increments consecutiveSuccesses", () => {
    const trust = updateAfterSession("builder", "implementation", true);
    expect(trust.consecutiveSuccesses).toBe(1);
    expect(trust.consecutiveFailures).toBe(0);
  });

  it("failure resets consecutiveSuccesses", () => {
    updateAfterSession("builder", "implementation", true);
    updateAfterSession("builder", "implementation", true);
    updateAfterSession("builder", "implementation", true);
    updateAfterSession("builder", "implementation", true);
    const trust = updateAfterSession(
      "builder",
      "implementation",
      false,
      "major",
    );
    expect(trust.consecutiveSuccesses).toBe(0);
    expect(trust.consecutiveFailures).toBe(1);
  });

  it("promotes 0 to 1 after 5 successes with score > 60", () => {
    const trust = makeTrust({
      consecutiveSuccesses: 4,
      score: 65,
    });

    trust.consecutiveSuccesses = 5;

    const result = checkPromotion(trust);
    expect(result.shouldPromote).toBe(true);
    expect(result.newLevel).toBe(1);
  });

  it("promotes 1 to 2 after 15 successes with score > 75", () => {
    const trust = makeTrust({
      level: 1,
      consecutiveSuccesses: 15,
      score: 80,
    });

    const result = checkPromotion(trust);
    expect(result.shouldPromote).toBe(true);
    expect(result.newLevel).toBe(2);
  });

  it("promotes 2 to 3 with 30 successes, score > 85, 0 critical", () => {
    const trust = makeTrust({
      level: 2,
      consecutiveSuccesses: 30,
      score: 90,
      criticalFailuresInLast50: 0,
    });

    const result = checkPromotion(trust);
    expect(result.shouldPromote).toBe(true);
    expect(result.newLevel).toBe(3);
  });

  it("blocks promotion 2 to 3 when critical failures exist", () => {
    const trust = makeTrust({
      level: 2,
      consecutiveSuccesses: 30,
      score: 90,
      criticalFailuresInLast50: 1,
    });

    const result = checkPromotion(trust);
    expect(result.shouldPromote).toBe(false);
    expect(result.newLevel).toBe(2);
  });

  it("critical failure demotes to Level 0", () => {
    const trust = makeTrust({ level: 2, score: 85 });
    const result = updateAfterSession(
      trust.agent,
      trust.taskType,
      false,
      "critical",
    );

    saveTrust([trust]);

    const directDemote = demote(
      makeTrust({ level: 2, score: 85 }),
      "critical_failure",
    );
    expect(directDemote.level).toBe(0);
    expect(directDemote.history).toHaveLength(1);
    expect(directDemote.history[0].action).toBe("demoted");
  });

  it("2 consecutive major failures demote 1 level", () => {
    saveTrust([makeTrust({ level: 2, score: 85 })]);

    updateAfterSession("builder", "implementation", false, "major");
    const trust = updateAfterSession(
      "builder",
      "implementation",
      false,
      "major",
    );

    expect(trust.level).toBe(1);
    expect(trust.consecutiveFailures).toBe(2);
  });

  it("score below threshold demotes 1 level", () => {
    saveTrust([
      makeTrust({
        level: 2,
        score: 72,
        consecutiveSuccesses: 0,
        consecutiveFailures: 0,
      }),
    ]);

    const trust = updateAfterSession(
      "builder",
      "implementation",
      false,
      "major",
    );

    expect(trust.level).toBeLessThan(2);
  });

  it("oversight at Level 0 requires all protections", () => {
    const trust = makeTrust({ level: 0 });
    const oversight = determineOversight(trust);

    expect(oversight.useWorktree).toBe(true);
    expect(oversight.requireReviewer).toBe(true);
    expect(oversight.requireUserConfirmation).toBe(true);
    expect(oversight.validationMode).toBe("strict");
  });

  it("oversight at Level 3 has minimal requirements", () => {
    const trust = makeTrust({ level: 3 });
    const oversight = determineOversight(trust);

    expect(oversight.useWorktree).toBe(false);
    expect(oversight.requireReviewer).toBe(false);
    expect(oversight.requireUserConfirmation).toBe(false);
    expect(oversight.validationMode).toBe("light");
    expect(oversight.spotCheck).toBe(true);
  });

  it("inactivity caps trust at Level 1", () => {
    const thirtyOneDaysAgo = new Date();
    thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

    const trust = makeTrust({
      level: 3,
      lastActivity: thirtyOneDaysAgo.toISOString(),
    });

    const result = checkInactivity(trust);
    expect(result.level).toBe(1);
    expect(result.history).toHaveLength(1);
    expect(result.history[0].action).toBe("demoted");
  });

  it("JSONL round-trip preserves trust data", () => {
    const records: AgentTrust[] = [
      makeTrust({
        agent: "builder",
        taskType: "implementation",
        level: 2,
        score: 82,
        consecutiveSuccesses: 18,
        totalSessions: 45,
      }),
      makeTrust({
        agent: "reviewer",
        taskType: "review",
        level: 1,
        score: 65,
      }),
    ];

    saveTrust(records);
    const loaded = loadTrust();

    expect(loaded).toHaveLength(2);
    expect(loaded[0].agent).toBe("builder");
    expect(loaded[0].level).toBe(2);
    expect(loaded[0].score).toBe(82);
    expect(loaded[0].consecutiveSuccesses).toBe(18);
    expect(loaded[1].agent).toBe("reviewer");
    expect(loaded[1].level).toBe(1);
  });
});

describe("classifyFailure", () => {
  it("minor has -1 penalty and no demotion", () => {
    const result = classifyFailure("minor");
    expect(result.scorePenalty).toBe(-1);
    expect(result.demotionAction).toBe("none");
  });

  it("major has -5 penalty", () => {
    const result = classifyFailure("major");
    expect(result.scorePenalty).toBe(-5);
  });

  it("critical has -15 penalty and immediate demotion", () => {
    const result = classifyFailure("critical");
    expect(result.scorePenalty).toBe(-15);
    expect(result.demotionAction).toBe("immediate_level_0");
  });
});
