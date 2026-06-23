---
id: 023-skill-activation
created: 2026-06-23
approved: 2026-06-23
mode: standard
phase: 1
status: closed
---

# Problema

La sesión principal (el Lead) no usa las skills de forma fiable: la auto-activación nativa de Claude Code infra-dispara por diseño, no se puede forzar, y falla en silencio. El hint inyectado por el hook se ignora; las keywords en español/frasing novedoso fallan el match. Resultado: la inversión en skills se vuelve parcialmente teatro porque no se invocan cuando aplican.

# Resultado esperado

- Toda tarea no trivial recibe una **consideración determinista y barata** de qué skills aplican (entregada por el hook, no dependiente de que el Lead recuerde invocar).
- Las descripciones de skills disparan mejor la SELECCIÓN nativa, incluyendo prompts en español (sesgo deliberado a falso-positivo sobre no-activación).
- Las skills de fase (`build`/`critic`/etc.) se invocan de verdad dentro de `/flow`, no se saltan.
- Existe un par propone→ratifica (`skill-advisor`) como backstop al undertrigger en fronteras de fase.

# Success criteria (medibles, Given/When/Then)

- **AC1**: Given un prompt de trabajo no trivial (ES o EN), when el hook `skill-activation` corre, then inyecta un shortlist de skills candidatas con motivo + nombra `skill-advisor`, de forma determinista y sin coste LLM (script puro). Medible: ejecutar el hook con N prompts fixture y comprobar inyección no vacía donde aplica.
- **AC2**: Given el harness `.claude/evals/` con un set de prompts ES+EN, when se mide la tasa de activación/consideración antes vs después del cambio, then la tasa después es ≥ la de antes (medir, no estimar; baseline registrado).
- **AC3**: Given `skill-advisor` reinstaurada, when se invoca, then lee las skills de `.claude/skills/` + `~/.claude/skills/`, rankea un shortlist ≤5 vs la tarea y presenta vía `AskUserQuestion` cuáles activar (propone→ratifica), sin re-implementar matching propio.
- **AC4**: Given todas las skills (~24), when se revisa su frontmatter, then cada una tiene `description` concisa (caso de uso primero) + campo oficial `when_to_use` con gatillos ES+EN, respetando el cap combinado 1.536 chars y sin overflow de presupuesto (verificado por check de budget determinista `.claude/evals/skill-activation-rate.ts`; `/doctor` interactivo como confirmación manual opcional).
- **AC5**: Given `/flow` y `orchestrator-protocol`, when una fase se ejecuta, then la instrucción de invocar su skill de fase es explícita/directiva (refuerzo verificable por lectura del diff en `flow.md` + `orchestrator-protocol`).
- **AC6**: Given el cambio completo, when se corre `bun test ./.claude/hooks/`, then verde (sin regresión).

# Out of scope (explícito)

- **HU5 backstop Stop-hook "¿skills consideradas?"** — opcional; evaluar tras MVP, no entra en este ciclo salvo que el ROI se demuestre.
- Forzar la invocación automática de una skill (imposible por diseño — confirmado por dos investigaciones + docs oficiales). No se intenta.
- Reescritura de la lógica/cuerpo de las skills (solo frontmatter `description`/`when_to_use`).
- Mecanismo cross-lingüe automático (se ataca añadiendo gatillos ES explícitos, no con un matcher multilingüe).

# Constraints

- **Técnico**: Bun + TypeScript para el hook; el hook debe ser barato (sin LLM, lectura de heads de SKILL.md como hoy).
- **Presupuesto de listing**: `description`+`when_to_use` ≤1.536 chars combinados por skill; vigilar el presupuesto global (1% contexto) para no dropear las menos usadas — pushy pero lean.
- **Compatibilidad**: `bun test ./.claude/hooks/` debe seguir verde.
- **Verificación version-sensitive**: confirmar que `when_to_use` funciona en la versión de Claude Code instalada antes de aplicarlo a las 22 skills.

# Stakeholders

- **Oriol** — sufre el problema (skills no se usan), decide el gate, valida el outcome.
- **El Lead (Claude)** — consumidor del shortlist; su comportamiento es el que se quiere cambiar.

# Open questions

- ¿Dónde aterriza exactamente el hint inyectado y por qué el Lead lo trata como advisory? (verificación mecánica en build HU2 — explica el fallo raíz).
- ¿`disable-model-invocation:true` + cableado `/command` explícito da MÁS fiabilidad al reducir el pool de mis-selección? (a explorar en tech-plan, no bloqueante).

# Modelo conceptual / Detalle técnico

Dos palancas verificadas, complementarias:
- **(a) Selección** — ingeniería de `description` + `when_to_use` (mejora qué skill elige el modelo nativamente). Coste cero, no garantiza.
- **(b) Invocación determinista** — atar la invocación a un paso de command/protocolo (`/flow` por fase) + el hook barato siempre-on que entrega la consideración. Es lo único que da garantía.

"Seguridad de que se usen" = **consideración garantizada y barata** (hook) + **ratify gate** (skill-advisor) + **invocación cableada por fase** (/flow). NO = auto-invocación forzada (imposible).

Evidencia: `_research-skill-activation-2026-06-09.md` (29 agentes) + research externo 99-agentes 2026-06-23 + docs oficiales Anthropic (`when_to_use`, `disable-model-invocation`, cap 1.536 verificados con WebFetch 2026-06-23).

> Cuestionario reducido por brief detallado: el problema, outcomes, MVP y out-of-scope se co-redactaron con el usuario a lo largo de la conversación (que ES el drillme) + draft `_draft-skill-activation-fix-2026-06-23.md`. Drillme adicional: 0 preguntas nuevas — sin gaps que cambien la decisión.
