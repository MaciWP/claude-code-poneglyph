import {
  existsSync,
  readFileSync,
  appendFileSync,
  writeFileSync,
  mkdirSync,
} from "fs";
import { join } from "path";
import { homedir } from "os";
import type { KnowledgeEntry } from "./types";

const KNOWLEDGE_DIR = join(homedir(), ".claude", "knowledge");
const GRAPH_PATH = join(KNOWLEDGE_DIR, "graph.jsonl");

export function getGraphPath(): string {
  return GRAPH_PATH;
}

export function getKnowledgeDir(): string {
  return KNOWLEDGE_DIR;
}

export function nowIso(): string {
  return new Date().toISOString();
}

function parseJsonlLine(line: string): KnowledgeEntry | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as KnowledgeEntry;
  } catch {
    return null;
  }
}

export function loadGraph(graphPath?: string): KnowledgeEntry[] {
  const path = graphPath ?? GRAPH_PATH;
  try {
    if (!existsSync(path)) return [];
    const content = readFileSync(path, "utf-8");
    return content
      .split("\n")
      .map(parseJsonlLine)
      .filter((e): e is KnowledgeEntry => e !== null);
  } catch {
    return [];
  }
}

export function saveEntry(entry: KnowledgeEntry, graphPath?: string): void {
  const path = graphPath ?? GRAPH_PATH;
  const dir = join(path, "..");
  try {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    appendFileSync(path, JSON.stringify(entry) + "\n");
  } catch {
    // best effort
  }
}

export function rewriteGraph(
  entries: KnowledgeEntry[],
  graphPath?: string,
): void {
  const path = graphPath ?? GRAPH_PATH;
  const dir = join(path, "..");
  try {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const content =
      entries.length > 0
        ? entries.map((e) => JSON.stringify(e)).join("\n") + "\n"
        : "";
    writeFileSync(path, content);
  } catch {
    // best effort
  }
}

export function extractContentKeywords(content: string): string[] {
  return content
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}
