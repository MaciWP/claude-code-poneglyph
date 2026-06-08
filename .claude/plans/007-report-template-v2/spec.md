---
id: 007-report-template-v2
created: 2026-06-03
approved:
mode: standard
phase: 1
status: closed
closed: 2026-06-03
---

# Problema

La plantilla `html-report` actual solo renderiza outputs internos de Claude Code en dos layouts (report editorial / dashboard), **sin diagramas ni gráficos**, con un charter (004) que **excluye explícitamente la toma de decisiones**, y sin un estándar de "se lee de un vistazo" ni de calidad **cliente-ready sin retoques**. No cubre lo que Oriol necesita: un documento escaneable, con diagramas, válido tanto para reportes de desarrollo como para decisiones (dev y no-dev), presentable a un cliente nada más generarlo.

# Resultado esperado

- Un documento que se **entiende de un vistazo**: jerarquía, densidad y escaneabilidad — no muros de texto.
- Capacidad de **representar diagramas** (flujos, comparativas) y **gráficos de datos** dentro del documento.
- La misma capa visual sirve para **reportes de desarrollo** Y **documentos de decisión** (incluido no-dev: comparar productos/opciones — monitor, PC, zapatos…).
- Calidad **cliente-ready**: el output se enseña a un cliente/compañero **sin retoque manual**.
- *(v2 — delta from retro 007, ratificado 2026-06-03)* Galería de componentes shadcn + interactividad (tabs/tooltips/command) como **evolución incremental**. Deliverable inicial = showcase (`smoke-components-shadcn.html`); horneado a `components.html` + cableado en glance/decision = evolución futura.

# Success criteria (medibles, Given/When/Then)

- **AC1 (vistazo)**: Given un informe generado, when un lector lo abre, then la acción/conclusión principal y la distribución se captan sin scroll (above-the-fold), con la acción inmediata destacada arriba.
- **AC2 (diagramas)**: Given un contenido con un diagrama de flujo o una comparativa, when se genera el documento, then el diagrama aparece embebido y el documento se mantiene **self-contained por defecto** (sin dependencia de red para ver su contenido esencial).
- **AC3 (decisión no-dev)**: Given una decisión de elección (p.ej. monitor), when se pide el documento, then produce comparativa de opciones + criterios ponderados + recomendación, legible de un vistazo.
- **AC4 (cliente-ready)**: Given un output recién generado, when se inspecciona contra el corpus de taste (pre-flight + anti-slop de 004), then pasa el gate **sin retoque manual** (0 fallos de checklist).
- **AC5 (no-regresión)**: Given los layouts/skills actuales, when se evoluciona la plantilla, then `html-report` sigue renderizando report/retro/review y `bun test ./.claude/hooks/` sigue verde.

# Out of scope (explícito)

- Generación de UI / landing pages arbitrarias de usuario (sigue siendo territorio `frontend-design` / impeccable).
- App interactiva / SPA: el documento es un **snapshot estático** (micro-interacción ligera opcional, no aplicación con estado).
- Datos en vivo / auto-refresh: el documento es un render puntual.
- Reescribir el skill `decide` (su lógica de 3 perspectivas se mantiene; aquí solo se decide la **relación de plantillas** — ver Open Questions).

# Constraints

- **Self-contained por defecto** (decisión de producto "híbrido", aprobada 2026-06-03): el documento se abre y se envía sin dependencia de red para su contenido esencial; interactividad o ejecución en cliente solo cuando un diagrama complejo lo exija, declarado. *(La elección de la herramienta concreta de diagramas es Phase 2.)*
- **Reusar** el corpus de taste de 004 (`taste-hard-rules` + `anti-slop` + `pre-flight` + `critique`) y el **estilo dashboard dark aprobado** (plan 006 `report-glance-v2.html`) — no reinventar estética.
- No-regresión: `bun test ./.claude/hooks/` verde; layouts actuales no se rompen.
- Mantenibilidad (Cmd X): **no duplicar doctrina** entre `html-report` y `decide`.

# Stakeholders

- **Oriol** — único consumidor; usa los documentos para reportes de desarrollo y para decisiones (personales y de cara a cliente); aprueba los gates; decide las Open Questions.

# Open questions

> A cerrar antes de / durante el hard gate 1→2 (o diferir explícitamente a Phase 2).

- **OQ1 (relación con `decide`)**: ¿`html-report` absorbe el caso "decisión", `decide` **reusa** las plantillas de `html-report`, o se **unifican** en un sistema de plantillas compartido? Hoy `decide` ya emite su propio memo HTML → riesgo de doctrina duplicada (Cmd X). *Sesgo: reuso/unificación antes que duplicar.*
- **OQ2 (alcance dual-purpose)**: ¿se añade un layout **"comparison/decision"** (opciones + scoring ponderado + recomendación) además de report/dashboard, o se **generaliza el dashboard** para cubrirlo?
- **OQ3 (charter)**: confirmar la ampliación del charter de 004 ("no decisiones arbitrarias") — ¿hasta dónde llega el "no-dev"? ¿cualquier decisión personal o un subconjunto acotado?

> **Cuestionario reducido por brief detallado + petición scope-light**: la visión, los 4 outcomes y la decisión de gráficos (híbrido) ya los dio el usuario en sesión (memoria `html-report-template-vision`). El drillme de Phase 1 se concentra en las 3 Open Questions, no en re-derivar el qué/por qué.
