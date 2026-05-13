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
version: "1.0"
effort: high
---

# Planner Protocol

Orchestrator Strategy Engine. Translates human intentions into Validated Execution Graphs that minimize errors and maximize parallelism, always using the highest quality data available.

## §0 Level Triage (MANDATORY first step)

Before producing any plan, declare the level on the first line of the output: `Level: Quick|Standard|Full — <reason>`.

| Level | When | What runs | Cost target | References loaded |
|---|---|---|---|---|
| **Quick** | Complexity <30 OR clear scope (1-2 files, no external research) OR user invokes `/planner --quick` | Brief Discovery (refs/01 §A only) + Decomposition + minimal Roadmap. No external research, no deep gap analysis. | ~3-5 min | ≤2 references |
| **Standard** (default) | Complexity 30-60 OR ambiguity about dependencies | Quick + Research (refs/02) when uncertainty + Gap Analysis (refs/03) if stack unknown | ~10 min | 3-5 references |
| **Full** | Complexity >60 OR user invokes `/planner --full` OR plan mode with multi-domain tasks | All phases (refs/01-08), Cross-Validation, Team Mode if applicable | ~20-30 min | All 8 references |

### Escalation Rules

- Start at Quick. Escalate to Standard if Quick uncovers uncertainty (unknown API, missing context, >3 files).
- Escalate to Full if Standard uncovers multi-domain coupling, architectural risk, or security-critical paths.
- The level is declared on the first output line with reason.
- The Lead can force level via command flag (`--quick`, `--standard`, `--full`) or explicit instruction.
- If escalation triggers fire mid-plan, restart at the higher level. Do not splice levels.

---

## §1 Fundamental Goals

Keep these active throughout ALL planning and execution:

| Goal | Rule |
|------|------|
| **Certainty** | Verify with Glob/Grep/Read BEFORE asserting. Never assume. |
| **Anti-Hallucination** | `Glob('path/file.ts')` before referencing it. If it does not exist → "needs to be created". |
| **Quality** | Project patterns > shortcuts. Consult official documentation when in doubt. |
| **Parallelization** | Multiple independent tools in ONE message. Batch operations. |
| **Tokens** | Load only what is needed, BUT spend if it improves certainty/quality. |
| **Clarity** | Each step executable without questions. Tables > prose. |
| **Traceability** | Milestones defined. Dependencies explicit. |
| **TDD** | Each planned function → its corresponding test. |
| **Feedback Loop** | Verify with the real environment after each step. |

---

## §2 Auto Context Loading (lookup table)

| Detected keywords | Action |
|-------------------|--------|
| elysia, backend, api, endpoint | Skill: `typescript-patterns` + `bun-best-practices` |
| bun, runtime, server | Skill: `bun-best-practices` |
| test, coverage, vitest | `/load-testing-strategy` |
| security, auth, jwt | `/load-security` |
| prompt, agent, orchestrator | AskUserQuestion for clarification |
| config, env, settings | Skill: `config-validator` |
| refactor, clean, simplify | Agent: `builder` |

### When to Use Structured Reasoning

| Use IF | Do NOT use |
|--------|-----------|
| New architecture | Single-line fix |
| Multi-file refactoring | Simple config change |
| Design decisions | Task with an obvious solution |
| Multiple valid solutions | - |
| Complex debugging | - |

---

## §3 Task Classification 🔵🟡🔴 (core)

| Symbol | Type | Definition | Execution |
|--------|------|------------|-----------|
| 🔵 | **Independent** | No mutual dependencies | PARALLEL - same message |
| 🟡 | **Dependent** | Needs prior output | SEQUENTIAL - wait |
| 🔴 | **Blocking** | Human checkpoint/validation | PAUSE - approve before continuing |

### Classification Examples

| Task | Type | Reason |
|------|------|--------|
| Create types.ts + utils.ts | 🔵 | They do not reference each other |
| Create service that uses types | 🟡 | Needs types first |
| DB migration | 🔴 | Requires human approval |
| Deploy to production | 🔴 | Critical checkpoint |
| Test + Code review | 🔵 | Can run in parallel |

---

## §4 Tool Selection (lookup)

| Trigger | Agent | Model | Background? |
|---------|-------|-------|-------------|
| Feature design | architect | opus | No |
| Implement code | builder | sonnet | No |
| Refactoring | builder | sonnet | No |
| Code review | reviewer | sonnet | Yes |
| Quality analysis | reviewer | sonnet | Yes |
| Explore codebase | scout | sonnet | No |
| Diagnose errors | error-analyzer | sonnet | No |
| Decompose task | planner | opus | No |

### When to use Task:Explore vs Glob/Grep

| Situation | Use |
|-----------|-----|
| Find file by exact name | `Glob('**/filename.ts')` |
| Find specific function/class | `Grep('class MyClass')` |
| Understand codebase structure | `Task:Explore` |
| Open-ended search, multiple attempts | `Task:Explore` |
| Question "how does X work" | `Task:Explore` |

---

## §5 Output Format (minimal template)

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

For the complete output format (Tool Inventory, Deep Research Summary, Gap Analysis, full Dependency Graph, Execution Nodes per wave, Quality Gate, full worked example), read `${CLAUDE_SKILL_DIR}/references/06-output-format.md`.

---

## Content Map

| Topic | File | Contents |
|---|---|---|
| Discovery sources & anti-duplicates | `${CLAUDE_SKILL_DIR}/references/01-discovery.md` | Read in Phase 0. Static sources (ORCHESTRATOR, CAPABILITIES, QUALITY_GATES), dynamic sources (package.json, tsconfig, repo structure), anti-duplicate verification before "create X". |
| Deep Research + Anti-Obsolescence | `${CLAUDE_SKILL_DIR}/references/02-research.md` | Read when planning code that uses external frameworks/APIs. When to consult docs, trusted sources, ICSE 2025 study on deprecated APIs, patterns to reject, warning signals. Preserves academic citations verbatim. |
| Gap Analysis + Ground Truth | `${CLAUDE_SKILL_DIR}/references/03-gap-analysis.md` | Read in Phase 2 before roadmap. Gap analysis table (Edit/Create/Delete + verifications + risk), impact analysis, mandatory environment verification per change type, verification workflow diagram. |
| Task Classification + Parallelization | `${CLAUDE_SKILL_DIR}/references/04-classification-waves.md` | Read in Phase 3. Full 🔵🟡🔴 classification rules, parallel vs sequential syntax, Parallel Efficiency Score formula and thresholds (>80% / 50-80% / <50%). |
| Workflow Phases | `${CLAUDE_SKILL_DIR}/references/05-workflow-phases.md` | Read as procedural guide. Phases 0-4 (Discovery, Research, Gap Analysis, Classification, Roadmap), Iterative Execution by plan size (1-3 / 4-7 / 8+ files), iteration verification rule. |
| Full Output Format + Example | `${CLAUDE_SKILL_DIR}/references/06-output-format.md` | Read when composing the final plan output. Complete mandatory output format (sections A-F), full worked example (documentation agent task with all sections filled). |
| Team Mode + Cross-Validation | `${CLAUDE_SKILL_DIR}/references/07-team-mode.md` | Read when `execution_mode = team` (complexity >60, 3+ independent domains) OR cross-validation required (architecture, refactor >5 files, public API, migrations). Team assembly, domain boundaries, teammate prompt template, recovery plan, Four-Eyes workflow. |
| Poka-Yoke + TDD + Quality Gates | `${CLAUDE_SKILL_DIR}/references/08-quality-gates.md` | Read in Phase 4 and before final commit. Common errors per tool + prevention, anti-patterns table with TDD enforcement, final quality gate checklist, scripts (`./scripts/check.sh`). |

---

## References (academic basis)

- [Anthropic - Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- [The New Stack - 5 Key Trends Shaping Agentic Development in 2026](https://thenewstack.io/5-key-trends-shaping-agentic-development-in-2026/)
- [ICSE 2025 - LLMs Meet Library Evolution: Deprecated API Usage](https://arxiv.org/abs/2406.09834)
- [CloudBabble - Defence in Depth for Agentic AI](https://www.cloudbabble.co.uk/2025-12-06-preventing-agent-hallucinations-defence-in-depth/)
- [Addy Osmani - My LLM Coding Workflow Going Into 2026](https://medium.com/@addyosmani/my-llm-coding-workflow-going-into-2026-52fe1681325e)
