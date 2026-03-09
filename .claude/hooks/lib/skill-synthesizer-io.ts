/**
 * File I/O for skill synthesis (SPEC-014).
 * Draft writing, log management, existing skill keyword loading.
 */

import {
  mkdirSync,
  readdirSync,
  readFileSync,
  existsSync,
  writeFileSync,
  appendFileSync,
} from "fs";
import { join } from "path";
import { homedir } from "os";
import type { SynthesizedSkill, SynthesisLog } from "./skill-synthesizer-types";
import { formatDraftContent } from "./skill-synthesizer-content";

function getDraftDir(): string {
  return join(homedir(), ".claude", "skills-draft");
}

function getSkillsDir(): string {
  return join(homedir(), ".claude", "skills");
}

function getLogPath(): string {
  return join(homedir(), ".claude", "synthesis-log.jsonl");
}

export function writeDraft(skill: SynthesizedSkill): string {
  const dir = join(getDraftDir(), skill.name);
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, "SKILL.md");
  const content = formatDraftContent(skill);
  writeFileSync(filePath, content, "utf-8");
  return filePath;
}

function extractFrontmatterKeywords(content: string): string[] {
  const match = content.match(/^---\r?\n([\s\S]*?)---/);
  if (!match) return [];

  const yaml = match[1];
  const keywords: string[] = [];
  let inKeywords = false;

  for (const line of yaml.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("keywords:")) {
      const inline = trimmed.slice("keywords:".length).trim();
      if (inline.startsWith("[")) {
        return inline
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""));
      }
      inKeywords = true;
      continue;
    }
    if (inKeywords && trimmed.startsWith("- ")) {
      keywords.push(
        trimmed
          .slice(2)
          .trim()
          .replace(/^["']|["']$/g, ""),
      );
    } else if (inKeywords && trimmed && !trimmed.startsWith("-")) {
      inKeywords = false;
    }
  }
  return keywords;
}

function readSkillKeywords(dirPath: string, dirName: string): string[] {
  const skillPath = join(dirPath, dirName, "SKILL.md");
  try {
    if (!existsSync(skillPath)) return [];
    const content = readFileSync(skillPath, "utf-8");
    return extractFrontmatterKeywords(content);
  } catch {
    return [];
  }
}

export function loadExistingSkillKeywords(): string[][] {
  let dirs: string[];
  try {
    dirs = readdirSync(getSkillsDir());
  } catch {
    return [];
  }

  const skillsDir = getSkillsDir();
  const result: string[][] = [];
  for (const dir of dirs) {
    const kws = readSkillKeywords(skillsDir, dir);
    if (kws.length > 0) result.push(kws);
  }
  return result;
}

export function appendLog(entry: SynthesisLog): void {
  try {
    mkdirSync(join(homedir(), ".claude"), { recursive: true });
    const line = JSON.stringify(entry) + "\n";
    appendFileSync(getLogPath(), line);
  } catch {
    // Best effort
  }
}

function parseLogLine(line: string): SynthesisLog | null {
  if (!line.trim()) return null;
  try {
    return JSON.parse(line) as SynthesisLog;
  } catch {
    return null;
  }
}

export function loadSynthesisLog(): SynthesisLog[] {
  const logPath = getLogPath();
  try {
    if (!existsSync(logPath)) return [];
    const content = readFileSync(logPath, "utf-8");
    return content
      .split("\n")
      .map(parseLogLine)
      .filter((entry): entry is SynthesisLog => entry !== null);
  } catch {
    return [];
  }
}
