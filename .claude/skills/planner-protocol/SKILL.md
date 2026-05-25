---
name: planner-protocol
description: |
  Adaptive planning protocol — Discovery, Research, Gap Analysis, Task Classification,
  Execution Roadmap with DAGs, TDD, Validation. Three levels (Quick/Standard/Full)
  scaled by complexity to avoid overhead on small tasks.
  Use proactively when: complexity ≥30, plan mode active, or user invokes /planner.
  Keywords - plan, roadmap, decompose, DAG, parallel waves, gap analysis, classification
type: knowledge-base
disable-model-invocation: false
version: "1.1"
effort: high
---

# Planner Protocol

Orchestrator Strategy Engine. Translates human intentions into Validated Execution Graphs that minimize errors and maximize parallelism, always using the highest quality data available.

## §0 Level Triage (MANDATORY first step)

Declare the level on the first line of the output: `Level: Quick|Standard|Full — <reason>`.

| Level | When | What runs | Cost | Refs loaded |
|---|---|---|---|---|
| **Quick** | Complexity <30 OR clear scope (1-2 files, no external research) OR `/planner --quick` | Brief Discovery (refs/01 §A) + Decomposition + minimal Roadmap | ~3-5 min | ≤2 |
| **Standard** (default) | Complexity 30-60 OR ambiguity about dependencies | Quick + Research (refs/02) + Gap Analysis (refs/03) if stack unknown | ~10 min | 3-5 |
| **Full** | Complexity >60 OR `/planner --full` OR multi-domain | All phases (refs/01-08) + Cross-Validation + Team Mode if applicable | ~20-30 min | 8 |

### Escalation Rules

- Start at Quick. Escalate to Standard if Quick uncovers uncertainty (unknown API, missing context, >3 files).
- Escalate to Full if Standard uncovers multi-domain coupling, architectural risk, or security-critical paths.
- If escalation triggers fire mid-plan, restart at the higher level. Do not splice levels.
- The Lead can force level via flag (`--quick`, `--standard`, `--full`) or explicit instruction.

---

## §1 Fundamental Goals (active throughout)

Certainty (verify before asserting) · Anti-Hallucination (Glob before referencing) · Parallelization (batch independent ops in one message) · TDD (each planned function → its test) · Clarity (tables > prose) · Traceability (milestones + dependencies explicit). Full operational meaning: poneglyph CLAUDE.md §10 Commandments.

---

## §2 Task Classification 🔵🟡🔴 (core)

| Symbol | Type | Definition | Execution |
|--------|------|------------|-----------|
| 🔵 | **Independent** | No mutual dependencies | PARALLEL — same message |
| 🟡 | **Dependent** | Needs prior output | SEQUENTIAL — wait |
| 🔴 | **Blocking** | Human checkpoint/validation | PAUSE — approve before continuing |

Full classification rules, parallel vs sequential syntax, Parallel Efficiency Score thresholds (>80% / 50-80% / <50%), worked examples: `${CLAUDE_SKILL_DIR}/references/04-classification-waves.md`.

---

## §3 Agent + Skill Selection

Tool→Agent mapping and keyword→skill matching are owned by `orchestrator-protocol`. The planner ASSIGNS agents/skills to each DAG node but does not re-derive the routing rules. If those rules are not in context, the Lead should invoke `Skill('orchestrator-protocol')` first (see `bootstrap-lead.md`). The references hold the canonical matrices:

- Agent selection matrix + 8 multi-agent patterns + 7 anti-patterns → `orchestrator-protocol/references/04-agent-selection.md`
- Keywords→skills mapping + priority scoring + synergy rules → `orchestrator-protocol/references/05-skill-matching.md`

---

## §4 Output Format (mandatory header)

Every plan output MUST start with:

```markdown
Level: <Quick|Standard|Full> — <reason>

## Executive Summary
Implement [WHAT] in [WHERE] to achieve [OBJECTIVE].
Affects [N] files, [M] are new, risk [LOW/MEDIUM/HIGH].

## Dependency Graph
<mermaid DAG with 🔵🟡🔴>

## Execution Nodes
<table per wave: file, tool, skills, verification>
```

Full output sections (Tool Inventory, Deep Research Summary, Gap Analysis, complete DAG, Execution Nodes per wave, Quality Gate, full worked example): `${CLAUDE_SKILL_DIR}/references/06-output-format.md`.

---

## Content Map

| Topic | File |
|---|---|
| Discovery sources + anti-duplicates (Phase 0) | `${CLAUDE_SKILL_DIR}/references/01-discovery.md` |
| Deep Research + anti-obsolescence (planning code with external APIs) | `${CLAUDE_SKILL_DIR}/references/02-research.md` |
| Gap Analysis + ground truth verification per change type (Phase 2) | `${CLAUDE_SKILL_DIR}/references/03-gap-analysis.md` |
| Task classification rules + parallel efficiency score (Phase 3) | `${CLAUDE_SKILL_DIR}/references/04-classification-waves.md` |
| Workflow phases 0-4 procedural guide + iterative execution by plan size | `${CLAUDE_SKILL_DIR}/references/05-workflow-phases.md` |
| Complete output format (sections A-F) + full worked example | `${CLAUDE_SKILL_DIR}/references/06-output-format.md` |
| Team mode + cross-validation + Four-Eyes workflow (complexity >60) | `${CLAUDE_SKILL_DIR}/references/07-team-mode.md` |
| Poka-Yoke + TDD + final quality gate checklist + scripts | `${CLAUDE_SKILL_DIR}/references/08-quality-gates.md` |

---

## References (academic basis)

- [Anthropic — Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- [The New Stack — 5 Key Trends Shaping Agentic Development in 2026](https://thenewstack.io/5-key-trends-shaping-agentic-development-in-2026/)
- [ICSE 2025 — LLMs Meet Library Evolution: Deprecated API Usage](https://arxiv.org/abs/2406.09834)
- [CloudBabble — Defence in Depth for Agentic AI](https://www.cloudbabble.co.uk/2025-12-06-preventing-agent-hallucinations-defence-in-depth/)
- [Addy Osmani — My LLM Coding Workflow Going Into 2026](https://medium.com/@addyosmani/my-llm-coding-workflow-going-into-2026-52fe1681325e)
