/**
 * Tests for lead-enforcement.ts — default-allow gate.
 *
 * Block only on:
 *   - Negative keywords (destructive remove, forced push, db migration, schema edit)
 *   - Sensitive paths without "sensitive: <reason>" declaration
 *
 * Allow everything else.
 */

import { describe, expect, test } from "bun:test";
import { decide, type HookInput } from "../lead-enforcement";

function input(overrides: Partial<HookInput> & { tool_name?: string }): HookInput {
  return {
    tool_name: overrides.tool_name ?? "Edit",
    tool_input: overrides.tool_input ?? {},
    agent_id: overrides.agent_id,
    transcript_path: overrides.transcript_path,
  };
}

describe("decide() — default allow", () => {
  test("simple Edit on normal file with no declaration → allow", () => {
    const result = decide(
      input({ tool_input: { file_path: "/repo/src/foo.ts" } }),
      "Updating the foo function.",
    );
    expect(result.action).toBe("allow");
  });

  test("Write on new normal file with no declaration → allow", () => {
    const result = decide(
      input({ tool_name: "Write", tool_input: { file_path: "/repo/src/new.ts" } }),
      "Creating new file.",
    );
    expect(result.action).toBe("allow");
  });

  test("Bash with neutral command → allow", () => {
    const result = decide(
      input({ tool_name: "Bash", tool_input: { command: "npm test" } }),
      "Running tests.",
    );
    expect(result.action).toBe("allow");
  });

  test("multiple Edits in same turn (any number) → all allow", () => {
    const r1 = decide(input({ tool_input: { file_path: "/a.ts" } }), "");
    const r2 = decide(input({ tool_input: { file_path: "/b.ts" } }), "");
    const r3 = decide(input({ tool_input: { file_path: "/c.ts" } }), "");
    expect(r1.action).toBe("allow");
    expect(r2.action).toBe("allow");
    expect(r3.action).toBe("allow");
  });
});

describe("decide() — negative keywords always block", () => {
  test("Bash with destructive remove → block", () => {
    const result = decide(
      input({ tool_name: "Bash", tool_input: { command: "rm -rf /tmp/x" } }),
      "Cleaning up.",
    );
    expect(result.action).toBe("block");
    if (result.action === "block") expect(result.reason).toContain("destructive-remove");
  });

  test("Bash with git push forced → block", () => {
    const result = decide(
      input({ tool_name: "Bash", tool_input: { command: "git push --force origin main" } }),
      "",
    );
    expect(result.action).toBe("block");
    if (result.action === "block") expect(result.reason).toContain("forced-push");
  });

  test("assistant text mentions db migration → block", () => {
    const result = decide(
      input({ tool_input: { file_path: "/repo/foo.ts" } }),
      "Running database migration now.",
    );
    expect(result.action).toBe("block");
    if (result.action === "block") expect(result.reason).toContain("db-migration");
  });

  test("file_path contains schema change keyword → block", () => {
    const result = decide(
      input({ tool_input: { file_path: "/repo/schema change.sql" } }),
      "",
    );
    expect(result.action).toBe("block");
  });
});

describe("decide() — sensitive paths require declaration", () => {
  test(".env without declaration → block", () => {
    const result = decide(
      input({ tool_input: { file_path: "/repo/.env" } }),
      "Updating env.",
    );
    expect(result.action).toBe("block");
    if (result.action === "block") expect(result.reason).toContain("sensitive");
  });

  test(".env with valid sensitive declaration → allow", () => {
    const result = decide(
      input({ tool_input: { file_path: "/repo/.env" } }),
      "sensitive: rotating API keys for staging",
    );
    expect(result.action).toBe("allow");
  });

  test("package.json without declaration → block", () => {
    const result = decide(
      input({ tool_input: { file_path: "/repo/package.json" } }),
      "Adding dep.",
    );
    expect(result.action).toBe("block");
  });

  test("package.json with declaration → allow", () => {
    const result = decide(
      input({ tool_input: { file_path: "/repo/package.json" } }),
      "sensitive: adding new runtime dependency",
    );
    expect(result.action).toBe("allow");
  });

  test("bun.lockb without declaration → block", () => {
    const result = decide(
      input({ tool_input: { file_path: "/repo/bun.lockb" } }),
      "",
    );
    expect(result.action).toBe("block");
  });

  test(".claude/settings.json without declaration → block", () => {
    const result = decide(
      input({ tool_input: { file_path: "/repo/.claude/settings.json" } }),
      "",
    );
    expect(result.action).toBe("block");
  });

  test("secrets/api.key without declaration → block", () => {
    const result = decide(
      input({ tool_input: { file_path: "/repo/secrets/api.key" } }),
      "",
    );
    expect(result.action).toBe("block");
  });

  test("sensitive declaration with reason <8 chars → block (too short)", () => {
    const result = decide(
      input({ tool_input: { file_path: "/repo/.env" } }),
      "sensitive: short",
    );
    expect(result.action).toBe("block");
  });

  test("'sensitive override: <reason>' variant → allow", () => {
    const result = decide(
      input({ tool_input: { file_path: "/repo/.env" } }),
      "sensitive override: emergency hotfix for prod outage",
    );
    expect(result.action).toBe("allow");
  });
});

describe("decide() — negative wins over sensitive", () => {
  test("sensitive path + negative keyword → block on negative", () => {
    const result = decide(
      input({ tool_name: "Bash", tool_input: { command: "rm -rf .env" } }),
      "sensitive: cleaning up",
    );
    expect(result.action).toBe("block");
    if (result.action === "block") expect(result.reason).toContain("destructive-remove");
  });
});
