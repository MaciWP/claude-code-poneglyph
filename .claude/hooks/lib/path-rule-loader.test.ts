import { describe, test, expect } from "bun:test";
import {
  parseFrontmatter,
  globMatch,
  matchRules,
  getSkillsForPath,
  getKeywordsForPath,
  loadPathRules,
  type PathRule,
} from "./path-rule-loader";

// ============================================================================
// parseFrontmatter
// ============================================================================

describe("parseFrontmatter", () => {
  test("parses YAML frontmatter with block arrays", () => {
    const content = `---
globs:
  - "**/routes/**"
  - "**/api/**"
priority: 20
skills:
  - api-design
  - typescript-patterns
---

## Some Context

Body text here.`;

    const { data, body } = parseFrontmatter(content);
    expect(data.globs).toEqual(["**/routes/**", "**/api/**"]);
    expect(data.priority).toBe(20);
    expect(data.skills).toEqual(["api-design", "typescript-patterns"]);
    expect(body).toContain("Body text here.");
  });

  test("parses inline arrays", () => {
    const content = `---
skills: [api-design, security-review]
priority: 10
---

Body`;

    const { data } = parseFrontmatter(content);
    expect(data.skills).toEqual(["api-design", "security-review"]);
  });

  test("returns empty data for no frontmatter", () => {
    const { data, body } = parseFrontmatter("Just a body");
    expect(data).toEqual({});
    expect(body).toBe("Just a body");
  });

  test("handles empty frontmatter", () => {
    const content = `---
---

Body`;
    const { data, body } = parseFrontmatter(content);
    expect(Object.keys(data)).toHaveLength(0);
    expect(body).toBe("Body");
  });
});

// ============================================================================
// globMatch
// ============================================================================

describe("globMatch", () => {
  test("matches ** wildcard", () => {
    expect(globMatch("**/routes/**", "src/routes/users.ts")).toBe(true);
    expect(globMatch("**/routes/**", "app/api/routes/index.ts")).toBe(true);
  });

  test("matches * wildcard", () => {
    expect(globMatch("**/*.test.ts", "src/utils/helper.test.ts")).toBe(true);
    expect(globMatch("**/*.test.ts", "src/utils/helper.ts")).toBe(false);
  });

  test("matches exact path segments", () => {
    expect(globMatch(".claude/hooks/**", ".claude/hooks/trace-logger.ts")).toBe(
      true,
    );
    expect(globMatch(".claude/hooks/**", ".claude/rules/test.md")).toBe(false);
  });

  test("handles Windows backslashes", () => {
    expect(globMatch("**/routes/**", "src\\routes\\users.ts")).toBe(true);
  });

  test("does not match unrelated paths", () => {
    expect(globMatch("**/auth/**", "src/services/user.ts")).toBe(false);
  });
});

// ============================================================================
// matchRules
// ============================================================================

describe("matchRules", () => {
  const testRules: PathRule[] = [
    {
      name: "auth-security",
      globs: ["**/auth/**", "**/security/**"],
      priority: 20,
      skills: ["security-review", "typescript-patterns"],
      keywords: ["auth", "jwt"],
      context: "Auth context",
    },
    {
      name: "api-routes",
      globs: ["**/routes/**"],
      priority: 10,
      skills: ["api-design", "typescript-patterns"],
      keywords: ["endpoint"],
      context: "API context",
    },
    {
      name: "testing",
      globs: ["**/*.test.ts"],
      priority: 10,
      skills: ["testing-strategy", "bun-best-practices"],
      keywords: ["test"],
      context: "Test context",
    },
  ];

  test("matches single rule", () => {
    const matches = matchRules("src/routes/users.ts", testRules);
    expect(matches).toHaveLength(1);
    expect(matches[0].rule.name).toBe("api-routes");
  });

  test("matches higher priority rule first", () => {
    const matches = matchRules("src/auth/login.ts", testRules);
    expect(matches[0].rule.name).toBe("auth-security");
  });

  test("matches test files", () => {
    const matches = matchRules("src/services/user.test.ts", testRules);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches.some((m) => m.rule.name === "testing")).toBe(true);
  });

  test("returns empty for non-matching path", () => {
    const matches = matchRules("README.md", testRules);
    expect(matches).toHaveLength(0);
  });
});

// ============================================================================
// getSkillsForPath
// ============================================================================

describe("getSkillsForPath", () => {
  const testRules: PathRule[] = [
    {
      name: "auth",
      globs: ["**/auth/**"],
      priority: 20,
      skills: ["security-review", "typescript-patterns"],
      keywords: [],
      context: "",
    },
    {
      name: "routes",
      globs: ["**/routes/**"],
      priority: 10,
      skills: ["api-design", "typescript-patterns"],
      keywords: [],
      context: "",
    },
  ];

  test("deduplicates skills from multiple matching rules", () => {
    const rules: PathRule[] = [
      {
        name: "multi",
        globs: ["**/auth/routes/**"],
        priority: 20,
        skills: ["security-review", "typescript-patterns"],
        keywords: [],
        context: "",
      },
      {
        name: "routes",
        globs: ["**/routes/**"],
        priority: 10,
        skills: ["api-design", "typescript-patterns"],
        keywords: [],
        context: "",
      },
    ];

    const skills = getSkillsForPath("src/auth/routes/login.ts", rules);
    const tsCount = skills.filter((s) => s === "typescript-patterns").length;
    expect(tsCount).toBe(1);
  });

  test("returns skills in priority order", () => {
    const skills = getSkillsForPath("src/auth/handler.ts", testRules);
    expect(skills[0]).toBe("security-review");
  });

  test("returns empty for non-matching path", () => {
    expect(getSkillsForPath("README.md", testRules)).toEqual([]);
  });
});

// ============================================================================
// getKeywordsForPath
// ============================================================================

describe("getKeywordsForPath", () => {
  const testRules: PathRule[] = [
    {
      name: "auth",
      globs: ["**/auth/**"],
      priority: 20,
      skills: ["security-review"],
      keywords: ["auth", "jwt", "password"],
      context: "",
    },
  ];

  test("returns keywords from matching rules", () => {
    const kw = getKeywordsForPath("src/auth/login.ts", testRules);
    expect(kw).toContain("auth");
    expect(kw).toContain("jwt");
  });

  test("returns empty for non-matching path", () => {
    expect(getKeywordsForPath("README.md", testRules)).toEqual([]);
  });
});

// ============================================================================
// loadPathRules (integration with real files)
// ============================================================================

describe("loadPathRules", () => {
  test("loads rules from .claude/rules/paths/", () => {
    const rules = loadPathRules();
    expect(rules.length).toBeGreaterThanOrEqual(2);

    const names = rules.map((r) => r.name);
    expect(names).toContain("orchestration");
    expect(names).toContain("hooks");
  });

  test("returns empty for non-existent directory", () => {
    const rules = loadPathRules("/nonexistent/path");
    expect(rules).toEqual([]);
  });

  test("orchestration and hooks have priority 15", () => {
    const rules = loadPathRules();
    const orch = rules.find((r) => r.name === "orchestration");
    expect(orch?.priority).toBe(15);
    const hooks = rules.find((r) => r.name === "hooks");
    expect(hooks?.priority).toBe(15);
  });

  test("each rule has at least one glob", () => {
    const rules = loadPathRules();
    for (const rule of rules) {
      expect(rule.globs.length).toBeGreaterThanOrEqual(1);
    }
  });
});

// ============================================================================
// Migration validation
// ============================================================================

describe("remaining path rules after cleanup", () => {
  test("only 2 path rules remain", () => {
    const rules = loadPathRules();
    expect(rules.length).toBe(2);
  });

  test("orchestration has no skills", () => {
    const rules = loadPathRules();
    const orch = rules.find((r) => r.name === "orchestration");
    expect(orch?.skills).toEqual([]);
  });

  test("hooks has no skills", () => {
    const rules = loadPathRules();
    const hooks = rules.find((r) => r.name === "hooks");
    expect(hooks?.skills).toEqual([]);
  });
});
