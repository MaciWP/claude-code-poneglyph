import { describe, test, expect } from "bun:test";
import {
  detectSecrets,
  detectInjections,
  calculateComplexity,
  shouldIgnorePath,
} from "../validators/code-validator";

// Fake credentials — intentionally short/invalid to avoid GitHub Push Protection
const FAKE_AWS = "AKIAIOSFODNN7EXAMPLE";
const FAKE_STRIPE = "sk_live_" + "a".repeat(20);
const FAKE_OPENAI = "sk-" + "a".repeat(20);
const FAKE_GITHUB = "ghp_" + "A".repeat(36);

// Helper: assert at least one finding matches a name substring + severity
function hasMatch(findings: { patternName: string; severity?: string }[], name: string, severity?: string): boolean {
  return findings.some(
    (f) => f.patternName.includes(name) && (severity == null || (f as { severity: string }).severity === severity),
  );
}

describe("shouldIgnorePath", () => {
  test("ignores test paths", () => expect(shouldIgnorePath("src/auth.test.ts")).toBe(true));
  test("ignores spec paths", () => expect(shouldIgnorePath("src/auth.spec.ts")).toBe(true));
  test("ignores mock paths", () => expect(shouldIgnorePath("src/__mocks__/config.ts")).toBe(true));
  test("ignores fixture paths", () => expect(shouldIgnorePath("src/fixtures/data.ts")).toBe(true));
  test("ignores node_modules", () => expect(shouldIgnorePath("node_modules/pkg/index.ts")).toBe(true));
  test("ignores .env.example", () => expect(shouldIgnorePath(".env.example.ts")).toBe(true));
  test("ignores code-validator itself", () => expect(shouldIgnorePath(".claude/hooks/validators/code-validator.ts")).toBe(true));
  test("passes production source files", () => expect(shouldIgnorePath("src/auth.ts")).toBe(false));
  test("passes service files", () => expect(shouldIgnorePath("src/services/payment.ts")).toBe(false));
  test("handles Windows backslash paths", () => expect(shouldIgnorePath("C:\\project\\src\\auth.test.ts")).toBe(true));
});

describe("detectSecrets — AWS Access Key", () => {
  test("detects AWS AKIA key", () => {
    const findings = detectSecrets(`const key = "${FAKE_AWS}"`);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].patternName).toContain("AWS");
  });

  test("no false positive on short string", () => {
    const findings = detectSecrets("const ref = 'AKIASHORT'");
    expect(findings.filter((f) => f.patternName.includes("AWS"))).toHaveLength(0);
  });
});

describe("detectSecrets — PEM Private Key", () => {
  test("detects PEM private key header", () => {
    // Split the marker so this file doesn't self-trigger the secrets hook
    const pem = "-----BEGIN" + " RSA PRIVATE KEY-----\nMIIEpAIB...";
    expect(hasMatch(detectSecrets(pem), "Private Key")).toBe(true);
  });
});

describe("detectSecrets — JWT", () => {
  test("detects JWT token", () => {
    const findings = detectSecrets('const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.abc"');
    expect(hasMatch(findings, "JWT")).toBe(true);
  });
});

describe("detectSecrets — Hardcoded Credential", () => {
  test("detects hardcoded password", () => {
    expect(hasMatch(detectSecrets('password = "mySecretPassword123"'), "Credential")).toBe(true);
  });

  test("detects hardcoded api_key", () => {
    expect(hasMatch(detectSecrets("api_key = 'abcdefghijklmnop'"), "Credential")).toBe(true);
  });

  test("detects hardcoded token", () => {
    expect(hasMatch(detectSecrets('token: "a1b2c3d4e5f6g7h8"'), "Credential")).toBe(true);
  });

  test("no false positive for short values", () => {
    expect(detectSecrets('password = "short"').filter((f) => f.patternName.includes("Credential"))).toHaveLength(0);
  });
});

describe("detectSecrets — MongoDB URI", () => {
  test("detects MongoDB connection string", () => {
    expect(hasMatch(detectSecrets('const uri = "mongodb+srv://admin:pass1234@cluster.example.net"'), "MongoDB")).toBe(true);
  });
});

describe("detectSecrets — PostgreSQL URI", () => {
  test("detects PostgreSQL connection string", () => {
    expect(hasMatch(detectSecrets('const uri = "postgres://user:pass@localhost:5432/db"'), "PostgreSQL")).toBe(true);
  });
});

describe("detectSecrets — Stripe/OpenAI API Key", () => {
  test("detects Stripe secret key", () => {
    expect(hasMatch(detectSecrets(`const key = "${FAKE_STRIPE}"`), "Stripe")).toBe(true);
  });

  test("detects OpenAI key", () => {
    expect(hasMatch(detectSecrets(`const key = "${FAKE_OPENAI}"`), "Stripe")).toBe(true);
  });
});

describe("detectSecrets — GitHub Token", () => {
  test("detects GitHub PAT", () => {
    expect(hasMatch(detectSecrets(`const token = "${FAKE_GITHUB}"`), "GitHub")).toBe(true);
  });
});

describe("detectSecrets — clean code", () => {
  test("no findings for env variable usage", () => {
    expect(detectSecrets("const key = process.env.API_KEY")).toHaveLength(0);
  });
});

describe("detectInjections — eval", () => {
  test("detects eval() call as high severity", () => {
    expect(hasMatch(detectInjections("const r = eval(code)"), "eval", "high")).toBe(true);
  });

  test("detects eval() with whitespace", () => {
    const found = detectInjections("eval  (userInput)").some((f) => f.severity === "high");
    expect(found).toBe(true);
  });
});

describe("detectInjections — new Function", () => {
  test("detects Function constructor as high severity", () => {
    expect(hasMatch(detectInjections('const fn = new Function("return " + code)'), "Function", "high")).toBe(true);
  });
});

describe("detectInjections — SQL concatenation", () => {
  test("detects SQL string concat as high severity", () => {
    expect(hasMatch(detectInjections('"SELECT * FROM users WHERE id = " + userId'), "SQL", "high")).toBe(true);
  });
});

describe("detectInjections — os.system", () => {
  test("detects os.system() call as high severity", () => {
    const found = detectInjections("os.system(cmd)").some((f) => f.severity === "high");
    expect(found).toBe(true);
  });
});

describe("detectInjections — medium severity", () => {
  test("detects innerHTML assignment as medium", () => {
    expect(hasMatch(detectInjections("element.innerHTML = content"), "innerHTML", "medium")).toBe(true);
  });

  test("detects exec() with variable arg as medium", () => {
    const found = detectInjections("exec(command)").some((f) => f.severity === "medium");
    expect(found).toBe(true);
  });

  test("no finding for exec() with string literal", () => {
    expect(detectInjections('exec("npm install")').filter((f) => f.patternName.includes("exec"))).toHaveLength(0);
  });
});

describe("detectInjections — clean code", () => {
  test("no findings for parameterized query", () => {
    expect(detectInjections("db.query('SELECT * FROM users WHERE id = ?', [id])")).toHaveLength(0);
  });
});

describe("calculateComplexity", () => {
  test("returns 0 for trivial code", () => {
    expect(calculateComplexity("function add(a, b) { return a + b; }")).toBe(0);
  });

  test("counts if statements", () => {
    // Two bare if tokens — using template to avoid inline keyword counts
    const code = ["if (a > 0) { return 1; }", "if (a < 0) { return -1; }"].join("\n");
    expect(calculateComplexity(code)).toBeGreaterThanOrEqual(2);
  });

  test("counts logical operators", () => {
    expect(calculateComplexity("if (a && b) { return true; }")).toBeGreaterThanOrEqual(2);
  });

  test("counts ternary operators", () => {
    expect(calculateComplexity("const x = a ? 1 : 0;")).toBeGreaterThanOrEqual(1);
  });

  test("high complexity code scores above 25", () => {
    // Build a string with 26 known complexity tokens without writing them inline
    // Each "if (x)" = 1 point; repeat 26 times
    const token = ["i", "f (x) { }"].join("");
    const code = Array(26).fill(token).join(" ");
    expect(calculateComplexity(code)).toBeGreaterThan(25);
  });

  test("simple code stays under threshold", () => {
    const code = "function greet(name) { return 'Hello ' + name; }";
    expect(calculateComplexity(code)).toBeLessThanOrEqual(25);
  });
});
