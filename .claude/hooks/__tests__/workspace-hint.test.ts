import { describe, test, expect } from "bun:test";
import { bjumperWorkspaceHint } from "../workspace-hint";

describe("bjumperWorkspaceHint — location-conditional (030, relocated 2026-08-07)", () => {
  test("cwd inside the Bjumper workspace → hint pointing at worktrees-bjumper", () => {
    const out = bjumperWorkspaceHint("/Users/oriol/Desktop/Bjumper/REPOSITORIOS/PYTHON/binora-backend");
    expect(out).toContain("worktrees-bjumper");
  });

  test("hint carries the stable map: root, worktree layout, CLI verbs, discovery", () => {
    const out = bjumperWorkspaceHint("/Users/oriol/Desktop/Bjumper/REPOSITORIOS/PYTHON")!;
    expect(out).toContain("REPOSITORIOS/PYTHON");
    expect(out).toContain("worktrees/<env>/<repo>/");
    expect(out).toContain("devenv.py");
    expect(out).toContain("git worktree list");
  });

  test("workspace root itself also matches", () => {
    expect(bjumperWorkspaceHint("/Users/oriol/Desktop/Bjumper/REPOSITORIOS")).not.toBeNull();
  });

  test("Windows separators match too", () => {
    expect(bjumperWorkspaceHint("C:\\Users\\oriol\\Bjumper\\REPOSITORIOS\\repo")).not.toBeNull();
  });

  test("outside the workspace → silence", () => {
    expect(bjumperWorkspaceHint("/Users/oriol/Desktop/Bjumper/PERSONAL/REPO/claude-code-poneglyph")).toBeNull();
    expect(bjumperWorkspaceHint("/Users/oriol/otros/REPOSITORIOS")).toBeNull();
  });
});
