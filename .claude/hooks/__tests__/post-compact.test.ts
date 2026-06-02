import { describe, test, expect, afterEach } from "bun:test";
import { LEAD_REMINDER, ANTI_HALLUCINATION, getSessionMode } from "../post-compact";

describe("LEAD_REMINDER", () => {
  test("names the three available subagents", () => {
    expect(LEAD_REMINDER).toContain("builder");
    expect(LEAD_REMINDER).toContain("reviewer");
    expect(LEAD_REMINDER).toContain("scout");
  });
  test("states the default-allow gate", () => {
    expect(LEAD_REMINDER).toContain("default-allow");
  });
  test("mentions the delegation threshold", () => {
    expect(LEAD_REMINDER).toContain(">=5 files");
  });
});

describe("ANTI_HALLUCINATION", () => {
  test("includes the core checklist items", () => {
    expect(ANTI_HALLUCINATION).toContain("Glob before asserting");
    expect(ANTI_HALLUCINATION).toContain("Read before Edit");
    expect(ANTI_HALLUCINATION).toContain("confidence < 70%");
  });
});

describe("getSessionMode", () => {
  const orig = Bun.env.CLAUDE_LEAD_MODE;
  afterEach(() => {
    if (orig === undefined) delete Bun.env.CLAUDE_LEAD_MODE;
    else Bun.env.CLAUDE_LEAD_MODE = orig;
  });

  test("returns the mode section when CLAUDE_LEAD_MODE=true", () => {
    Bun.env.CLAUDE_LEAD_MODE = "true";
    expect(getSessionMode()).toContain("Lead Orchestrator active");
  });
  test("returns null when CLAUDE_LEAD_MODE is unset", () => {
    delete Bun.env.CLAUDE_LEAD_MODE;
    expect(getSessionMode()).toBeNull();
  });
  test("returns null when CLAUDE_LEAD_MODE is not exactly 'true'", () => {
    Bun.env.CLAUDE_LEAD_MODE = "false";
    expect(getSessionMode()).toBeNull();
  });
});
