import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { createStore, closeStore } from "./store";
import { indexContent } from "./indexer";
import { search, getStoreStats } from "./searcher";
import type { Database } from "bun:sqlite";

describe("context-store benchmark", () => {
  let db: Database;

  const sampleBlock = [
    'const { Router } = require("express");',
    'const { validateInput } = require("validators");',
    'const { UserService } = require("services/user");',
    'const { AuthMiddleware } = require("middleware/auth");',
    "",
    "/**",
    " * User management REST API endpoints.",
    " * Handles CRUD operations for user accounts.",
    " */",
    "const router = Router();",
    "",
    'router.get("/users", AuthMiddleware.requireAuth, async (req, res) => {',
    "  const users = await UserService.findAll({",
    "    page: req.query.page ?? 1,",
    "    limit: req.query.limit ?? 20,",
    "  });",
    "  res.json({ data: users.items, total: users.total });",
    "});",
    "",
    'router.post("/users", AuthMiddleware.requireAdmin, async (req, res) => {',
    "  const validated = validateInput(req.body, UserCreateSchema);",
    "  const user = await UserService.create(validated);",
    "  res.status(201).json({ data: user });",
    "});",
    "",
    'router.put("/users/:id", AuthMiddleware.requireAuth, async (req, res) => {',
    "  const validated = validateInput(req.body, UserUpdateSchema);",
    "  const user = await UserService.update(req.params.id, validated);",
    '  if (!user) return res.status(404).json({ error: "Not found" });',
    "  res.json({ data: user });",
    "});",
    "",
    'router.delete("/users/:id", AuthMiddleware.requireAdmin, async (req, res) => {',
    "  await UserService.delete(req.params.id);",
    "  res.status(204).end();",
    "});",
    "",
    "module.exports = router;",
  ].join("\n");
  const sample4KB = sampleBlock.repeat(4);

  beforeAll(() => {
    db = createStore(":memory:");
  });

  afterAll(() => {
    closeStore(db);
  });

  test("index latency: <10ms per 4KB chunk", () => {
    const iterations = 100;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      indexContent(db, `bench-file-${i}.ts`, sample4KB, "bench-session");
    }

    const elapsed = performance.now() - start;
    const avgMs = elapsed / iterations;

    console.log(
      `Index: ${avgMs.toFixed(2)}ms avg (${iterations} iterations, ${elapsed.toFixed(0)}ms total)`,
    );
    expect(avgMs).toBeLessThan(10);
  });

  test("search latency: <5ms per query", () => {
    const queries = [
      "authentication middleware",
      "user management REST",
      "CRUD operations",
      "validate input schema",
      "router express endpoint",
    ];

    const iterations = 100;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      search(db, queries[i % queries.length], 10);
    }

    const elapsed = performance.now() - start;
    const avgMs = elapsed / iterations;

    console.log(
      `Search: ${avgMs.toFixed(2)}ms avg (${iterations} iterations, ${elapsed.toFixed(0)}ms total)`,
    );
    expect(avgMs).toBeLessThan(5);
  });

  test("getStoreStats latency: <5ms", () => {
    const iterations = 50;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      getStoreStats(db);
    }

    const elapsed = performance.now() - start;
    const avgMs = elapsed / iterations;

    console.log(
      `Stats: ${avgMs.toFixed(2)}ms avg (${iterations} iterations)`,
    );
    expect(avgMs).toBeLessThan(5);
  });

  test("total hook simulation: <100ms", () => {
    const iterations = 20;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      const simDb = createStore(":memory:");
      indexContent(simDb, `sim-${i}.ts`, sample4KB, "sim");
      search(simDb, "authentication user", 5);
      closeStore(simDb);
    }

    const elapsed = performance.now() - start;
    const avgMs = elapsed / iterations;

    console.log(
      `Full hook sim: ${avgMs.toFixed(2)}ms avg (${iterations} iterations)`,
    );
    expect(avgMs).toBeLessThan(100);
  });

  test("store handles 1000+ chunks efficiently", () => {
    const stats = getStoreStats(db);
    console.log(
      `Store stats: ${stats.totalChunks} chunks, ${stats.totalTokens} tokens, ${stats.sessions.length} sessions`,
    );

    expect(stats.totalChunks).toBeGreaterThan(100);
    expect(stats.totalTokens).toBeGreaterThan(0);

    const start = performance.now();
    const result = search(db, "user management router", 10);
    const elapsed = performance.now() - start;

    console.log(
      `Large store search: ${elapsed.toFixed(2)}ms, found ${result.chunks.length} chunks`,
    );
    expect(elapsed).toBeLessThan(10);
    expect(result.chunks.length).toBeGreaterThan(0);
  });
});
