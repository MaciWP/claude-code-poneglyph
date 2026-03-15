import { Database } from "bun:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { StoreOptions } from "./types";

/**
 * Create or open a context store backed by bun:sqlite FTS5.
 * Uses DELETE journal mode on Windows for clean file cleanup.
 */
export function createStore(options?: StoreOptions | string): Database {
  const path =
    typeof options === "string" ? options : (options?.path ?? ":memory:");
  const db = new Database(path);

  if (process.platform === "win32") {
    db.run("PRAGMA journal_mode=DELETE");
  }

  db.run(`CREATE VIRTUAL TABLE IF NOT EXISTS chunks USING fts5(
    source,
    content,
    summary,
    tokenize='porter ascii'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS chunk_meta (
    rowid INTEGER PRIMARY KEY,
    tokens INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    session_id TEXT NOT NULL
  )`);

  return db;
}

/**
 * Close the store and clean up resources.
 */
export function closeStore(db: Database): void {
  try {
    if (process.platform === "win32") {
      try {
        db.run("PRAGMA wal_checkpoint(TRUNCATE)");
      } catch {
        // WAL may not be active
      }
    }
    db.close();
  } catch {
    // best-effort
  }
}

/**
 * Get the session DB path for the current Claude Code session.
 * Uses process.ppid so all hooks in the same session share the DB.
 */
export function getSessionDbPath(): string {
  return join(tmpdir(), `poneglyph-context-${process.ppid}.db`);
}
