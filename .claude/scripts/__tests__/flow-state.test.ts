import { describe, test, expect } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  closeUs,
  approveGate,
  setVerdict,
  closeFeature,
  flipUsFrontmatter,
  runCommand,
  type FlowState,
} from "../flow-state";

const DATE = "2026-06-11";

function baseState(): FlowState {
  return {
    spec_slug: "099-fixture",
    mode: "standard",
    current_phase: 3,
    phases_completed: [1, 2, 2.5],
    gates_approved: { "1->2": true, "2->3": false },
    us_completed: [],
    us_pending: ["US1", "US2"],
    feature_closed: false,
    review_verdict: null,
    retro_status: null,
    started_at: DATE,
    updated_at: DATE,
  };
}

describe("closeUs", () => {
  test("moves US from pending to completed and appends history", () => {
    const s = closeUs(baseState(), "US1", { date: DATE, files: ["a.md"] });
    expect(s.us_completed).toContain("US1");
    expect(s.us_pending).not.toContain("US1");
    expect(s.us_history?.at(-1)).toMatchObject({ us: "US1", completed_at: DATE, tests_passed: true });
  });

  test("throws on US not in pending", () => {
    expect(() => closeUs(baseState(), "US9", { date: DATE })).toThrow(/not pending/);
  });
});

describe("approveGate", () => {
  test("2->3 sets flag and advances phase to 3", () => {
    const s = approveGate(baseState(), "2->3");
    expect(s.gates_approved["2->3"]).toBe(true);
    expect(s.current_phase).toBe(3);
  });

  test("unknown gate throws", () => {
    // @ts-expect-error invalid gate on purpose
    expect(() => approveGate(baseState(), "3->4")).toThrow(/gate/i);
  });
});

describe("setVerdict / closeFeature", () => {
  test("APPROVED verdict advances to phase 5 and completes phases 3,4", () => {
    const s = setVerdict({ ...baseState(), us_pending: [] }, "APPROVED");
    expect(s.review_verdict).toBe("APPROVED");
    expect(s.current_phase).toBe(5);
    expect(s.phases_completed).toContain(4);
  });

  test("invalid verdict throws", () => {
    expect(() => setVerdict(baseState(), "MAYBE")).toThrow(/verdict/i);
  });

  test("closeFeature flips terminal flags", () => {
    const s = closeFeature({ ...baseState(), us_pending: [] }, { date: DATE });
    expect(s.feature_closed).toBe(true);
    expect(s.retro_status).toBe("approved");
    expect(s.current_phase).toBe("closed");
    expect(s.phases_completed).toContain(5);
  });
});

describe("flipUsFrontmatter", () => {
  const doc = ["---", "us: US1", "status: approved", "---", "", "# US1"].join("\n");

  test("approved → closed with closed date", () => {
    const out = flipUsFrontmatter(doc, DATE);
    expect(out).toContain("status: closed");
    expect(out).toContain(`closed: ${DATE}`);
  });

  test("already closed → unchanged", () => {
    const closed = flipUsFrontmatter(doc, DATE);
    expect(flipUsFrontmatter(closed, "2026-12-31")).toBe(closed);
  });
});

describe("runCommand (integration, tmpdir)", () => {
  test("close-us updates state.json and US frontmatter on disk", async () => {
    const plan = mkdtempSync(join(tmpdir(), "flow-state-"));
    mkdirSync(join(plan, "tasks"));
    writeFileSync(join(plan, "state.json"), JSON.stringify(baseState(), null, 2));
    writeFileSync(join(plan, "tasks", "US1.md"), ["---", "us: US1", "status: approved", "---"].join("\n"));

    await runCommand("close-us", ["US1"], { planDir: plan, date: DATE });

    const state = JSON.parse(readFileSync(join(plan, "state.json"), "utf8"));
    expect(state.us_completed).toContain("US1");
    expect(state.updated_at).toBe(DATE);
    expect(readFileSync(join(plan, "tasks", "US1.md"), "utf8")).toContain("status: closed");
  });

  test("malformed state.json fails loudly", async () => {
    const plan = mkdtempSync(join(tmpdir(), "flow-state-bad-"));
    writeFileSync(join(plan, "state.json"), "{not json");
    await expect(runCommand("close-us", ["US1"], { planDir: plan, date: DATE })).rejects.toThrow();
  });
});
