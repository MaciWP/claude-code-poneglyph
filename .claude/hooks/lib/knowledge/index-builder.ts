import { existsSync, writeFileSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { KnowledgeEntry, KnowledgeIndex } from "./types";
import { loadGraph } from "./graph-storage";

const KNOWLEDGE_DIR = join(homedir(), ".claude", "knowledge");
const INDEX_PATH = join(KNOWLEDGE_DIR, "index.json");

function emptyIndex(): KnowledgeIndex {
  return {
    version: 1,
    entryCount: 0,
    byCategory: {},
    bySubject: {},
    byProject: {},
    byFile: {},
    byDomain: {},
  };
}

function addToRecord(
  record: Record<string, string[]>,
  key: string,
  id: string,
): void {
  if (!record[key]) {
    record[key] = [];
  }
  if (!record[key].includes(id)) {
    record[key].push(id);
  }
}

function indexEntry(index: KnowledgeIndex, entry: KnowledgeEntry): void {
  addToRecord(index.byCategory, entry.category, entry.id);
  addToRecord(index.bySubject, entry.subject.toLowerCase(), entry.id);

  if (entry.scope.project) {
    addToRecord(index.byProject, entry.scope.project, entry.id);
  }

  const files = entry.scope.files ?? [];
  for (const file of files) {
    addToRecord(index.byFile, file, entry.id);
  }

  const domains = entry.scope.domains ?? [];
  for (const domain of domains) {
    addToRecord(index.byDomain, domain, entry.id);
  }
}

export function buildIndex(entries: KnowledgeEntry[]): KnowledgeIndex {
  const index = emptyIndex();
  for (const entry of entries) {
    indexEntry(index, entry);
  }
  index.entryCount = entries.length;
  return index;
}

function saveIndex(index: KnowledgeIndex): void {
  try {
    if (!existsSync(KNOWLEDGE_DIR)) {
      mkdirSync(KNOWLEDGE_DIR, { recursive: true });
    }
    writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
  } catch {
    // best effort
  }
}

export async function rebuildIndex(
  graphPath?: string,
): Promise<KnowledgeIndex> {
  const entries = loadGraph(graphPath);
  const index = buildIndex(entries);
  saveIndex(index);
  return index;
}

export function updateIndex(
  index: KnowledgeIndex,
  entry: KnowledgeEntry,
): KnowledgeIndex {
  indexEntry(index, entry);
  index.entryCount++;
  return index;
}

export function resolveIds(
  ids: string[],
  entries: KnowledgeEntry[],
): KnowledgeEntry[] {
  const idSet = new Set(ids);
  return entries.filter((e) => idSet.has(e.id));
}
