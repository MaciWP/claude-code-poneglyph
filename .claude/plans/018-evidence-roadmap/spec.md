---
id: 018-evidence-roadmap
created: 2026-06-10
approved: 2026-06-10
mode: full
phase: 2
status: approved
---

# Problema

Post-017 design decisions (orchestration II, behavioral evals, context policy, platform architecture, new capabilities) currently rest on conjecture and anecdote. The user mandates measured data — "analizar proyectos que hayan sido medidos, con calidad de análisis y rigor" — before committing any design. Root problem: poneglyph has no evidence base; it has opinions plus one seed session (2026-06-10, 3 verified dossiers on orchestration).

# Resultado esperado

- Every post-017 design decision in the 5 research areas is backed by ≥1 Tier A/B source that survived adversarial verification.
- A ratified `roadmap-019.md` backlog where each entry cites its supporting evidence.
- The 3 seed dossiers from 2026-06-10 persisted in-repo and extended, not re-researched.
- A reusable rigor method (evidence tiers + verification protocol) proven across 5 dossiers — promotion candidate for future research features.

# Success criteria (medibles, Given/When/Then)

- **AC1 (rigor)**: Given any `evidence/W{n}.md`, when audited, then every decision-changing claim carries tier + URL + date, `UNVERIFIED` is explicit where verification failed, a counter-evidence section exists, and no Tier C/D claim is cited as basis in a decision-memo.
- **AC2 (coverage)**: Given the 5 workstreams, when Phase 3 closes, then each has `evidence/W{n}.md` + `decision-memo-W{n}.md`, and W5 (discovery) respected its timebox: 1 fan-out round + 1 verification round, no more.
- **AC3 (verification)**: Given the decision-changing claims, when critic samples ≥3 citations per dossier against the primary source, then sampled URLs resolve and support the claim as stated — any failure → NEEDS_CHANGES.
- **AC4 (synthesis)**: Given the 5 decision-memos, when US6 closes, then `roadmap-019.md` exists, every backlog entry references ≥1 Tier A/B finding, and the user ratifies it in retro.
- **AC5 (seeds)**: Given the 3 conversation-only dossiers (2026-06-10), when US0 closes, then `evidence/seed-{anthropic,academic,industry}.md` exist verbatim with provenance headers.

# Out of scope (explícito)

- Implementing ANY resulting design (sync v2, best-of-N mode, eval harness, harvest command, security posture changes) — that is 019+.
- 017's build work (hygiene, settings modernization, skills audit) — runs in parallel, separate lifecycle.
- Telemetry/observability pipeline — Commandment IX stays reactive ad-hoc.
- Re-running research already verified in the seed dossiers — extend, don't repeat.

# Constraints

- **Aislamiento**: 018 writes ONLY under `.claude/plans/018-evidence-roadmap/` — zero file conflicts with 017; lifecycles may interleave.
- **Rama**: work on the current active branch (`017-personal-optimization`) or its successor — no new divergent line (lesson: 012-016 stranded-branch finding, 2026-06-10).
- **Listón de evidencia**: Medido A/B (user-ratified 2026-06-10). Fan-out via Agent tool; Workflow only on explicit "ultracode" opt-in.
- **Compatibilidad**: `bun test ./.claude/hooks/` stays green (smoke — 018 touches no code).

# Stakeholders

- **Oriol** — único usuario; decides both hard gates and ratifies the 019+ backlog in retro.

# Open questions

- W5 inclusion rubric: what qualifies a published Claude Code setup as "high-quality / measured" worth analyzing — define before fan-out (Phase 2 decision).
- W3 transferability: most context-degradation benchmarks predate Fable 5-class models — dossier must flag where thresholds may not transfer.
- W1 METR-lite protocol depth: proposal only in this feature; any implementation is 019+ (confirm in Phase 2).

# Modelo conceptual / Detalle técnico

## Rigor method (transversal — applies to all 5 dossiers)

| Tier | Definition |
|---|---|
| **A** | Peer-reviewed / RCT / benchmark with public methodology |
| **B** | Vendor-measured internal data, labeled `[vendor]` |
| **C** | Practitioner report with concrete numbers |
| **D** | Opinion / anecdote without numbers |

- **Decision rule**: a design change requires ≥1 A/B source with no known A/B contradiction. C/D never ground a decision — inspiration/color only.
- **Adversarial verification**: every decision-changing claim passes through a second agent instructed to REFUTE it against the primary source (pattern validated 2026-06-10).
- **Counter-evidence mandate**: each workstream actively searches for negative results (seed examples: METR −19% RCT, MAST 41-86.7% failure rates). Research without counter-evidence is marketing.
- **Claim format**: assertion + tier + URL + date; `UNVERIFIED` explicit when confirmation failed.

## Workstreams

| WS | Focus | Feeds |
|---|---|---|
| W1 | Orchestration II: best-of-N + mechanical verifier in interactive flows; non-vendor background-session data; METR-lite self-measurement protocol; effort-scaling heuristics of published orchestrators | best-of-N mode, bg-sessions pilot, `orchestrator-protocol` heuristics |
| W2 | Behavioral evals: how serious projects regression-test prompts/config (promptfoo, OpenAI evals, Anthropic eval guidance, DSPy asserts, skill-creator evals); minimum eval-set size; skill-trigger accuracy measurement | golden-prompt harness for CLAUDE.md/style/skill changes |
| W3 | Measured context degradation (RULER, NoLiMa, context-rot reports, LongBench v2); practical utilization thresholds; compaction vs note-taking vs subagent-compression comparisons | Lead context policy (when to delegate reads, when to compact) |
| W4 | Platform: dev-vs-deployed patterns in dotfile managers (chezmoi, nix home-manager, stow); memory architectures with published evals (Letta/MemGPT, LangMem, Mem0); agent sandboxing/incident data | sync v2 design, harvest command, declared security posture |
| W5 | Discovery ("lo que no tenemos"): high-quality published CC setups; unused CC 2.1.x features with value evidence; emerging agentic patterns WITH measurement (ACE, skill-learning, self-improvement loops). **Timeboxed** | capability candidates → backlog entries |
| W6 | Synthesis: cross 5 memos → `roadmap-019.md` + decision↔evidence table | the ratified backlog |
