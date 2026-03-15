import type { Database } from "bun:sqlite";
import { chunkText } from "./chunker";

const CHARS_PER_TOKEN = 4;

export { chunkText };

/**
 * Estimate token count from text (chars / 4 heuristic).
 * Same heuristic used in budgeter.ts.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Index content into the FTS5 store.
 * Chunks the text, estimates tokens, and inserts into both tables.
 */
export function indexContent(
  db: Database,
  source: string,
  content: string,
  sessionId: string,
  maxChunkTokens?: number,
): number {
  if (!content || content.trim().length === 0) return 0;

  const chunks = chunkText(content, maxChunkTokens);
  if (chunks.length === 0) return 0;

  const now = Date.now();

  const insertChunk = db.prepare(
    "INSERT INTO chunks (source, content, summary) VALUES (?, ?, ?)",
  );
  const insertMeta = db.prepare(
    "INSERT INTO chunk_meta (rowid, tokens, timestamp, session_id) VALUES (?, ?, ?, ?)",
  );

  const insertAll = db.transaction(() => {
    for (const chunk of chunks) {
      const tokens = estimateTokens(chunk);
      const summary = chunk.split("\n")[0].slice(0, 200);

      insertChunk.run(source, chunk, summary);
      const rowid = db
        .query("SELECT last_insert_rowid() as id")
        .get() as { id: number };
      insertMeta.run(rowid.id, tokens, now, sessionId);
    }
  });

  insertAll();
  return chunks.length;
}
