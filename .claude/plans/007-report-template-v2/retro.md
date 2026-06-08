---
spec: 007-report-template-v2
phase: 5
retro_level: full
verdict_phase4: APPROVED_WITH_WARNINGS
spec_drift: legitimate
promotions_proposed: 2
promotions_approved: 2
commandment_violations: 3
living_spec_delta: yes
action_items: 5
created: 2026-06-03
status: approved
---

# Retro — 007 report-template-v2

## 1. Executive summary

Problema (spec): la plantilla `html-report` no leía de un vistazo, no tenía diagramas, su charter excluía decisiones, y no había estándar cliente-ready. Entregado: `glance.template.html` + `decision.template.html` (nuevos), `visuals-svg-first.md` (diagramas híbridos), `decide` reusando el sistema, integración en SKILL/pre-flight, + extra shadcn (galería + interactividad) como showcase. Verdict: **smooth con fricción real** — 1 MAJOR (gitignore comiéndose el deliverable) resuelto en caliente, scope ampliado en mitad del build (ratificado), y una delegación de agente innecesaria (corregida). Feature dogfooded sobre el propio html-report.

## 2. Technical lessons

### ✅ Patterns that worked
- **Verificar el entorno antes de decidir** (mmdc/node ausentes → SVG-a-mano-first): evitó asumir un pipeline inexistente. Cmd II en acción. Reusar siempre que una estrategia dependa de una herramienta.
- **Generar variantes reales para comparar** (glance vs completo; v1 vs v2; smoke-decision): el usuario eligió sobre renders, no sobre mocks ASCII → convergencia rápida. Refuerza `ask-visual-reference-early`.
- **Token block canónico verbatim** (glance→decision): un solo sistema visual sin duplicar (Cmd X), mismo contrato que tokens.css↔report.template.
- **Scope-light honesto** (no re-cuestionario cuando la visión ya estaba dada): evitó ceremonia (Cmd III).

### ❌ Patterns that didn't work
- **Delegué 1 agente síncrono para ejecutar una skill** (`html-report` via builder): 112k tok / 8m15s con duplicación de lecturas (report.md + SKILL.md que el main ya tenía) y **0 paralelismo**. Anti-patrón; corregido y reforzado en `agent-usage-minimalism`. Lección dura: ejecutar skills inline; nunca delegar a 1 agente por "isolation".
- **gitignore `*.html` se comió el deliverable** (glance/decision.template.html): **recurrencia** del bug del commit `8a85e4a` (v8 templates). El critic lo cazó (MAJOR), resuelto en caliente — pero la recurrencia prueba que falta una salvaguarda (→ promoción).
- **Elegí el template equivocado al inicio** (report editorial vs dashboard dark ya aprobado en 003/004): no recuperé las preferencias previas antes de generar → 1 iteración perdida. Mismo origen que `ask-visual-reference-early`.
- **Frontmatter de los 7 `US{N}.md` quedó en `draft`** al construir inline (no pasé por el cierre per-HU del `build` skill): cerrados residualmente en este retro (Step 13a). Lección de proceso, no de la HU.

## 3. Process audit

| Phase | Effort | Friction | Improvement |
|---|---|---|---|
| 1 scope | S | ninguna (visión dada, scope-light) | — |
| 2 tech-plan | M | Parallel Efficiency 40% (secuencial inherente) | OK, declarado honesto |
| 2.5 tdd-design | S | ninguna (validation-mode) | — |
| **3 build** | **L** | scope ampliado en caliente (US6/US7) + delegación de agente errónea + US.md draft | ejecutar skills inline; cerrar frontmatter per-HU |
| 4 critic | M | — (cazó el MAJOR gitignore: valor real) | — |

**Fase más pesada: Phase 3** — templates grandes inline + scope creep ratificado + el desvío del agente.

## 4. Drillme — Phase 5

1. `[approach]` **Fase demasiado pesada?** Build (Phase 3) — por templates grandes + scope ampliado en caliente. Mitigable partiendo el extra en su propia mini-feature en vez de en mitad del build.
2. `[approach]` **Fricción evitable?** Sí: la delegación de 1 agente (coste sin paralelismo) y el template inicial equivocado. Ambas evitables recuperando contexto/preferencias antes de actuar.
3. `[approach]` **Patrón reusable?** La salvaguarda "verificar git check-ignore antes de declarar un artefacto entregado" — recurrente (2 veces ya).
4. `[context]` **Global/local/memory?** Salvaguarda gitignore → **local** (.claude/, específico de cómo este repo gestiona templates como source). Lecciones de agente/variantes → **memory** (ya aplicadas).
5. `[failure]` **Commandment violado en silencio?** V, VII, X tuvieron ⚠️ (ver §7) — todos detectados y corregidos en sesión, ninguno silencioso al cierre.

## 5. Promotion candidates

| Candidate | Scope | Type | Why | Concrete proposal |
|---|---|---|---|---|
| Salvaguarda "deliverable gitignored" | **local** | rule o checklist-item | gitignore `*.html` se comió el deliverable 2× (8a85e4a + este M1) — patrón recurrente sin guardia | Añadir ítem al `pre-flight-checklist.md`: "si el artefacto debe persistir/sincronizar → `git check-ignore <path>` = vacío, o excepción `!` en .gitignore". Coste ~3 líneas. Verificado: `pre-flight-checklist.md` existe, sin colisión |
| Refuerzo `ask-visual-reference-early` | **memory** | memory update | el template inicial equivocado nació de no recuperar preferencias previas de 003/004 antes de generar | Añadir a la memoria: "antes de generar un deliverable visual, recuperar preferencias/decisiones de features previas (003/004) + generar variantes para comparar". (Parcialmente ya aplicado esta sesión) |

> `agent-usage-minimalism` NO se lista como candidato nuevo: ya fue reforzado en memoria durante esta sesión (1 agente síncrono prohibido).

## 6. Living-spec deltas

`spec_drift: legitimate` (del critic). **Matiz honesto del retro**: aplicando el criterio estricto de "delta legítimo" (debe nacer de un edge case de build/critic), el scope-extra US6/US7 **NO es un edge case** — fue una **ampliación de visión ratificada explícitamente por el usuario** en mitad del build. No es `scope_creep` (fue ratificado, no colado) ni `skipped_ac` (los 5 AC originales se cumplen). Es re-scope ratificado. Propuesta (NO auto-editada):

```diff
--- spec.md (v1)
+++ spec.md (v2 — delta from retro 007)
@@ # Resultado esperado @@
+ - (v2, ratificado 2026-06-03) Galería de componentes shadcn + interactividad
+   (tabs/tooltips/command) como evolución incremental. Deliverable inicial =
+   showcase (smoke-components-shadcn.html); horneado a components.html + cableado
+   en glance/decision = evolución futura.
```

Rationale: el usuario amplió el alcance en caliente y lo ratificó; documentarlo en spec.md cierra el bucle living-spec honestamente. **Pendiente tu aprobación** del diff.

## 7. Commandments audit

| # | Commandment | Cumplido | Evidencia / Violación |
|---|---|---|---|
| I | Honest symbiosis | ✅ | Admití el error del agente, el template equivocado y los caveats sin softening; pregunté en cada ambigüedad real |
| II | Factual truth | ✅ | Verifiqué mmdc, gitignore (`git check-ignore`), `bun test`, secrets — sin inventar |
| III | Code quality / simple | ✅ | SVG-a-mano antes que JS; scope-light; sin over-engineering |
| IV | Blocking gates | ✅ | Hard gates 1→2 y 2→3; critic verdict; `bun test` 100/0 antes de APPROVED |
| V | Understand before acting | ⚠️ | Al inicio NO recuperé preferencias de 003/004 → template equivocado. Corregido al recuperar 004/003 |
| VI | Security | ✅ | Secrets sweep 0; sin superficie auth/payments |
| VII | Performance / efficiency | ⚠️ | Delegué 1 agente síncrono (112k tok/8min, 0 paralelismo). Corregido + memoria reforzada |
| VIII | Optimal meta-prompting | ✅ | Prompts Arch H completos a las skills (scope/tech-plan/tdd-design/critic/retro) |
| IX | Observability / self-improvement | ✅ | Memorias actualizadas (agent-usage, html-report-vision); este retro produce promociones |
| X | Poneglyph maintainability | ⚠️ | gitignore comiéndose el deliverable (recurrente) = fallo de mantenibilidad del meta-sistema. Resuelto + promoción de salvaguarda |

### Commandment violations forensics (V, VII, X)

- **V (⚠️)**: momento = generación del primer HTML (006); alternativa = leer 003/004 antes de generar; action item = la salvaguarda de `ask-visual-reference-early` (recuperar preferencias previas).
- **VII (⚠️)**: momento = render del HTML del 006 vía builder; alternativa = inline; ya prevenido por `agent-usage-minimalism` reforzado.
- **X (⚠️)**: momento = creación de los templates nuevos; alternativa = verificar git check-ignore al crear; action item = promoción salvaguarda gitignore.

## 8. Action items

| Action | Owner | Trigger | Due |
|---|---|---|---|
| Ratificar promoción salvaguarda gitignore → pre-flight | usuario | revisión retro | antes de próxima feature |
| Ratificar living-spec diff (spec.md v2) | usuario | revisión retro | antes de cerrar promociones |
| Smoke visual de los renders (glance/decision/showcase) — confirmar AC1/3/4 | usuario | al abrir los HTML | esta sesión / próxima |
| `/decide` smoke E2E (validar US4 reuse en uso real) | Lead/usuario | próximo uso de /decide | próxima feature |
| Hornear US6/US7 a components.html + cablear en glance/decision | next-session | "ya iremos evolucionándolo" | evolución futura |
