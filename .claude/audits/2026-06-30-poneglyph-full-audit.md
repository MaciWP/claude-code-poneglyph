# Poneglyph — Auditoría completa + hoja de ruta (2026-06-30)

> Entrada: `/goal /flow --full` — auditar la solución (gaps/mejoras/errores), proponer hoja de ruta, verificar el flujo `/flow` completo, analizar el uso real en otros proyectos (binora, cv-astro).
> Naturaleza: feature de **auditoría** (deliverable = informe), ceremonia ligera. El `/flow --full` literal se reserva para dogfooding de UN fix concreto (Fase F).
> Método: orientación → advisor → fan-out read-only de 5 `Explore` → **verificación inline de cada finding contestada** (anti-alucinación) → síntesis.

## BLUF

**El sistema funciona y su núcleo está sano.** Lo que falla NO es el repo poneglyph (integridad limpia, maquinaria de `/flow` verificada end-to-end, 125/125 tests). El hallazgo #1 sale del **uso real**: las hard gates están **front-loaded** (1→2 y 2→3 son humanas y efectivas) pero la mitad trasera del flujo (build→critic→retro) **no tiene enforcement**, así que ≈43% de los ciclos (3 de 7 con state.json) quedan incompletos en la mitad trasera — algunos in-flight, no "abandonados" (conteo verificado, ver U1). El segundo eje es **higiene de documentación/propagación** (system-inventory desactualizado; capas `.claude/` de proyecto con peso muerto huérfano).

3 findings de los agentes eran **falsos positivos** y se rechazaron tras verificación (detalle abajo) — la disciplina de verificar antes de afirmar pagó.

---

## Qué funciona (verificado — no asumido)

| Área | Verificación | Resultado |
|---|---|---|
| Maquinaria `/flow` (flow-state.ts) | Ciclo completo ejercido en scratch (approve-gate→close-us→verdict→close-feature) + edge cases | ✅ correcto, errores limpios |
| Schema state.json | Template == schema canónico (13 campos tras el fix D4 de 025) | ✅ |
| Hooks | `bun test ./.claude/hooks/` | ✅ 125 pass, 0 fail |
| Integridad repo | MIGRAR-Y-CUT (4 relocaciones), refs a `_archive/`, cross-links skills/docs | ✅ limpio, 0 roto-en-clone |
| Evals harness | 19 casos + 6 graders, fuentes existen (corregido 2026-07-02: decía 18; el caso 19 entró el 06-23) | ✅ sano |
| Capa global (`~/.claude/`) | symlink a repo; 7 hooks cableados | ✅ fresca en todos los proyectos |

---

## Findings (por tier, verificados)

### TIER 1 — El uso real (la respuesta a "el uso en otros proyectos")

Corpus: 8 planes formales en binora-backend, binora-frontend, cv-astro.

**U1 — Hard gates front-loaded; la mitad trasera no se cierra.** Conteo verificado (spot-check inline de los state.json, 2026-06-30): **4 closed / 7 planes con state.json (≈43% incompletas)**, no las "4/8" de la primera lectura. Las 3 incompletas — todas atascadas en la mitad trasera:
- binora-backend `001-JRV-855`: `current_phase:4` (entró a review), `phases_completed:[1,2,3]`, sin review.md/retro.md. **Committeado hace 4 días → in-flight, NO abandonado.**
- binora-frontend `002-forms`: `current_phase:5`, `retro_status:pending` sin ratificar.
- cv-astro `002-deps-upgrade`: `[1,2,2.5]`, US4 pendiente.
- (cv-astro `003-code-sanitization`: sin state.json — nunca formalizado; no cuenta como plan-con-ciclo.)

Raíz: tras Phase 3 (build), `critic`+`retro` no tienen gate que fuerce su ejecución. El propio flow.md ya nombra el smell: *"state.json files accumulate without feature_closed:true → workflows abandoned mid-flight"*. **Framing honesto: hasta ≈43% de ciclos quedan incompletos en la mitad trasera; algunos in-flight, no abandonados.** `[Probable — spot-check de 2 de 3 + conteo de cierre; la lectura cualitativa de retros viene de un solo Explore, no re-verificada claim a claim]`.

**U2 — Fricción recurrente capturada en retros pero no promovida a global:**
- Sandbox PATH roto para subagents/MCP (bloqueador recurrente; ya en memoria `claude-binary-sandbox-path`).
- Design-fidelity: prompts de build pierden elementos visuales explícitos.
- Contract propagation: source of truth no sincronizado a submodule.
- Falsos negativos de test (contraste no-renderizado, jsdom con `<input type=number>`).

**U3 — `learned/` funciona** (cada sesión hereda contexto; logs de 85-138 líneas) **pero retro no rankea esa herencia local como promotion a global** → las lecciones quedan atrapadas por proyecto.

### TIER 2 — Defectos reales en el repo (verificados inline)

| ID | Severidad | Fichero:línea | Defecto | Estado |
|---|---|---|---|---|
| D1 | Media | `docs/system-inventory.md:128,142,158` | Stale: skills "22"→**24** real; "skill-advisor cut"→**existe** (re-añadido 024); "fallbackModel DO NOT EXIST"→**existe** y configurado (CC 2.1.166); `requiredMinimumVersion` ahora existe (CC 2.1.163) | ✅ verificado |
| D2 | Baja-Media | `hooks/auto-approve.ts:9-12,33-53` vs `settings.json:190-197` | Comentario "keep both in sync" engañoso: son **mecanismos distintos** (hard_deny=bloqueo duro 6 patrones; auto-approve=no-auto-aprobar→pregunta, 11 patrones). No deben ser idénticos; falta documentar el layering | ✅ verificado |
| D3 | Baja-Media | `skills/meta-create/references/skill/template-placeholders.md:14,19` | Cita `templates/knowledge-base.md` y `templates/encoded-preference.md` **inexistentes** (solo hay reference/research/workflow) | ✅ verificado |
| D4 | Baja | `scripts/flow-state.ts:72,108` vs `commands/flow.md:94-112` | `us_history` y `current_phase:"closed"` se escriben pero NO están en el schema canónico ni el template | ✅ **RESUELTO en 025** (flow.md documenta ambos; re-verificado 2026-07-02) |
| D5 | Baja | `skills/meta-create/references/skill/examples-library.md:57,156,257` | Ejemplos `for_agents:[builder,reviewer,scout]` (agentes cortados en 008) sin nota de deprecación | ⚠️ reportado por agente, consistente con 008 |
| D6 | Baja | `scripts/flow-state.ts` | Sin subcomando para marcar Phase 2.5 mid-flight (resumability parcial si muere en tdd-design) | ✅ verificado |
| D7 | Baja | `hooks/security-gate.ts:39`, `hooks/learning-inbox.ts:88` | Gaps menores: exclusión `.claude/` documentada SOLO in-code (comentario de 9 líneas en el locus — corregido 2026-07-02: la redacción original "no documentada" era falsa), no en system-inventory §Security; REVIEW_PROSE puede sobre-filtrar learnings legítimas | ⚠️ reportado por agente |

### Falsos positivos RECHAZADOS (transparencia anti-alucinación)

| Reportado | Por qué se rechaza |
|---|---|
| 🚫 `${CLAUDE_SKILL_DIR}` "no definida" en decision-stress-test (marcada ALTA) | Es variable **soportada y recomendada** por Claude Code desde v2.1.69 (changelog). Es el patrón portable correcto, no un defecto |
| 🚫 `git push` "bloquea TODO, feature rota" (marcada CRÍTICA) | "Block" en auto-approve = NO auto-aprobar → cae al flujo de permisos (pregunta), **no deniega**. Conservador por diseño (§Security posture). Severidad inflada; el punto real es D2 |
| 🚫 system-inventory "13 roles incorrecto, son 12" | grep confirma **13** roles únicos → CLAUDE.md está bien; el agente miscontó (8 vs 9 engineering) |

---

## Hoja de ruta priorizada

Criterio: impacto × (coste recurrente o riesgo) × ROI. Respeta la doctrina del repo (*pulir > añadir*; *fix la clase, no el caso*; *default breve*).

### P0 — Cerrar el gap de la mitad trasera del flujo (TIER 1 / U1)
El de mayor valor y el único estructural. NO toca minimal mode (build suelto trivial no necesita ceremonia). Para features standard/full:
- Subcomando `flow-state.ts open-plans` / report que liste planes con `feature_closed:false` y su fase → visibilidad del abandono.
- Decidir si añadir un checkpoint ligero post-build (no necesariamente hard gate humano) que recuerde critic+retro.
- Dar a `retro.md` un `owner` + estado de ratificación explícito (no `pending` flotante).
> **Candidato ideal de dogfood `/flow --full`**: es una feature real con decisiones de diseño que atraviesa las 5 fases → cierra el gap Y valida el flujo end-to-end (parte 3 del goal). Dos pájaros.

### P1 — Higiene de verdad/propagación (barato, alto valor de confianza)
- **D1**: refrescar `system-inventory.md` (Commandment II/X — el mapa no puede mentir). Trivial.
- **U2/U3**: promover a global las 3-4 lecciones recurrentes (sandbox PATH ya en memoria; design-fidelity checklist; contract-verify en Phase 2). Cablear en retro.

### P2 — Defectos menores (batch en una pasada)
- D2 (clarificar layering auto-approve/hard_deny), D3 (refs muertas meta-create), D5 (nota deprecación), D6/D7 opcionales. (D4 salió de este batch: quedó resuelto en 025.)

### P3 — Higiene cross-repo (requiere tu decisión — toca otros repos)
- Limpiar peso muerto huérfano en `.claude/` de binora/cv (caveman.md, guard-*.sh, format-code.sh, agent-memory/, plans legacy). Confirmado huérfano (no cableado), no es riesgo — es deuda de claridad.
- Considerar un check de "alineación poneglyph-en-proyecto" (no hay tooling hoy; sync solo propaga la capa global).

---

## Estado del goal
- Auditar (gaps/mejoras/errores): ✅ hecho y verificado (3 falsos positivos rechazados).
- Hoja de ruta: ✅ propuesta arriba (P0-P3).
- Analizar uso real en otros proyectos: ✅ TIER 1 (4/7 cerrados, ≈57% completitud — corregido 2026-07-02; el "50%" era la primera lectura que U1 ya había descartado).
- Verificar el flujo completo: ✅ **dogfood `/flow --full` (plan 025) completado end-to-end, veredicto APPROVED** — las 5 fases + 2 hard gates + flow-state.ts + skills de fase + reviewer fresco, todo ejercido. 145 tests pass. *Matiz: validó el **happy path** del flujo (todas las gates fueron APPROVE); las ramas REFINE/NEEDS_CHANGES/BLOCKED y `--resume` no se ejercieron.*

## Ejecución (post-auditoría)
- **P0 — mecanismo de detección construido y testeado** (dogfood 025): `flow-state.ts status` + recordatorio en post-compact.ts + schema D4 + retro ownership. APPROVED, 145 tests. **NO es "resuelto"**: construí la *detección* del abandono, no he medido que el ≈43% baje — eso es comportamental y se valida en próximas sesiones (memoria `feedback-behavioral-ac-next-session`). Además el recordatorio cuelga de `post-compact`, que **solo dispara tras una compactación** → sesiones cortas sin compactar no lo ven. **Follow-up (no ahora, diseño ya ratificado)**: `SessionStart` dispara en cada sesión y mordería más; evaluar migrar/duplicar el recordatorio ahí.
- **P3 entregado al user**: borrado cross-repo denegado por la red de seguridad (correcto); comandos exactos provistos para ejecución manual.
- **P1/P2 pendientes de ratificación** (diferidos por decisión del user; ver retro 025 §Action items).
