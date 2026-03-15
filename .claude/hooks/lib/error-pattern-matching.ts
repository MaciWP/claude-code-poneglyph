import type {
  ErrorCategory,
  ErrorPattern,
  MatchResult,
} from "./error-patterns";

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_REGEXES: Array<{ category: ErrorCategory; regex: RegExp }> = [
  {
    category: "TypeError",
    regex: /TypeError|cannot read propert|is not a function|undefined is not/i,
  },
  {
    category: "EditConflict",
    regex: /old_string.*not found|not unique in the file|edit conflict/i,
  },
  {
    category: "ModuleNotFound",
    regex: /cannot find module|module not found|ENOENT.*require/i,
  },
  {
    category: "CompilationError",
    regex: /compilation failed|tsc.*error|type error TS\d+|syntax error/i,
  },
  {
    category: "TestFailure",
    regex: /test failed|expect\(.*\)\.to|assertion.*failed|FAIL\s/i,
  },
  {
    category: "NetworkError",
    regex: /ECONNREFUSED|ETIMEDOUT|fetch failed|network error/i,
  },
  {
    category: "PermissionError",
    regex: /EACCES|permission denied|access denied/i,
  },
  {
    category: "HallucinationError",
    regex:
      /phantom_import|phantom_symbol|phantom_property|phantom_type|wrong_arity|type_mismatch|hallucination detected/i,
  },
];

// ============================================================================
// Normalization
// ============================================================================

const NORMALIZATION_RULES: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /[A-Z]:\\[\w\\.-]+/g, replacement: "<path>" },
  { pattern: /\/[\w/.-]+\.\w+/g, replacement: "<path>" },
  { pattern: /:\d+:\d+/g, replacement: ":<line>:<col>" },
  { pattern: /line \d+/gi, replacement: "line <N>" },
  { pattern: /['"][a-zA-Z_$][\w$]*['"]/g, replacement: "'<prop>'" },
  { pattern: /0x[0-9a-fA-F]+/g, replacement: "<addr>" },
  { pattern: /(Cannot find module )\S+/i, replacement: "$1<module>" },
  { pattern: /\s+/g, replacement: " " },
];

export function normalizeErrorMessage(message: string): string {
  let normalized = message;
  for (const { pattern, replacement } of NORMALIZATION_RULES) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized.trim();
}

// ============================================================================
// Classification
// ============================================================================

export function classifyError(message: string): ErrorCategory {
  for (const { category, regex } of CATEGORY_REGEXES) {
    if (regex.test(message)) return category;
  }
  return "Unknown";
}

// ============================================================================
// Levenshtein
// ============================================================================

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

function computeSimilarity(a: string, b: string): number {
  const dist = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen > 0 ? 1 - dist / maxLen : 0;
}

// ============================================================================
// Best-similarity search
// ============================================================================

interface SimilarityResult {
  pattern: ErrorPattern;
  similarity: number;
}

function findMostSimilar(
  normalized: string,
  candidates: ErrorPattern[],
): SimilarityResult | null {
  let best: ErrorPattern | null = null;
  let bestSim = 0;

  for (const pattern of candidates) {
    const sim = computeSimilarity(normalized, pattern.normalizedMessage);
    if (sim > bestSim) {
      bestSim = sim;
      best = pattern;
    }
  }

  return best ? { pattern: best, similarity: bestSim } : null;
}

// ============================================================================
// Matching
// ============================================================================

function findExactMatch(
  normalized: string,
  patterns: ErrorPattern[],
): MatchResult | null {
  for (const pattern of patterns) {
    if (pattern.normalizedMessage === normalized) {
      return { pattern, confidence: 1.0, matchType: "exact" };
    }
  }
  return null;
}

function findCategoryMatch(
  normalized: string,
  category: ErrorCategory,
  patterns: ErrorPattern[],
): MatchResult | null {
  if (category === "Unknown") return null;

  const candidates = patterns.filter((p) => p.category === category);
  if (candidates.length === 0) return null;

  const result = findMostSimilar(normalized, candidates);
  if (result && result.similarity > 0.5) {
    return {
      pattern: result.pattern,
      confidence: 0.8 * result.similarity,
      matchType: "regex",
    };
  }
  return null;
}

function findFuzzyMatch(
  normalized: string,
  patterns: ErrorPattern[],
): MatchResult | null {
  const result = findMostSimilar(normalized, patterns);
  if (result && result.similarity > 0.7) {
    return {
      pattern: result.pattern,
      confidence: result.similarity,
      matchType: "fuzzy",
    };
  }
  return null;
}

export function matchError(
  message: string,
  patterns: ErrorPattern[],
): MatchResult | null {
  const normalized = normalizeErrorMessage(message);
  const category = classifyError(message);

  return (
    findExactMatch(normalized, patterns) ??
    findCategoryMatch(normalized, category, patterns) ??
    findFuzzyMatch(normalized, patterns)
  );
}
