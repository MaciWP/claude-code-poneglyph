# Conclusión + plan: activación fiable de skills (DRAFT, pendiente de ratificar)

> Input para un futuro `/flow`. Basado en: research interno `_research-skill-activation-2026-06-09.md` (29 agentes) + research externo 2026-06-23 (99 agentes, 17 fuentes, 19 claims confirmados / 6 refutados) + docs oficiales Anthropic + propuesta del usuario 2026-06-23. NO ejecutado todavía.

## Conclusión clara

1. **La auto-activación NO se puede forzar — confirmado por dos investigaciones independientes + docs oficiales.** No existe ningún knob que obligue a invocar una skill; `disable-model-invocation` hace lo inverso (la saca del pool). Anthropic admite que el modelo infra-dispara y falla en silencio.

2. **El remedio "descripción más fuerte / MUST" para que el Lead no se olvide fue REFUTADO (0-3).** Subir el volumen de la descripción mejora la SELECCIÓN nativa pero NO arregla que el Lead ignore el hint. Son dos problemas distintos.

3. **Hay exactamente dos palancas reales:**
   - **(a) Ingeniería de `description` + campo `when_to_use`** → mejora la SELECCIÓN. WHAT+WHEN, tercera persona, caso de uso primero, ≤1.536 chars combinados. El campo **`when_to_use` es oficial y dedicado** para frases-gatillo y poneglyph NO lo usa hoy. Incluir **términos-gatillo en español** ataca directamente el "frasing español falla".
   - **(b) Cableado determinista** → garantiza la INVOCACIÓN. Atar la invocación a un paso de **command/protocolo** (no a la discreción del modelo). Es `/flow` por-fase. Guía oficial Anthropic: "use hooks to enforce behavior deterministically".

4. **`skill-advisor` (tu "drillme de skills") es la jugada correcta.** El research interno lo recomendó explícitamente como respuesta de controlabilidad (§147-169) y se cortó en el polish 2026-06-11. Recuperarlo revierte un recorte prematuro.

5. **Límite honesto (reconciliación con "forzar vía hook"):** un hook NO puede forzar una llamada a herramienta — solo inyecta contexto. Por tanto "seguridad de que se usen" = **CONSIDERACIÓN garantizada** (shortlist surfaced cada turno + gate de ratificación), no INVOCACIÓN automática garantizada. Lo más cercano a "forzar": el hook inyecta el *shortlist como contenido accionable* (no un simple "Invoke Skill(X)") + `skill-advisor` como gate en fronteras de fase.

6. **Sobre "descripciones super completas, prefiero falsa activación":** correcto para la selección, con UN aviso de evidencia: las descriptions comparten un **presupuesto de listing** (1% de contexto; en overflow se DROPEAN las descriptions de las skills menos usadas). Inflar las 22 puede tirar abajo justo las que menos se usan → backfire. Regla: **pushy pero lean**, y usar `when_to_use` para los gatillos.

## Plan (HUs, para `/flow --standard`) — refinado 2026-06-23 con feedback usuario

**Decisiones ratificadas por el usuario:** recuperar skill-advisor (SÍ); el hook debe surfacing del shortlist **sí o sí** pero barato; `/flow` debe **instar más** al uso de build/critic/etc.

| HU | Qué | Palanca | Riesgo |
|---|---|---|---|
| **HU1** | **Reinstaurar `skill-advisor` como skill propone→ratifica ("drillme de skills")**: lee `.claude/skills/` + `~/.claude/skills/` en disco, rankea shortlist ≤3-5 vs la tarea, presenta vía `AskUserQuestion` qué activar. Multi-pasada. Su PROPIA description directiva + `when_to_use`. Invocada en **fronteras de fase de `/flow` + on-demand** (NO cada turno — la pasada LLM es el coste a evitar). NO re-implementa matching. | (b) determinista | medio |
| **HU2** | **Hook = capa barata siempre-on (sin LLM)**: el hook hace el match él mismo e **inyecta el shortlist con motivos + nombra skill-advisor de forma incondicional**. La consideración la entrega el hook (determinista, ~0 coste); NO fuerza llamada (imposible) pero entrega el valor sin depender de que el Lead invoque. Resolver primero la open-question: ¿dónde aterriza el hint y por qué el Lead lo trata como advisory? Quitar el skip de `/goal` para que también surface ahí. | (b) determinista | medio |
| **HU3** | **`description` + `when_to_use` en las 22 skills**: SEPARAR — `description` concisa (qué + caso clave primero) + campo oficial **`when_to_use`** con frases-gatillo **ES+EN**. Pushy pero LEAN (1.536 combinado + presupuesto; `/doctor`; `skillOverrides: name-only` para low-priority si hace falta liberar budget). Sesgo a falso-positivo (preferencia usuario), medido contra overflow. | (a) selección | bajo |
| **HU4** | **`/flow` insta más a build/critic/etc.**: auditar que cada fase INVOCA de verdad su skill (no que el Lead la salte); instrucción de invocación más directiva en `flow.md` + en `orchestrator-protocol` (el cableado por-fase ya existe, reforzarlo). Este es el lever determinista que el usuario pidió reforzar. | (b) determinista | bajo |
| **HU5 (opc.)** | **Backstop Stop-hook "¿skills consideradas?"**: evento Stop (fiable) inyecta reconsideración si un turno de trabajo cerró sin considerar una skill relevante. Evaluar tras HU1-4. | (b) determinista | alto |
| **Verif.** | Harness `.claude/evals/`: MEDIR activación antes/después sobre prompts ES+EN (medir, no estimar). | — | — |

## Hecho verificado clave (mis ojos en la doc, 2026-06-23)
`when_to_use` es campo **oficial** (frontmatter table de code.claude.com/docs/en/skills): "Additional context for when Claude should invoke the skill, such as trigger phrases or example requests. Appended to `description`… counts toward the 1,536-char cap." `description` = "what the skill does and when to use it… put key use case first". `disable-model-invocation:true` = inverso (saca del pool auto). Verificar `when_to_use` en la versión CC instalada al construir HU3.

## Open questions a resolver en build (del research externo)
1. ¿El hint inyectado llega al Lead en forma accionable o como advisory? (verificación mecánica — explica por qué el Lead lo ignora).
2. ¿Hay forma oficial de que un hook invoque DIRECTAMENTE una skill vs solo hint? (evidencia actual: NO).
3. ¿`disable-model-invocation` + cableado `/command` explícito da MÁS fiabilidad que dejar auto-invocación on (reduce mis-selección al achicar el pool)?
4. Tasa de activación ES antes/después de añadir gatillos en español.

## Vehículo
Correr este plan por `/flow --standard` — que ES el mecanismo determinista de cableado skill→fase (dogfooding).
