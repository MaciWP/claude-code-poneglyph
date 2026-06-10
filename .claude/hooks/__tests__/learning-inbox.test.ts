import { describe, test, expect } from "bun:test";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractCandidates, appendToInbox } from "../learning-inbox";

const tmp = mkdtempSync(join(tmpdir(), "learning-inbox-"));

describe("extractCandidates — payload with detectable signal (T11.1)", () => {
  test("user correction produces a typed candidate with confidence and context", () => {
    const payload = {
      session_id: "s1",
      transcript_tail:
        "user: no, eso está mal — te has equivocado, el endpoint correcto era /v2/items",
    };
    const candidates = extractCandidates(payload);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].type).toBe("user-correction");
    expect(candidates[0].confidence).toBeGreaterThan(0);
    expect(candidates[0].context).toContain("te has equivocado");
  });

  test("error→resolution pair is detected", () => {
    const payload = {
      transcript_tail:
        "TypeError: x is undefined ... after adding the guard the suite is passing again",
    };
    const candidates = extractCandidates(payload);
    expect(candidates.some((c) => c.type === "error-resolution")).toBe(true);
  });
});

describe("extractCandidates — self-match filter (019 retro: review prose is not a learning)", () => {
  test("error-resolution match inside review/verdict prose is discarded", () => {
    const payload = {
      transcript_tail:
        '"review_verdict": "APPROVED_WITH_WARNINGS — 2 MAJOR fixed in-review; panel infra-failed (session limit), inline with declared bias"',
    };
    expect(extractCandidates(payload).some((c) => c.type === "error-resolution")).toBe(false);
  });

  test("error-resolution match inside retro/inbox meta-prose is discarded", () => {
    const payload = {
      transcript_tail:
        "Learning-inbox first real cycle: 1 entry consumed, 1 discarded as noise (error-resolution regex matched the assistant's own review prose) — the suite is passing",
    };
    expect(extractCandidates(payload).some((c) => c.type === "error-resolution")).toBe(false);
  });

  test("genuine error→fix outside review prose still detected", () => {
    const payload = {
      transcript_tail: "TypeError: x is undefined in auto-approve.ts ... added the null guard, tests passing",
    };
    expect(extractCandidates(payload).some((c) => c.type === "error-resolution")).toBe(true);
  });
});

describe("appendToInbox — entry formatting (T11.1)", () => {
  test("appended entry is well-formed (type + confidence + source context)", () => {
    const inbox = join(tmp, "learned", "inbox.md");
    const payload = {
      session_id: "s1",
      transcript_tail: "user: te has equivocado, era /v2/items",
    };
    appendToInbox(extractCandidates(payload), inbox, "s1");
    expect(existsSync(inbox)).toBe(true);
    const content = readFileSync(inbox, "utf8");
    expect(content).toContain("user-correction");
    expect(content).toMatch(/confidence 0\.\d/);
    expect(content).toContain("te has equivocado");
  });
});

describe("extractCandidates — no signals = silence (T11.2)", () => {
  test("clean transcript returns empty list", () => {
    expect(extractCandidates({ transcript_tail: "hola, todo claro, seguimos" })).toEqual([]);
  });

  test("empty payload returns empty list", () => {
    expect(extractCandidates({})).toEqual([]);
  });

  test("appendToInbox with empty list writes nothing", () => {
    const inbox = join(tmp, "never", "inbox.md");
    appendToInbox([], inbox, "s2");
    expect(existsSync(inbox)).toBe(false);
  });
});

describe("appendToInbox — missing dir is created on first append (T11.3)", () => {
  test("creates learned/ dir + file with a single well-formed entry", () => {
    const inbox = join(tmp, "fresh", "learned", "inbox.md");
    appendToInbox(
      [{ type: "workaround", confidence: 0.4, context: "applied fallback X for flaky Y" }],
      inbox,
      "s3",
    );
    expect(existsSync(inbox)).toBe(true);
    const content = readFileSync(inbox, "utf8");
    expect(content).toContain("workaround");
    expect(content).toContain("applied fallback X for flaky Y");
    expect(content.match(/^## /gm)?.length).toBe(1);
  });
});
