---
us: US5
title: Cablear Skill(verify) en §Post-implementation verification y en critic (happy-path)
wave: W1
depends_on: []
tdd_mode: optional
estimate: S
status: closed
closed: 2026-07-08
---

# US5 — CG-06: verificación end-to-end nativa cableada

## Execution prompt (Phase 3 input)

**Task**: Referenciar `Skill(verify)` (skill nativa: ejercer el flujo afectado end-to-end, no solo tests) en `CLAUDE.md` §Post-implementation verification y en `critic/SKILL.md` Step 5 §Correctness (fila happy-path), para cambios con superficie de runtime.
**Context**: CG-06 — la doctrina exige "happy path E2E: manual walkthrough or smoke test" pero no nombra la skill nativa que lo hace sistemáticamente. La skill `verify` existe en el harness (verificada en listado de sesión); su anti-trigger: diffs solo-tests/docs sin superficie de runtime.
**Constraints**: Delta mínimo: 1-2 frases por sitio, con el anti-trigger explícito (no invocarla en cambios markdown-only — este repo lo es casi siempre; la ganancia real es en binora/cv). CLAUDE.md = cambio quirúrgico.
**Deliverable**: 2 ediciones de texto.
**Verify**: grep `Skill(verify)` en ambos ficheros; suites verdes.
**Ask first**: nada.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Wave / Deps** | W1 / none |
| **Files** | CLAUDE.md, skills/critic/SKILL.md |
| **TDD** | optional (texto) |

## Acceptance criteria

- **AC1**: Given ambos ficheros, when grep, then `verify` cableado con anti-trigger declarado (spec AC5).
