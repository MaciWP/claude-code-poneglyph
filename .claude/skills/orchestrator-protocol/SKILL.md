---
name: orchestrator-protocol
description: |
  Turn-level Lead orchestration protocol: verification principles, 5-step
  per-turn checklist (Triage / Complexity / Context / Delegate / Validate),
  the canonical spawn decision tree, skill matching, and delegation context
  template (Arch H).
  Complementary to the `/flow` command — `/flow` orchestrates a FEATURE
  lifecycle across multiple turns (5 phases with artefacts in plans/);
  this skill governs each individual Lead turn within (or outside) that flow.

  Use ON DEMAND when orchestration guidance is needed (complex routing,
  spawn decisions, skill matching). The operational core (inline-first,
  spawn thresholds, verification baseline) is always-loaded in CLAUDE.md;
  this skill is the expanded reference, not an always-on load.
  Keywords - orchestrate, delegate, complexity, routing, agent, skill, checklist
disable-model-invocation: false
---

# Lead Orchestration Protocol (turn-level)

> **Scope**: this skill defines what the Lead does in a single turn (Triage → Complexity → Context → Delegate → Validate). For multi-turn FEATURE orchestration (5-phase workflow with `spec.md`/`tasks/`/`tests.md`/`review.md`/`retro.md` artefacts), use the `/flow` command. They are complementary, not redundant.

## §0 Verify First

Before asserting anything exists, verify with tools. Never assume.

| Need | Primary tool | Fallback |
|------|-------------|---------|
| File exists? | Glob | Read with exact path |
| Symbol exists? | LSP goToDefinition | Grep |
| Content matches? | Read | — |
| Text in file? | Grep | Read + search |

**Rule**: confidence < 70% → ask with `AskUserQuestion`, don't guess.

Tool hierarchy, confidence levels, validation pipeline: the `anti-hallucination` skill (canonical).

---

## §1 Per-turn Checklist (5 steps)

Execute steps 1-5 IN ORDER before responding. No exceptions.

### Step 1: Triage

| Condition | Action |
|---|---|
| Trivial (typo, rename, 1 line, simple Q) | Skip to Step 4 |
| Vague AND genuine doubt | `AskUserQuestion` or `prompt-engineer` skill |
| Clear (pragmatically obvious intent) | Continue |
| Feature-scope task (multi-phase work) | Suggest `/flow <task>` to the user |

For architectural/comparison decisions → `Skill('decide')` first.

**Multi-round questioning** (006): when a prompt is ambiguous or a plan needs alignment, ask in rounds while genuine doubt remains — include lateral / improvement questions — rather than stopping at one round; converge and say so when no real doubt is left (calibrated, Commandment III). Use `drillme` for iteration mechanics. Principle: CLAUDE.md §Communication & Honesty Protocol.

> Prompt quality refinement, "what is a good prompt" rubric, ambiguity detection → use the `prompt-engineer` skill (Keywords: prompt, generar prompt, refine prompt, vague prompt, ambiguous). This is the canonical source — do not re-implement scoring here.

#### Delegation doctrine — inline-first (evidence-based, 2026-06-10)

**ALL build/write work runs INLINE in the Lead's session.** Agents exist for ONE purpose: parallelizing independent **read-only** units (research sweeps, exploration, review lenses). Evidence (user-validated across months of use, 2026-06-10, feature 017): delegated build work consistently cost more and produced worse results; the only delegation mode that proved valuable is the parallel read-only fan-out. The three known costs of delegating work:

1. **Token multiplication** — each agent re-reads context the Lead already holds.
2. **Summary degradation** — the agent's hand-back compresses away detail; quality is lost at the seam.
3. **Context loss** — the agent never sees the conversation; intent and constraints arrive incomplete (Arch H mitigates, never eliminates).

Write fan-out (≥4 independent WRITE units via Workflow) is **explicit user opt-in only** (keyword "ultracode" or a direct ask) — never auto-launched. This doctrine cites evidence, not fashion — revisable via retro if agent quality materially changes.

#### Spawn decision tree — expanded reference

> **The operational core is always-loaded in `CLAUDE.md` §Lead Orchestrator Mode** (inline-first, 1-agent forbidden, ≥4 read-only → Workflow). This is the full diagram + principles; other skills link here for the detail, not for the always-on rule:

```mermaid
graph TD
  START["Trabajo para el Lead"] --> CNT{"Eje-1: ¿# unidades de trabajo<br/>independientes y paralelizables?"}
  CNT -->|"1 (incl. 1 tarea grande no paralelizable)"| INLINE
  CNT -->|"2-3"| INLINE["INLINE en main<br/>NUNCA 1 agente · 'isolation' no es excusa (/clear limpia)"]
  CNT -->|"≥4"| RO{"Eje-2: ¿unidades read-only<br/>(research/exploración/review)?"}
  RO -->|"Sí"| NAT{"Eje-3: ¿NEGOCIAN<br/>interfaces entre sí?"}
  RO -->|"No → escritura"| OPTIN["INLINE secuencial<br/>salvo OPT-IN explícito del usuario<br/>(ultracode) → Workflow + worktree"]
  NAT -->|"No → independientes"| WF["WORKFLOW (fan-out read-only)<br/>research multi-search · panel de DECISIÓN ≥4"]
  NAT -->|"Sí → ≥3 dominios"| TEAM["TEAM mode (narrow · experimental)<br/>negocian vía task list (#24316 general-purpose)"]
```

| # | Principio | Regla |
|---|---|---|
| **P1** | 1 agente = **PROHIBIDO** | Única excepción: el **fresh-context reviewer** de critic Phase 4 (read-only, correctness/requirements — su valor ES el contexto fresco; evidencia 018 W1 D1/D3, feature 019). Fuera de eso: no paraleliza; solo aísla contexto (que `/clear` limpia); encarece sin retorno. |
| **P2** | "isolation" **no es excusa** | El main actúa y se ensucia antes que pagar 1 agente. **"≥5 files" NO es trigger de spawn → inline.** |
| **P3** | Umbral **≥4** + **read-only** | 1-3 unidades → inline. ≥4 read-only → Workflow. ≥4 de ESCRITURA → inline secuencial salvo opt-in explícito del usuario. |
| **P4** | research sí, code-review NO se delega en panel | Research delegada → ≥4 en paralelo (search barato `Explore`/haiku); si <4 → inline. Code review = checks mecánicos + **1 fresh-context reviewer** (P1-exception); panel ≥4 SOLO para decisiones (`decision-stress-test`) — evidencia 018 W1/W2 (feature 019). |
| **P5** | Core en CLAUDE.md, detalle aquí | El núcleo operacional vive always-loaded en CLAUDE.md; este árbol es la referencia expandida. El resto enlaza aquí para el detalle, no redefine umbrales. |
| **P6** | Fix = borrado + enlazar | Sin maquinaria de enforcement; los patrones de la Workflow tool se **enlazan**, no se copian. |
| **P7** | spawn-decision ≠ intra-orchestration | ≥4 gobierna la DECISIÓN de spawnear. Agentes coordinándose **dentro** de un team/workflow ya spawneado (p.ej. Four-Eyes generator→validator) no son un nuevo spawn. |
| **P8** | Escritura = inline-first | Build/write SIEMPRE inline por defecto; el fan-out de escritura degrada calidad (3 costes arriba) y solo se justifica con opt-in explícito. |

**Exploración (lectura, NO spawn-de-trabajo)**: `Explore` (Haiku built-in del harness) es la primitiva de lectura — barata, read-only — para exploración masiva read-only que ensuciaría el contexto del Lead. **NO cuenta como "1 agente prohibido".** 1-2 files → Lead `Read` inline. Delegar TRABAJO sigue el árbol (≥4). Matriz completa: `references/04-agent-selection.md`.

**Ortogonal al árbol (no son spawn)**: sensitive paths (`.env`, `*.lock`, `package.json`, `.claude/settings.json`, `secrets/`, `credentials/`) → inline con `sensitive: <reason ≥8 chars>`. Destructive ops (`rm -rf`, force push, schema change) → nunca directo; escalar al usuario con razón explícita.

**Cuándo Workflow vs Team** (eje-2) + dispatch del fresh-context reviewer: `references/04-agent-selection.md` §Workflow wiring.

### Step 2: Complexity

Show inline: `Complexity: ~XX`.

| Score | Routing | Mode |
|---|---|---|
| <30 | act inline (skip scoring/skills) | inline |
| 30-60 | `Skill('tech-plan')` optional | inline or Workflow (≥4) |
| >60 | `Skill('tech-plan')` MANDATORY | inline, Workflow, or Team |

> If complexity > 60, suggest `/effort xhigh` to the user.

Complexity factors × weight, mode selection, worktree decision: `references/03-complexity-routing.md`.

### Step 3: Prepare Context (Arch H)

Skills reach an agent (a Workflow/Team agentType, or the Lead's own session) by three mechanisms:
1. **`skills:` frontmatter** — for a custom `agentType` used inside a Workflow that ALWAYS needs a skill (preloads at startup).
2. **`Skill` tool** — an agent self-discovers and invokes task-specific skills mid-task when `Skill` is in its `tools:`. Name the relevant skills in the task prose.
3. **Arch H Lead-directed `Read`** — embed `Read .claude/skills/<name>/SKILL.md` in the agent/workflow prompt's `[RELEVANT SKILLS FOR THIS TASK]` block (max 3, matched via `references/05-skill-matching.md` + path rules). Use to force exact content. (Lead-side `Skill()` does NOT propagate.)

Full Arch H template with all blocks, propagation model, skill discovery: `references/06-context-arch-h.md`.

### Step 4: Delegate

| Tool | Usage |
|---|---|
| `Workflow` (≥4 independent **read-only** units) | Fan-out: research sweeps / exploration / decision-review panel in parallel (`agentType` `default`, or built-ins like `Explore`). Write fan-out: explicit user opt-in only (`isolation: 'worktree'` on file collision) |
| `Explore` | Explore codebase (massive read-only — Haiku built-in; not a work-spawn) |
| `Skill('tech-plan')` | Plan complex tasks — Lead inline, no dedicated agent |
| `Skill('diagnostic-patterns')` | Diagnose failures — Lead inline, no dedicated agent |
| `Skill()` | Load context into the Lead's OWN session only |
| `/goal` / `/loop` (native autonomous iteration) | Drive a gated build→critic to a verifiable stop, or recurring read-only audit/research. Doctrine-safe usage (external oracle + evidence in transcript, never cross a hard gate unattended): `references/09-loops-playbook.md` |

Direct action (the default for ALL write work): Read always permitted. Edit/Write/Bash run inline — **≥5 files is still inline** (P2), and a long write queue runs inline SEQUENTIALLY rather than fanning out (P8). On sensitive paths declare inline `sensitive: <reason ≥8 chars>`. Destructive patterns — escalate with explicit reason. No automated gate enforces this; the Lead is responsible.

**Parallelize**: parallelism inside the Lead's own session is free — batch independent tool calls (Reads, Greps, disjoint Writes) in one message. Agent fan-out via `Workflow` requires ≥4 independent READ-ONLY units (P3); for write waves, inline sequential is the default and Workflow needs explicit user opt-in (P8). Multi-agent patterns + anti-patterns: `references/04-agent-selection.md`.

### Step 5: Validate

| Change type | Validation |
|---|---|
| Single file, low complexity | Lead confirms tests passing inline |
| Multi-file | `Skill('critic')` inline + **1 fresh-context read-only reviewer** (P1-exception, feature 019; `references/04-agent-selection.md` §Workflow wiring) |
| Security-related | `security-review` skill (mandatory dispatch — Cmd VI) |
| Cross-domain feature | `Skill('critic')` (Phase 4 of the 5-phase workflow) |

**NEVER report "completed" without confirmation that tests pass.** Test verification is the Lead's explicit responsibility — there is no automatic Stop hook for it.

Retry budget, stuck detection, escalation rung → `error-recovery.md` rule (project root, always-loaded). Procedural recovery detail (SendMessage, diagnosis steps, recovery template, worktree cleanup) → `references/07-error-recovery.md` (on-demand). Output style baseline + escape triggers → `output-styles/poneglyph.md`.

---

## Content Map

| Topic | File |
|---|---|
| Verification, confidence levels, validation pipeline | the `anti-hallucination` skill (canonical; `references/01-verification.md` is a pointer) |
| Complexity factors × weight, mode selection, worktree, effort/model routing | `references/03-complexity-routing.md` |
| Agent selection matrix, exploration 2×2, Workflow wiring, multi-agent patterns + anti-patterns | `references/04-agent-selection.md` |
| Keywords→skills mapping, priority scoring, synergy/conflict rules | `references/05-skill-matching.md` |
| Architecture levels, rules vs skills, full Arch H template, propagation model | `references/06-context-arch-h.md` |
| Procedural error recovery (SendMessage, diagnosis steps, recovery template, worktree cleanup) | `references/07-error-recovery.md` |
| `/goal` + `/loop` doctrine-safe usage, DAME→poneglyph map, recipes, video adopt/reject map | `references/09-loops-playbook.md` |

### Removed references (simplified 2026-05-28 — US8 AC7 SIMPLIFICAR)

| Former ref | Current canonical source |
|---|---|
| `02-prompt-scoring.md` | `prompt-engineer` skill (covers prompt quality + scoring) |
| `07-delegation-recovery.md` | split (021): always-loaded triggers in `.claude/rules/error-recovery.md`; procedural detail back in `references/07-error-recovery.md` |
| `08-output-style.md` | `output-styles/poneglyph.md` (terse-first rules, escape triggers) |

## Related

- `/flow` command — orchestrates a FEATURE lifecycle (5 phases, multi-turn). This skill orchestrates each Lead TURN within or outside a flow.
- `prompt-engineer` skill — prompt quality refinement (replaces prompt-scoring reference).
- `.claude/rules/error-recovery.md` — Lead-driven error diagnosis + retry policy.
- `output-styles/poneglyph.md` — terse-first response style.
