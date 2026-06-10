---
us: US0
title: Persist seed dossiers (anthropic/academic/industry) with provenance headers
wave: W-0
depends_on: []
tdd_mode: skip:artefact copy from session, verified by file existence
estimate: S
status: closed
---

# US0 — Persist seed dossiers

> **Closed in Phase 1** (2026-06-10): the 3 dossiers lived only in conversation context — they were persisted immediately for durability, ahead of Phase 3. Registered here for AC5 traceability.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | ✅ closed |
| **Wave** | W-0 |
| **Depends on** | none |
| **Blocks** | [US1] (W1 extends these directly) |
| **Files touched** | `evidence/seed-{anthropic,academic,industry}.md` |
| **TDD-mode** | skip: artefact copy, verified by existence |
| **Estimate** | S |

## Acceptance criteria

- **AC1** (= spec AC5): Given the 3 conversation dossiers (2026-06-10), when US0 closes, then `evidence/seed-{anthropic,academic,industry}.md` exist verbatim with provenance headers (agent name, date, method, tier framing). ✅ verified — 3 files written Phase 1.

## Verificación post-implementación

- Smoke: `ls .claude/plans/018-evidence-roadmap/evidence/seed-*.md` → 3 files. ✅
