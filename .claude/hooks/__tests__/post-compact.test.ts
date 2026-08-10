import { describe, test, expect } from "bun:test";
import { buildOutput, getSessionMode, LEAD_REMINDER } from "../post-compact";

describe("post-compact re-injection (open-plans section cut post-audit 2026-08-07)", () => {
  test("buildOutput carries the Lead reminder", () => {
    const out = buildOutput();
    expect(out).toContain("Lead Orchestrator Mode");
    // ANTI_HALLUCINATION block removed (030): instructions-loaded.log proved
    // CLAUDE.md reloads at the same compaction instant — the checklist was a duplicate.
    expect(out).not.toContain("Anti-Hallucination");
  });

  test("the open-plans reminder is gone (retired: measured follow-through 1/9)", () => {
    expect(buildOutput()).not.toContain("Planes /flow abiertos");
  });

  test("session-mode section reflects CLAUDE_LEAD_MODE", () => {
    const prev = Bun.env.CLAUDE_LEAD_MODE;
    try {
      Bun.env.CLAUDE_LEAD_MODE = "true";
      expect(getSessionMode()).toContain("Lead Orchestrator active");
      expect(buildOutput()).toContain("Session Mode");
      Bun.env.CLAUDE_LEAD_MODE = "false";
      expect(getSessionMode()).toBeNull();
      expect(buildOutput()).toBe(LEAD_REMINDER);
    } finally {
      if (prev === undefined) delete Bun.env.CLAUDE_LEAD_MODE;
      else Bun.env.CLAUDE_LEAD_MODE = prev;
    }
  });
});
