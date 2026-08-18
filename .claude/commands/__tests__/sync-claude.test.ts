import { describe, it, expect } from "bun:test";
import * as path from "path";
import {
  classifyGrokTwin,
  expandRulesLinks,
  formatGrokTwinLine,
} from "../sync-claude.ts";

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

describe("classifyGrokTwin (check, not install)", () => {
  const expected = "/repo/.claude/system-prompts/poneglyph-sp.md";

  it("ok when the symlink resolves to the generated twin", () => {
    expect(
      classifyGrokTwin({
        exists: true,
        isSymlink: true,
        resolvedTarget: expected,
        expected,
      }),
    ).toBe("ok");
  });

  it("missing when the dest is absent", () => {
    expect(
      classifyGrokTwin({
        exists: false,
        isSymlink: false,
        resolvedTarget: null,
        expected,
      }),
    ).toBe("missing");
  });

  it("not-symlink when a regular file occupies the path", () => {
    expect(
      classifyGrokTwin({
        exists: true,
        isSymlink: false,
        resolvedTarget: null,
        expected,
      }),
    ).toBe("not-symlink");
  });

  it("wrong-target when the symlink points elsewhere", () => {
    expect(
      classifyGrokTwin({
        exists: true,
        isSymlink: true,
        resolvedTarget: "/other/poneglyph-style.md",
        expected,
      }),
    ).toBe("wrong-target");
  });

  it("status copy never claims to install", () => {
    for (const kind of ["ok", "missing", "not-symlink", "wrong-target"] as const) {
      if (kind === "ok") {
        expect(formatGrokTwinLine(kind)).toContain("check, not install");
      } else {
        expect(formatGrokTwinLine(kind, "/x")).toMatch(/ln -sfn|check, not install/);
      }
    }
  });
});
