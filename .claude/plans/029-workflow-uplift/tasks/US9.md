---
us: US9
title: Gate Workflow — permiso explícito + tabla tarea→modelo (nunca Fable en unidades)
wave: WA
depends_on: []
tdd_mode: optional
estimate: S
status: closed
closed: 2026-08-05
note: Encogida por decisiones posteriores del usuario — el tope de modelo ya vive always-loaded (Cmd X + §Agents for cheap reads); esta US entregó (a) permissions.ask ["Workflow"] en el settings base + sync verificado en el global generado, (b) tabla canónica task→model en orchestrator-protocol (incluye "Fable/Mythos NUNCA en unidades"), (c) fix de ancla stale §Lead Orchestrator Mode en el spawn tree. Incidente y fix — el base YA tenía "ask": [] tras el deny (Read parcial de 40 líneas lo ocultó) → clave duplicada sombreó el edit; detectado porque la verificación post-sync leyó el ARTEFACTO GENERADO, no el editado. Decisión flag — Agent sigue en allow (fan-outs read-only sin prompt), acotado por la tabla; moverlo a ask = 1 línea si se quiere. Efectivo en la PRÓXIMA sesión (settings cargan al arrancar). Evals live deferred (fuera de sandbox).
---

# US9 — Gate Workflow: permiso + modelo correcto

## Execution prompt (Phase 3 input)

**Task**: Make delegation cost-safe: (a) explicit `ask` permission for the Workflow tool, (b) a task→model guide table in CLAUDE.md §delegation, (c) the convention that workflow/agent units NEVER inherit Fable — `opts.model`/`model` is always set explicitly.
**Context (verified 2026-08-05)**: Global settings: `permissions.allow` includes `Agent` (auto-approved fan-outs); `Workflow` is NOT allowlisted → already prompts under `defaultMode: auto`; binora repos add no relevant entries. Evidence: 2 explicit cost complaints + 1 killed run ("no uses workflows consumen mucho en fable hazlo en sonnet pls como mucho"); user directive U1 with his own example: "buscar → sonnet o haiku, prioridad sonnet". Workflow units inherit the session model by default (tool contract) — on a Fable session that's the expensive path the user got burned by.
**Constraints**: Add `"ask": ["Workflow"]` to global settings permissions (belt-and-braces: documents intent even though default already prompts) — `sensitive: settings.json global`. The model table lives in CLAUDE.md §Lead Orchestrator Mode (compressed, ~6 rows) and playbook §4 stays the canonical rationale (pointer, don't duplicate — Cmd IX):

| Tarea de la unidad | Modelo |
|---|---|
| Búsqueda/exploración read-only | sonnet (prioridad) o haiku |
| Sweep mecánico masivo (grep/format/inventario) | haiku |
| Research web | sonnet |
| Build delegado (opt-in explícito) | sonnet |
| Verify/judge de alto riesgo | opus, con razón explícita |
| Fable/Mythos en unidades | NUNCA — Fable solo en el Lead |

Behavioral change → run golden-prompt evals after (`bun .claude/evals/run.ts`).
**Deliverable**: settings.json edit + CLAUDE.md §delegation table + 1 line in orchestrator-protocol pointing here.
**Verify**: `claude config`/settings show the ask entry; evals green; smoke: next Workflow call prompts and its script sets model per table.
**Ask first**: ¿mover también `Agent` de allow → ask? (hoy 5 fan-outs sin prompt; read-only y baratos si el modelo es correcto — propuesta: dejar Agent en allow PERO sujeto a la misma tabla de modelos).

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | WA |
| **Depends on** | none |
| **Files touched** | `~/.claude/settings.json` (vía repo + sync) · `CLAUDE.md` §delegación · `.claude/skills/orchestrator-protocol/SKILL.md` (1 línea) |
| **TDD-mode** | optional (config+markdown) |
| **Estimate** | S |
| **Cómo arrancar** | Leer CLAUDE.md §Delegation doctrine actual; insertar tabla sin duplicar playbook §4 |

## User story

- **As a**: Oriol
- **I want**: que ningún fan-out corra sin mi permiso ni herede Fable, con una guía clara de qué modelo toca por tarea
- **So that**: el coste de delegación queda bajo control sin tener que vigilarlo yo

## Acceptance criteria

- **AC1**: Given settings, when read, then `permissions.ask` contains `Workflow` (global) — y la entrada sobrevive a `sync-claude`.
- **AC2**: Given CLAUDE.md §delegación, when read, then la tabla tarea→modelo está presente (≤8 filas), con "Fable NUNCA en unidades" explícito y puntero a playbook §4.
- **AC3**: Given un script de Workflow nuevo, when se redacta, then cada `agent()` de unidad lleva `model` explícito (convención declarada en la misma sección).
- **AC4**: Golden-prompt evals green tras el cambio.

## Commandments cubiertos

| # | Cómo |
|---|---|
| X | Control directo del coste de delegación (la fricción de coste más citada) |
| VI | Permiso explícito antes de la operación cara |

## Verificación post-implementación

- Smoke: invocar un Workflow trivial → prompt de permiso aparece; script usa sonnet/haiku según tabla.
- `bun .claude/evals/run.ts` green.
