# Known Gaps & Tech Debt

This file tracks **known issues that have been identified but deferred** to future sessions. Each entry includes enough context (problem, evidence, repro, constraints) for a future Claude Code session to pick it up cold and solve it.

## How to use this file

When fixing a gap:

1. Read the entry below **in full**
2. **Verify the symptom still reproduces** — state may have drifted since discovery
3. Follow the suggested phase plan (in plan mode for investigation, build mode for implementation)
4. Mark the entry as `RESOLVED` with the commit hash that closed it
5. Move resolved entries to the `## Resolved` section at the bottom

When discovering a new gap:

1. Add a new entry under `## Open Gaps` with ID `GAP-NNN` (next sequential number)
2. Include: problem statement, root cause hypothesis, evidence, repro steps, affected components, suggested phase plan, files to touch, DO NOT touch list, success criteria
3. Be honest about what is known vs hypothesized — distinguish "verified" from "suspected"

---

## Open Gaps

### GAP-002 — `cheap_model_ratio` always returns null (no per-Agent model capture)

| Field | Value |
|---|---|
| **Status** | OPEN |
| **Discovered** | 2026-04-11 (while resolving GAP-001) |
| **Severity** | LOW — observability nice-to-have, not blocking |
| **Estimated effort** | 1-2h |

`calculateCheapModelRatio` in `.claude/hooks/lib/trace-metrics.ts:142-148` explicitly returns `null` because per-Agent model information is not captured in main-session traces. Per-Agent models live in **subagent transcripts** at `~/.claude/projects/<project>/<session-uuid>/subagents/agent-*.jsonl` — a separate data source from `transcript_path`. Fix strategy: extend `trace-logger.ts` to scan the subagent transcripts siblings to the main transcript, extract the `message.model` from each, and aggregate into a `{tool_use_id → model}` map. Then `calculateCheapModelRatio` can walk the main transcript's Agent tool_use blocks, look up each one's model, and compute the ratio.

### GAP-003 — `Bun.file()` does not translate MSYS Unix paths on Windows (silent)

| Field | Value |
|---|---|
| **Status** | OPEN |
| **Discovered** | 2026-04-11 (during GAP-001 E2E verification) |
| **Severity** | LOW — cosmetic, does not affect production Claude Code traces |
| **Estimated effort** | 15 min |

On Windows, `Bun.file("/c/Users/Maci/path/to.jsonl")` does not translate the Git-Bash-style Unix path to `C:\Users\...` — it treats the path as literal, the file doesn't exist, and `readRawTranscriptFromPath` returns `[]` without any warning. The hook is best-effort (always exits 0), so the failure is silent. Production Claude Code always passes Windows-native paths (`C:\Users\...`), so real traces are unaffected — but any manual hook invocation (scripts, tests, CLI tools) must use the native form. Fix options: (a) normalize `/c/...` → `C:\...` in `readRawTranscriptFromPath`, (b) log a stderr warning when the file handle resolves to non-existent, (c) document the constraint in hook README. Option (b) is the most informative and has lowest regression risk.

---

## Resolved

### GAP-001 — Trace-logger schema mismatch — RESOLVED 2026-04-11

| Field | Value |
|---|---|
| **Status** | RESOLVED |
| **Discovered** | 2026-04-11 |
| **Resolved** | 2026-04-11 |
| **Commits** | `8968b0c` (lib/trace-persisted + unit tests), `0e02ecb` (trace-logger rewire + integration tests) |
| **Session** | 2026-04-11 Phase P8 fix |
| **Test count delta** | 447 → 470 (+23 tests) |

#### Root cause

`trace-logger.ts:118-131` (pre-fix) called `JSON.parse(content)` on a **JSONL file** (one JSON envelope per line, not a JSON array). The parse threw `SyntaxError` on the first embedded newline, the silent `catch { return []; }` returned an empty array, `buildTrace` fell through to `buildTraceMinimal`, and every structured field (`model`, `tokens`, `agents`, `skills`, `costUsd`, `durationMs`, `prompt`, `toolCalls`, `filesChanged`) was written as `null`. Additionally, even if JSON.parse had worked, the downstream extractors in `lib/trace-extract.ts` and `lib/trace-metrics.ts` filter on `msg.role === "assistant"`, but the persisted JSONL uses a `{type, message: {role, content, model, usage}}` envelope — the `role` lives at `msg.message.role`, not top-level. Two layered bugs, one silent failure mode.

#### Fix

1. **New `lib/trace-persisted.ts` + `lib/trace-persisted-meta.ts`** — JSONL reader (split-on-newline, per-line try/catch, skip malformed), envelope normalizer (`{type, message}` → `{role, content}`, also accepts legacy flat `{role, content}`), and authoritative metadata extractor that pulls real `message.model`, `message.usage.input_tokens + cache_creation_input_tokens + cache_read_input_tokens`, `message.usage.output_tokens`, and `timestamp` delta instead of character-count estimates.
2. **`trace-logger.ts` rewired** — broken `readTranscriptFromPath` deleted, `main()` now prefers the persisted JSONL path (`transcript_path`) via a new `buildTraceFromPersisted` that combines the normalized transcript (for existing extractors) with authoritative metadata (for real model/tokens/duration). Inline `transcript` field kept as legacy fallback. `buildTraceMinimal` preserved for the zero-data case. All fallbacks use `??` nullish coalescing (not `||`) so a legitimate `0` token count flows through.
3. **No fabrication guarantees** — `auth.inputTokens`/`auth.outputTokens` are `null` (not 0) when `message.usage` is absent; `auth.model` is `null` when no assistant entry has `message.model`; `auth.durationMs` is `null` without valid timestamps. In every null case, the pipeline falls through to the original character-based estimators, preserving backwards compatibility with legacy inline fixtures.

#### Verification evidence

- **Unit tests**: 19 new tests in `lib/trace-persisted.test.ts` covering JSONL parsing (missing file, valid, malformed lines), envelope/flat normalization (6 shapes + null/non-object), authoritative metadata (real usage sum, missing usage, duration delta), and model name normalization (opus/sonnet/haiku/unknown).
- **Integration tests**: 4 new tests in `trace-logger.test.ts` using realistic JSONL envelope payloads with `parentUuid`, `isSidechain`, `message.usage`, `tool_use` content blocks — asserting real data flow and exact token sum (`8970 / 170 / 9140` protects against `INPUT_TOKEN_FIELDS` constant regression).
- **Full hook suite**: 470/470 passing (baseline was 447, +23 new tests).
- **E2E replay**: Invoked the hook manually with real historical session `e5ff0515-...jsonl` (984 lines). Produced a trace record with `model="opus"`, `inputTokens=87240263`, `outputTokens=138221`, `costUsd=$1318.97`, `durationMs=201630606`, `agents=["scout","Explore","builder","reviewer"]`, `status="completed"`, `toolCalls=264`, `filesChanged=3`, `prompt` = first user message of the session. Every previously-null field is now populated with real data, not estimates.
- **Code review**: APPROVED by reviewer agent. Zero must-fix items. All four implementation deviations (file split to pass complexity validator, `import.meta.main` guard, `buildTrace` dispatcher deletion, +1 exact-sum test) justified.

#### Out of scope / follow-ups

- **333 historical null records** in `~/.claude/traces/*.jsonl` remain untouched — they are historical markers of the pre-fix period, not valuable data to retroactively reconstruct.
- **`cheap_model_ratio`** still returns `null` in `trace-metrics.ts:142-148`. This requires per-Agent model capture, which lives in subagent transcripts (`<session>/subagents/agent-*.jsonl`) — a separate data source not read by the main trace-logger. Tracking this as GAP-002 above.
- **`Bun.file()` + MSYS/Git-Bash Unix-style paths on Windows**: discovered during E2E — `/c/Users/...` paths are NOT translated to `C:\...` by `Bun.file()`, causing silent all-null records when a caller uses the wrong path form. Claude Code in production passes native `C:\...` paths so this doesn't affect real traces, but any manual hook invocation must use Windows-native path form. Tracking as GAP-003 above (low priority — cosmetic defensive logging).

---
