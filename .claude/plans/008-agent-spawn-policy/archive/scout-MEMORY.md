# Scout Memory


## 2026-04-11 — Session 36fa8223
- The repo underwent a clean architectural pivot (March 8): Web UI archived, pure orchestration remains. This is now the permanent direction.
- Arch H (Lead-Directed Skill Reads) is the canonical skill propagation pattern — the last 5 commits all reinforce its documentation in rules and SKILL.md Content Maps.
- Memory persistence (`MEMORY.md` per agent in `agent-memory/`) is the canonical format — the SubagentStop hook writes these automatically via `persistMemory()`; they accumulate across sessions.
- The skills inventory currently sits at 43 SKILL.md files (vs 24 referenced in older CLAUDE.md counts) — the discrepancy is real and CLAUDE.md count may be stale.
- The `hooks/lib/` directory still has ~55 files after the previous rationalization session — significant surface area remains that could warrant further review.

## 2026-04-11 — Session 36fa8223
- Path-scoped rules in `.claude/rules/paths/*.md` support only the `paths:` frontmatter field; other fields like `priority:`, `globs:` are silently ignored by Claude Code.
- Orphan skill reference files (in `references/` or `templates/`) are invisible to agents unless explicitly listed in the SKILL.md Content Map — always verify wiring before committing.

## 2026-04-19 — Session 1970c713
1. **Prompt caching 1h TTL** (2026-04-17) cuts system prompt cost to ~10% on consecutive sessions within hour window — high-impact, low-friction leverage point.

2. **Lead orchestration model selection** — Opus 4.7 is ~25× haiku, ~5× sonnet for pure routing/decision work. Cost data strongly suggests sonnet is threshold sufficient; Opus overkill for delegation-dominant workloads.

3. **Parallel agent cost explosion** — 3× Explore in parallel × Opus = $500+ sessions. Single Explore would suffice for most investigations; parallelization reserved for Trigger A (independent subtasks with true data disjoint, not just "read different files").

4. **System prompt engineering debt** — CLAUDE.md + 13 rules + paths + 40+ skill descriptions + deferred tools add ~50K tokens/session baseline. Rules consolidation (funnel to 8–10 core) + examples pruning could recover 20–30% of fixed cost.

