---
id: 004-report-visual-taste
created: 2026-05-29
mode: standard
phase: 5
status: closed
scope_mode: light
depends_on: 003-html-report-skill (html-report skill must exist — it does; close 003 in parallel)
research: .claude/plans/_research-skill-evolution-2026-05-29.md (Part B)
---

# Scope ligero

Lección retro-002: el usuario ya expresó qué/por qué a lo largo de esta sesión + 14 agentes de research. Spec = problema + resultado + AC concretos, sin cuestionario de 8 preguntas. Seeded del dossier (Part B). Reabrir en Phase 2 si emergen dudas reales.

# Problema

`html-report` (plan 003) ya dota a Claude Code de una capa visual: convierte sus outputs (report/retro/review/audit) en HTML self-contained. Faltan dos cosas para que esa capa sea de calidad **consistente** y no improvisada:

1. **Corpus de "taste" verificado por expertos** que eleve la calidad más allá de la doctrina actual de html-report (no-purple, deep teal, serif) a **reglas duras accionables** (spacing / type / color / depth / motion + WCAG). Hoy la calidad depende de improvisación por generación.
2. **Modo CRÍTICA / audit**: dado un HTML/CSS (o un render de html-report), detectar "AI-slop tells" y violaciones de reglas duras. Capacidad que **ni html-report ni el builtin `frontend-design` tienen** (ambos son generativos, sin modo revisión).

**Charter (límite duro)**: capa visual para los **propios outputs de Claude Code** (informes/resultados). **NO** es un generador de UI/landing pages arbitrarias de usuario (eso es `frontend-design` / `impeccable`). De los repos estudiados tomamos sus **principios de taste** + el **modo crítica** que les falta; **no** su alcance de generación de UI general.

# Resultado esperado

- Corpus de taste verificado (Refactoring UI, Rauno Freiberg, Josh Comeau, Emil Kowalski, MD3, WCAG) como reglas duras encodables, consumible por `html-report` (y potencialmente `decide/memo` + futuras superficies).
- Sección **Absolute Bans** + catálogo **AI-slop tells** (negative vocabulary — palanca #1 según los 3 repos estudiados).
- **Modo crítica/audit**: señala violaciones de reglas duras + tells genéricos, con severidad y referencia a la regla.
- **Pre-flight checklist** como gate de calidad ("si algún ítem falla, no está listo").
- SKILL.md(s) <500 líneas; detalle en `references/` (finding A7: presupuesto 25K post-compaction).

# THE scope question (decisión humana — Phase 2)

¿**Skill `design-taste` separada** (reutilizable por html-report + decide + futuras) **VS enriquecer `html-report` in-place** (taste corpus como `html-report/references/` + modo crítica)?

- **Bias Cmd III** (lo más simple): `references/` en html-report + modo crítica, **salvo** que la reutilización fuera de html-report lo justifique (decide/memo ya comparte familia visual; superficies futuras).
- **Guard Cmd X**: NO duplicar la doctrina ya en html-report ni el builtin frontend-design — **AÑADIR** (reglas duras + crítica), no reformular.

# Success criteria (Given/When/Then)

- **AC1 — Taste corpus encodado**: Given las reglas de las autoridades del dossier, when se escribe el corpus, then existe ≥1 reference con reglas duras de spacing/type/color/depth/motion + WCAG (4.5:1 texto / 3:1 large+UI), cada una con su fuente. No reformula la doctrina existente de html-report.
- **AC2 — Absolute Bans + slop catalog**: Given el output, when se inspecciona, then incluye lista de bans incondicionales + catálogo de AI-slop tells (Inter, purple→blue, cards-in-cards, centered-all, em-dashes, bounce easing, icon-tile-above-heading, untinted greys, gray-text-on-color...).
- **AC3 — Modo crítica**: Given un HTML/CSS de ejemplo con tells, when se ejecuta el modo crítica, then reporta violaciones con severidad cubriendo ≥ typography/color/layout/motion/a11y, citando la regla violada.
- **AC4 — Pre-flight gate**: Given el corpus, when se cierra una generación, then hay un checklist (~15-25 ítems) accionable como gate.
- **AC5 — Integración html-report**: Given html-report, when genera, then consume el corpus (no improvisación). Documentado en SKILL.md.
- **AC6 — Tamaño**: Given el/los SKILL.md, when se mide, then <500 líneas cada uno; detalle en `references/`.
- **AC7 — Tests verdes**: `bun test ./.claude/hooks/` sigue pasando (no toca hooks).
- **AC8 — No duplicación (Cmd X)**: Given frontend-design + html-report, when se revisa el corpus, then no reformula su contenido; lo extiende. Verificable en Phase 4 critic.

# Out of scope (explícito)

- Generación de UI/landing pages arbitrarias de usuario (territorio frontend-design / impeccable).
- Cerrar plan 003 (verify + critic + retro) — bookkeeping paralelo, prerequisito blando (html-report ya existe), no esta feature.
- Skill-activation overhaul — feature **005**, fast-follow separada.
- Vendorizar impeccable/taste-skill — tomamos principios, no instalamos (security note del dossier).
- Componentes JS / interactividad — html-report sigue estático self-contained.

# Constraints

- **Stack**: skill markdown + `references/` (+ posible helper de crítica). Sin frameworks.
- **Reutiliza**: dossier Part B; `tokens.css` sacred de html-report (no tocar).
- **Builtin**: `frontend-design` = base; este corpus la complementa (crítica + reglas duras), no la reemplaza.
- **Security**: cualquier patrón adoptado de repos terceros = leído a mano antes (no install — checklist del dossier).
- **Compat**: `bun test ./.claude/hooks/` verde.

# Stakeholders

- **Oriol** — único consumidor; usa HTML para presentar resultados; aprueba gates; decide THE scope question.

# Open questions (Phase 2)

- **OQ1 (THE question)**: skill separada vs enhance html-report (ver sección dedicada arriba).
- **OQ2**: ¿adoptar dials (taste-skill) / register brand-product (impeccable) / named verbs (`polish`/`quieter`) — o solo bans + reglas duras + crítica (más simple, bias Cmd III)?
- **OQ3**: modo crítica = comando propio (`/critique`) o parte de html-report.
- **OQ4**: ¿el corpus cubre solo render de reports (charter estricto) o también guía cuando Claude genera CSS para otros fines? (bias: estricto a reports).
