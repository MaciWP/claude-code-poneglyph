---
us: US8
title: Skill frontend-craft — versión propia de Impeccable, consistency-first
wave: WC
depends_on: []
tdd_mode: optional
estimate: M
status: closed
closed: 2026-08-05
result: Entregada recalibrada por evidencia (0 quejas estéticas; 4 barridos de consistencia manuales) — modo CONSISTENCIA default (usage sweep proactivo + extracción de patrón antes del primer edit; el caso JRV-987 como failure mode nombrado) + modo CRAFT (floor numérico vendorizado de Impeccable Apache-2.0 con adaptación de la línea del design-hook no portado; modos por superficie Persuade/Operate/Read/Experience; dirección estética → plugin frontend-design, sin duplicar). Verificación acotada 1+1 rondas con screenshots del usuario. DESIGN.md persistence dejada FUERA de v1 (backlog, ask-first resuelta por defecto). Hook la descubre ("cambia el hover") ✅; 158/158. Colisión menor fichada para censo — lsp-operations matchea "hover".
---

# US8 — Skill `frontend-craft` (versión propia de Impeccable)

## Execution prompt (Phase 3 input)

**Task**: Create the `frontend-craft` skill — poneglyph's adaptation of Impeccable (pbakaus, Apache 2.0), recalibrated to the user's real evidence: consistency-with-the-existing-app FIRST, bold aesthetics second.
**Context**: Sources already downloaded to scratchpad by research agent: `impeccable-SKILL.md`, `craft-floor.md`, `new-work.md` (paths in 029 research notes); Anthropic's `frontend-design` plugin installed and read at `/Users/oriol/.claude/plugins/cache/claude-plugins-official/frontend-design/unknown/skills/frontend-design/SKILL.md`. Evidence recalibration: 0 "generic UI" complaints in ~45 frontend-adjacent sessions; real friction = semantic/consistency ("confirmar que estamos usando el mismo estilo de hover que en el resto de la app", "dodne se usan mas estos badge?" — 4 manual sweeps user-initiated) + the one visual task that hurt (JRV-987 priority badges: 3 rounds + 3 follow-up sessions, ended in component unification). Memory: design iteration without a concrete reference doesn't converge; chrome connector flaky → iterate via user screenshots.
**Constraints**: Two modes, consistency default: **(1) Consistency mode (default for work repos)**: before editing any shared UI element — enumerate its usages (Grep/LSP), extract the app's existing pattern (hover, spacing, tokens, sibling components), state which screens are affected; after editing — verify same-pattern conformance. **(2) Craft mode (new surfaces / personal projects)**: adapted craft-floor subset (numeric floors: contrast ≥4.5:1 with tinted-not-gray secondary text, measure 65-75ch, shadow anatomy, all interaction states, one authored motion moment) + refuse-list of AI tells (nested same-size cards, hero-metric template, eyebrow kickers, gradient text, decorative glassmorphism, emoji-as-icons) + mode-per-surface paragraph (Persuade/Operate/Read/Experience). Shared rules: bounded verification (1 batched screenshot round + max 1 confirm — screenshots from the user, connector unreliable); "the brief wins"; refinement preserves, redesign replaces. LEAVE OUT: concept-seed randomness, browser extension/live mode, 59-rule detector CLI, native mobile playbooks, DESIGN.md/PRODUCT.md persistence (defer to backlog — needs per-repo buy-in). Delta-not-duplicate: where the installed `frontend-design` plugin already covers a topic, point to it. Credit Impeccable (Apache 2.0) in a comment. Body English, es-ES surface, keyword row + test.
**Deliverable**: `.claude/skills/frontend-craft/SKILL.md` + `references/craft-floor.md` (adapted subset) + keyword row + test.
**Verify**: `bun test ./.claude/hooks/` green; smoke: "cambia el hover de este componente" → the skill's consistency sweep enumerates usages before any edit.
**Ask first**: skill name; whether DESIGN.md persistence enters v1 or backlog (proposal: backlog).

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | none |
| **Blocks** | none |
| **Files touched** | `.claude/skills/frontend-craft/SKILL.md` · `references/craft-floor.md` · `.claude/hooks/skill-activation.ts` (+ test) |
| **TDD-mode** | optional |
| **Estimate** | M |
| **Cómo arrancar** | Leer los 3 ficheros de Impeccable en scratchpad + el frontend-design plugin instalado; extraer el subset |

## User story

- **As a**: Oriol
- **I want**: que el trabajo de UI respete primero los patrones de la app existente (y lo verifique), y que lo nuevo tenga un suelo de calidad profesional no genérico
- **So that**: los barridos de consistencia dejan de iniciarlos yo, y las superficies nuevas no parecen plantilla de IA

## Acceptance criteria

- **AC1**: Given an edit to a shared UI element, when the skill applies, then usages are enumerated and the existing pattern extracted BEFORE the first edit (the manual sweep, now proactive).
- **AC2**: Given craft mode, when read, then numeric floors + refuse-list + mode-per-surface are present, and topics covered by the installed frontend-design plugin are pointed to, not duplicated.
- **AC3**: Given a design iteration, when screenshots are needed, then the skill requests them from the user (bounded: 1 batch + 1 confirm) — no open-ended self-QA loop.
- **AC4**: Apache 2.0 attribution present; es-ES activation surface; keyword row tested.

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/skills/frontend-craft/SKILL.md` | Skill nueva, 2 modos |
| `.claude/skills/frontend-craft/references/craft-floor.md` | Subset adaptado del craft-floor de Impeccable |
| `.claude/hooks/skill-activation.ts` + test | Keyword row ("hover", "componente UI", "diseño", "estilo de la app", "badge") — `sensitive: hook global` |

## Commandments cubiertos

| # | Cómo |
|---|---|
| V | Consistencia con lo existente > invención nueva; suelo de calidad sin maquinaria |
| I | El barrido de usages es "entender antes de actuar" aplicado a UI compartida |

## Smell signals

- ⚠️ Si la skill empieza a absorber la maquinaria de Impeccable (scripts, detector, persistence) → recortar; el 80% del valor está en el floor + sweep.

## Verificación post-implementación

- Smoke: petición de cambio de hover → sweep de usages primero.
- `bun test ./.claude/hooks/` green.
