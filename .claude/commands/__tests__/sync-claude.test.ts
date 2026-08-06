import { describe, it, expect } from "bun:test";
import * as path from "path";
import { expandRulesLinks } from "../sync-claude.ts";

const SRC = path.join("/repo", ".claude", "rules");
const DEST = path.join("/home", ".claude", "rules");
const PROJECT_ONLY = new Set(["test-policy.md"]);

describe("expandRulesLinks", () => {
  it("links top-level rule files individually as file links", () => {
    const out = expandRulesLinks(
      SRC,
      DEST,
      [{ name: "error-recovery.md", isDirectory: false }],
      PROJECT_ONLY,
    );
    expect(out).toEqual([
      {
        source: path.join(SRC, "error-recovery.md"),
        dest: path.join(DEST, "error-recovery.md"),
        type: "file",
      },
    ]);
  });

  it("excludes project-only rules from the global set", () => {
    const out = expandRulesLinks(
      SRC,
      DEST,
      [{ name: "test-policy.md", isDirectory: false }],
      PROJECT_ONLY,
    );
    expect(out).toEqual([]);
  });

  it("links subdirectories as directory links", () => {
    const out = expandRulesLinks(
      SRC,
      DEST,
      [{ name: "paths", isDirectory: true }],
      PROJECT_ONLY,
    );
    expect(out).toEqual([
      {
        source: path.join(SRC, "paths"),
        dest: path.join(DEST, "paths"),
        type: "directory",
      },
    ]);
  });

  it("skips dotfiles like .DS_Store", () => {
    const out = expandRulesLinks(
      SRC,
      DEST,
      [{ name: ".DS_Store", isDirectory: false }],
      PROJECT_ONLY,
    );
    expect(out).toEqual([]);
  });

  it("handles the real poneglyph rules layout: error-recovery + paths/ in, test-policy out", () => {
    const out = expandRulesLinks(
      SRC,
      DEST,
      [
        { name: "error-recovery.md", isDirectory: false },
        { name: "test-policy.md", isDirectory: false },
        { name: "paths", isDirectory: true },
      ],
      PROJECT_ONLY,
    );
    expect(out.map((l) => path.basename(l.dest)).sort()).toEqual([
      "error-recovery.md",
      "paths",
    ]);
    expect(out.find((l) => l.dest.endsWith("paths"))!.type).toBe("directory");
    expect(out.every((l) => !l.dest.endsWith("test-policy.md"))).toBe(true);
  });
});

import { mkdtempSync, writeFileSync, symlinkSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { materializeAgentsMd } from "../sync-claude.ts";

describe("materializeAgentsMd (029/US18 — Windows broken-symlink repair)", () => {
  const repoWith = (agentsContent: string | "symlink" | null): string => {
    const dir = mkdtempSync(path.join(tmpdir(), "agents-fix-"));
    writeFileSync(path.join(dir, "CLAUDE.md"), "# Poneglyph\n\ndoctrine body\n");
    if (agentsContent === "symlink") symlinkSync("CLAUDE.md", path.join(dir, "AGENTS.md"));
    else if (agentsContent !== null) writeFileSync(path.join(dir, "AGENTS.md"), agentsContent);
    return dir;
  };

  it("replaces a broken text-symlink (content 'CLAUDE.md') with the real doctrine", () => {
    const dir = repoWith("CLAUDE.md");
    expect(materializeAgentsMd(dir)).toBe("materialized");
    expect(readFileSync(path.join(dir, "AGENTS.md"), "utf8")).toContain("doctrine body");
  });

  it("leaves a healthy symlink untouched", () => {
    const dir = repoWith("symlink");
    expect(materializeAgentsMd(dir)).toBe("ok");
  });

  it("leaves an already-materialized real file untouched", () => {
    const dir = repoWith("# Poneglyph\n\ndoctrine body\n");
    expect(materializeAgentsMd(dir)).toBe("ok");
  });

  it("absent AGENTS.md → skipped (repos without the mirror)", () => {
    const dir = repoWith(null);
    expect(materializeAgentsMd(dir)).toBe("skipped");
  });
});
