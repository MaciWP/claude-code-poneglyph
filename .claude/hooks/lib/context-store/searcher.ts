import type { Database } from "bun:sqlite";
import type { ContextChunk, VirtualizationResult } from "./types";
import { estimateTokens } from "./indexer";

function sanitizeQuery(query: string): string {
  return query
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length > 1)
    .join(" ");
}

/**
 * Search the FTS5 store for chunks matching a query.
 * Returns chunks ordered by BM25 relevance.
 */
export function search(
  db: Database,
  query: string,
  limit: number = 10,
): VirtualizationResult {
  const start = Date.now();
  const sanitized = sanitizeQuery(query);

  if (!sanitized) {
    return { chunks: [], totalTokens: 0, durationMs: 0 };
  }

  try {
    const rows = db
      .query(
        `SELECT
        chunks.rowid,
        chunks.source,
        chunks.content,
        chunks.summary,
        chunk_meta.tokens,
        chunk_meta.timestamp,
        chunk_meta.session_id,
        rank
      FROM chunks
      JOIN chunk_meta ON chunks.rowid = chunk_meta.rowid
      WHERE chunks MATCH ?
      ORDER BY rank
      LIMIT ?`,
      )
      .all(sanitized, limit) as Array<{
      rowid: number;
      source: string;
      content: string;
      summary: string;
      tokens: number;
      timestamp: number;
      session_id: string;
      rank: number;
    }>;

    const chunks: ContextChunk[] = rows.map((row) => ({
      rowid: row.rowid,
      source: row.source,
      content: row.content,
      summary: row.summary,
      tokens: row.tokens,
      timestamp: row.timestamp,
      sessionId: row.session_id,
      rank: row.rank,
    }));

    const totalTokens = chunks.reduce((sum, c) => sum + c.tokens, 0);

    return {
      chunks,
      totalTokens,
      durationMs: Date.now() - start,
    };
  } catch {
    return { chunks: [], totalTokens: 0, durationMs: Date.now() - start };
  }
}

/**
 * Get a summary of all chunks from a specific session.
 * Returns concatenated content of top chunks up to maxTokens.
 */
export function getSessionSummary(
  db: Database,
  sessionId: string,
  maxTokens: number = 4000,
): string {
  try {
    const rows = db
      .query(
        `SELECT
        chunks.source,
        chunks.content,
        chunk_meta.tokens
      FROM chunks
      JOIN chunk_meta ON chunks.rowid = chunk_meta.rowid
      WHERE chunk_meta.session_id = ?
      ORDER BY chunk_meta.timestamp DESC`,
      )
      .all(sessionId) as Array<{
      source: string;
      content: string;
      tokens: number;
    }>;

    const parts: string[] = [];
    let usedTokens = 0;

    for (const row of rows) {
      if (usedTokens + row.tokens > maxTokens) break;
      parts.push(`### ${row.source}\n${row.content}`);
      usedTokens += row.tokens;
    }

    return parts.join("\n\n");
  } catch {
    return "";
  }
}

/**
 * Get statistics about the current store.
 */
export function getStoreStats(db: Database): {
  totalChunks: number;
  totalTokens: number;
  sessions: string[];
  topSources: Array<{ source: string; count: number }>;
} {
  try {
    const countResult = db
      .query("SELECT COUNT(*) as count FROM chunk_meta")
      .get() as { count: number };
    const tokenResult = db
      .query("SELECT COALESCE(SUM(tokens), 0) as total FROM chunk_meta")
      .get() as { total: number };
    const sessionResult = db
      .query("SELECT DISTINCT session_id FROM chunk_meta")
      .all() as Array<{ session_id: string }>;
    const sourceResult = db
      .query(
        `SELECT source, COUNT(*) as count
      FROM chunks
      GROUP BY source
      ORDER BY count DESC
      LIMIT 10`,
      )
      .all() as Array<{ source: string; count: number }>;

    return {
      totalChunks: countResult.count,
      totalTokens: tokenResult.total,
      sessions: sessionResult.map((r) => r.session_id),
      topSources: sourceResult,
    };
  } catch {
    return { totalChunks: 0, totalTokens: 0, sessions: [], topSources: [] };
  }
}
