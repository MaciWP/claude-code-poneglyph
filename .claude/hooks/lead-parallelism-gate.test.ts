import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { join } from "path";
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from "fs";
import { homedir } from "os";

const HOOK_PATH = join(import.meta.dir, "lead-parallelism-gate.ts");
const SKIP_LOG_PATH = join(homedir(), ".claude", "parallelism-skips.jsonl");

const tmpDir = join(import.meta.dir, "__test_temp_parallelism__");

interface RunResult {
  exitCode: number;
  stderr: string;
  stdout: string;
}

async function runHook(
  stdinJson: object,
  transcriptContent?: object[],
): Promise<RunResult> {
  let transcriptPath: string | undefined;

  if (transcriptContent !== undefined) {
    transcriptPath = join(tmpDir, `transcript-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    writeFileSync(transcriptPath, JSON.stringify(transcriptContent), "utf-8");
  }

  const inputWithPath = transcriptPath
    ? { ...stdinJson, transcript_path: transcriptPath }
    : stdinJson;

  const proc = Bun.spawn([process.execPath, HOOK_PATH], {
    stdin: new Blob([JSON.stringify(inputWithPath)]),
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env },
  });

  const exitCode = await proc.exited;
  const stderr = await new Response(proc.stderr).text();
  const stdout = await new Response(proc.stdout).text();

  return { exitCode, stderr, stdout };
}

function makeTranscript(
  userMessage: string,
  assistantMessage?: string,
): object[] {
  const entries: object[] = [
    { role: "user", content: userMessage },
  ];
  if (assistantMessage !== undefined) {
    entries.push({ role: "assistant", content: assistantMessage });
  }
  return entries;
}

function readSkipLog(): string[] {
  try {
    if (!existsSync(SKIP_LOG_PATH)) return [];
    return readFileSync(SKIP_LOG_PATH, "utf-8")
      .split("\n")
      .filter((l) => l.trim().length > 0);
  } catch {
    return [];
  }
}

let skipLogBackup: string | null = null;

beforeAll(() => {
  mkdirSync(tmpDir, { recursive: true });

  try {
    if (existsSync(SKIP_LOG_PATH)) {
      skipLogBackup = readFileSync(SKIP_LOG_PATH, "utf-8");
    }
    // remove for clean test state
    if (existsSync(SKIP_LOG_PATH)) {
      rmSync(SKIP_LOG_PATH);
    }
  } catch {
    skipLogBackup = null;
  }
});

afterAll(() => {
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // cleanup best effort
  }

  try {
    if (skipLogBackup !== null) {
      writeFileSync(SKIP_LOG_PATH, skipLogBackup, "utf-8");
    } else if (existsSync(SKIP_LOG_PATH)) {
      rmSync(SKIP_LOG_PATH);
    }
  } catch {
    // cleanup best effort
  }
});

describe("lead-parallelism-gate", () => {
  test("non-Agent tool call is a no-op and exits 0", async () => {
    const result = await runHook({ tool_name: "Edit", tool_input: { file_path: "foo.ts" } });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  test("Agent call with no transcript_path is a no-op", async () => {
    const result = await runHook({
      tool_name: "Agent",
      tool_input: { subagent_type: "builder", prompt: "do something" },
      session_id: "s1",
    });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  test("Agent call with nonexistent transcript_path is a no-op", async () => {
    const result = await runHook({
      tool_name: "Agent",
      tool_input: { subagent_type: "builder", prompt: "do something" },
      session_id: "s1",
      transcript_path: join(tmpDir, "nonexistent-transcript.json"),
    });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  test("Agent call with no multi-task keywords produces no warning", async () => {
    const transcript = makeTranscript("Fix the login bug in auth.ts");
    const result = await runHook(
      { tool_name: "Agent", tool_input: { subagent_type: "builder" }, session_id: "s2" },
      transcript,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  test("Agent call with multi-task keyword 'y también' and no dependency reason emits warning and logs", async () => {
    const logsBefore = readSkipLog().length;
    const transcript = makeTranscript(
      "Refactora el componente Login y también actualiza los tests",
      "Delegando al builder...",
    );
    const result = await runHook(
      { tool_name: "Agent", tool_input: { subagent_type: "builder" }, session_id: "s3" },
      transcript,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("Parallelism gate");
    expect(result.stderr).toContain("también");

    const logsAfter = readSkipLog();
    expect(logsAfter.length).toBe(logsBefore + 1);
    const entry = JSON.parse(logsAfter[logsAfter.length - 1]);
    expect(entry.session_id).toBe("s3");
    expect(entry.agent_type).toBe("builder");
    expect(entry.dependency_reason_found).toBe(false);
    expect(entry.user_keywords_matched.some((k: string) => k.includes("también"))).toBe(true);
  });

  test("Agent call with multi-task keyword but Lead states dependency reason produces no warning", async () => {
    const logsBefore = readSkipLog().length;
    const transcript = makeTranscript(
      "Crea el endpoint y también actualiza la documentación",
      "Solo delegation — esperando scout output antes del builder para tener el mapa de archivos completo.",
    );
    const result = await runHook(
      { tool_name: "Agent", tool_input: { subagent_type: "scout" }, session_id: "s4" },
      transcript,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");

    const logsAfter = readSkipLog();
    expect(logsAfter.length).toBe(logsBefore);
  });

  test("malformed JSON stdin exits 0 without crash", async () => {
    const proc = Bun.spawn([process.execPath, HOOK_PATH], {
      stdin: new Blob(["{not valid json{{{"]),
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env },
    });
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });

  test("Agent call with 'also' keyword triggers warning", async () => {
    const transcript = makeTranscript(
      "Create the service and also add unit tests",
      "Proceeding with builder.",
    );
    const result = await runHook(
      { tool_name: "Agent", tool_input: { subagent_type: "builder" }, session_id: "s5" },
      transcript,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("Parallelism gate");
  });

  test("Agent call with 'depends on' in Lead message suppresses warning", async () => {
    const transcript = makeTranscript(
      "Build the API and also generate the OpenAPI spec",
      "Running builder first — reviewer depends on having the implementation done.",
    );
    const result = await runHook(
      { tool_name: "Agent", tool_input: { subagent_type: "builder" }, session_id: "s6" },
      transcript,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  test("3 sequential Explore delegations across turns emits cross-turn warning", async () => {
    const transcript: object[] = [
      { role: "user", content: "Explore the project structure" },
      {
        role: "assistant",
        content: [
          { type: "text", text: "Launching first exploration." },
          { type: "tool_use", name: "Agent", input: { subagent_type: "Explore", prompt: "p1" } },
        ],
      },
      { role: "user", content: "now the hooks folder" },
      {
        role: "assistant",
        content: [
          { type: "text", text: "Next exploration." },
          { type: "tool_use", name: "Agent", input: { subagent_type: "Explore", prompt: "p2" } },
        ],
      },
      { role: "user", content: "and now skills" },
    ];
    const result = await runHook(
      { tool_name: "Agent", tool_input: { subagent_type: "Explore", prompt: "p3" }, session_id: "cross1" },
      transcript,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("lead-parallelism-gate");
    expect(result.stderr).toContain("sequential");
    expect(result.stderr).toContain("Explore");
  });

  test("2 Agents batched in same assistant message produces NO cross-turn warning", async () => {
    const transcript: object[] = [
      { role: "user", content: "Explore everything" },
      {
        role: "assistant",
        content: [
          { type: "text", text: "Batching both." },
          { type: "tool_use", name: "Agent", input: { subagent_type: "Explore", prompt: "a" } },
          { type: "tool_use", name: "Agent", input: { subagent_type: "Explore", prompt: "b" } },
        ],
      },
      { role: "user", content: "continue with one more" },
    ];
    const result = await runHook(
      { tool_name: "Agent", tool_input: { subagent_type: "Explore", prompt: "c" }, session_id: "cross2" },
      transcript,
    );
    expect(result.exitCode).toBe(0);
    // No multi-task keywords in user msg AND prior batch was parallel → no warning
    expect(result.stderr).toBe("");
  });

  test("Sequential Agents with different subagent_types produce NO cross-turn warning", async () => {
    const transcript: object[] = [
      { role: "user", content: "Build the feature" },
      {
        role: "assistant",
        content: [
          { type: "text", text: "Scouting first." },
          { type: "tool_use", name: "Agent", input: { subagent_type: "scout", prompt: "p1" } },
        ],
      },
      { role: "user", content: "continue" },
      {
        role: "assistant",
        content: [
          { type: "text", text: "Now building." },
          { type: "tool_use", name: "Agent", input: { subagent_type: "builder", prompt: "p2" } },
        ],
      },
      { role: "user", content: "now review" },
    ];
    const result = await runHook(
      { tool_name: "Agent", tool_input: { subagent_type: "reviewer", prompt: "p3" }, session_id: "cross3" },
      transcript,
    );
    expect(result.exitCode).toBe(0);
    // scout → builder → reviewer is a legitimate sequential pipeline, no warning.
    expect(result.stderr).toBe("");
  });
});
