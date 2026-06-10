---
us: US4
title: Hooks — fix auto-approve stdin bug, export functions, prune tests to essentials
wave: W2
depends_on: []
tdd_mode: forced
estimate: M
status: draft
absorbs_decision: Stop test-gate restoration ratified by user at build
---

# US4 — Hooks: fix + testabilidad + poda

## Execution prompt (Phase 3 input)

**Task**: (1) RED→GREEN: failing test for auto-approve stdin, then fix `auto-approve.ts:70` to use `readHookStdin()` from `lib/hook-stdin.ts`. (2) Export core functions from the 4 hooks (logic currently reachable only via `import.meta.main`). (3) Prune `__tests__/` (631 lines, 5 files) keeping only tests that protect against silent failure (security scanning, stdin, permission decisions); document the prune list in the commit message.
**Context**: security-gate.ts already uses readHookStdin correctly — mirror that pattern. The Windows hang is the proof these tests earn their keep.
**Constraints**: If a test is the ONLY coverage of a security function, it is not ceremony — it stays. The ~50% target is indicative; the criterion is qualitative. settings.json is NOT edited here (US8 single-writer); a ratified Stop-gate hook file is handed to US8.
**Deliverable**: fixed auto-approve + exported functions + pruned green suite (+ optional Stop-gate hook file if ratified).
**Verify**: `bun test ./.claude/hooks/` green; `grep -n "Bun.stdin.text()" .claude/hooks/auto-approve.ts` → 0.
**Ask first**: ¿restaurar el gate Stop que ejecuta los tests de hooks en este repo? (tensión declarada: menos tests vs Mandamiento IV).

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 |
| **Depends on** | none |
| **Blocks** | [US8] (settings.json single-writer) |
| **Files touched** | `.claude/hooks/auto-approve.ts`, `security-gate.ts`, `post-compact.ts`, `validators/code-validator.ts`, `__tests__/*` (5 files, prune) |
| **TDD-mode** | forced — red→green on the auto-approve stdin fix |
| **Estimate** | M |
| **Cómo arrancar** | Write failing test reproducing stdin handling via readHookStdin contract; then fix auto-approve.ts:70 |
| **Decisión absorbida** | gate Stop de tests — AskUserQuestion en build (tensión: menos tests vs Mandamiento IV) |

## User story

- **As a**: Oriol
- **I want**: hooks that can't silently break (the Windows hang proved they do) with the minimum test surface that protects me
- **So that**: the 4 hooks guard every session on every machine without test ceremony

## Acceptance criteria

- **AC1**: Given auto-approve.ts, when reading stdin handling, then it uses `readHookStdin()` from `lib/hook-stdin.ts` (same pattern as security-gate) and a red→green test covers it. (spec AC2)
- **AC2**: Given the 4 hooks, when importing them from tests, then core functions are exported (no logic reachable only via `import.meta.main`).
- **AC3**: Given `__tests__/`, when running `bun test ./.claude/hooks/`, then the pruned suite is green and every surviving test maps to the criterion "protects against silent failure" (security scanning, stdin handling, permission decisions); content/text-assert ceremony removed. Prune list documented in the commit message.
- **AC4**: Given the user's build-time decision on the Stop test-gate, when ratified YES, then the gate hook file is (re)created and handed to US8 for registration; when NO, the decision is recorded in validations.md.

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/hooks/auto-approve.ts` | readHookStdin() + export functions |
| `.claude/hooks/{security-gate,post-compact}.ts`, `validators/code-validator.ts` | Export functions for testability (no behavior change) |
| `.claude/hooks/__tests__/*` | Prune to essentials; add stdin red→green test |

## Workflow detallado

1. RED: test for auto-approve stdin via readHookStdin contract (fails against current code).
2. GREEN: fix auto-approve.ts:70.
3. Export functions across the 4 hooks; adapt imports in tests.
4. Prune pass per test file: keep silent-failure protection, drop ceremony. 631 lines baseline; target ~50% but the criterion is qualitative, not the number.
5. AskUserQuestion: ¿restaurar gate Stop que ejecuta `bun test ./.claude/hooks/` en este repo? (auto-override tras 8 bloqueos; solo aplica a poneglyph).

## Commandments cubiertos

| # | Cómo |
|---|---|
| VI | security-gate y auto-approve protegidos contra rotura silenciosa |
| IV | Red de tests mínima pero real; opción de gate mecánico |
| III | Poda de ceremonia — tests que no protegen, mueren |

## Smell signals

- ⚠️ Si la poda elimina el único test de una función de seguridad → no es ceremonia, se queda.

## Verificación post-implementación

- `bun test ./.claude/hooks/` green.
- `grep -n "Bun.stdin.text()" .claude/hooks/auto-approve.ts` → 0 hits.
