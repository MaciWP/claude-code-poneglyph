/** A chunk of indexed content stored in FTS5 */
export interface ContextChunk {
  /** FTS5 rowid */
  rowid: number;
  /** Source identifier (file path, tool name, etc.) */
  source: string;
  /** The actual content text */
  content: string;
  /** Optional summary of the content */
  summary: string;
  /** Estimated token count */
  tokens: number;
  /** Unix timestamp when indexed */
  timestamp: number;
  /** Session identifier */
  sessionId: string;
  /** BM25 rank score (lower = more relevant) */
  rank?: number;
}

/** Result of a virtualization/search operation */
export interface VirtualizationResult {
  /** Matching chunks ordered by relevance */
  chunks: ContextChunk[];
  /** Total tokens across all chunks */
  totalTokens: number;
  /** Time taken for the operation in ms */
  durationMs: number;
}

/** Session checkpoint data for persistence */
export interface SessionCheckpoint {
  sessionId: string;
  totalChunks: number;
  totalTokens: number;
  topSources: string[];
  exportedAt: number;
}

/** Options for creating a store */
export interface StoreOptions {
  /** Path to SQLite file. Defaults to ":memory:" */
  path?: string;
  /** Enable WAL mode for concurrent access */
  walMode?: boolean;
}
