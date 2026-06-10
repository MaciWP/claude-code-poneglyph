---
us: US2
title: Always-loaded diet — CLAUDE.md ≤200 lines + error-recovery truth fix
wave: W1
depends_on: [US1, US3]
tdd_mode: optional
estimate: M
status: closed
closed: 2026-06-10
absorbs_decision: inventory moves to on-demand doc; agent-memory ref removed
---

# US2 — Dieta del always-loaded

## Execution prompt (Phase 3 input)

**Task**: Diet CLAUDE.md from 264 to ≤200 lines (evict inventory table, W1-W5 history, mode tables, rule-mapping to a NEW `.claude/docs/system-inventory.md`); integrate the US1 doctrine anchor and US3 style anchor; remove the `.claude/agent-memory/{agent}/MEMORY.md` reference from Commandment VIII; fix `error-recovery.md` Hook Reliability table (UserPromptSubmit/SubagentStop are NOT registered today).
**Context**: Official guidance: bloated CLAUDE.md causes instruction loss; per-line test "would removing this cause mistakes?". Inputs: US1 anchor (orchestration) + US3 anchor (style) must be ready. system-inventory.md also documents the undocumented dirs (workflows/, audits/, docs/, config/, ccstatusline/) minus what US5 deletes.
**Constraints**: The 10 Commandments table survives (it IS behavior). Nothing is deleted — evicted content moves. English. Note: Windows sync copies CLAUDE.md — flag re-sync need in the report.
**Deliverable**: CLAUDE.md ≤200 + error-recovery.md fixed + docs/system-inventory.md new.
**Verify**: `wc -l CLAUDE.md` ≤200; `grep -n "agent-memory" CLAUDE.md` → 0; error-recovery table matches the real hook registry.
**Ask first**: borderline evictions (if a section is arguably behavioral) — one AskUserQuestion with the eviction list before writing.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | [US1, US3] |
| **Blocks** | none (W2/W3 don't edit CLAUDE.md) |
| **Files touched** | `CLAUDE.md`, `.claude/rules/error-recovery.md`, `.claude/docs/system-inventory.md` (new) |
| **TDD-mode** | optional |
| **Estimate** | M |
| **Cómo arrancar** | wc -l CLAUDE.md (baseline 264); list every section with its always-loaded justification |
| **Decisión absorbida** | inventario/historia → docs/ on-demand; quitar ref `.claude/agent-memory/{agent}/` del Mandamiento VIII (0 custom agents — nada lo puebla) |

## User story

- **As a**: Oriol
- **I want**: the always-loaded layer reduced to what changes Claude's behavior every turn
- **So that**: instructions stop competing with inventory tables and Claude adheres better (official guidance: bloated CLAUDE.md causes instruction loss)

## Acceptance criteria

- **AC1**: Given the rewritten CLAUDE.md, when counting lines, then ≤200, with the system inventory, W1-W5 refactor history, and rule-mapping table moved to `.claude/docs/system-inventory.md` (on-demand). (spec AC4)
- **AC2**: Given CLAUDE.md, when reading the orchestration section, then it carries the US1 doctrine anchor (5-10 lines) and the Commandment VIII text no longer references `.claude/agent-memory/{agent}/MEMORY.md`.
- **AC3**: Given CLAUDE.md, when reading the communication anchors, then they carry the US3 es-ES essentials (anti-sycophancy + labels + natural Spanish) without duplicating the output-style body.
- **AC4**: Given `.claude/rules/error-recovery.md`, when reading the Hook Reliability table, then UserPromptSubmit/SubagentStop rows reflect reality (not registered today; US12 may register one later) and no always-on rule contradicts another. (spec AC1 partial)
- **AC5**: Given the new `docs/system-inventory.md`, when reading it, then it documents ALL real `.claude/` dirs including the 7 previously undocumented ones (workflows/, audits/, docs/, config/, ccstatusline/ — minus those US5 deletes).

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `CLAUDE.md` | Diet to ≤200; integrate US1 doctrine anchor + US3 style anchors; remove agent-memory ref |
| `.claude/rules/error-recovery.md` | Fix phantom-hook table; align with US1 doctrine wording |
| `.claude/docs/system-inventory.md` | NEW — inventory + history + mode tables + dir documentation |

## Workflow detallado

1. Inventory CLAUDE.md sections; per line ask the official test: "would removing this cause mistakes?"
2. Create docs/system-inventory.md with evicted content (English, repo convention).
3. Rewrite CLAUDE.md integrating US1/US3 anchors; keep Commandments table (it IS behavioral).
4. Fix error-recovery.md table; re-check cross-rule consistency (test-policy, paths/).
5. Remember: sync copies CLAUDE.md on Windows — note for next sync run.

## Drillme (Socratic check)

1. `[approach]` ¿Las 10 filas de Mandamientos sobreviven? → sí, son comportamiento; lo que sale es inventario/historia (datos, no instrucciones).
2. `[context]` ¿Memoria conductual? Cambios a CLAUDE.md solo validan en la SIGUIENTE sesión (lección conocida) — el AC de comportamiento queda para retro.
3. `[failure]` ¿Qué pasa si algo evicted resulta necesario? → docs/system-inventory.md es on-demand, recuperable con un Read; nada se borra.

## Commandments cubiertos

| # | Cómo |
|---|---|
| VII | Menos tokens fijos por sesión, más presupuesto para trabajo real |
| V | Instrucciones que sí cargan = mejor comprensión de intención |
| X | error-recovery deja de mentir; inventario completo y veraz |

## Verificación post-implementación

- `wc -l CLAUDE.md` ≤ 200.
- `grep -n "agent-memory" CLAUDE.md` → 0 hits.
- `grep -n "UserPromptSubmit" .claude/rules/error-recovery.md` → fila corregida.
