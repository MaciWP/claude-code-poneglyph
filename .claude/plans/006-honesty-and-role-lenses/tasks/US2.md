---
us: US2
title: CLAUDE.md — honesty protocol (augment Cmd I/II) + base role + inventory
wave: W1
depends_on: []
tdd_mode: optional
estimate: L
status: closed
approved: 2026-06-08
closed: 2026-06-08
absorbs_decision: placement-behavior-to-claudemd
---

# US2 — CLAUDE.md: honesty protocol + base role + inventory

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | `none` (usa nombres canónicos fijados en index.md Cross-cutting) |
| **Blocks** | `none` |
| **Files touched** | `CLAUDE.md` (repo root + sincronizado a `~/.claude/`) |
| **TDD-mode** | optional (validation-mode: lectura) |
| **Estimate** | L (fichero núcleo, varias ediciones coherentes) |
| **Cómo arrancar** | `Read CLAUDE.md`; augmentar Commandment I/II con protocolo; añadir subsección "Base role" + principio AC10 |
| **Decisión absorbida** | placement: comportamiento → CLAUDE.md; rol base = refuerzo |

## User story

- **As a**: Oriol (y proyectos heredados de `~/.claude/`)
- **I want**: que CLAUDE.md codifique always-on el comportamiento de honestidad y el rol base senior, augmentando los Commandments existentes (no duplicando)
- **So that**: Claude opere por defecto como asesor proactivo senior, honesto y con señal epistémica, en cada sesión

## Acceptance criteria

- **AC1 (augment Commandment I/II)**: Given CLAUDE.md, when se edita, then Commandment I (honest symbiosis) y II (factual truth) se **augmentan** con un bloque operativo "Communication & Honesty Protocol" (anti-pelota, confidence labels default-seguro, discrepancia estructurada calibrada, verdad-primero/no-calentamiento, hold steelmanizado, auto-corrección) — sin crear una sección paralela que los duplique. (spec AC1-AC4, AC9)
- **AC2 (hold steelmanizado explícito)**: Given el protocolo, then declara: mantener postura ante presión social/mera aserción; actualizar ante razonamiento sólido/info nueva, declarándolo. (spec AC4)
- **AC3 (rol base = refuerzo)**: Given CLAUDE.md, then incluye subsección "Base role" = ingeniero/asesor senior full-stack, **refuerzo** del Lead + Commandment I (no identidad nueva que compita); "más listo" = volumen/precisión, no autoridad; simbiosis intacta. (spec AC6)
- **AC4 (sugerencia proactiva de rol)**: Given una tarea que encaja en un rol especializado (auth→security, deploy→devops), then el rol base **sugiere** `/role <x>` (no auto-activa). (spec AC7)
- **AC5 (principio AC10)**: Given CLAUDE.md, then referencia el principio "preguntar en rondas + laterales/mejoras proactivas, calibrado" (el mecanismo detallado vive en `/flow` + `orchestrator-protocol`, US4). (spec AC10)
- **AC6 (inventory + cross-refs)**: Given el "System inventory", when se actualiza, then Slash commands 4→5 (añade `/role`), y se nota la capa de honestidad + rol base sin contradecir el resto del documento. Glossary/cross-refs coherentes.
- **AC7 (no bloat)**: Given el goal terseness, then las adiciones son **condensadas** (tablas, bullets); el catálogo verboso de roles NO va aquí (vive en `commands/role.md`, US3).

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `CLAUDE.md` | augment Commandment I/II con "Communication & Honesty Protocol"; +subsección "Base role"; +referencia principio AC10; update "System inventory" (commands 4→5); cross-refs/glossary |

## Workflow detallado

1. `Read CLAUDE.md` (tengo gran parte en contexto; releer las secciones a tocar: Commandments table, "Expected Behavior", "Lead Orchestrator Mode", "System inventory").
2. Augmentar Commandment I y II: bloque operativo condensado del protocolo de honestidad. Reusar los nombres canónicos (index.md Cross-cutting).
3. Añadir subsección "Base role" cerca de "The relationship: symbiosis" o "Lead Orchestrator Mode" — refuerzo, no identidad nueva.
4. Añadir 1-2 líneas del principio AC10 (proactividad multi-round) apuntando a `/flow` + `orchestrator-protocol`.
5. Update "System inventory": Slash commands `4` → `5`; fila/nota del nuevo `/role` + capa honestidad.
6. Verificar coherencia: ningún texto existente contradice el protocolo nuevo (Commandment I "colegas, no jerarquía" debe seguir intacto y compatible con "asesor proactivo").
7. Canon: `meta-settings-cookbook` (CLAUDE.md best practices).

## Drillme (Socratic check)

1. `[location]` ¿El comportamiento va en CLAUDE.md (no output-style)? — Sí: always-on real; output-style es toggleable.
2. `[approach]` ¿Augmentar Commandment I/II vs sección nueva? — Augmentar: evita duplicación (Commandment X); el protocolo OPERACIONALIZA los commandments existentes.
3. `[context]` ¿"Asesor proactivo" choca con "colegas, no jerarquía" (Cmd I)? — No si se redacta bien: asesor = discrepa/propone con evidencia; el usuario sigue decidiendo. "Más listo" = volumen/precisión.
4. `[failure]` ¿Y si CLAUDE.md crece demasiado? — Condensar (tablas); catálogo de roles fuera; rule nueva descartada. Si tras editar supera un umbral razonable, mover detalle a referencia.

## Commandments cubiertos

| # | Cómo |
|---|---|
| I | Operacionaliza honest symbiosis + rol base como asesor (simbiosis intacta) |
| II | Confidence-labeling discipline always-on |
| III | Adiciones condensadas; catálogo fuera; no rule nueva |
| X | Augmenta, no duplica; inventory coherente |

## Reutiliza

- `meta-settings-cookbook` — CLAUDE.md canon.

## Verificación post-implementación

- `grep -i "Communication & Honesty Protocol\|Base role\|/role" CLAUDE.md` → match.
- Lectura: Commandment I sigue diciendo "colegas, no jerarquía"; no hay sección honesty paralela duplicada.
- "System inventory" Slash commands = 5.
- `bun test ./.claude/hooks/` sigue pasando.

## Open questions (a resolver en implementación)

- Ubicación exacta de la subsección "Base role" (junto a symbiosis vs Lead Orchestrator Mode) — decidir al editar por mejor cohesión.
