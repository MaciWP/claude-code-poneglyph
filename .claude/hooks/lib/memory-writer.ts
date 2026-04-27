import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from "fs";
import { join } from "path";
import { computeProjectHash } from "./memory-hash.js";

const DEFAULT_BASE_DIR = join(import.meta.dir, "..", "..", "agent-memory");
const MAX_MEMORY_CHARS = 20000;
const HASH_COMMENT_RE = /<!--\s*hash_at_write:\s*[a-f0-9]+\s*-->\n?/;
const HASH_COMMENT_PATTERN = /<!--\s*hash_at_write:/;

function getBaseDir(): string {
  return process.env.CLAUDE_MEMORY_DIR ?? DEFAULT_BASE_DIR;
}

export interface TranscriptMessage {
  role?: string;
  content?: unknown;
  [key: string]: unknown;
}

function getTextFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const block of content) {
    if (typeof block === "object" && block !== null) {
      const b = block as { type?: string; text?: string };
      if (b.type === "text" && typeof b.text === "string") {
        parts.push(b.text);
      }
    }
  }
  return parts.join("\n");
}

export function extractMemoryInsights(transcript: TranscriptMessage[]): string | null {
  const assistantMessages = transcript.filter((m) => m.role === "assistant");
  if (assistantMessages.length === 0) return null;

  const lastAssistant = assistantMessages[assistantMessages.length - 1];
  const text = getTextFromContent(lastAssistant.content);

  const match = text.match(/#{2,3}\s+Memory Insights\s*\n([\s\S]*?)(?=\n#{1,3}\s|\n*$)/);
  if (!match) return null;

  const body = match[1].trim();
  if (!body) return null;

  const contamination = /\[1-5 insights|\*\*(?:Que|What)\s+(?:NO[T]?\s+)?(?:to\s+)?inclu/i;
  if (contamination.test(body)) return null;

  return body;
}

function memoryPath(agentName: string): string {
  return join(getBaseDir(), agentName, "MEMORY.md");
}

function agentDir(agentName: string): string {
  return join(getBaseDir(), agentName);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function removeOldestSection(content: string): string {
  const firstSection = content.indexOf("\n## ");
  if (firstSection === -1) return "";
  const nextSection = content.indexOf("\n## ", firstSection + 1);
  if (nextSection === -1) {
    const headerEnd = content.indexOf("\n\n");
    return headerEnd !== -1 ? content.slice(0, headerEnd + 2) : "";
  }
  return content.slice(0, firstSection) + content.slice(nextSection);
}

export function pruneMemory(agentName: string, maxChars: number = MAX_MEMORY_CHARS): void {
  const path = memoryPath(agentName);
  if (!existsSync(path)) return;

  let content = readFileSync(path, "utf-8");
  let iterations = 0;
  while (content.length > maxChars && iterations < 100) {
    content = removeOldestSection(content);
    iterations++;
  }
  writeFileSync(path, content, "utf-8");
}

function buildHashComment(hash: string): string {
  return `<!-- hash_at_write: ${hash} -->\n`;
}

function injectHashComment(fileContent: string, hash: string): string {
  const comment = buildHashComment(hash);
  if (HASH_COMMENT_PATTERN.test(fileContent)) {
    return fileContent.replace(HASH_COMMENT_RE, comment);
  }
  return comment + fileContent;
}

export async function persistMemory(
  agentName: string,
  sessionId: string,
  insights: string,
  cwd?: string,
): Promise<void> {
  const dir = agentDir(agentName);
  const path = memoryPath(agentName);

  mkdirSync(dir, { recursive: true });

  const sessionShort = sessionId.slice(0, 8);
  const dateStr = formatDate(new Date());
  const section = `\n## ${dateStr} — Session ${sessionShort}\n${insights}\n`;

  let hash: string | undefined;
  if (cwd) {
    try {
      hash = await computeProjectHash(cwd);
    } catch {
      console.debug("[memory-writer] failed to compute project hash, skipping");
    }
  }

  if (!existsSync(path)) {
    const agentTitle = agentName.charAt(0).toUpperCase() + agentName.slice(1);
    let initial = `# ${agentTitle} Memory\n\n`;
    if (hash) initial = buildHashComment(hash) + initial;
    writeFileSync(path, initial, "utf-8");
  } else if (hash) {
    const existing = readFileSync(path, "utf-8");
    writeFileSync(path, injectHashComment(existing, hash), "utf-8");
  }

  appendFileSync(path, section, "utf-8");
  pruneMemory(agentName, MAX_MEMORY_CHARS);
}
