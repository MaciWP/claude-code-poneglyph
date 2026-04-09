import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  extractExpertiseInsights,
  persistExpertise,
  pruneExpertise,
} from "./expertise-writer";
import type { TranscriptMessage } from "./expertise-writer";

const TEST_DIR = join(tmpdir(), `expertise-writer-test-${process.pid}`);

function setTestDir(): void {
  process.env.CLAUDE_EXPERTISE_DIR = TEST_DIR;
}

function cleanup(): void {
  try {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  } catch {
    // best effort
  }
  delete process.env.CLAUDE_EXPERTISE_DIR;
}

function makeTranscript(messages: Array<{ role: string; content: string }>): TranscriptMessage[] {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

describe("extractExpertiseInsights", () => {
  test("finds insights section with ### header in last assistant message", () => {
    const transcript = makeTranscript([
      { role: "user", content: "do some work" },
      {
        role: "assistant",
        content:
          "Done work.\n\n### Expertise Insights\n- insight one\n- insight two\n",
      },
    ]);
    const result = extractExpertiseInsights(transcript);
    expect(result).not.toBeNull();
    expect(result).toContain("- insight one");
    expect(result).toContain("- insight two");
  });

  test("finds insights section with ## header", () => {
    const transcript = makeTranscript([
      { role: "user", content: "task" },
      {
        role: "assistant",
        content: "Done.\n\n## Expertise Insights\n- only insight\n",
      },
    ]);
    const result = extractExpertiseInsights(transcript);
    expect(result).toBe("- only insight");
  });

  test("returns null when no insights section present", () => {
    const transcript = makeTranscript([
      { role: "user", content: "task" },
      { role: "assistant", content: "All done, no insights here." },
    ]);
    expect(extractExpertiseInsights(transcript)).toBeNull();
  });

  test("returns null for empty transcript", () => {
    expect(extractExpertiseInsights([])).toBeNull();
  });

  test("returns null when only user messages", () => {
    const transcript = makeTranscript([{ role: "user", content: "### Expertise Insights\n- hacked" }]);
    expect(extractExpertiseInsights(transcript)).toBeNull();
  });

  test("searches only the last assistant message", () => {
    const transcript = makeTranscript([
      {
        role: "assistant",
        content: "First.\n\n### Expertise Insights\n- old insight\n",
      },
      { role: "user", content: "continue" },
      { role: "assistant", content: "Second message with no insights." },
    ]);
    expect(extractExpertiseInsights(transcript)).toBeNull();
  });

  test("handles array content blocks", () => {
    const transcript: TranscriptMessage[] = [
      { role: "user", content: "task" },
      {
        role: "assistant",
        content: [
          { type: "text", text: "Result.\n\n### Expertise Insights\n- block insight\n" },
        ],
      },
    ];
    const result = extractExpertiseInsights(transcript);
    expect(result).toContain("- block insight");
  });
});

describe("persistExpertise", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    setTestDir();
  });

  afterEach(() => {
    cleanup();
  });

  test("creates EXPERTISE.md with header when file does not exist", () => {
    persistExpertise("builder", "abc12345", "- insight one");
    const path = join(TEST_DIR, "builder", "EXPERTISE.md");
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, "utf-8");
    expect(content).toContain("# Builder Expertise");
    expect(content).toContain("- insight one");
  });

  test("appends to existing EXPERTISE.md", () => {
    persistExpertise("builder", "session1a", "- first");
    persistExpertise("builder", "session2b", "- second");
    const path = join(TEST_DIR, "builder", "EXPERTISE.md");
    const content = readFileSync(path, "utf-8");
    expect(content).toContain("- first");
    expect(content).toContain("- second");
  });

  test("includes session short id and date in section header", () => {
    persistExpertise("reviewer", "abcdef99xyz", "- review insight");
    const path = join(TEST_DIR, "reviewer", "EXPERTISE.md");
    const content = readFileSync(path, "utf-8");
    expect(content).toContain("Session abcdef99");
    expect(content).toMatch(/## \d{4}-\d{2}-\d{2}/);
  });

  test("creates agent directory when it does not exist", () => {
    const agentDir = join(TEST_DIR, "scout");
    expect(existsSync(agentDir)).toBe(false);
    persistExpertise("scout", "sess1234", "- scout insight");
    expect(existsSync(agentDir)).toBe(true);
  });
});

describe("pruneExpertise", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    setTestDir();
  });

  afterEach(() => {
    cleanup();
  });

  test("does nothing when file does not exist", () => {
    expect(() => pruneExpertise("nobody", 100)).not.toThrow();
  });

  test("does nothing when file is under limit", () => {
    const agentDir = join(TEST_DIR, "builder");
    mkdirSync(agentDir, { recursive: true });
    const path = join(agentDir, "EXPERTISE.md");
    const content = "# Builder Expertise\n\n## 2026-01-01 — Session abc\n- insight\n";
    writeFileSync(path, content);
    pruneExpertise("builder", 20000);
    expect(readFileSync(path, "utf-8")).toBe(content);
  });

  test("removes oldest section when over limit", () => {
    const agentDir = join(TEST_DIR, "builder");
    mkdirSync(agentDir, { recursive: true });
    const path = join(agentDir, "EXPERTISE.md");
    const old = "## 2026-01-01 — Session old\n" + "- " + "x".repeat(100) + "\n";
    const recent = "## 2026-01-02 — Session new\n- recent insight\n";
    const content = `# Builder Expertise\n\n${old}\n${recent}`;
    writeFileSync(path, content);

    pruneExpertise("builder", content.length - 10);

    const result = readFileSync(path, "utf-8");
    expect(result).not.toContain("Session old");
    expect(result).toContain("Session new");
    expect(result).toContain("# Builder Expertise");
  });

  test("removes multiple oldest sections when needed", () => {
    const agentDir = join(TEST_DIR, "builder");
    mkdirSync(agentDir, { recursive: true });
    const path = join(agentDir, "EXPERTISE.md");
    const sections = [1, 2, 3].map(
      (i) => `## 2026-01-0${i} — Session s${i}\n- insight ${i}\n`,
    );
    writeFileSync(path, `# Builder Expertise\n\n${sections.join("\n")}`);

    const fullSize = readFileSync(path, "utf-8").length;
    pruneExpertise("builder", fullSize - sections[0].length - sections[1].length);

    const result = readFileSync(path, "utf-8");
    expect(result).toContain("Session s3");
    expect(result).not.toContain("Session s1");
  });
});
