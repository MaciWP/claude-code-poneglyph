---
id: 020-drillme-exhaustive
created: 2026-06-18
approved: 2026-06-18
mode: full
phase: 1
status: closed
closed: 2026-06-18
---

# Problema

`drillme` está calibrada en **contradicción directa** con la doctrina que dice implementar. CLAUDE.md (§Communication & Honesty Protocol) ordena *"ask in rounds — including lateral/improvement questions — until no remaining question would change the decision; drillme carries the catalog"*, pero la skill se calibra al revés: "3-7 questions", "⚠️ >10 → over-engineering; calibrate down", "the 10% tool, ~500 tokens". El usuario invoca `/drillme` esperando la batería exhaustiva que la doctrina promete y recibe 4-5 preguntas con aviso de exceso. La raíz no es un bug: es una **calibración graduada (¿cuántas preguntas?) que contradice la instrucción doctrinal de exhaustividad hasta saturación**, agravada por una activación tímida que deja gaps sin interrogar.

# Resultado esperado

- `drillme`, cuando detecta ambigüedad, lanza una **batería exhaustiva en rondas hasta saturación** (ninguna pregunta restante cambiaría la decisión / cero gaps), no un tope de 3-7 preguntas.
- **Activación híbrida y fácil**: drillme es una meta-skill transversal invocable por todas las skills; se considera en (casi) toda tarea no trivial y dispara preguntas **allí donde detecta gaps, dudas o algo especificable mejor** (information gain), con **0 preguntas donde no hay nada que desambiguar** (cero ceremonia en lo trivial).
- **Las respuestas se "bakean" en el artefacto** (spec/plan/decisión), no se quedan en el aire — patrón `/speckit.clarify`.
- **Anti-padding preservado**: exhaustivo = cobertura del espacio de ambigüedad **sin redundancia** (information gain por pregunta), nunca inventar preguntas para alcanzar un número.
- **Skill y doctrina dejan de contradecirse**: la redacción interna se vuelve una instrucción clara, imperativa y alineada con CLAUDE.md.

# Success criteria (medibles, Given/When/Then)

- **AC1**: Given una decisión/tarea con ambigüedad, when `drillme` corre, then produce preguntas en rondas hasta **saturación** (declarada explícitamente cuando ninguna pregunta restante cambiaría la decisión), sin tope numérico 3-7.
- **AC2**: Given activación **híbrida**, when `drillme` evalúa el contexto, then dispara preguntas solo donde detecta gaps/dudas/ambigüedad reducible (information gain > umbral); en contexto trivial sin ambigüedad → **0 preguntas, cierre inmediato** (sin ceremonia, Commandment III).
- **AC3**: Given que `drillme` cierra, when reporta, then o declara "cero gaps" o lista los `[OPEN]` con qué se necesita para resolver cada uno; **ninguna decisión se asume en silencio**, y las respuestas obtenidas se **escriben en el artefacto** (sección Clarifications/Decisiones).
- **AC4**: Given duda **epistémica vs aleatoria**, when una pregunta no puede ser respondida ni por el usuario (incertidumbre irreducible), then `drillme` **no insiste**: la marca `[OPEN]` y sigue, en vez de machacar.
- **AC5**: Given el mecanismo de entrega, when `drillme` pregunta, then usa `AskUserQuestion` en **rondas temáticas** (estructura funnel: abrir → sondear → cerrar), ni 40 de golpe ni 1-a-1 estricto; las preguntas **abiertas** ofrecen 2-4 opciones-ejemplo + el "Other" nativo.
- **AC6**: Given el catálogo, when `drillme` genera la batería, then incluye **preguntas laterales / de mejora** (aspectos que el usuario no mencionó: edge cases, partial failures, retries, downtime, validation gaps) además de las 4 categorías socráticas + el phase bank aplicable.
- **AC7**: Given el guard anti-padding, when `drillme` genera preguntas, then conserva el anti-pattern "Synthetic coverage" (no inventar para rellenar cuota); cada pregunta aporta information gain.
- **AC8**: Given un **freno flojo**, when las respuestas se **degradan** (evasivas repetidas, rubber-stamping, goalposts moviéndose) o el usuario fatiga, then `drillme` PARA y reporta honestamente; **no hay tope de rondas numérico** que corte antes de cerrar gaps reales.
- **AC9**: Given que `drillme` alcanza su techo (desacuerdo de fondo, respuestas que no cierran tras presión legítima), when no resuelve, then **escala explícitamente a `decision-stress-test`** y/o reporta "inconcluso + items abiertos".
- **AC10**: Given que es **meta-skill transversal**, when cualquier skill (scope, tech-plan, build, critic, retro, u otras) necesita cerrar ambigüedad, then puede invocar `drillme`; y `/flow` la cablea en **scope + ambos hard gates (1→2 y 2→3)**.
- **AC11**: Given el cierre del feature, when se revisa CLAUDE.md + `drillme`, then la contradicción ("3-7" / ">10 over-engineering" / "the 10% tool") ya no existe: ambos describen exhaustividad-hasta-saturación con activación híbrida.

# Out of scope (explícito)

- **No fusionar** `drillme` con `decision-stress-test`: siguen separadas (drillme pregunta AL USUARIO; stress-test debate entre 5-12 AGENTES). Solo se añade el escalado drillme→stress-test.
- **No crear una skill nueva**: el cambio vive dentro de `drillme`.
- **No rediseñar** los 6 phase-question banks: se conservan y consumen; se pueden **ampliar** con laterales en Phase 2, no reescribir.
- **No tocar** runtime de Claude Code ni hooks de seguridad. Reforzar `skill-activation.ts` / la `description` para la activación fácil es candidato de Phase 2 (dentro del outcome "activación fácil").
- **No** implementar un cálculo numérico real de EVPI/entropía: "information gain" es un **criterio cualitativo aplicable durante la generación** ("¿esta pregunta cambiaría la decisión?"), no una métrica computada (lección "rules must be generation-executable").

# Constraints

- **Técnico**: `drillme` vive en el layer global `~/.claude/skills/drillme/` (symlink de este repo); el cambio es **global** y afecta a toda repo que use el layer poneglyph.
- **Compatibilidad**: cambio markdown/skill; `bun test ./.claude/hooks/` debe seguir green.
- **Test-policy**: nivel `auxiliary` — validación post-impl + **validación conductual de AC en próxima sesión**, no por grep de presencia (lección "behavioral AC validation").
- **Commandment III**: la reconciliación exhaustividad↔no-over-engineering es vía **activación híbrida (gated por information gain) + anti-padding**, NO eliminando el juicio ni interrogando lo trivial.
- **Generation-executable**: el criterio de parada y el de activación se expresan como instrucciones aplicables al generar (preguntas-ancla, "¿cambia la decisión?"), no como thresholds que exijan contar.

# Stakeholders

- **Oriol** — sufre el problema (invoca drillme y no obtiene la batería esperada), decide el hard gate, valida el outcome conductual.

# Decisiones tomadas (rondas de scope — 4 rondas + research)

| Tema | Decisión | Nota / respaldo |
|---|---|---|
| Forma del cambio | **Drillme exhaustivo** (no skill nueva, no modo opt-in tímido) | Decisión del usuario: instrucción clara y simple sobre matiz |
| Activación | **Híbrida, gated por gaps**: universal en la práctica, dispara donde hay information gain, 0 donde no | Evidencia converge en clarificación *selectiva*, no always-on (ICLR 2025; EACL 2024) |
| Mecanismo | **`AskUserQuestion` en rondas temáticas**; funnel abrir→sondear→cerrar; abiertas con opciones-ejemplo + Other | callcentrehelper; bridging-the-gap |
| Criterio de parada | **Saturación** (information gain ≈ 0) + **anti-padding** | EVPI / SAGE-Agent (arXiv 2511.08798) |
| Freno | **Flojo**: por saturación o degradación de respuestas, no por tope numérico | El riesgo dominante documentado es parar PRONTO |
| Bakeo | **Las respuestas se escriben en el artefacto** | `/speckit.clarify` (github/spec-kit) |
| Boundary | **Separados + drillme escala a `decision-stress-test`** | |
| Cableado | `/flow` invoca drillme en **scope + gates 1→2 y 2→3**; meta-skill usable por todas las skills | Decisión del usuario |

# Modelo conceptual (principios transversales para Phase 2)

1. **Activación híbrida (decisión bajo incertidumbre + coste)** — drillme se *considera* siempre, pero *dispara* preguntas solo cuando el information gain supera un umbral cualitativo (hay un gap que, resuelto, cambiaría la decisión). Formaliza el "que se active cuando detectes gaps/dudas/mejorable" del usuario. Fuentes: [Uncertainty as guide, EACL 2024](https://aclanthology.org/2024.eacl-long.16.pdf); [Structured Uncertainty / SAGE-Agent, arXiv 2511.08798](https://arxiv.org/html/2511.08798v1).
2. **Saturación como parada** — se para cuando la siguiente pregunta no cambiaría la decisión (information gain ≈ 0), no en un número. [Active Task Disambiguation, arXiv 2502.04485](https://arxiv.org/pdf/2502.04485).
3. **Exhaustivo ≠ muchas preguntas** — SAGE: +7-39% cobertura *reduciendo* preguntas 1.5-2.7× con cost-model anti-redundancia. El anti-padding evita que "exhaustivo" degenere en "siempre 40".
4. **Epistémico vs aleatorio** — solo se insiste en lo que preguntando se puede resolver (epistémico). Lo irreducible (ni el usuario lo sabe) se marca `[OPEN]`, no se machaca. [EACL 2024](https://aclanthology.org/2024.eacl-long.16.pdf).
5. **Coverage-based + bakeo** — questioning sistemático por aspectos, y las respuestas se escriben en el artefacto (no se evaporan). Patrón [`/speckit.clarify`, github/spec-kit](https://github.com/github/spec-kit).
6. **Marca lo no resuelto** — `[ASSUMPTION:...]`/`[OPEN]`: nada se decide en silencio ("nada al azar"). [freecodecamp](https://www.freecodecamp.org/news/how-to-stop-letting-ai-agents-guess-your-requirements/).
7. **Freno honesto** — degradación de respuestas / fatiga (cualitativo), no tope de rondas. El problema documentado en elicitación es parar pronto.
8. **Boundary** — drillme = interrogación exhaustiva al usuario (1 voz, N preguntas); decision-stress-test = debate multi-agente (N voces, 1 decisión). drillme escala al segundo en su techo.
9. **Valor (motivación)** — clarificar antes de implementar reduce errores e iteraciones de forma medible: [Cursor 2.1 reporta −34% errores y −42% ciclos de ida-y-vuelta](https://www.digitalapplied.com/blog/cursor-2-1-clarifying-questions-plans).

# Open questions

- **[OPEN — Phase 2]** Mecanismo técnico exacto de la "activación fácil": ¿reforzar el hook `skill-activation.ts` (inyección de `Skill(drillme)` por keyword), ampliar `description`, y/o añadir un bloque "invoke drillme" en las skills consumidoras? Decisión de tech-plan.
- **[OPEN — Phase 2]** Cómo expresar el umbral de information gain de forma *generation-executable* (preguntas-ancla / heurística "¿cambiaría la decisión?") sin pedir cálculo numérico.
- **[OPEN]** Medición de éxito: validación conductual en próxima sesión (drillme produce batería real hasta saturación en una decisión ambigua, 0 preguntas en un typo), no grep de presencia.
