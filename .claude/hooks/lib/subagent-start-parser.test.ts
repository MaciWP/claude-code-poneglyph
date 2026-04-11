import { describe, test, expect } from "bun:test";
import {
  extractMemoryBytes,
  extractSkillsInjected,
  extractEffort,
  promptHash,
  parseSpawnContext,
} from "./subagent-start-parser";

describe("extractMemoryBytes", () => {
  test("counts bytes between MEMORY marker and [TASK]", () => {
    const body = "\nhello world\n";
    const prompt = `[ACCUMULATED MEMORY - builder]${body}[TASK]\ndo the thing`;
    expect(extractMemoryBytes(prompt)).toBe(Buffer.byteLength(body, "utf8"));
  });

  test("also accepts legacy EXPERTISE marker for backward compat", () => {
    const body = "\nfoo\n";
    const prompt = `[ACCUMULATED EXPERTISE]${body}[TASK]\n`;
    expect(extractMemoryBytes(prompt)).toBe(Buffer.byteLength(body, "utf8"));
  });

  test("returns 0 when marker absent", () => {
    expect(extractMemoryBytes("just a task, no memory")).toBe(0);
  });

  test("returns full tail length when no terminating marker", () => {
    const tail = " stuff after";
    const prompt = `[ACCUMULATED MEMORY]${tail}`;
    expect(extractMemoryBytes(prompt)).toBe(Buffer.byteLength(tail, "utf8"));
  });
});

describe("extractSkillsInjected", () => {
  test("parses 'Loaded skills:' line", () => {
    const prompt =
      "Context\nLoaded skills: anti-hallucination, security-review, api-design\n[TASK]";
    const skills = extractSkillsInjected(prompt);
    expect(skills).toEqual([
      "anti-hallucination",
      "security-review",
      "api-design",
    ]);
  });

  test("case-insensitive 'Skills:' alias", () => {
    expect(extractSkillsInjected("Skills: code-quality, testing")).toEqual([
      "code-quality",
      "testing",
    ]);
  });

  test("fuzzy match against known skills when no line", () => {
    const prompt = "use security-review patterns and code-quality here";
    const known = ["security-review", "code-quality", "api-design"];
    const skills = extractSkillsInjected(prompt, known);
    expect(skills.sort()).toEqual(["code-quality", "security-review"]);
  });

  test("returns empty array when nothing matches", () => {
    expect(extractSkillsInjected("nothing")).toEqual([]);
  });

  test("does not match 'Skills:' mid-sentence (anchored)", () => {
    const prompt = "The candidate is fluent in foo Skills: fluent in foo";
    expect(extractSkillsInjected(prompt)).toEqual([]);
  });

  test("matches 'Skills:' on its own line even when not first line", () => {
    const prompt = "Intro paragraph.\nSkills: alpha, beta\nMore text";
    expect(extractSkillsInjected(prompt)).toEqual(["alpha", "beta"]);
  });
});

describe("extractEffort", () => {
  test("parses [effort: high]", () => {
    expect(extractEffort("prefix [effort: high] suffix")).toBe("high");
  });

  test("case insensitive medium", () => {
    expect(extractEffort("[EFFORT: Medium]")).toBe("medium");
  });

  test("returns null when absent", () => {
    expect(extractEffort("no marker")).toBeNull();
  });
});

describe("promptHash", () => {
  test("returns 16-char hex", () => {
    const h = promptHash("hello");
    expect(h).toHaveLength(16);
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });

  test("deterministic", () => {
    expect(promptHash("same")).toBe(promptHash("same"));
  });
});

describe("parseSpawnContext", () => {
  test("combines all fields", () => {
    const prompt = `[ACCUMULATED MEMORY]\nabcde\n[TASK]\nLoaded skills: a, b\n[effort: low]\n`;
    const ctx = parseSpawnContext(prompt);
    expect(ctx.memoryBytes).toBe(7); // "\nabcde\n"
    expect(ctx.skillsInjected).toEqual(["a", "b"]);
    expect(ctx.effort).toBe("low");
    expect(ctx.promptHash).toHaveLength(16);
  });
});
