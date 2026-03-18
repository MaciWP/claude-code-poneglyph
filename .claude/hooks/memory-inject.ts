#!/usr/bin/env bun

import { existsSync } from "node:fs";
import {
  loadSuggestions,
  formatSuggestionsForContext,
} from "./lib/routing-suggestions";
import { getSkillsForPath } from "./lib/path-rule-loader";
import {
  createStore,
  closeStore,
  getSessionDbPath,
} from "./lib/context-store/store";
import { hydrateFromKnowledge } from "./lib/context-store/bridge";
import { search } from "./lib/context-store/searcher";

interface HookInput {
  hook_event_name: string;
  prompt: string;
  session_id: string;
  transcript_path: string;
  cwd: string;
}

interface MemorySearchResult {
  memory: {
    id: string;
    content: string;
    type: string;
    laneType?: string;
    title?: string;
    confidence: {
      current: number;
    };
  };
  similarity: number;
  relevanceScore: number;
}

interface InjectionResponse {
  memories: MemorySearchResult[];
  context: string;
  metadata: {
    queryTimeMs: number;
    memoriesConsidered: number;
    memoriesInjected: number;
  };
}

interface HookOutput {
  hookSpecificOutput: {
    hookEventName: string;
    additionalContext: string;
  };
}

const API_URL = process.env.MEMORY_API_URL || "http://localhost:8080";
const TIMEOUT_MS = 4000;
const WARM_START_LIMIT = 5;

function recoverWarmStartContext(prompt: string): string {
  try {
    const dbPath = getSessionDbPath();
    if (!existsSync(dbPath)) return "";

    const db = createStore(dbPath);
    try {
      hydrateFromKnowledge(db, prompt, `session-${process.ppid}`, 20);

      const result = search(db, prompt, WARM_START_LIMIT);
      if (result.chunks.length === 0) return "";

      const recoveredContext = result.chunks
        .map((c) => `### ${c.source}\n${c.content}`)
        .join("\n\n");

      return `\n\n## Recovered Context (from session index)\n${recoveredContext}`;
    } finally {
      closeStore(db);
    }
  } catch {
    return "";
  }
}

const PATH_REGEX =
  /(?:[\w./\\-]+\.(?:ts|tsx|js|jsx|py|go|rs|java|rb|php|swift|kt|c|cpp|cs|md|json|yaml|yml|toml|cfg|ini))/g;

function extractPathSkills(prompt: string): string[] {
  try {
    const matches = prompt.match(PATH_REGEX);
    if (!matches) return [];

    const seen = new Set<string>();
    const skills: string[] = [];

    for (const filePath of matches) {
      const pathSkills = getSkillsForPath(filePath);
      for (const skill of pathSkills) {
        if (!seen.has(skill)) {
          seen.add(skill);
          skills.push(skill);
        }
      }
    }

    return skills;
  } catch {
    return [];
  }
}

function emitOutput(context: string, prompt: string): void {
  const warmStart = recoverWarmStartContext(prompt);
  let enrichedContext = context + warmStart;

  try {
    const pathSkills = extractPathSkills(prompt);
    if (pathSkills.length > 0) {
      enrichedContext += `\n\n## Path-Based Skills\nRecommended skills based on files in prompt: ${pathSkills.join(", ")}`;
    }
  } catch {
    // best-effort — never break memory-inject
  }

  if (!enrichedContext || enrichedContext.trim().length === 0) return;

  const output: HookOutput = {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: enrichedContext,
    },
  };
  console.log(JSON.stringify(output));
}

function emitRoutingSuggestionsFallback(prompt: string): void {
  try {
    const suggestions = loadSuggestions();
    const context = formatSuggestionsForContext(suggestions);
    emitOutput(context ?? "", prompt);
  } catch {
    try {
      emitOutput("", prompt);
    } catch {
      // best effort - never block Claude Code
    }
  }
}

async function main(): Promise<void> {
  let input: HookInput;

  try {
    const stdin = await Bun.stdin.text();
    input = JSON.parse(stdin) as HookInput;
  } catch {
    process.exit(0);
  }

  const { prompt, session_id } = input;

  if (!prompt || prompt.trim().length < 5) {
    process.exit(0);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${API_URL}/api/memory/inject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: prompt,
        sessionId: session_id,
        maxMemories: 5,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      emitRoutingSuggestionsFallback(prompt);
      process.exit(0);
    }

    const result = (await response.json()) as InjectionResponse;

    if (!result.context || result.context.trim().length === 0) {
      emitRoutingSuggestionsFallback(prompt);
      process.exit(0);
    }

    emitOutput(result.context, prompt);
  } catch {
    emitRoutingSuggestionsFallback(prompt);
    process.exit(0);
  }
}

main();
