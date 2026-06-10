# Seed dossier — graphify scout (code-graph context layer)

> **Provenance**: scout agent `scout-graphify` (general-purpose, WebSearch+WebFetch, ≤15 tool calls), session 2026-06-10, triggered by user request "graphify podría ser útil para reducir gasto de tokens — investígalo". Scout includes its own counter-evidence pass; W3 finder must extend (esp. the LSP-marginal-value gap), not repeat. Verbatim scout output below.

---

## SCOUT REPORT: "graphify"

### 1. Identification verdict

**[Seguro] The user means `safishamsi/graphify`** — a literal tool named "graphify", not Graphiti and not the generic category. Confidence: high. Its tagline matches the user's description verbatim ("queryable knowledge graph" of code so the AI "understands how each part relates", marketed on "token tax" reduction), and it is currently the highest-visibility tool with that name in the Claude Code ecosystem.

**What it is** (verified via GitHub API + repo, 2026-06-10):
- AI-coding-assistant **skill** (`/graphify .` in Claude Code) + optional **MCP server** (`python -m graphify.serve`, tools: `query_graph`, `get_node`, `get_neighbors`, `shortest_path`). Python, MIT.
- Two-pass: tree-sitter AST extraction (28 grammars; local, no LLM) → optional LLM pass for semantic "INFERRED" edges. Also ingests SQL schemas, Terraform, Markdown, PDFs, images, video. Output: `graph.json` + `GRAPH_REPORT.md` + `graph.html`.
- Staleness handling: `--update` incremental re-index + optional git post-commit hook (`graphify hook install`).
- **Stats (GitHub API, fetched today)**: 64,488 stars, 6,565 forks, 330 open issues, **created 2026-04-03** (only ~2 months old — meteoric, hype-driven adoption curve; treat star count as a momentum signal, not maturity), last push 2026-06-08, release v0.8.36 (2026-06-08) — very actively maintained but pre-1.0, fast-moving API.
- Install: `pip/uv install graphifyy` → `graphify install` → `/graphify .` (~5 min setup per reviews).

### 2. Evidence table (measured benefit)

| Claim | Tier | Source / date |
|---|---|---|
| RepoGraph (repo-level code graph): +2.66/+2.34 absolute resolve-rate on SWE-bench, ~32.8% avg relative improvement | **A** (ICLR 2025) | proceedings.iclr.cc RepoGraph paper (2026-06-10 search) |
| CodexGraph (graph-DB interface for code agents): accuracy maintained w/ large input-token cuts (~80% in-toolset) | **A** (NAACL 2025) | emergentmind.com/topics/codexgraph; arxiv (2026-06-10) |
| Tree-sitter KG via MCP: 99.2% token reduction over raw file exploration (372 questions, 31 languages) | **A/B** (arXiv preprint, vendor-adjacent) | arxiv.org/html/2603.27277v1 (2026-06-10) |
| Graphify on MemMachine repo (442 files): avg 79.6× fewer tokens/query (496k naive → ~6.2k); range 48×–714×; extraction cost 1.4M input + 247k output tokens, payback ≈240 queries | **C** (practitioner with numbers; baseline = naive full-corpus read, a weak strawman) | stevescargall.com blog, 2026-05-10 |
| Realistic ranges: 6.8× (code review), 6–15× (100–500 files), 49× (500+ files); methodology = vs naive grep cycles | **C** | roborhythms.com/graphify-review, 2026-05-28 |
| Headline "71×" figure = large mixed corpus vs reading every raw file | **B/C** (vendor-amplified) | medium.com Edward Low + graphify.net, May 2026 |

### 3. Counter-evidence (this is the strong part)

- **Independent 10-question session on browser-use repo: 113k tokens WITH graphify vs 120k WITHOUT — only ~7-8% savings** (search-corroborated across multiple May-2026 writeups, 2026-06-10). The 71× headline compares against a baseline (read entire corpus) that Claude Code never actually uses.
- **GitHub issue #580 (open since 2026-04-28): "Graphify not improving token efficiency in Claude Code sessions"** — user measured token usage INCREASE: each query re-reads GRAPH_REPORT.md, overhead exceeds savings; graph doesn't persist in context. Still open as of today. [Seguro — fetched the issue]
- **roborhythms review failure modes**: <100 files → "naive grep already fast and cheap"; Leiden clustering on legacy Java monoliths produces "operationally useless" communities; graph = build-time snapshot, goes stale without git-hook wiring; Claude Code ≥2.1.117 silently broke its PreToolUse hook integration (workaround = manual graph consultation). (2026-05-28)
- **LSP-overlap analysis** (aalmada.github.io, 2026-04-25/upd-06-08): positions LSP and Graphify as complementary — LSP wins on symbol-precise ops (def/refs/types), graph claimed to win on cross-artifact architectural navigation — but provides **no numbers** for the marginal value of graph-over-LSP. Tier D for the "complementary" claim.
- No A-tier evidence exists for *graphify itself* — the academic results (RepoGraph/CodexGraph) are different systems measured on SWE-bench agents, not Claude Code interactive sessions.

### 4. Cost of adoption (single-user Claude Code + existing LSP/tree-sitter setup)

- Setup ~5 min; but ongoing: pre-1.0 churn (131 releases in 2 months), git-hook wiring required to avoid staleness, known hook breakage with recent Claude Code versions, optional LLM semantic pass costs real tokens (1.4M-token extraction on a 442-file repo, ~240-query payback).
- **Duplication risk is material**: the target setup already has typescript-lsp + tree-sitter-grade search. For TS-centric repos, LSP covers most of what the AST graph provides; graphify's differential value is cross-artifact (code+SQL+infra+docs) and community/architecture summaries — unproven incrementally (issue #580, browser-use test).
- Sweet spot per all sources: **large (500+ file), polyglot, mixed-artifact repos with stable structure**. Weak fit: small/fast-changing repos, single-language repos already served by LSP.

### Recommendation (3 lines)

**Fold into an existing workstream angle ("context-efficiency layer"), not a full research target.** Identification is solid and the tool is real, huge-momentum, and free — but the only independent end-to-end Claude Code measurements show ~7% savings or net-negative (issue #580), versus vendor-amplified 49-71× from strawman baselines; with LSP already installed the marginal value is the unmeasured part. Concrete next step if pursued: a 1-hour A/B on one of the user's own 100+ file repos (same 10 questions with/without `/graphify .`), which would settle it empirically per the "measure, don't estimate" memory rule; discard without regret if the repo set is small/TS-only.
