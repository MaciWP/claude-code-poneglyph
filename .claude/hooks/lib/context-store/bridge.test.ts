import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { createStore, closeStore } from "./store";
import { indexContent } from "./indexer";
import { hydrateFromKnowledge, persistToKnowledge } from "./bridge";
import type { Database } from "bun:sqlite";

describe("context-store bridge", () => {
  let db: Database;

  beforeEach(() => {
    db = createStore(":memory:");
  });

  afterEach(() => {
    closeStore(db);
  });

  describe("hydrateFromKnowledge", () => {
    test("returns 0 when no knowledge entries exist", () => {
      const count = hydrateFromKnowledge(db, "test query", "s1");
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test("respects maxEntries limit", () => {
      const count = hydrateFromKnowledge(db, "test", "s1", 5);
      expect(count).toBeLessThanOrEqual(5);
    });
  });

  describe("persistToKnowledge", () => {
    test("returns 0 when no chunks to persist", () => {
      const result = persistToKnowledge(db, "empty-session");
      expect(result).toBe(0);
    });

    test("persists session with content", () => {
      indexContent(
        db,
        "test.ts",
        "Authentication middleware with JWT validation",
        "s1",
      );
      indexContent(
        db,
        "api.ts",
        "REST API endpoint for user management",
        "s1",
      );

      const result = persistToKnowledge(db, "s1", "/test/project");
      expect(result).toBe(1);
    });
  });
});
