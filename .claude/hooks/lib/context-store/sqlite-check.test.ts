import { describe, test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unlinkSync, existsSync } from "node:fs";

function closeAndCheckpoint(db: Database): void {
  try {
    db.run("PRAGMA wal_checkpoint(TRUNCATE)");
  } catch {
    // WAL may not be active
  }
  db.close();
}

function safeUnlink(filePath: string): void {
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      const p = filePath + suffix;
      if (existsSync(p)) unlinkSync(p);
    } catch {
      // Windows file lock -- best effort
    }
  }
}

describe("bun:sqlite FTS5 platform check", () => {
  test("in-memory database works", () => {
    const db = new Database(":memory:");
    expect(db).toBeTruthy();
    db.close();
  });

  test("FTS5 virtual table with porter tokenizer works", () => {
    const db = new Database(":memory:");
    db.run(
      `CREATE VIRTUAL TABLE IF NOT EXISTS test_fts USING fts5(title, content, tokenize='porter ascii')`,
    );
    db.run(`INSERT INTO test_fts (title, content) VALUES (?, ?)`, [
      "Test Title",
      "This is test content for FTS5 search",
    ]);
    const results = db
      .query(`SELECT * FROM test_fts WHERE test_fts MATCH ?`)
      .all("test");
    expect(results.length).toBe(1);
    expect((results[0] as Record<string, unknown>).title).toBe("Test Title");
    db.close();
  });

  test("BM25 ranking works", () => {
    const db = new Database(":memory:");
    db.run(
      `CREATE VIRTUAL TABLE IF NOT EXISTS ranked USING fts5(content, tokenize='porter ascii')`,
    );
    db.run(`INSERT INTO ranked (content) VALUES (?)`, [
      "the quick brown fox",
    ]);
    db.run(`INSERT INTO ranked (content) VALUES (?)`, [
      "fox fox fox fox fox",
    ]);
    const results = db
      .query(
        `SELECT content, rank FROM ranked WHERE ranked MATCH ? ORDER BY rank`,
      )
      .all("fox");
    expect(results.length).toBe(2);
    db.close();
  });

  test("file-based database works", () => {
    const dbPath = join(tmpdir(), `poneglyph-test-${Date.now()}.db`);
    try {
      const db = new Database(dbPath);
      db.run("PRAGMA journal_mode=DELETE");
      db.run(
        `CREATE VIRTUAL TABLE IF NOT EXISTS file_fts USING fts5(content, tokenize='porter ascii')`,
      );
      db.run(`INSERT INTO file_fts (content) VALUES (?)`, [
        "persistent storage FTS5 verification",
      ]);
      const results = db
        .query(`SELECT * FROM file_fts WHERE file_fts MATCH ?`)
        .all("persistent");
      expect(results.length).toBe(1);
      closeAndCheckpoint(db);

      const db2 = new Database(dbPath);
      db2.run("PRAGMA journal_mode=DELETE");
      const results2 = db2
        .query(`SELECT * FROM file_fts WHERE file_fts MATCH ?`)
        .all("persistent");
      expect(results2.length).toBe(1);
      closeAndCheckpoint(db2);
    } finally {
      safeUnlink(dbPath);
    }
  });

  test("multiple sessions can share file-based db", () => {
    const dbPath = join(tmpdir(), `poneglyph-shared-${Date.now()}.db`);
    try {
      const db1 = new Database(dbPath);
      db1.run("PRAGMA journal_mode=DELETE");
      db1.run(
        `CREATE VIRTUAL TABLE IF NOT EXISTS shared USING fts5(session, content, tokenize='porter ascii')`,
      );
      db1.run(`INSERT INTO shared (session, content) VALUES (?, ?)`, [
        "s1",
        "session one data",
      ]);
      closeAndCheckpoint(db1);

      const db2 = new Database(dbPath);
      db2.run("PRAGMA journal_mode=DELETE");
      db2.run(`INSERT INTO shared (session, content) VALUES (?, ?)`, [
        "s2",
        "session two data",
      ]);
      const all = db2.query(`SELECT * FROM shared`).all();
      expect(all.length).toBe(2);

      const results = db2
        .query(`SELECT * FROM shared WHERE shared MATCH ?`)
        .all("session");
      expect(results.length).toBe(2);
      closeAndCheckpoint(db2);
    } finally {
      safeUnlink(dbPath);
    }
  });
});
