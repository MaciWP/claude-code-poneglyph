# Poneglyph — Re-auditoría completa v2 (2026-07-02, Fable 5)

> Re-ejecución del goal de la auditoría 2026-06-30 con modelo Mythos-class, a petición del usuario ("volverla a hacer con un modelo mucho más potente; utiliza todo tu potencial").
> Método: workflow find→refute (5 dominios de claims + 3 sweeps de uso + 1 de transcripts, 57 agentes, ~1.9M tokens de subagentes) + verificación inline del Lead (tests en vivo, edge-paths de flow-state.ts ejercidos en scratch, greps de confirmación).
> Incidencia: 28 refuters murieron por límite de sesión (reset 6am). Los findings huérfanos se verificaron **inline por el Lead** después (greps + evidencia en vivo + changelog oficial provisto por el usuario). Estado de verificación anotado por finding.

## BLUF

**El sistema está sano y SE USA de verdad** — la mejor noticia de esta auditoría son los datos duros de adopción: el share de `/flow` en trabajo real con escritura es **40–71% por proyecto (55% global)**, muy por encima del smell threshold del 20% que el propio `flow.md` define. La auditoría del 30-06 sale **sustancialmente confirmada** tras re-verificación adversarial (sus números U1 recomputan exactos; sus 3 falsos-positivos estaban bien rechazados) — solo 5 defectos menores propios del documento.

Lo que esta pasada añade que la anterior no vio:

1. **Riesgo de durabilidad activo**: TODO el entregable de 025 (APPROVED) + ambas auditorías viven sin commitear desde hace 2+ días (PA-5).
2. **Clase sync-trap a nivel de instrucción** (RI-1/RI-10): 4 componentes sincados a `~/.claude` instruyen `bun .claude/scripts/flow-state.ts`, pero `scripts/` (y `evals/`) no se sincronizan → la instrucción solo funciona con cwd=poneglyph.
3. **Colisión `security-review`** (SK-04/CG-01, **confirmada en vivo en esta sesión**): el listado model-facing muestra la descripción del skill nativo, no la de poneglyph → el gate de seguridad del critic es ambiguo sobre qué cuerpo carga.
4. **10 de 24 skills tienen keywords muertas** (SK-01): el hook `skill-activation.ts` solo parsea la primera línea tras `Keywords -` y 10 skills las envuelven en 2-4 líneas.
5. **Guard gap en `close-feature`** (F1, reproducido en vivo por el Lead): cierra el lifecycle con `NEEDS_CHANGES` y sin retro, y estampa `retro_status:"approved"` incondicionalmente (viola Cmd IV).

## Qué funciona (verificado, no asumido)

| Área | Verificación | Resultado |
|---|---|---|
| Suites completas (hooks/scripts/commands/evals) | `bun test` en vivo | ✅ 169 pass, 0 fail |
| CLI flow-state.ts rutas de error (9 casos edge) | ejercido en scratch por el Lead | ✅ mensajes limpios, exit codes correctos (salvo F1-F3) |
| Auditoría 06-30 | re-verificación adversarial claim-a-claim | ✅ sustancialmente correcta; U1 recomputa 4/7 exacto; 3 FP bien rechazados |
| Registro de hooks (settings ↔ disco) | sweep + refute | ✅ 7/7 mapean, eventos válidos |
| Sync-trap a nivel de import (fix 025) | sweep de todos los hooks | ✅ ningún hook importa de scripts/ |
| Integridad references/templates de las 24 skills | sweep bidireccional | ✅ todo fichero citado existe |
| Capa mecánica de carga en proyectos | instructions-loaded.log en binora/cv | ✅ probada (13 sesiones binora-backend, rules por path en cv-astro) |
| Duplicaciones nativas grandes (plan mode, memoria, skill-activation) | capability sweep | ✅ la capa custom sigue aportando valor sobre lo nativo |

## Uso real (estadísticas duras — la respuesta a "estadísticas y uso en otros proyectos")

### Transcripts (~/.claude/projects, ventana retenida 2026-06-02 → 07-02)

| Proyecto | Sesiones | /flow | AskUserQuestion | Workflow | Top skills |
|---|---|---|---|---|---|
| poneglyph | 72 (151 MB) | 17 | 130 | 15 | tech-plan 13, tdd-design 12 |
| binora-backend | 20 | 4 | 35 | 1 | tech-plan, prompt-engineer, html-report |
| binora-frontend | 18 | 4 | 51 | 1 | code-review 5, tech-plan, scope |
| cv-astro | 8 | 5 | 45 | 0 | prompt-engineer, tech-plan, scope |
| discord-plugin | 1 | 1 | 1 | 0 | — |
| claude-code-ui / BDataBackend / binora-contract | históricos (transcripts purgados; índices prueban actividad dic-25/feb-26) | | | | |

**Share de `/flow` en sesiones con escritura real**: global 30/55 = **55%** (60% contando fases sin /flow); por proyecto: cv-astro 71%, poneglyph 57%, binora-backend 44%, binora-frontend 40%. Todos ≥2× el smell threshold (<20%).

### Ciclos de vida en proyectos externos

- **binora-backend**: 2 planes con state (1 cerrado, 1 en fase 4 desde 06-18 — la clase back-half exacta que 025 ataca) + 2 análisis nunca formalizados.
- **binora-frontend**: 3 planes, 11/11 US completadas, 2 cerrados, 1 atascado en fase 5 `retro_status:pending` desde 06-05. El promotion loop funcionó una vez (2 promotions de 001 verificadas en la capa global).
- **cv-astro**: 001 lifecycle completo en un día ✅; 002 con el código YA en producción (PR #91) pero `feature_closed:false` y US4 pendiente; 003 nunca formalizado.
- **discord-plugin**: solo learned/ auto-generado. **BDataBackend**: sin capa `.claude/` — nunca onboardeado.

### Fricción recurrente en retros externos (temas, con estado de promoción)

Promovidas a global: back-half abandonment (→025), sandbox PATH, design-fidelity, meta-prompting gap, ceremonia pesada para features pequeñas, verificación fresh-context refuta diagnósticos fabricados.
**NO promovidas** (deuda del loop de retro): contract-lag backend→frontend, promotion loop que no cierra (candidatos aprobados que nunca aterrizan en la capa), learning-inbox captura ruido (JSON truncado, confianza 0.4-0.5).

## Findings

Estado: ✅=refuter CONFIRMED · 🔎=verificado inline por el Lead · ⚠️=probable, evidencia del finder sin re-verificar · 🚫=dudoso/rechazado.

### A. Maquinaria flow-state.ts (hallazgos propios del Lead, reproducidos en vivo)

| ID | Sev | Defecto | Estado |
|---|---|---|---|
| F1 | Media | `close-feature` sin guard de veredicto: cierra con NEEDS_CHANGES/sin retro y estampa `retro_status:"approved"` (flow-state.ts:101-115) | 🔎 reproducido |
| F2 | Baja | `status` con root inexistente responde "no open plans (all features closed)" — indistinguible de ruta errónea | 🔎 reproducido |
| F3 | Baja | `detectPlanDir` filtra ENOENT crudo si cwd≠repo, sin la pista `--plan` | 🔎 reproducido |
| RI-5 | Baja | `approveGate`/`setVerdict` no refrescan `updated_at` (closeUs/closeFeature sí) | ✅ |
| RI-4 | Baja | flow.md:253 omite el subcomando `status` que 025 añadió | ✅ |
| RI-6 | Baja | flow.md Edge 2 cita `gate_iterations`, campo que ni schema ni interface definen | ✅ |

### B. Integridad del repo

| ID | Sev | Defecto | Estado |
|---|---|---|---|
| RI-1 | Media | Sync-trap instruccional: 4 componentes sincados instruyen `bun .claude/scripts/flow-state.ts`; scripts/ no está en LINK_FOLDERS | ✅ |
| RI-10 | Media | Ídem con `bun .claude/evals/run.ts` en 3 skills sincadas (evals/ tracked-not-synced) | ✅ |
| RI-2 | Media | Hooks globales escriben `<cwd>/.claude/learned/` en TODOS los repos; solo poneglyph lo gitignora; project-onboard no propone la regla | ✅ |
| RI-3 | Media | ultracode-audit.js: defaults y corpora apuntan a planes archivados/gitignorados | ✅ |
| RI-7 | Baja | 3 entradas stale en .gitignore | ✅ |
| RI-8 | Baja | sync-claude.md omite `--validate-hooks` | ✅ |
| RI-9 | Baja | 3 dirs vacíos en hooks/ propagados por symlink | ✅ |
| PA-5 | Media | **Durabilidad**: 025 completo + ambas auditorías solo en working tree, sin commit | ✅ |

### C. Capa de skills

| ID | Sev | Defecto | Estado |
|---|---|---|---|
| SK-01 | Media | Hook parsea solo 1ª línea de `Keywords -`; 10/24 skills con keywords en continuación → muertas | ✅ |
| SK-04/CG-01 | Media→Alta | Colisión de nombre con el `security-review` nativo; el built-in gana el listado model-facing | 🔎 confirmado en esta sesión |
| SK-02 | Media | frontmatter-spec declara `type` Required (0/24 lo llevan) y omite `paths` | ✅ |
| SK-03 | Media | orchestrator-protocol instruye `Skill('decide')` pero decide es manual-only (`disable-model-invocation: true`) | ✅ |
| SK-05 | Baja | meta-create cita `CLAUDE.md §When to delegate` — sección inexistente | ✅ |
| SK-06 | Baja | prompt-engineer `when_to_use` en inglés (viola convención 023) | ✅ |
| SK-09 | Baja | meta-create Reminder 1 manda `Use proactively when:`; convención real es `Úsala cuando:` | 🔎 |
| SK-08 | Baja | demo-estado.json / glass-mousepads.json huérfanos en html-report/scripts | 🔎 |
| SK-07 | Baja | 09-loops-analysis-source no citado desde SKILL.md | 🚫 dudoso (grep muestra 2 menciones "09-loops"; verificar cuál) |

### D. Verdad documental (higiene, batch en una pasada)

| ID | Fichero | Defecto | Estado |
|---|---|---|---|
| DT-01/CG-07 | system-inventory:158 | Schema claims stale: fallbackModel/requiredMinimumVersion SÍ existen (settings.json:5 lo usa; changelog 2.1.163/2.1.166) | 🔎 |
| DT-02 | system-inventory:128 | Skills "22"→24; "skill-advisor cut"→existe (023/024) | 🔎 |
| DT-03 | system-inventory:142 | Contradicción interna: commands/(5) vs 3 | 🔎 |
| DT-04 | plans/README:21 | "state.json solo en full" contradice flow.md (standard+full) | 🔎 |
| DT-05 | plans/README:27 | 6 nombres de skills pre-rename (scope-definer, tech-planner…) | 🔎 |
| DT-06 | aux-matrix:3 | "Every phase SKILL.md carries the block" — falso para critic y drillme (retro sí lo tiene) | 🔎 parcial |
| DT-07..12 | system-inventory | docs/ row incompleta; evals 18→19; línea-ref stale; sync claim omite workflows/; double-fire desactualizado; nombre MCP "binOra Desarrollo" obsoleto (esta sesión: "binOra - Demo"/"binOra - Producción Bjumper") | ⚠️ (DT-12 🔎 en vivo) |
| PA-1..4 | audit 06-30 | 4 correcciones menores al propio documento (18→19 casos; D4 stale por 025; "50%"→4/7; D7 primera mitad mal citada) | ✅ |

### E. Capability-gap (oportunidades; sev = tamaño de oportunidad)

| ID | Oportunidad | Estado |
|---|---|---|
| CG-02 | Bump `minimumVersion` 2.1.166→≥2.1.198 (fix de rules condicionales vía symlink — TODA la capa global es symlink) | 🔎 changelog confirmado |
| CG-03 | `autoMode.classifyAllShell` (2.1.193) + capas nativas 2.1.183 solapan auto-approve.ts → trial y posible MIGRAR-Y-CUT parcial | ⚠️ |
| CG-04 | critic: implementar el fresh-context reviewer con el motor nativo `/code-review` (typed findings, mantenido) | ⚠️ decisión |
| CG-05 | security-gate.ts: emitir `hookSpecificOutput.additionalContext` (2.1.163) para que el modelo VEA el warning de secreto | 🔎 changelog confirmado |
| CG-06 | Cablear `Skill(verify)` nativo en §Post-implementation verification y en critic (happy-path) | ⚠️ decisión |
| CG-08 | learning-inbox vs auto-memory nativa: KEEP con split documentado | ⚠️ |
| CG-09 | Sandbox nativo maduró (sandbox.credentials 2.1.187) — re-evaluar activarlo | ⚠️ decisión |
| CG-10 | best-of-n vía background sessions (`claude --bg`) en vez de `-p` bloqueante | ⚠️ piloto |
| CG-11 | fallbackModel lidera con sonnet-4-6; Sonnet 5 es el default desde 2.1.197 | 🔎 |
| CG-12 | ¿minimumVersion superseded por requiredMinimumVersion (2.1.163)? Verificar en docs al bumpear | ⚠️ |

Release notes recientes con relevancia adicional (aportadas por el usuario, 2.1.198-201): subagents en background por defecto + notification hooks `agent_needs_input`/`agent_completed` (encaja con CG-10 y con el recordatorio post-build de 025); Explore hereda el modelo de la sesión (ya no es Haiku — actualizar la mención en CLAUDE.md §delegation); skills apiladas `/a /b` (2.1.199); AskUserQuestion ya no auto-continúa (2.1.200 — bueno para las hard gates).

## Hoja de ruta (lista de actuaciones)

### P0 — Durabilidad (hoy, requiere OK del usuario para commit)
1. **Commit** de todo el trabajo 025 + auditoría 06-30 + esta auditoría (PA-5). Nada lo bloquea: APPROVED, 169 tests verdes.

### P1 — Fixes verificados y baratos (una sesión, inline)
2. `flow-state.ts`: guard en `close-feature` (exigir verdict APPROVED/WITH_WARNINGS), mensaje honesto en `status` root-inexistente, ENOENT→error típado, `updated_at` en approveGate/setVerdict + tests (F1-F3, RI-5).
3. `flow.md`: añadir `status`, quitar/definir `gate_iterations` (RI-4/6).
4. `skill-activation.ts`: parsear Keywords multilínea + test (SK-01) — o aplanar las 10 skills a una línea (fix la clase, no el caso → hook).
5. Batch docs-truth: system-inventory (DT-01/02/03/07/08/09/10/11/12, CG-07), plans/README (DT-04/05), aux-matrix (DT-06), correcciones a audit 06-30 (PA-1..4), sync-claude.md (RI-8), .gitignore (RI-7), rmdir dirs vacíos (RI-9).
6. Skills menores: SK-02, SK-03, SK-05, SK-06, SK-09.

### P2 — Decisiones de diseño (ratificar una a una)
7. **Renombrar `security-review`** → p.ej. `security-review-deep` + actualizar dispatchers (SK-04/CG-01).
8. **Sync-trap instruccional**: añadir scripts/ a LINK_FOLDERS o hacer las instrucciones layer-aware (RI-1/RI-10).
9. **learning-inbox multi-repo**: gitignore propuesto por project-onboard o escribir en `~/.claude/learned/<slug>/` (RI-2); además atacar el ruido de capturas (fricción binora/cv).
10. `minimumVersion` → ≥2.1.198 + verificar CG-12; fallbackModel → Sonnet 5 (CG-02/11/12).
11. CG-03/04/05/06/09/10 — adopciones nativas (trial cada una).
12. Refrescar ultracode-audit.js (RI-3).
13. **Cerrar el promotion loop de retros externos** (fricción no-promovida: contract-lag, candidatos que no aterrizan) — candidato a mini-feature con `/flow`.

### P3 — Cross-repo (tejado del usuario, comandos ya entregados el 30-06)
14. Limpieza dead-weight binora/cv (hooks huérfanos, agent-memory, caveman, duplicado double-load de `rules/dj*` en binora-backend, .DS_Store tracked).
15. Cerrar lifecycles atascados: binora-backend 001 (fase 4), binora-frontend 002 (retro pending), cv-astro 002 (`/flow --resume` o cierre manual honesto).

## Estado del goal del usuario

1. Analizar estado y estadísticas ✅ · 2. Buscar errores ✅ · 3. Gaps ✅ · 4. Mejoras ✅ (CG + release notes) · 5. Anti-alucinación ✅ (refuters + verificación inline del Lead; 1 finding degradado a dudoso: SK-07) · 6. Iteración ✅ (esta pasada re-verificó la auditoría previa). Siguiente: ratificar actuaciones y avanzar con las etapas de flow sobre las que lo requieran (P2.13 es el mejor candidato a `/flow`).
