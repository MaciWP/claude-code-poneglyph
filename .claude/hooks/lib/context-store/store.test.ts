import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { createStore, closeStore, getSessionDbPath } from "./store";
import { indexContent, chunkText, estimateTokens } from "./indexer";
import { search, getSessionSummary, getStoreStats } from "./searcher";
import type { Database } from "bun:sqlite";

describe("context-store", () => {
  let db: Database;

  beforeEach(() => {
    db = createStore(":memory:");
  });

  afterEach(() => {
    closeStore(db);
  });

  describe("store", () => {
    test("createStore creates FTS5 tables", () => {
      const ftsResult = db.query("SELECT * FROM chunks LIMIT 1").all();
      expect(ftsResult).toBeArray();

      const metaResult = db.query("SELECT * FROM chunk_meta LIMIT 1").all();
      expect(metaResult).toBeArray();
    });

    test("createStore is idempotent", () => {
      const db2 = createStore(":memory:");
      expect(db2).toBeTruthy();
      closeStore(db2);
    });

    test("getSessionDbPath returns consistent path", () => {
      const path1 = getSessionDbPath();
      const path2 = getSessionDbPath();
      expect(path1).toBe(path2);
      expect(path1).toContain("poneglyph-context-");
    });
  });

  describe("indexer", () => {
    test("estimateTokens uses chars/4 heuristic", () => {
      expect(estimateTokens("1234")).toBe(1);
      expect(estimateTokens("12345678")).toBe(2);
      expect(estimateTokens("")).toBe(0);
    });

    test("chunkText splits by headings", () => {
      const text = "## Section 1\nContent 1\n## Section 2\nContent 2";
      const chunks = chunkText(text);
      expect(chunks.length).toBeGreaterThanOrEqual(2);
    });

    test("chunkText preserves code blocks", () => {
      const code =
        "```typescript\nfunction foo() {\n  return 42;\n}\n```";
      const text = `Some text before\n\n${code}\n\nSome text after`;
      const chunks = chunkText(text);
      const codeChunk = chunks.find((c) => c.includes("function foo"));
      expect(codeChunk).toBeTruthy();
      expect(codeChunk).toContain("```typescript");
      expect(codeChunk).toContain("```");
    });

    test("chunkText returns empty array for empty input", () => {
      expect(chunkText("")).toEqual([]);
      expect(chunkText("   ")).toEqual([]);
    });

    test("chunkText respects maxChunkTokens", () => {
      const longText = "word ".repeat(1000);
      const chunks = chunkText(longText, 100);
      for (const chunk of chunks) {
        expect(estimateTokens(chunk)).toBeLessThanOrEqual(200);
      }
    });

    test("indexContent indexes text and returns chunk count", () => {
      const count = indexContent(
        db,
        "test.ts",
        "Hello world content here",
        "session1",
      );
      expect(count).toBeGreaterThan(0);

      const rows = db
        .query("SELECT COUNT(*) as c FROM chunks")
        .get() as { c: number };
      expect(rows.c).toBe(count);
    });

    test("indexContent with empty content returns 0", () => {
      expect(indexContent(db, "empty.ts", "", "s1")).toBe(0);
      expect(indexContent(db, "empty.ts", "   ", "s1")).toBe(0);
    });

    test("indexContent stores metadata correctly", () => {
      indexContent(
        db,
        "meta-test.ts",
        "Some content for metadata test",
        "session-abc",
      );

      const meta = db
        .query("SELECT * FROM chunk_meta LIMIT 1")
        .get() as { session_id: string; tokens: number; timestamp: number };
      expect(meta.session_id).toBe("session-abc");
      expect(meta.tokens).toBeGreaterThan(0);
      expect(meta.timestamp).toBeGreaterThan(0);
    });
  });

  describe("searcher", () => {
    beforeEach(() => {
      indexContent(
        db,
        "auth.ts",
        "Authentication middleware validates JWT tokens and checks user permissions",
        "s1",
      );
      indexContent(
        db,
        "db.ts",
        "Database connection pool manages PostgreSQL queries and transactions",
        "s1",
      );
      indexContent(
        db,
        "api.ts",
        "REST API endpoint handles user registration with email validation",
        "s1",
      );
    });

    test("search returns relevant results", () => {
      const result = search(db, "authentication JWT");
      expect(result.chunks.length).toBeGreaterThan(0);
      expect(result.chunks[0].source).toBe("auth.ts");
    });

    test("search returns empty for no match", () => {
      const result = search(db, "xyznonexistentkeyword");
      expect(result.chunks.length).toBe(0);
    });

    test("search respects limit", () => {
      const result = search(db, "user", 1);
      expect(result.chunks.length).toBeLessThanOrEqual(1);
    });

    test("search sanitizes special characters", () => {
      const result = search(db, "auth-token (jwt) [test]");
      expect(result).toBeTruthy();
    });

    test("search returns totalTokens", () => {
      const result = search(db, "database");
      expect(result.totalTokens).toBeGreaterThan(0);
    });

    test("search returns durationMs", () => {
      const result = search(db, "API");
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    test("getSessionSummary returns session content", () => {
      const summary = getSessionSummary(db, "s1", 4000);
      expect(summary.length).toBeGreaterThan(0);
      expect(summary).toContain("auth.ts");
    });

    test("getSessionSummary respects maxTokens", () => {
      for (let i = 0; i < 50; i++) {
        indexContent(db, `file-${i}.ts`, "A".repeat(400), "s-big");
      }
      const summary = getSessionSummary(db, "s-big", 100);
      expect(estimateTokens(summary)).toBeLessThanOrEqual(200);
    });

    test("getSessionSummary returns empty for unknown session", () => {
      expect(getSessionSummary(db, "nonexistent", 4000)).toBe("");
    });

    test("getStoreStats returns correct counts", () => {
      const stats = getStoreStats(db);
      expect(stats.totalChunks).toBeGreaterThan(0);
      expect(stats.totalTokens).toBeGreaterThan(0);
      expect(stats.sessions).toContain("s1");
      expect(stats.topSources.length).toBeGreaterThan(0);
    });
  });
});
