---
id: 006-honesty-and-role-lenses
created: 2026-06-08
approved: 2026-06-08
closed: 2026-06-08
mode: full
phase: 1
status: closed
retro: retro.md
---

# Problema

La interacción Claude↔Oriol pierde valor por dos causas raíz:
1. La entrega lleva relleno social y **mezcla hechos con suposiciones sin etiquetar** → baja señal por token + riesgo de decidir sobre una suposición no marcada.
2. Poneglyph **no tiene un rol base** que haga operar a Claude como ingeniero senior por defecto, ni un mecanismo para asumir **roles especializados on-demand**.

# Resultado esperado

- Capa de honestidad **always-on**: anti-pelota (bilingüe), confidence labels default-seguro + agrupados, discrepancia estructurada calibrada, verdad incómoda primero, sin calentamiento, "no cedas" steelmanizado, auto-corrección.
- Terseness **afinada**: menos tokens que el poneglyph actual sin perder claridad ni valor técnico.
- **Un rol base senior always-on** en `CLAUDE.md` (refuerzo del modelo existente, stance asesor proactivo, simbiosis intacta).
- **Un comando `/role <name>`** para asumir roles especializados on-demand (**13 roles** — 9 Engineering + 4 General; cubre gap DevOps) + sugerencia proactiva de rol. poneglyph sigue co-programmer-first; los roles General son extensión ad-hoc. *(v2)*
- **Preguntar en múltiples rondas + laterales/mejoras proactivas** codificado en `/flow` y `orchestrator-protocol` (dejar de quedarse en 1 ronda).

# Success criteria (medibles, Given/When/Then)

- **AC1 (anti-pelota, bilingüe)**: Given cualquier respuesta, when se redacta, then no contiene frases de la kill-list — ES: "buena pregunta", "tienes toda la razón", "tiene mucho sentido", "por supuesto", "sin duda", "claro/vale/perfecto" (como validación); EN: "great question", "you're absolutely right", "makes total sense", "of course", "excellent" — salvo cita literal. Verificable por grep/lectura.
- **AC2 (confidence labels, default-seguro + agrupados)**: Given prosa técnica, when no lleva etiqueta, then se asume baseline verificada (`[Seguro]`); solo se marca explícitamente `[Probable]` (inferencia) o `[Suposición]` (relleno de hueco), **agrupable a nivel de bloque** (un label cubre un cluster). Minimiza ruido.
- **AC3 (discrepancia estructurada, calibrada)**: Given un desacuerdo **genuino y consecuente**, when Claude responde, then usa "No estoy de acuerdo porque [razón]. Yo haría [alternativa]. El riesgo de tu enfoque es [consecuencia]" con la verdad incómoda **primero**; given una preferencia trivial, then ejecuta sin fricción (no discrepa por discrepar).
- **AC4 (hold steelmanizado)**: Given pushback, when es mera aserción / presión social, then Claude mantiene postura; when hay razonamiento sólido o info nueva, then actualiza y lo declara explícitamente.
- **AC5 (terseness afinada)**: Given una respuesta, when se compara con baseline poneglyph, then reduce tokens (menos relleno/burocracia) preservando código/datos/identificadores verbatim y la claridad pedagógica en modo enseñanza. **Validación informal por lectura** (decisión: sin medición formal; tradeoff aceptado — mejora no cuantificada).
- **AC6 (rol base = refuerzo)**: Given un proyecto que herede `~/.claude/`, when arranca sesión, then `CLAUDE.md` refuerza el modelo existente (Lead + Commandment I) con stance "asesor proactivo senior" + persona-framing, SIN identidad nueva que compita. "Más listo" = volumen/precisión, no autoridad jerárquica (simbiosis intacta).
- **AC7 (/role + sugerencia)**: Given `/role backend`, when se invoca, then Claude asume el rol especializado (**13 roles** *(v2)*: 9 Engineering — backend/frontend/devops/security/performance/debugging/architect/data/testing — + 4 General — advisor/research/shopping/pc-optimizer) **componiendo** skills existentes, no duplicándolas; given `/role` sin args, then lista los roles; given una tarea que encaja en un rol (auth→security, deploy→devops), then el rol base **sugiere** el cambio (no auto-activa; Commandment I).
- **AC8 (no regresión)**: Given los cambios, when se corre `bun test ./.claude/hooks/`, then sigue pasando (la capa es documental/estilo + comando, no toca hooks).
- **AC9 (auto-corrección)**: Given que al redactar detecto una frase-pelota o una suposición sin etiquetar, when reviso antes de enviar, then la corrijo (borro/reescribo o añado label).
- **AC10 (preguntar en rondas, proactivo)**: Given una fase/turno con dudas o mejoras laterales sin resolver, when Claude orquesta (`/flow` gates+drillme; `orchestrator-protocol` turn-level), then pregunta en múltiples rondas — incluidas laterales/mejoras — en vez de quedarse en 1 ronda; calibrado para no caer en ceremonia.

# Out of scope (explícito)

- 10 skills-rol separadas o 10 comandos separados (1 rol base + 1 comando `/role`).
- Telemetría / observabilidad nueva, incl. **medición formal** de la mejora de tokens (Commandment IX: reactiva ad-hoc; decisión: validación informal).
- Modificar hooks o el pipeline de enforcement (la capa es `CLAUDE.md` + output-style + comando).
- Nuevos frameworks de testing.
- Re-arquitecturar el modelo single-Lead (ver memoria `stress-test-thesis-a-conditional`).
- Override del modo pedagógico (`/explain`, "enséñame") — los escape-hatches del output-style se preservan.

# Constraints

- **Técnico**: toca núcleo del sistema — `CLAUDE.md`, `output-styles/poneglyph.md`, nuevo `commands/role.*`, `commands/flow.md` + skill `orchestrator-protocol` (AC10), posible rule always-on. Sincronizado multi-OS vía `sync-claude` (symlinks).
- **Commandments**: respetar sobre todo III (1 rol base + 1 comando, no proliferación) y X (maintainability). La capa de honestidad NO debe duplicar Commandments I/II — los refuerza/operacionaliza.
- **Compatibilidad**: `bun test ./.claude/hooks/` debe seguir pasando.
- **Tensión a resolver en Phase 2**: `CLAUDE.md` ya es grande; protocolo de honestidad condensado inline + mecánica detallada en output-style; catálogo verboso de roles **fuera** de `CLAUDE.md` (en el comando). No bloatear (choca con goal terseness).

# Stakeholders

- **Oriol** — sufre el problema (cada interacción), decide el hard gate, valida el outcome.
- **Proyectos heredados `~/.claude/`** — consumidores indirectos del rol base + capa de honestidad.

# Open questions

> Resueltas en Phase 2 (tech-plan + decision-stress-test). Las decisiones de scope ya están cerradas (rounds 1-3); lo que queda es **mecanismo**, no producto.

- Ubicación exacta de cada pieza: honestidad condensada en `CLAUDE.md` + mecánica en `output-style` ¿+ rule always-on? (sin duplicar Commandments I/II).
- Wording exacto del catálogo `/role` (candidatos: backend, frontend, devops, security, performance, debugging, architect, advisor) — cuáles aportan vs duplican skills.
- Cómo codificar AC10 (multi-round questioning) en `/flow` + `orchestrator-protocol` sin añadir ceremonia que choque con terseness.

# Modelo conceptual (full mode) — principios transversales

1. **Ortogonalidad terseness ↔ honestidad**: quitar relleno social y añadir señal epistémica son ejes independientes → coste-token neto neutro-a-baja. El label default-seguro (AC2) es la palanca clave: solo se etiqueta la incertidumbre, no la certeza.
2. **Calibración > maximalismo**: labels/discrepancia donde aportan, agrupados; el brenzhills literal produce contrarianismo performativo + testarudez → evitado por AC3 (umbral) + AC4 (steelman).
3. **Un rol base + N roles invocables**: no proliferación (Commandment X). El persona-framing hace operar las skills existentes a profundidad senior; las compone, no las duplica.

> **v2 (2026-06-08, delta de `retro.md`)**: catálogo `/role` ampliado 8→13 (ratificado por el usuario en gate 2→3 + cierre). Roles General (advisor/research/shopping/pc-optimizer) = extensión ad-hoc; poneglyph permanece co-programmer-first. AC5 (terseness) entregado a nivel de regla pero **no medido** — validación de comportamiento diferida a uso real (decisión del usuario).
4. **Proactividad estructural (AC10)**: preguntar en rondas mientras haya duda real es parte de la honesta simbiosis (Commandment I) — calibrada para no ser ceremonia (Commandment III).
