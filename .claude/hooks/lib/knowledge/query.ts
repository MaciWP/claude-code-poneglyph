import type { KnowledgeEntry, KnowledgeQuery } from "./types";
import { loadGraph } from "./graph-storage";

function isSuperseded(
  entry: KnowledgeEntry,
  allEntries: KnowledgeEntry[],
): boolean {
  return allEntries.some((other) =>
    other.relations.supersedes.includes(entry.id),
  );
}

function matchesCategories(
  entry: KnowledgeEntry,
  categories: KnowledgeQuery["categories"],
): boolean {
  if (!categories) return true;
  return categories.includes(entry.category);
}

function matchesSubjects(
  entry: KnowledgeEntry,
  subjects: KnowledgeQuery["subjects"],
): boolean {
  if (!subjects) return true;
  const entrySubject = entry.subject.toLowerCase();
  return subjects.some((s) => entrySubject.includes(s.toLowerCase()));
}

function matchesFiles(
  entry: KnowledgeEntry,
  files: KnowledgeQuery["files"],
): boolean {
  if (!files) return true;
  const entryFiles = entry.scope.files;
  if (!entryFiles) return false;
  return files.some((f) => entryFiles.includes(f));
}

function matchesDomains(
  entry: KnowledgeEntry,
  domains: KnowledgeQuery["domains"],
): boolean {
  if (!domains) return true;
  const entryDomains = entry.scope.domains;
  if (!entryDomains) return false;
  return domains.some((d) => entryDomains.includes(d));
}

function matchesProject(
  entry: KnowledgeEntry,
  project: KnowledgeQuery["project"],
): boolean {
  if (!project) return true;
  return !entry.scope.project || entry.scope.project === project;
}

function matchesConfidence(
  entry: KnowledgeEntry,
  minConfidence: number,
): boolean {
  return entry.provenance.confidence >= minConfidence;
}

function getAgeDays(entry: KnowledgeEntry): number {
  const created = new Date(entry.provenance.createdAt).getTime();
  const now = Date.now();
  return (now - created) / (1000 * 60 * 60 * 24);
}

export function checkStaleness(entry: KnowledgeEntry): boolean {
  if (!entry.ttl) return false;
  return getAgeDays(entry) > entry.ttl;
}

export function filterByConfidence(
  entries: KnowledgeEntry[],
  min: number,
): KnowledgeEntry[] {
  return entries.filter((e) => e.provenance.confidence >= min);
}

export function filterByAge(
  entries: KnowledgeEntry[],
  maxDays: number,
): KnowledgeEntry[] {
  return entries.filter((e) => getAgeDays(e) <= maxDays);
}

export function queryKnowledge(
  query: KnowledgeQuery,
  graphPath?: string,
): KnowledgeEntry[] {
  const allEntries = loadGraph(graphPath);
  const minConf = query.minConfidence ?? 0;

  const filtered = allEntries.filter((entry) => {
    if (isSuperseded(entry, allEntries)) return false;
    if (checkStaleness(entry)) return false;
    if (!matchesCategories(entry, query.categories)) return false;
    if (!matchesSubjects(entry, query.subjects)) return false;
    if (!matchesFiles(entry, query.files)) return false;
    if (!matchesDomains(entry, query.domains)) return false;
    if (!matchesProject(entry, query.project)) return false;
    if (!matchesConfidence(entry, minConf)) return false;
    if (query.maxAge && getAgeDays(entry) > query.maxAge) return false;
    return true;
  });

  filtered.sort((a, b) => b.provenance.confidence - a.provenance.confidence);

  if (query.limit) {
    return filtered.slice(0, query.limit);
  }

  return filtered;
}
