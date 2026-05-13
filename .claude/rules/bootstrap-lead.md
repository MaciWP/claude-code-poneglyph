---
description: Lead session activation — when and how to load the orchestrator skill
---

<!-- Last verified: 2026-04-25 -->

# Lead Orchestration Bootstrap

**Applies only to the Lead session** (`CLAUDE_LEAD_MODE=true` in your environment).
Subagents: skip this rule entirely — `Skill()` is not available in your toolset.

## When to invoke

Invoke `Skill("orchestrator-protocol")` at session start, and re-invoke freely whenever the protocol needs to be refreshed:
- Initial trigger: First user request that requires code, investigation, or decision (not trivial Q&A)
- Re-invoke after context compaction if the orchestration protocol is no longer in memory
- Re-invoke when protocol guidance is needed (the skill has 8 references; loading `SKILL.md` does not guarantee they are all in context)
- Skip: If session is only casual conversation

## How to invoke

As your FIRST action for the first non-trivial task of the session:
```
Skill("orchestrator-protocol")
```

This loads the complete protocol — complexity routing, delegation triggers, Arch H template,
agent selection, and error recovery — into your active context.

## Delegation Decision Triggers

After the protocol is loaded, every user request must be triaged against **two independent triggers** before the Lead acts:

### Trigger A — Delegar implementación

Aplica cuando el cambio implica escritura de código. El gate `lead-enforcement.ts` opera en modo **default-allow**: el Lead actúa libre salvo en señales reales de peligro.

| Condición | Acción |
|-----------|--------|
| ≥3 archivos a modificar | Delegar a `builder` (o `planner` si complexity >60) — el gate no lo fuerza, pero la métrica `/parallelism-insights` lo monitoriza |
| Cambio architectural (cross-module, nueva interfaz, refactor mayor) | Delegar a `planner` → `builder` |
| 1-2 archivos, cambio acotado | Lead actúa directamente — **sin declaración requerida** |
| Path sensible (`.env`, `*.lock`, `package.json`, `.claude/settings.json`, `secrets/`, `credentials/`) | Declarar inline `sensitive: <razón ≥8 chars>` o delegar al builder |
| Operación destructiva/irreversible (`rm -rf`, force push, db migration, schema change) | 🚫 Bloqueada absolutamente por el gate; delegar al builder con razón clara |

**Cambio importante (allow-by-default)**: el Lead ya NO declara `Files: N + non-architectural` para cada Edit. Las únicas declaraciones obligatorias son `sensitive: <razón>` cuando se toca un path sensible. Para el resto, el Lead decide cuándo delegar guiado por Trigger A/B y las métricas de paralelización.

### Trigger B — Delegar exploración (matriz 2×2)

Aplica cuando hace falta entender el codebase antes de cambiar.

| Volumen / Complejidad | Acción |
|-----------------------|--------|
| BAJO + BAJA (1-2 archivos, lectura directa) | `Read` directo del Lead |
| BAJO + ALTA (1-2 archivos, requiere LSP/semántica) | `scout` (Sonnet) |
| ALTO + BAJA (≥3 archivos, bulk read sin razonamiento) | `Explore` (Haiku) si disponible, si no `scout` |
| ALTO + ALTA (≥3 archivos, requiere síntesis) | `scout` (Sonnet) |

Referencia completa: `${CLAUDE_SKILL_DIR}/references/04-agent-selection.md` §Exploration Decision Matrix.

### Combinación

Los dos triggers son **independientes**. Una task puede disparar A (delegar implementación) sin disparar B (Lead ya tiene contexto), o disparar B (necesita exploración) sin disparar A (no hay cambio que implementar). Lo habitual es que ambos disparen — primero exploración, luego implementación.
