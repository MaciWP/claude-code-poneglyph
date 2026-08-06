# US14 — Censo de skills y propuesta keep/merge/cut (RATIFICABLE — nada se corta sin tu OK)

Datos: censo de lanzamientos vía Skill tool en TODOS los transcripts (grep
"Launching skill:", 2026-08-05) + colisiones de keywords observadas en vivo.
**Caveat metodológico**: el censo cuenta invocaciones Skill(); las
skills-REFERENCIA se consumen vía Read del Lead y no aparecen — para esas, el
criterio es "¿algún componente vivo las referencia?" (grep), no el contador.
El censo fino con `instructions-loaded.log` + `skill-hints.log` (US13) estará
disponible tras 1-2 semanas de datos.

## Uso medido (lanzamientos históricos)

tech-plan 11 · scope 9 · drillme 8 · tdd-design 7 · prompt-engineer 7 · build 7
· critic 6 · retro 5 · html-report 3 · skill-advisor 2 · meta-settings-cookbook 2
· worktrees-bjumper 1 · meta-create 1 · graphify 1 · diagnostic-patterns 1 ·
codex-consult 1 · anti-hallucination 1 — **cero lanzamientos**: best-of-n,
decide, decision-stress-test, escalate, explain-changes, lsp-operations,
orchestrator-protocol, project-onboard, review-patterns, security-audit.

## Propuesta por skill (las 10 con cero lanzamientos)

| Skill | Propuesta | Razón |
|---|---|---|
| `orchestrator-protocol` | **KEEP** | Referencia viva: CLAUDE.md la apunta como casa de la delegación (hoy más que nunca tras US9/US12); se consume vía Read |
| `lsp-operations` | **KEEP** | Referencia técnica consumida vía Read; citada por build/tech-plan. Nota: LSP tool no disponible en esta sesión (MCP desconectado) — vigilar |
| `project-onboard` | **KEEP** | Situacional por diseño; US15 la necesita como canal de despliegue; plantillas actualizadas hoy (US5/US10) |
| `security-audit` | **KEEP** | Gatillada por critic en auth/pagos — su valor es estar cuando toque, no frecuencia |
| `diagnostic-patterns`* | KEEP (1 uso) | Cableada en error-recovery + dev loop + flow |
| `decision-stress-test` | **KEEP con revisión** | Escalada declarada de drillme; 0 usos en 2 meses — si en el próximo censo sigue a 0, candidata a MERGE dentro de drillme como "modo panel" |
| `escalate` | **KEEP con revisión** | Cableada en error-recovery (stuck detection); misma regla: 0 usos en próximo censo → fold en error-recovery.md como procedimiento |
| `explain-changes` | **CUT candidata** | 0 usos, 0 referencias vivas desde componentes; su caso ("explícame el diff") lo cubren el modo profesor bajo demanda + `/review` nativo. Ahorro: mantenimiento, no tokens |
| `best-of-n` | **CUT candidata** | Piloto de 019 sin un solo uso posterior; requiere `claude -p --worktree` manual. Si se corta, archivar el patrón en docs (no perder el conocimiento) |
| `decide` | **REVISAR contenido antes de decidir** | 0 usos y no examinada en esta sesión — puede solapar con decision-stress-test/drillme; leerla antes de proponer destino |

## Colisiones de keywords detectadas en vivo (arreglo barato, alto ruido)

| Colisión | Fix propuesto |
|---|---|
| `best-of-n` matchea "worktree" (compite con worktrees-bjumper) | Quitar "worktree" de sus keywords (si sobrevive al cut) |
| `lsp-operations` matchea "hover" (compite con frontend-craft) | Cambiar a "hover type", "lsp hover" (multi-palabra) |
| `critic` matchea "revisa" y DESPLAZABA a binora-jira-tickets del top-2 en su propio trigger canónico ("revisa la JRV-1077") | ARREGLADO en la re-entrada del critic (029): keywords multi-palabra fuertes añadidas a la skill jira ("revisa jrv", "tráeme la jrv"…) — ahora entra primera. Lección: una colisión no es aceptable si expulsa a la skill DESTINATARIA del top-2 |

## Ejecución

Con tu ratificación por fila: los KEEP no requieren acción; los fix de keywords
son 1 edit por skill; los CUT esperan tu OK explícito (y `explain-changes` /
`best-of-n` se archivarían en `_archive`, no se borran — doctrina
archive-not-delete).

## Resolución 031 (2026-08-06, ratificada por Oriol)

best-of-n CUT · project-onboard CUT entero (memos relocados a docs/) · decide+decision-stress-test FUSIONADAS (decide, dos tiers; disable-model-invocation eliminado) · escalate renombrada `unstuck` · lsp-operations KEEP · scope KEEP · explain-changes pendiente (no ratificada hoy) · colisión best-of-n/"worktree" resuelta por corte. Tie-breaker censal vive en `skill-advisor/lib/rank.ts` (USAGE_TIER — refrescar en cada censo).
