import { describe, test, expect } from "bun:test";
import {
  extractSections,
  extractKeywords,
  extractFrontmatterKeywords,
} from "./parser";
import { scoreSections, filterByRelevance } from "./scorer";
import { applyBudget, estimateTokens, getBudgetForAgent } from "./budgeter";

// ============================================================================
// Parser
// ============================================================================

describe("extractSections", () => {
  test("extracts sections from markdown", () => {
    const md = `# Title

Intro text.

## Section A

Content A here.

## Section B

Content B here.

### Subsection B1

Nested content.`;

    const sections = extractSections(md);
    expect(sections.length).toBeGreaterThanOrEqual(4);
    expect(sections[0].heading).toBe("Title");
    expect(sections[0].level).toBe(1);
    expect(sections[1].heading).toBe("Section A");
    expect(sections[1].level).toBe(2);
  });

  test("handles empty markdown", () => {
    expect(extractSections("")).toEqual([]);
  });

  test("handles markdown without headings", () => {
    expect(extractSections("Just some text\nwith no headings")).toEqual([]);
  });

  test("extracts keywords from content", () => {
    const md = `## Security Review

Always validate authentication tokens. Check for SQL injection vulnerabilities.`;

    const sections = extractSections(md);
    expect(sections[0].keywords).toContain("validate");
  });
});

describe("extractKeywords", () => {
  test("extracts meaningful words", () => {
    const text = "Validate authentication tokens and check for vulnerabilities";
    const keywords = extractKeywords(text);
    expect(keywords).toContain("validate");
    expect(keywords).toContain("authentication");
    expect(keywords).toContain("tokens");
  });

  test("filters stop words", () => {
    const keywords = extractKeywords("the quick brown fox and the lazy dog");
    expect(keywords).not.toContain("the");
    expect(keywords).not.toContain("and");
  });

  test("handles empty text", () => {
    expect(extractKeywords("")).toEqual([]);
  });
});

describe("extractFrontmatterKeywords", () => {
  test("extracts keywords from YAML block array", () => {
    const md = `---
keywords:
  - auth
  - jwt
  - security
---

Content here.`;

    const keywords = extractFrontmatterKeywords(md);
    expect(keywords).toEqual(["auth", "jwt", "security"]);
  });

  test("extracts keywords from inline array", () => {
    const md = `---
keywords: [auth, jwt, security]
---

Content`;

    const keywords = extractFrontmatterKeywords(md);
    expect(keywords).toContain("auth");
    expect(keywords).toContain("jwt");
  });

  test("returns empty for no frontmatter", () => {
    expect(extractFrontmatterKeywords("No frontmatter here")).toEqual([]);
  });
});

// ============================================================================
// Scorer
// ============================================================================

describe("scoreSections", () => {
  const sections = [
    {
      heading: "Security Review",
      level: 2,
      content: "Always validate authentication tokens.",
      startLine: 0,
      endLine: 2,
      keywords: ["validate", "authentication", "tokens", "security"],
    },
    {
      heading: "Database Patterns",
      level: 2,
      content: "Use transactions for multi-table operations.",
      startLine: 3,
      endLine: 5,
      keywords: ["transactions", "operations", "database"],
    },
  ];

  test("scores matching sections higher", () => {
    const scored = scoreSections(sections, ["security", "authentication"]);
    expect(scored.length).toBeGreaterThan(0);
    expect(scored[0].section.heading).toBe("Security Review");
    expect(scored[0].score).toBeGreaterThan(0);
  });

  test("returns matched terms", () => {
    const scored = scoreSections(sections, ["security"]);
    expect(scored[0].matchedTerms).toContain("security");
  });

  test("returns empty for no matches", () => {
    const scored = scoreSections(sections, ["graphql", "websocket"]);
    expect(scored).toEqual([]);
  });

  test("handles empty inputs", () => {
    expect(scoreSections([], ["test"])).toEqual([]);
    expect(scoreSections(sections, [])).toEqual([]);
  });
});

describe("filterByRelevance", () => {
  test("filters sections below threshold", () => {
    const scored = [
      {
        section: {
          heading: "A",
          level: 2,
          content: "",
          startLine: 0,
          endLine: 0,
          keywords: [],
        },
        score: 0.8,
        matchedTerms: ["a"],
      },
      {
        section: {
          heading: "B",
          level: 2,
          content: "",
          startLine: 0,
          endLine: 0,
          keywords: [],
        },
        score: 0.05,
        matchedTerms: ["b"],
      },
    ];

    const filtered = filterByRelevance(scored, 0.1);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].section.heading).toBe("A");
  });
});

// ============================================================================
// Budgeter
// ============================================================================

describe("estimateTokens", () => {
  test("estimates tokens from text", () => {
    expect(estimateTokens("a".repeat(400))).toBe(100);
  });

  test("returns 0 for empty text", () => {
    expect(estimateTokens("")).toBe(0);
  });
});

describe("applyBudget", () => {
  test("includes sections within budget", () => {
    const scored = [
      {
        section: {
          heading: "A",
          level: 2,
          content: "a".repeat(100),
          startLine: 0,
          endLine: 0,
          keywords: [],
        },
        score: 0.9,
        matchedTerms: ["a"],
      },
      {
        section: {
          heading: "B",
          level: 2,
          content: "b".repeat(100),
          startLine: 0,
          endLine: 0,
          keywords: [],
        },
        score: 0.7,
        matchedTerms: ["b"],
      },
    ];

    const result = applyBudget(scored, {
      maxTokens: 1000,
      reserveTokens: 200,
    });
    expect(result.sectionsIncluded).toBe(2);
    expect(result.tokensUsed).toBeGreaterThan(0);
    expect(result.sectionsDropped).toBe(0);
  });

  test("drops sections exceeding budget", () => {
    const scored = [
      {
        section: {
          heading: "Big",
          level: 2,
          content: "x".repeat(4000),
          startLine: 0,
          endLine: 0,
          keywords: [],
        },
        score: 0.9,
        matchedTerms: ["x"],
      },
      {
        section: {
          heading: "Small",
          level: 2,
          content: "y".repeat(100),
          startLine: 0,
          endLine: 0,
          keywords: [],
        },
        score: 0.5,
        matchedTerms: ["y"],
      },
    ];

    const result = applyBudget(scored, {
      maxTokens: 500,
      reserveTokens: 100,
    });
    expect(result.sectionsDropped).toBeGreaterThan(0);
  });

  test("handles empty sections", () => {
    const result = applyBudget([], {
      maxTokens: 1000,
      reserveTokens: 200,
    });
    expect(result.sectionsIncluded).toBe(0);
    expect(result.tokensUsed).toBe(0);
  });
});

describe("getBudgetForAgent", () => {
  test("returns config for known agents", () => {
    const config = getBudgetForAgent("builder");
    expect(config.maxTokens).toBe(8000);
  });

  test("returns default for unknown agent", () => {
    const config = getBudgetForAgent("unknown");
    expect(config.maxTokens).toBe(5000);
  });
});
