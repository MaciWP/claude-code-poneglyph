import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, unlinkSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import {
  normalizeErrorMessage,
  classifyError,
  levenshteinDistance,
  matchError,
  loadPatterns,
  savePatterns,
  recordError,
  recordFixOutcome,
  getBestFix,
} from "./error-patterns";
import type { ErrorPattern } from "./error-patterns";

describe("normalizeErrorMessage", () => {
  test("strips Windows paths", () => {
    const msg = "Error in C:\\Users\\Maci\\project\\src\\app.ts";
    const normalized = normalizeErrorMessage(msg);
    expect(normalized).toContain("<path>");
    expect(normalized).not.toContain("C:\\Users");
  });

  test("strips Unix paths", () => {
    const msg = "ENOENT: no such file /home/user/app/config.json";
    const normalized = normalizeErrorMessage(msg);
    expect(normalized).toContain("<path>");
  });

  test("strips line:column numbers", () => {
    const normalized = normalizeErrorMessage("Error at :42:10 in file");
    expect(normalized).toContain(":<line>:<col>");
  });

  test("strips quoted property names", () => {
    const normalized = normalizeErrorMessage(
      "Cannot read property 'userName' of undefined",
    );
    expect(normalized).toContain("'<prop>'");
  });

  test("handles empty string", () => {
    expect(normalizeErrorMessage("")).toBe("");
  });
});

describe("classifyError", () => {
  test("classifies TypeError", () => {
    expect(classifyError("TypeError: Cannot read property")).toBe("TypeError");
  });

  test("classifies EditConflict", () => {
    expect(classifyError("old_string not found in file")).toBe("EditConflict");
  });

  test("classifies ModuleNotFound", () => {
    expect(classifyError("Cannot find module '@/utils'")).toBe(
      "ModuleNotFound",
    );
  });

  test("classifies CompilationError", () => {
    expect(classifyError("compilation failed: tsc error")).toBe(
      "CompilationError",
    );
  });

  test("classifies TestFailure", () => {
    expect(classifyError("FAIL src/utils.test.ts")).toBe("TestFailure");
  });

  test("classifies NetworkError", () => {
    expect(classifyError("ECONNREFUSED 127.0.0.1:5432")).toBe("NetworkError");
  });

  test("classifies PermissionError", () => {
    expect(classifyError("EACCES: permission denied")).toBe("PermissionError");
  });

  test("returns Unknown for unrecognized", () => {
    expect(classifyError("Something went wrong")).toBe("Unknown");
  });
});

describe("levenshteinDistance", () => {
  test("returns 0 for identical strings", () => {
    expect(levenshteinDistance("hello", "hello")).toBe(0);
  });

  test("returns correct distance", () => {
    expect(levenshteinDistance("hello", "hallo")).toBe(1);
  });

  test("handles empty strings", () => {
    expect(levenshteinDistance("", "hello")).toBe(5);
    expect(levenshteinDistance("hello", "")).toBe(5);
    expect(levenshteinDistance("", "")).toBe(0);
  });
});

describe("matchError", () => {
  test("exact match returns high confidence", () => {
    const normalizedMsg = normalizeErrorMessage(
      "TypeError: Cannot read 'id' of undefined",
    );
    const patterns: ErrorPattern[] = [
      {
        id: "p1",
        normalizedMessage: normalizedMsg,
        category: "TypeError",
        originalMessage: "TypeError: Cannot read 'id' of undefined",
        fixes: [],
        successRate: 0,
        occurrences: 1,
        firstSeen: "2026-03-08T00:00:00Z",
        lastSeen: "2026-03-08T00:00:00Z",
      },
    ];
    const result = matchError(
      "TypeError: Cannot read 'id' of undefined",
      patterns,
    );
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(1.0);
    expect(result!.matchType).toBe("exact");
  });

  test("similar error in same category matches with regex type", () => {
    const patterns: ErrorPattern[] = [
      {
        id: "p1",
        normalizedMessage: normalizeErrorMessage(
          "TypeError: Cannot read 'id' of undefined",
        ),
        category: "TypeError",
        originalMessage: "TypeError: Cannot read 'id' of undefined",
        fixes: [],
        successRate: 0,
        occurrences: 1,
        firstSeen: "2026-03-08T00:00:00Z",
        lastSeen: "2026-03-08T00:00:00Z",
      },
    ];
    const result = matchError(
      "TypeError: Cannot read 'name' of undefined",
      patterns,
    );
    expect(result).not.toBeNull();
    expect(result!.confidence).toBeGreaterThan(0.5);
  });

  test("returns null for completely different error", () => {
    const patterns: ErrorPattern[] = [
      {
        id: "p1",
        normalizedMessage: "TypeError test message about something specific",
        category: "TypeError",
        originalMessage: "TypeError test message about something specific",
        fixes: [],
        successRate: 0,
        occurrences: 1,
        firstSeen: "2026-03-08T00:00:00Z",
        lastSeen: "2026-03-08T00:00:00Z",
      },
    ];
    const result = matchError(
      "Something completely different and unrelated to anything at all here",
      patterns,
    );
    expect(result).toBeNull();
  });

  test("returns null for empty patterns", () => {
    expect(matchError("Any error", [])).toBeNull();
  });
});

describe("storage", () => {
  const patternsPath = join(homedir(), ".claude", "error-patterns.jsonl");
  let backup: string | null = null;

  beforeEach(() => {
    try {
      if (existsSync(patternsPath)) {
        backup = readFileSync(patternsPath, "utf-8");
      }
    } catch {
      backup = null;
    }
    try {
      unlinkSync(patternsPath);
    } catch {
      // may not exist
    }
  });

  afterEach(() => {
    try {
      if (backup !== null) {
        writeFileSync(patternsPath, backup);
      } else if (existsSync(patternsPath)) {
        unlinkSync(patternsPath);
      }
    } catch {
      // cleanup best effort
    }
  });

  test("savePatterns and loadPatterns round-trip", () => {
    const patterns: ErrorPattern[] = [
      {
        id: "test1",
        normalizedMessage: "test error",
        category: "Unknown",
        originalMessage: "test error",
        fixes: [],
        successRate: 0,
        occurrences: 1,
        firstSeen: "2026-03-08T00:00:00Z",
        lastSeen: "2026-03-08T00:00:00Z",
      },
    ];
    savePatterns(patterns);
    const loaded = loadPatterns();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("test1");
  });

  test("loadPatterns returns empty for missing file", () => {
    expect(loadPatterns()).toEqual([]);
  });
});

describe("recordError", () => {
  const patternsPath = join(homedir(), ".claude", "error-patterns.jsonl");
  let backup: string | null = null;

  beforeEach(() => {
    try {
      if (existsSync(patternsPath)) {
        backup = readFileSync(patternsPath, "utf-8");
      }
    } catch {
      backup = null;
    }
    try {
      unlinkSync(patternsPath);
    } catch {
      // may not exist
    }
  });

  afterEach(() => {
    try {
      if (backup !== null) {
        writeFileSync(patternsPath, backup);
      } else if (existsSync(patternsPath)) {
        unlinkSync(patternsPath);
      }
    } catch {
      // cleanup best effort
    }
  });

  test("creates new pattern", () => {
    const pattern = recordError("TypeError: foo is not a function");
    expect(pattern.id).toBeDefined();
    expect(pattern.category).toBe("TypeError");
    expect(pattern.occurrences).toBe(1);
  });

  test("increments occurrences for repeated error", () => {
    recordError("TypeError: bar is not defined");
    const second = recordError("TypeError: bar is not defined");
    expect(second.occurrences).toBe(2);
  });
});

describe("recordFixOutcome", () => {
  const patternsPath = join(homedir(), ".claude", "error-patterns.jsonl");
  let backup: string | null = null;

  beforeEach(() => {
    try {
      if (existsSync(patternsPath)) {
        backup = readFileSync(patternsPath, "utf-8");
      }
    } catch {
      backup = null;
    }
    try {
      unlinkSync(patternsPath);
    } catch {
      // may not exist
    }
  });

  afterEach(() => {
    try {
      if (backup !== null) {
        writeFileSync(patternsPath, backup);
      } else if (existsSync(patternsPath)) {
        unlinkSync(patternsPath);
      }
    } catch {
      // cleanup best effort
    }
  });

  test("records fix and updates success rate", () => {
    const pattern = recordError("TypeError: test fix outcome");
    recordFixOutcome(pattern.id, "Add null check", true);

    const loaded = loadPatterns();
    const updated = loaded.find((p) => p.id === pattern.id);
    expect(updated).toBeDefined();
    expect(updated!.fixes).toHaveLength(1);
    expect(updated!.successRate).toBe(1.0);
  });

  test("ignores unknown pattern id", () => {
    recordFixOutcome("nonexistent-id", "Some fix", true);
    const loaded = loadPatterns();
    expect(loaded).toEqual([]);
  });
});

describe("getBestFix", () => {
  test("returns fix with highest success rate", () => {
    const pattern: ErrorPattern = {
      id: "t",
      normalizedMessage: "t",
      category: "Unknown",
      originalMessage: "t",
      successRate: 0.67,
      occurrences: 3,
      firstSeen: "2026-03-08T00:00:00Z",
      lastSeen: "2026-03-08T00:00:00Z",
      fixes: [
        {
          description: "Fix A",
          appliedAt: "2026-03-08T00:00:00Z",
          succeeded: true,
        },
        {
          description: "Fix A",
          appliedAt: "2026-03-08T01:00:00Z",
          succeeded: true,
        },
        {
          description: "Fix B",
          appliedAt: "2026-03-08T02:00:00Z",
          succeeded: false,
        },
      ],
    };
    expect(getBestFix(pattern)).toBe("Fix A");
  });

  test("returns null for no fixes", () => {
    const pattern: ErrorPattern = {
      id: "t",
      normalizedMessage: "t",
      category: "Unknown",
      originalMessage: "t",
      fixes: [],
      successRate: 0,
      occurrences: 1,
      firstSeen: "2026-03-08T00:00:00Z",
      lastSeen: "2026-03-08T00:00:00Z",
    };
    expect(getBestFix(pattern)).toBeNull();
  });

  test("returns null when all fixes failed", () => {
    const pattern: ErrorPattern = {
      id: "t",
      normalizedMessage: "t",
      category: "Unknown",
      originalMessage: "t",
      fixes: [
        {
          description: "Fix A",
          appliedAt: "2026-03-08T00:00:00Z",
          succeeded: false,
        },
        {
          description: "Fix B",
          appliedAt: "2026-03-08T01:00:00Z",
          succeeded: false,
        },
      ],
      successRate: 0,
      occurrences: 2,
      firstSeen: "2026-03-08T00:00:00Z",
      lastSeen: "2026-03-08T00:00:00Z",
    };
    expect(getBestFix(pattern)).toBeNull();
  });
});
