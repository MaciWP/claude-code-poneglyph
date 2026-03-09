import type { KnowledgeEntry, KnowledgeCategory } from "./types";
import {
  loadGraph as loadGraphFromStorage,
  saveEntry as saveEntryToStorage,
  rewriteGraph,
  extractContentKeywords,
  nowIso,
} from "./graph-storage";
import { buildFullEntry, validate } from "./graph-entry";

function findMatch(
  entries: KnowledgeEntry[],
  category: KnowledgeCategory,
  subject: string,
  content: string,
): KnowledgeEntry | null {
  const contentKw = new Set(extractContentKeywords(content));
  const subjectLower = subject.toLowerCase();

  for (const entry of entries) {
    if (entry.category !== category) continue;
    if (entry.subject.toLowerCase() !== subjectLower) continue;

    const existingKw = extractContentKeywords(entry.content);
    const overlap = existingKw.filter((kw) => contentKw.has(kw)).length;
    if (overlap > 0) return entry;
  }

  return null;
}

function mergeEqualConfidence(
  entries: KnowledgeEntry[],
  match: KnowledgeEntry,
  newEntry: KnowledgeEntry,
  graphPath?: string,
): KnowledgeEntry {
  match.content = match.content + "\n" + newEntry.content;
  match.provenance.updatedAt = nowIso();
  rewriteGraph(entries, graphPath);
  return match;
}

function addValidation(
  entries: KnowledgeEntry[],
  match: KnowledgeEntry,
  agentName: string,
  graphPath?: string,
): KnowledgeEntry {
  match.provenance.validatedBy = [
    ...new Set([...match.provenance.validatedBy, agentName]),
  ];
  match.provenance.updatedAt = nowIso();
  rewriteGraph(entries, graphPath);
  return match;
}

export function writeEntry(
  partial: Partial<KnowledgeEntry>,
  graphPath?: string,
): KnowledgeEntry {
  const validation = validate(partial);
  if (!validation.valid) {
    throw new Error(`Invalid entry: ${validation.errors.join(", ")}`);
  }

  const entries = loadGraphFromStorage(graphPath);
  const match = findMatch(
    entries,
    partial.category!,
    partial.subject!,
    partial.content!,
  );
  const newEntry = buildFullEntry(partial);

  if (!match) {
    saveEntryToStorage(newEntry, graphPath);
    return newEntry;
  }

  if (newEntry.provenance.confidence > match.provenance.confidence) {
    supersede(match.id, newEntry, graphPath);
    return newEntry;
  }

  if (newEntry.provenance.confidence === match.provenance.confidence) {
    return mergeEqualConfidence(entries, match, newEntry, graphPath);
  }

  return addValidation(entries, match, newEntry.provenance.agent, graphPath);
}

export function readEntry(
  id: string,
  graphPath?: string,
): KnowledgeEntry | null {
  const entries = loadGraphFromStorage(graphPath);
  return entries.find((e) => e.id === id) ?? null;
}

export function supersede(
  oldId: string,
  newEntry: KnowledgeEntry,
  graphPath?: string,
): void {
  const entries = loadGraphFromStorage(graphPath);
  const oldEntry = entries.find((e) => e.id === oldId);

  if (oldEntry) {
    oldEntry.relations.supersedes = [];
    if (!newEntry.relations.supersedes.includes(oldId)) {
      newEntry.relations.supersedes = [...newEntry.relations.supersedes, oldId];
    }
  }

  entries.push(newEntry);
  rewriteGraph(entries, graphPath);
}

export function archive(id: string, graphPath?: string): void {
  const entries = loadGraphFromStorage(graphPath);
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return;

  entries.splice(idx, 1);
  rewriteGraph(entries, graphPath);
}
