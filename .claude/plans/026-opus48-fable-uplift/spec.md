---
id: 026-opus48-fable-uplift
created: 2026-07-07
approved: 2026-07-07
mode: full
phase: 1
status: closed
---

# Problema

Mañana se retira Fable 5 y el copiloto vuelve a Opus 4.8 / Sonnet 5: la doctrina poneglyph pierde el modelo que ejecutaba nativamente disciplinas que hoy nadie tiene escritas (auto-refutación antes de reportar, reproducción en vivo antes de afirmar, degradación honesta de findings, verificación planificada junto al trabajo). Sin capturarlas HOY —mientras Fable puede introspeccionarlas con evidencia de sus propias sesiones— esa pérdida conductual es irreversible.

# Resultado esperado

- Un **set de instrucciones híbrido** cargado en la capa global: núcleo compacto always-loaded (~15-25 líneas) + referencia profunda on-demand con el catálogo completo de patrones Fable y anti-fallos de Opus.
- La **config del harness ajustada** a la era post-Fable: effort por tipo de tarea (xhigh en Opus 4.8 para review/decisión), thinking, `fallbackModel` actualizado, guía de `/model` Opus 4.8 vs Sonnet 5 (1M contexto) según tarea.
- La **doctrina existente sin referencias rotas a Fable**: CLAUDE.md/output-style/skills revisados donde asuman capacidades o nombres del modelo saliente.
- Cobertura **dual Opus 4.8 + Sonnet 5** (el nuevo default), no solo Opus.

# Success criteria (medibles, Given/When/Then)

- **AC1**: Given el núcleo híbrido escrito, when se ejecuta `bun .claude/evals/run.ts` (suite offline, 19 golden cases + graders), then 0 regresiones frente al baseline actual.
- **AC2**: Given una sesión nueva post-retirada con Opus 4.8, when se inspecciona `instructions-loaded.log`, then el núcleo always-loaded aparece cargado (prueba mecánica de capa — memoria `verify-load-layer`).
- **AC3**: Given el set completo, when se lee la referencia profunda, then cada patrón destilado cita evidencia concreta (sesión/auditoría/ejemplo real de Fable), no genérica — verificable por lectura humana en gate.
- **AC4**: Given la config del harness propuesta, when se aplica a `settings.json`, then `bun test ./.claude/...` sigue verde y los cambios a settings se declaran `sensitive:` en build.
- **AC5** (diferido, honesto): Given la primera sesión real con Opus 4.8 + set cargado, when Oriol evalúa el comportamiento, then ratifica o refina en retro — la validación conductual NO se banquea hoy (memoria `behavioral-ac-next-session`).

# Out of scope (explícito)

- **Replicar la capacidad bruta de Fable 5** — un prompt no devuelve inteligencia; el objetivo es disciplina, no milagro. El set lo dirá explícitamente para calibrar expectativas.
- Reescritura general de CLAUDE.md/output-style — solo el delta necesario (referencias a Fable/capacidades).
- Cambios en las capas `.claude/` de otros repos (binora/cv) — heredan por la capa global.
- Modelos no-Anthropic y escenarios API directa fuera de Claude Code.
- El backlog P2 de la auditoría v2 (security-review rename, sync-trap, etc.) — features aparte.

# Constraints

- **Temporal**: Fable se retira mañana — Fase 3 (build) debe completarse HOY en esta sesión; la introspección del modelo es el insumo clave y caduca.
- **Coste de capa**: el núcleo always-loaded ≤ ~25 líneas (lección 25× de memoria `always-loaded-vs-ondemand-cost`); todo lo demás on-demand.
- **Compatibilidad**: suites `bun test` verdes; evals sin regresión; convención es-ES para superficies de activación, inglés para cuerpos.
- **Frugalidad**: sin agentes salvo necesidad extrema (directiva vigente del usuario).

# Stakeholders

- **Oriol** — sufre la degradación en todos los proyectos; decide gates y ratifica el set.
- **El Lead post-Fable (Opus 4.8/Sonnet 5)** — consumidor del artefacto; su comportamiento es la métrica.

# Voces externas (modo full — inline, sin agentes; adaptación declarada por frugalidad)

- **Outsider**: "¿No es esto un prompt de 'pórtate bien' más? ¿Por qué funcionaría?" → El framing se sostiene solo si cada instrucción es un delta OBSERVADO (Fable lo hace / Opus no lo hacía) con evidencia, no aspiracional; y si las palancas de harness (effort/thinking) acompañan, porque son mecánicas, no de fe. Riesgo real señalado: instrucciones que Opus ya cumple = ruido siempre cargado. Mitigación: filtro "solo deltas" en AC3.
- **Product**: valor alto y ventana única (la introspección caduca mañana); coste acotado (1 rule + 1 referencia + settings). Lo que NO se construye por esto: nada — es pequeño. Encaja con el goal permanente del repo ("aprovechar Claude Code + modelos Anthropic al máximo").
- **User (Lead futuro)**: el núcleo debe ser ejecutable en generación (ejemplos/anchors, no umbrales que exigen contar — memoria `rules-must-be-generation-executable`); la referencia profunda debe ser localizable (cablear desde el núcleo y desde skill-activation keywords).

# Open questions

- Ninguna abierta tras el cuestionario + drillme (0 preguntas adicionales en saturación). La única incógnita real —cómo se comporta Opus 4.8 con el set— es empírica y está capturada como AC5 diferido.
