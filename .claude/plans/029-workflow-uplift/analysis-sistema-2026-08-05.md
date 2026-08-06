# Análisis de sistema v2 — cómo funciona poneglyph, dónde falla, qué hacer

Fecha: 2026-08-05 (v2, tras feedback del usuario) · Método: artefactos primarios (14 state.json, settings.json, capas .claude/ de 6 repos, hook SessionStart ejecutado en vivo, censo de invocaciones de skills en TODOS los transcripts, fechas git) + análisis de transcripts (5 agentes) + research web (ponytail/impeccable) + canon de meta-create/meta-settings-cookbook para la forma de cada solución.

## Erratas corregidas (v1 → v2)

1. **"drillme 0 usos" era falso**: censo real de lanzamientos de skill en transcripts: drillme 8, tech-plan 11, scope 9, tdd-design 7, build 7, critic 6, retro 5, prompt-engineer 7, skill-advisor 2. Yo mezclé "comando tecleado por el usuario" (drillme 1×) con "skill invocada" (8×). Las fases del pipeline SÍ se invocan — vía /flow.
2. **"/flow 3× en la historia" era falso** (ya corregido en v1-tarde): 12 tecleos de /flow + 14 lifecycles con state.json en repos de trabajo.
3. **US4 (commit-text) reinventaba la rueda**: binora-backend ya tiene `commit-message.md` (111 líneas) y `pr-description.md` (144) que codifican el formato del usuario → abstraer, no crear de cero.
4. Verificado que NO era errata: 025 (back-half gate) y 027 (hook open-plans) aterrizaron el 2026-07-07; los 4 abandonos de lifecycle son del 17-29 jul → post-gate confirmado con fechas git.
5. **Caveat del censo**: cuenta lanzamientos vía Skill tool; las skills-referencia (lsp-operations, orchestrator-protocol…) se consumen vía Read del Lead y no aparecen — el censo definitivo debe usar `instructions-loaded.log` (017/US12), que registra cargas mecánicamente.

## Cómo funciona poneglyph hoy (verificado)

| Mecanismo | Estado observado |
|---|---|
| Always-loaded global (~5.2k palabras ≈ 7k tokens/turno) | Carga siempre; doctrina. En repos de trabajo se SUMA la capa proyecto: frontend +7.2k palabras (~17k tokens/turno total), backend +4.4k (~13k) |
| Hooks globales (7 registrados) | Funcionan. session-start-plans emite recordatorio de planes abiertos (probado en vivo) — pero nadie actúa sobre él, y referencia un script inexistente en repos de trabajo |
| Pipeline /flow | 14 lifecycles en repos de trabajo. Build SIEMPRE termina (0 US pendientes). Solo 4/14 cierran: 3 mueren entrando en critic, 7 tras verdict sin retro. 4 abandonos post-gate-025 |
| Skills (27 globales + ~24 de proyecto) | Invocación real BAJA: máximo 11 lanzamientos (tech-plan); 10 globales con 0 lanzamientos (caveat #5). skill-advisor: 2. Hints del hook a veces irrelevantes; honor-rate sin medir |
| Capas de proyecto | Heterogéneas y divergentes del global (planner.md fork de protocolo cortado, agent-memory pre-inline-first, schema de skills de otra era); binora-mcp casi sin capa; binora-contract otra generación |
| Learning loop (Cmd VII) | inbox.md crece sin consumidor en repos de trabajo (retro es el consumidor y es la fase que muere) |

**Diagnóstico**: (a) el pipeline pierde su cobro final (critic/retro) en 10/14 casos; (b) el turno ad-hoc no tiene disciplina; (c) la utilización de skills es una fracción de lo construido; (d) las capas de proyecto acumulan coste y divergencia sin gobernanza.

## Directrices del usuario (2026-08-05) y forma elegida por canon

| # | Directriz | Forma de solución (meta-create/cookbook) |
|---|---|---|
| 1 | Workflows: pedir permiso SIEMPRE + modelo correcto (nunca Fable en unidades; tabla guía) | `settings.json permissions.ask: ["Workflow"]` (determinista) `[Probable — sintaxis estándar; verificar]` + tabla task→model en CLAUDE.md §delegación + convención `opts.model` explícito en scripts |
| 2 | Abstraer skills de binora (pr review, comments convention…) | Promoción a skills/commands globales vía meta-create (re-canonizar frontmatter viejo); núcleo común + criterios por stack en capa proyecto |
| 3 | Skills no se activan solas → incentivar | NO rule nueva ciega: (a) endurecer el contrato de hints ("honra el hint o di en 1 línea por qué no"), (b) medir honor-rate con instructions-loaded.log, (c) skill-advisor cableado al contrato before-implementing (wiring determinista > auto-trigger, memoria) |
| 4 | Comportamiento default de programación + golden rules OBLIGATORIAS | CLAUDE.md hospeda la secuencia (US3) + rule con lenguaje MUST y **bloque de evidencia obligatorio** (reuse-scan y verify visibles en la respuesta); regresión con golden-prompt evals tras el cambio (mandato cookbook) |
| 5 | Reducir coste de capas de proyecto | Feature de racionalización: abstraer lo valioso → global; dejar lo repo-específico; borrar lo sin valor. Retomar 003-claude-layer-audit (backend, retro pending) |
| 6 | Abusar más de /drillme /skill-advisor | Cableo determinista: skill-advisor como paso del contrato en tareas no triviales; drillme referenciado en blocking-questions del contrato y en cierres de fase (ya lo está en tech-plan) |
| 7 | Filtrar skills: qué se usa, qué sobra | Censo con instructions-loaded.log + propuesta keep/merge/cut ratificable (dirección "pulir > añadir") |

## Tabla v2 — ordenada por valor/esfuerzo (con directrices integradas)

Valor/Esfuerzo 1-5. Status: ✅ artefacto primario · 🔵 transcripts ≥2 instancias · ⚠️ probable/juicio. Col. Origen: U# = directriz del usuario, US# = draft 029, v1 = tabla anterior.

| # | Hallazgo / tarea | Datos / valoración | Valor | Esf. | Status | Origen |
|---|---|---|---|---|---|---|
| 1 | **Gate Workflow: permiso + tabla de modelos** (nunca Fable en unidades; búsqueda→sonnet prio/haiku; bulk mecánico→haiku; build delegado→sonnet; verify crítico→opus con razón) | 2 quejas de coste + 1 run matado; permissions.ask = determinista, coste ~0 | 4 | 1 | 🔵 | U1 |
| 2 | **Protocolo de acción sobre planes abiertos** (el recordatorio fira y nadie actúa) | Probado en vivo; 10 lifecycles abiertos. Triage de primer turno: resume/cerrar/archivar | 5 | 1 | ✅ | v1 |
| 3 | **Fix script inexistente** en recordatorio (+ clase sync-trap) | Instrucción de recuperación inejecutable donde hace falta | 3 | 1 | ✅ | v1 |
| 4 | **Golden rules OBLIGATORIAS**: secuencia en CLAUDE.md + rule MUST con bloque de evidencia (reuse-scan/verify visibles) + evals de regresión | Directriz explícita "totalmente obligatorias"; endurece US3 | 5 | 2 | 🔵 | U4+US3 |
| 5 | **Contrato before-implementing** (turno ad-hoc) — ahora con skill-advisor y drillme cableados como pasos | Turno default sin disciplina; cableo determinista responde a U3/U6 | 5 | 2 | 🔵 | US2+U6 |
| 6 | **Skill verify + gate pre-done** (ref muerta + fricción #1) | 20+ "¿estás seguro?"/18 sesiones; CI rota tras "done" 2× | 5 | 2 | ✅ | US5 |
| 7 | **Back-half: por qué 025 no aguanta** + re-enganche | 10/14 abiertos, 4 post-gate (fechas git verificadas). Diagnóstico + mecanismo, se apoya en #2 | 5 | 2 | ✅ | v1 |
| 8 | **Abstraer skills/commands de binora**: pr-conventional-comments → global (re-canonizar schema viejo), review-pr núcleo común (backend 230 vs frontend 240 líneas divergen), commit-message+pr-description absorbidos por US4 | Ficheros verificados; evita reinventar /commit-text (errata v1 #3) | 4 | 2 | ✅ | U2 |
| 9 | **Skill jira-ticket** (MCP Atlassian) | 13 pastes con cruft vs 6 llamadas MCP | 4 | 2 | 🔵 | US6 |
| 10 | **Honor-rate de hints + skill-advisor wiring** (fusiona v1 #8+#22): endurecer contrato de hints, medir con instructions-loaded.log, hint "feature → /flow --minimal" | skill-advisor 2 lanzamientos; hints irrelevantes observados; medir antes de tocar más | 4 | 2 | ✅ | U3+U6 |
| 11 | **Skill simplicity-ladder** (ponytail propio) | Premisa re-tecleada ~14 sesiones; pushback over-engineering 9 msgs | 4 | 2 | 🔵 | US1 |
| 12 | **Censo y poda de skills** (usar instructions-loaded.log, no solo grep; propuesta keep/merge/cut ratificable) | 10 skills globales con 0 lanzamientos (caveat: referencias se consumen vía Read); máx 11 lanzamientos | 3 | 2 | ✅ | U7 |
| 13 | **Disciplina git/side-effects** + absorber commit-message/pr-description existentes | 10 instancias; comandos ya existen en backend → abstraer | 4 | 3 | 🔵 | US4+U2 |
| 14 | **Racionalización de capas de proyecto** (fusiona v1 #15+#20+#21): abstraer/dejar/borrar por valor; retomar 003-claude-layer-audit; incluye divergencias (planner.md fork, agent-memory viejo) y coste (frontend ~17k tokens/turno) | Capas verificadas fichero a fichero | 4 | 3 | ✅ | U5 |
| 15 | **Advisor modelo/effort al turno default** | 60+ toggles manuales; advisor 027 solo en fronteras /flow | 4 | 3 | ✅ | US7 |
| 16 | **/review-pr hardening** (entra en #8 si se abstrae el núcleo) | Arg misparse 3×, scope overreach 2× | 3 | 2 | 🔵 | v1 |
| 17 | **Brevedad en repos de trabajo** (línea dura en capa proyecto, dentro de #14) | 19 correcciones/12 sesiones | 3 | 2 | 🔵 | v1 |
| 18 | **Corregir claims del 029 index** (flow/build/drillme con censo real) | Erratas propias documentadas arriba | 3 | 1 | ✅ | fix |
| 19 | **project-onboard a binora-mcp** | CLAUDE.md de mayo, 0 skills/rules | 3 | 2 | ✅ | v1 |
| 20 | **Refutador de constraints en research delegado** | 3 correcciones/1 sesión | 3 | 2 | 🔵 | v1 |
| 21 | **Learning loop: consumidor alternativo** (si retro no corre, el inbox necesita otro dueño — p.ej. triage en el protocolo #2) | inbox 80 líneas truncadas sin consumo | 3 | 3 | ✅ | v1 |
| 22 | **Skill frontend-craft** (Impeccable propio, consistency-first) | 0 quejas estéticas; 4 barridos de consistencia manuales | 3 | 3 | 🔵 | US8 |
| 23 | **Copia vieja Poneglyph/ + .rar en REPOSITORIOS/PYTHON** (decisión usuario) | Confusión de fuente de verdad | 2 | 1 | ✅ | v1 |
| 24 | **Higiene de sesión/mega-sesiones** (se alivia con #2+#7) | 3 agotamientos, /clear 21× | 2 | — | 🔵 | v1 |
| 25 | **Topología del workspace Bjumper** (requisito del usuario): mapa repos↔worktrees↔docs + navegación orgánica, extensión de worktrees-bjumper | Layout verificado: `<root>/worktrees/<env>/<repo>` (jrv-1031/1077/1081, `_shared`/`_proxy`); `git worktree list` enumera; la skill actual cubre el CLI pero la topología en 1 sola línea; caveat: transcripts (y probablemente plans no trackeados) son per-cwd → un worktree no ve el contexto del repo principal | 4 | 2 | ✅ | usuario → US16 (WA) |
| 26 | **/flow sobre-mandatado y verboso** (audit prompt-engineer): cadena completa 23.138 palabras ≈ ~31k tokens de instrucciones por run (antes de references); 98 mandatos MUST/SIEMPRE/NEVER; cumplimiento medido de mandatos: skill-advisor ~2% (2 lanzamientos vs ~98 esperados), drillme ≤19%, retro 29% — más mandatos ≠ más cumplimiento; score 56/100 como prompt (Structure 8/20, Actionable 8/20) | Fix: reescritura a router fino (≤1.200 palabras) + checklist ≤5 items por frontera registrada en state.json (`boundary_checks`) + dieta de mandatos 98→≤25 (cada uno checklist-item o hook-enforced) | 5 | 3 | ✅ | usuario → US17 (WB) |
| 27 | **Portabilidad multi-modelo/multi-harness** (directiva usuario): la doctrina (markdown) porta gratis vía AGENTS.md (estándar emergente: Codex/Cursor/Gemini); la mecánica (hooks, skill-activation, /flow, skills) es adapter de Claude Code y NO porta barata | v1 hecho (CLAUDE.md genérico + symlink AGENTS.md); resto: sync-claude genera AGENTS.md en Windows, homes globales por tool, inventario portable-vs-bound | 3 | 3 | ✅ | usuario → US18 (WC) |

## Waves propuestas (re-priorización con las directrices)

- **Wave A — esta semana, todo esfuerzo ≤2**: #1 gate Workflow · #2 protocolo planes abiertos · #3 fix script · #18 erratas index · #4 golden rules obligatorias · #5 contrato · #6 verify.
- **Wave B**: #7 diagnóstico back-half · #8 abstracción binora · #9 jira · #10 hints/skill-advisor · #11 ladder.
- **Wave C**: #12 censo skills · #13 git · #14 racionalización capas · #15 advisor · #16-17 (si no quedaron absorbidas).
- **Re-evaluar tras medir**: #19-24.

Regla transversal (cookbook): todo cambio conductual (CLAUDE.md/rules/output-style) pasa la regresión de golden-prompts (`bun .claude/evals/run.ts`) antes de darse por bueno.
