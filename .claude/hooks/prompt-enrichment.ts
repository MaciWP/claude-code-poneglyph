#!/usr/bin/env bun
/**
 * UserPromptSubmit hook — minimal version.
 * Only emits a sessionTitle on the first turn for UI/transcript organization.
 * Does NOT inject context to the LLM (decision 2026-05-26: skill hints removed
 * because Claude already has skill descriptions in system prompt; injecting per
 * prompt costs ~4,500 tokens/sesión with no behavioral upside).
 */

import { existsSync, readFileSync } from "node:fs";
import { readHookStdin } from "./lib/hook-stdin";

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

  if (!isFirstTurn(transcript_path)) {
    process.exit(0);
  }

  const output: HookOutput = {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      sessionTitle: buildSessionTitle(prompt),
    },
  };
  console.log(JSON.stringify(output));
}

if (import.meta.main) {
  main();
}
