---
spec: 008-agent-spawn-policy
phase: 5
status: approved
closed: 2026-06-09
retro_level: light
via: audit-011-ultracode-audit
---

# Retro — 008 agent-spawn-policy (closure via audit 011)

## Cierre

008 quedó **partial-accepted** el 2026-06-09 (minimal-coherent cut US1/US2/US7/US4/US5 ratificado). Mismo día, audit 011 (`ultracode-audit` workflow) re-trianguló las 5 HUs deferred y concluyó: eran **limpieza de refs muertas a agentes cortados** — bajo coste, alto valor de mantenibilidad (Cmd X). Veredicto: **execute, no defer**. Ejecutadas inline + verificadas → 008 **CLOSED** (no partial).

| HU | Estado | Resultado |
|---|---|---|
| US3 scope + decide | ✅ closed | `decide` reframe: quitados labels builder/planner/reviewer; perspectivas corren **inline** (regla ≥4: 1-3 nunca spawnnean); `scope` ya limpio |
| US6 doc-wiring + team-mode + classification-waves | ✅ closed | Banners de mapeo agente-cortado→modelo-actual en `05-team-mode.md` + `04-classification-waves.md`; fix `Task(reviewer)`→`Task(Explore)` |
| US8 memorias + version-wording | ✅ closed | version-wording ya satisfecho (AC4); `agent-memory/reviewer/MEMORY.md` (huérfano binora 19KB) archivado a `archive/reviewer-MEMORY-binora.md`. **Named-memory en ruta Windows = no-op en macOS** → re-check si se trabaja en Windows |
| US9 barrido skills auxiliares | ✅ closed | dead-refs reframe: `review-patterns:83`, `security-review:182`, `diagnostic-patterns:174`, `explain-changes` (SKILL:36/40/155 + interaction-patterns:36/123/127), `prompt-engineer:74`, `html-report:95`, `test-policy:37`→build/SKILL.md |
| US10 verificación final | ✅ closed | `grep` agente-entidad en superficies vivas = **CLEAN**; `bun test ./.claude/hooks/` = **101 pass / 0 fail** |

## Lección estructural (Cmd IX — self-improvement)

**Bug recurrente de proceso**: Phase 3 (`build`) cerraba HUs sin normalizar el frontmatter `status:` de los `tasks/US{N}.md` a `closed`. 001 lo detectó y prometió un verification gate en Phase 5 (`retro`), pero **004 y 010 reincidieron** — el audit 011 los encontró marcados `closed` a nivel feature con sus US en `draft`. 008 mismo tenía 5 US en `draft`.

→ El gate de cierre de 008 (US10) tampoco incluía un `grep-for-deleted-agent-names` cross-file, por eso el corte de agentes dejó debris en 5 dominios.

**Acción**: el audit 011 normalizó 004/010/008 + creó el `state.json` faltante de 001. Recomendación de promoción (pendiente de ratificar): añadir a `retro/SKILL.md` un check explícito *"todos los `tasks/US*.md` en `status: closed`"* + un *"grep de nombres de entidades borradas"* al cerrar features que cortan componentes.

## Auditoría 10 Commandments (light)

| Cmd | Veredicto |
|---|---|
| III simplicidad | ✅ reframes proporcionales (banners + 1-line), no reescrituras wholesale |
| IV gates | ✅ cierre verificado (grep + bun test), no "completado" sin tests |
| X mantenibilidad | ✅ el objetivo mismo: matar debris del corte 008 |
| IX observabilidad | ⚠️ el bug de frontmatter-no-cerrado escapó 2 veces → gate de retro a reforzar (arriba) |

Detalle completo de hallazgos: `.claude/plans/011-ultracode-audit/report.md`.
