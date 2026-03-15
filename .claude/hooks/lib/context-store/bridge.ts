import type { Database } from "bun:sqlite";
import type { KnowledgeCategory } from "../knowledge/types";
import { queryKnowledge } from "../knowledge/query";
import { writeEntry } from "../knowledge/graph";
import { indexContent } from "./indexer";
import { getSessionSummary, getStoreStats } from "./searcher";

const HYDRATE_CATEGORIES: KnowledgeCategory[] = [
  "architecture",
  "debug_insight",
  "pattern",
];
const HYDRATE_MAX_AGE = 7;
const DEFAULT_MAX_ENTRIES = 20;

export function hydrateFromKnowledge(
  db: Database,
  query: string,
  sessionId: string,
  maxEntries: number = DEFAULT_MAX_ENTRIES,
): number {
  try {
    const entries = queryKnowledge({
      categories: HYDRATE_CATEGORIES,
      maxAge: HYDRATE_MAX_AGE,
      limit: maxEntries,
    });

    let indexed = 0;
    for (const entry of entries) {
      const source = `knowledge:${entry.id}`;
      const chunksAdded = indexContent(db, source, entry.content, sessionId);
      if (chunksAdded > 0) indexed++;
    }
    return indexed;
  } catch {
    return 0;
  }
}

export function persistToKnowledge(
  db: Database,
  sessionId: string,
  project?: string,
): number {
  try {
    const summary = getSessionSummary(db, sessionId, 4000);
    if (!summary || summary.trim().length === 0) return 0;

    const stats = getStoreStats(db);
    if (stats.totalChunks === 0) return 0;

    const scope: { project?: string } = {};
    if (project) scope.project = project;

    writeEntry({
      category: "architecture" as KnowledgeCategory,
      subject: `context-session-${sessionId}`,
      content: summary,
      scope,
      ttl: 7,
      provenance: {
        agent: "session-digest",
        session: sessionId,
        confidence: 0.6,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        validatedBy: [],
      },
      relations: {
        relatedTo: [],
        supersedes: [],
        derivedFrom: [],
      },
    });

    return 1;
  } catch {
    return 0;
  }
}
