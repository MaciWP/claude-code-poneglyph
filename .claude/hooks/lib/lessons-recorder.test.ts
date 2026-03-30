import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  existsSync,
  unlinkSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { recordLesson, loadRecentLessons } from "./lessons-recorder";
import type { Lesson } from "./lessons-recorder";

const TEST_DIR = join(tmpdir(), "lessons-recorder-test-" + process.pid);
const TEST_PATH = join(TEST_DIR, "lessons.jsonl");

function setTestPath(): void {
  process.env.CLAUDE_LESSONS_PATH = TEST_PATH;
}

function cleanup(): void {
  try {
    if (existsSync(TEST_PATH)) unlinkSync(TEST_PATH);
  } catch {
    // best effort
  }
  delete process.env.CLAUDE_LESSONS_PATH;
}

describe("lessons-recorder", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    setTestPath();
  });

  afterEach(() => {
    cleanup();
  });

  describe("recordLesson", () => {
    test("appends a lesson to the file", () => {
      recordLesson({
        context: "editing user service",
        correction: "do not use any type",
        lesson: "always use unknown instead of any",
      });

      const content = readFileSync(TEST_PATH, "utf-8").trim();
      const lines = content.split("\n");
      expect(lines).toHaveLength(1);

      const parsed = JSON.parse(lines[0]) as Lesson;
      expect(parsed.context).toBe("editing user service");
      expect(parsed.correction).toBe("do not use any type");
      expect(parsed.lesson).toBe("always use unknown instead of any");
      expect(parsed.timestamp).toBeDefined();
    });

    test("appends multiple lessons without overwriting", () => {
      recordLesson({
        context: "first",
        correction: "c1",
        lesson: "l1",
      });
      recordLesson({
        context: "second",
        correction: "c2",
        lesson: "l2",
        skill: "typescript-patterns",
      });

      const content = readFileSync(TEST_PATH, "utf-8").trim();
      const lines = content.split("\n");
      expect(lines).toHaveLength(2);

      const second = JSON.parse(lines[1]) as Lesson;
      expect(second.context).toBe("second");
      expect(second.skill).toBe("typescript-patterns");
    });

    test("includes optional skill field", () => {
      recordLesson({
        context: "ctx",
        correction: "cor",
        lesson: "les",
        skill: "security-review",
      });

      const parsed = JSON.parse(
        readFileSync(TEST_PATH, "utf-8").trim(),
      ) as Lesson;
      expect(parsed.skill).toBe("security-review");
    });
  });

  describe("loadRecentLessons", () => {
    test("returns empty array for missing file", () => {
      if (existsSync(TEST_PATH)) unlinkSync(TEST_PATH);
      expect(loadRecentLessons()).toEqual([]);
    });

    test("returns empty array for empty file", () => {
      writeFileSync(TEST_PATH, "");
      expect(loadRecentLessons()).toEqual([]);
    });

    test("returns lessons most recent first", () => {
      const now = Date.now();
      const entries: Lesson[] = [
        {
          timestamp: new Date(now - 3000).toISOString(),
          context: "old",
          correction: "c",
          lesson: "l",
        },
        {
          timestamp: new Date(now - 2000).toISOString(),
          context: "mid",
          correction: "c",
          lesson: "l",
        },
        {
          timestamp: new Date(now - 1000).toISOString(),
          context: "new",
          correction: "c",
          lesson: "l",
        },
      ];
      const content = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
      writeFileSync(TEST_PATH, content);

      const loaded = loadRecentLessons();
      expect(loaded).toHaveLength(3);
      expect(loaded[0].context).toBe("new");
      expect(loaded[2].context).toBe("old");
    });

    test("respects limit parameter", () => {
      const now = Date.now();
      const entries: Lesson[] = Array.from({ length: 5 }, (_, i) => ({
        timestamp: new Date(now - (5 - i) * 1000).toISOString(),
        context: `entry-${i}`,
        correction: "c",
        lesson: "l",
      }));
      writeFileSync(
        TEST_PATH,
        entries.map((e) => JSON.stringify(e)).join("\n") + "\n",
      );

      const loaded = loadRecentLessons(2);
      expect(loaded).toHaveLength(2);
      expect(loaded[0].context).toBe("entry-4");
      expect(loaded[1].context).toBe("entry-3");
    });

    test("filters out lessons older than 60 days", () => {
      const now = Date.now();
      const msPerDay = 24 * 60 * 60 * 1000;
      const entries: Lesson[] = [
        {
          timestamp: new Date(now - 90 * msPerDay).toISOString(),
          context: "expired",
          correction: "c",
          lesson: "l",
        },
        {
          timestamp: new Date(now - 30 * msPerDay).toISOString(),
          context: "recent",
          correction: "c",
          lesson: "l",
        },
      ];
      writeFileSync(
        TEST_PATH,
        entries.map((e) => JSON.stringify(e)).join("\n") + "\n",
      );

      const loaded = loadRecentLessons();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].context).toBe("recent");
    });

    test("skips malformed lines", () => {
      const now = new Date().toISOString();
      const content = [
        JSON.stringify({
          timestamp: now,
          context: "valid",
          correction: "c",
          lesson: "l",
        }),
        "not valid json {{{",
        "",
        JSON.stringify({
          timestamp: now,
          context: "also-valid",
          correction: "c",
          lesson: "l",
        }),
      ].join("\n");
      writeFileSync(TEST_PATH, content);

      const loaded = loadRecentLessons();
      expect(loaded).toHaveLength(2);
      expect(loaded[0].context).toBe("also-valid");
      expect(loaded[1].context).toBe("valid");
    });
  });
});
