#!/usr/bin/env bun

import { existsSync, readFileSync } from "node:fs";
import { readHookStdin } from "./lib/hook-stdin";
import { getSkillReadPaths, type SkillReadPath } from "./lib/path-rule-loader";

interface HookInput {
  hook_event_name: string;
  prompt: string;
  session_id: string;
  transcript_path: string;
  cwd: string;
}

interface HookOutput {
  hookSpecificOutput: {
    hookEventName: string;
    additionalContext: string;
    sessionTitle?: string;
  };
}

const TITLE_MAX_LEN = 50;

export function buildSessionTitle(prompt: string): string {
  const normalized = prompt.replace(/\s+/g, " ").trim();
  if (normalized.length <= TITLE_MAX_LEN) return normalized;
  const slice = normalized.slice(0, TITLE_MAX_LEN);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${cut}…`;
}

export function isFirstTurn(transcriptPath: string | undefined): boolean {
  try {
    if (!transcriptPath || !existsSync(transcriptPath)) return true;
    const content = readFileSync(transcriptPath, "utf-8").trim();
    if (content.length === 0) return true;
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    return lines.length <= 1;
  } catch {
    return false;
  }
}

const PATH_REGEX =
  /(?:[\w./\\-]+\.(?:ts|tsx|js|jsx|py|go|rs|java|rb|php|swift|kt|c|cpp|cs|md|json|yaml|yml|toml|cfg|ini))/g;

function extractPathSkills(prompt: string): SkillReadPath[] {
  try {
    const matches = prompt.match(PATH_REGEX);
    if (!matches) return [];

    const seen = new Set<string>();
    const result: SkillReadPath[] = [];

    for (const filePath of matches) {
      const readPaths = getSkillReadPaths(filePath);
      for (const entry of readPaths) {
        if (!seen.has(entry.name)) {
          seen.add(entry.name);
          result.push(entry);
        }
      }
    }

    return result;
  } catch {
    return [];
  }
}

async function emitOutput(
  context: string,
  prompt: string,
  sessionTitle?: string,
): Promise<void> {
  let enrichedContext = context;

  try {
    const pathSkills = extractPathSkills(prompt);
    if (pathSkills.length > 0) {
      const lines = pathSkills.map(
        (s) =>
          `- \`Read ${s.readPath}\` — matched path glob in ${s.matchedGlob}`,
      );
      enrichedContext +=
        `\n\n## Path-Based Skills (for delegation)\n\n` +
        `Based on files in your prompt, these skills likely apply. When delegating to a subagent, include a \`Read\` instruction for each:\n\n` +
        lines.join("\n");
    }
  } catch {
    // best-effort — never break memory-inject
  }

  const hasContext = enrichedContext && enrichedContext.trim().length > 0;
  if (!hasContext && !sessionTitle) return;

  const hookSpecificOutput: HookOutput["hookSpecificOutput"] = {
    hookEventName: "UserPromptSubmit",
    additionalContext: hasContext ? enrichedContext : "",
  };
  if (sessionTitle) hookSpecificOutput.sessionTitle = sessionTitle;

  const output: HookOutput = { hookSpecificOutput };
  console.log(JSON.stringify(output));
}

async function main(): Promise<void> {
  let input: HookInput;
  try {
    const stdin = await readHookStdin();
    input = JSON.parse(stdin) as HookInput;
  } catch {
    process.exit(0);
  }
  const { prompt, transcript_path } = input;
  if (!prompt || prompt.trim().length < 5) {
    process.exit(0);
  }
  const sessionTitle = isFirstTurn(transcript_path)
    ? buildSessionTitle(prompt)
    : undefined;
  await emitOutput("", prompt, sessionTitle);
}

if (import.meta.main) {
  main();
}
