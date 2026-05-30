---
id: 003-html-report-skill
created: 2026-05-29
mode: full
phase: 5
status: closed
scope_mode: light
wave: A
parent_audit: 002-claude-config-deep-audit
build_method: dynamic-workflow
---

# Scope ligero (research/build-feature)

Aplico la lección del retro 002: build-features arrancan con scope LIGERO — problema + resultado + AC concretos, sin cuestionario de 8 preguntas. El usuario ya expresó el qué/por qué en la conversación previa. Si emergen dudas reales en Phase 2, se reabren.

# Problema

Poneglyph produce TODO en markdown (reports, retros, audits, scoring). Markdown es denso y poco visual — malo para **presentar resultados** o **revisar de un vistazo**. No existe forma estándar y reutilizable de generar output HTML de calidad: la skill `decide` tiene 1 template aislado (`memo.html`) solo para memos de decisión, no generalizable a otros tipos de resultado. El usuario usa HTML mucho para presentaciones/resultados y no tiene una herramienta que lo genere con componentes y CSS consistentes.

# Resultado esperado

- Skill nueva (`html-report` o similar) que genera **HTML self-contained de calidad** desde cualquier resultado/reporte de poneglyph.
- **Librería de componentes reutilizables** (cards, tablas comparativas, badges de score, timelines, barras, callouts) + **design tokens** (colores, tipografía, espaciado) → output coherente y "no genérico de IA".
- **Plantillas por tipo**: informe (audit/review), presentación, dashboard de estado, memo. Mínimo 2-3 en el MVP.
- Se apoya en la skill builtin **`frontend-design`** como base de calidad visual (no reinventar diseño).
- Self-contained (CSS inline, sin dependencias externas) + soporte dark/light (patrón heredado de `decide/memo.html`).

# Success criteria (medibles, Given/When/Then)

- **AC1 — Skill registrada**: Given la skill creada, when el harness la lista, then aparece con frontmatter válido (`name` + `description` con "Keywords -") y se invoca como `/<name>` o auto-match. Verificable en system-reminder.
- **AC2 — Genera HTML self-contained**: Given un input (markdown/datos de un report), when se invoca la skill, then produce 1 archivo `.html` autocontenido (CSS inline, 0 dependencias externas) que abre en cualquier navegador offline.
- **AC3 — Componentes + tokens reutilizables**: Given el output, when se inspecciona, then usa una librería de componentes definida (≥5 componentes) y design tokens centralizados (no CSS ad-hoc disperso). Re-skinneable cambiando solo los tokens.
- **AC4 — ≥2 plantillas**: Given los tipos de resultado de poneglyph, when la skill se usa, then soporta ≥2 plantillas distintas (mínimo: informe + dashboard/presentación) con layouts diferenciados.
- **AC5 — Apoyo en frontend-design**: Given la skill, when genera HTML, then referencia/invoca `frontend-design` builtin para el criterio de diseño (no reinventa estética). Documentado en SKILL.md.
- **AC6 — Calidad no-genérica**: Given el HTML generado, when se ve, then NO tiene el "look genérico de IA" (degradados morados por defecto, fuentes sistema sin jerarquía). Evidencia: render real revisado en Phase 4.
- **AC7 — Dogfood**: Given este propio audit (002 report.md), when se pasa por la skill, then genera una versión HTML presentable del report como smoke test real (no sintético).

# Out of scope (explícito)

- **Olas B y C** (governance/evidencia + integración nativa) — features separadas, después.
- **Las otras mejoras del audit** (workflows-integration, skill-creator evals, deep-research adoption, etc.) — Ola C.
- **Servidor / hosting / interactividad JS compleja** — HTML estático self-contained, no web app. Gráficos = CSS/SVG inline, no librerías JS pesadas.
- **Reemplazar markdown** — el HTML es una capa de presentación ADICIONAL, los artefactos siguen en markdown.
- **Migrar `decide` a la nueva skill** — `decide` sigue con su memo.html; evaluar consolidación en una retro futura, no ahora.

# Constraints

- **Técnico**: skill markdown + templates HTML + posible helper. Stack: HTML/CSS self-contained, SVG inline para gráficos. Sin frameworks JS (React/Vue) — over-engineering para el caso.
- **Reutiliza**: patrón de `decide/templates/memo.html` (self-contained, dark/light) como precedente verificado.
- **Builtin**: `frontend-design` como base de calidad (Commandment III — no reinventar).
- **Compatibilidad**: `bun test ./.claude/hooks/` sigue pasando (skill no toca hooks).
- **Build method**: dynamic workflow (Workflow tool) — primer dogfood. Si el workflow falla o no aporta, fallback a build secuencial.

# Stakeholders

- **Oriol** — único consumidor; usa HTML mucho para presentaciones/resultados; aprueba gates; define qué plantillas prioriza.

# Open questions (a resolver en Phase 2 si es necesario)

- **OQ1**: ¿Nombre de la skill? Propuesta: `html-report`. Alternativas: `visualize`, `present`, `html-render`. Decidir en tech-plan.
- **OQ2**: ¿Plantillas exactas del MVP? Propuesta: informe + dashboard. ¿Añadir presentación (slides) o memo desde el inicio?
- **OQ3**: ¿La skill consume markdown existente (parsea report.md) o recibe datos estructurados? Probable: ambos — parsea markdown Y acepta datos. Decidir en tech-plan.
- **OQ4**: ¿`frontend-design` se invoca en runtime (cada generación) o se usa una vez para fijar los tokens/componentes y luego son estáticos? Probable: una vez para diseñar la librería, luego estática (más barato). Decidir en tech-plan.

# Nota sobre el método de build (dynamic workflow)

Esta feature estrena el Workflow tool (gap G1 del audit). La construcción del skill HTML tiene paralelismo natural: design tokens, cada componente, cada plantilla, el SKILL.md → construibles en paralelo. Phase 3 lanzará un dynamic workflow con fan-out. Es dogfood doble: `/flow` (governance) + dynamic workflows (motor). Si el workflow no aporta sobre build secuencial, se documenta en retro como lección.
