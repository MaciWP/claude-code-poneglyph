---
name: skill-advisor
description: |
  Propone un shortlist ratificable de las skills más relevantes para la tarea actual ("un drillme de skills") y pregunta al humano cuáles activar — el backstop determinista contra el undertrigger estructural de skills del modelo. Lee skills de disco (.claude/skills + ~/.claude/skills), rankea un shortlist ≤5 y lo presenta vía AskUserQuestion. NO re-implementa el matching del modelo ni fuerza ninguna invocación: surface y el humano decide.
  Úsala cuando: empiezas una tarea no trivial y dudas qué skills aplican, en fronteras de fase de /flow (donde la auto-activación es ~0%), cuando las skills "parecen que deberían dispararse pero no", o on-demand. "qué skills uso", "qué skill aplica", "no sé qué activar", "propón skills", "drillme de skills".
  Keywords - skill-advisor, skills, qué skill, qué skills, propón skills, suggest skills, which skills, no sé qué activar, drillme de skills, activar skill, skill routing, shortlist
when_to_use: |
  "qué skills uso para esto", "qué skill aplica aquí", "no sé qué activar",
  "propón las skills relevantes", "drillme de skills", "which skills apply",
  "suggest relevant skills", "what skill should I use here";
  at every /flow phase boundary; when the Lead is about to act without considering skills.
disable-model-invocation: false
---

# skill-advisor — propose→ratify skill shortlist

> The deterministic backstop to skill under-triggering (research: native auto-activation
> infra-dispara y no se puede forzar). This skill does NOT force invocation — it makes
> the Lead **consider** the right skills and lets the human ratify. The cheap always-on
> surfacing lives in the `skill-activation.ts` hook; this skill is the deeper, ratified pass.

## When to run

- A `/flow` phase boundary (Phase 1→2→2.5→3→4→5) — auto-activation is weakest where there is no open file and the request is conceptual.
- The Lead is about to do real work without having considered the available skills.
- On demand: the user asks "qué skills aplican" / "propón skills" / "drillme de skills".
- NOT on trivial conversational turns (loading skills there is ceremony).

## Workflow

1. **Get the task** — the current user request or phase context (one line is enough).
2. **Rank** — call the pure pre-filter:
   ```ts
   import { rank, loadSkillsFromDisk } from "./lib/rank";
   const skills = loadSkillsFromDisk([".claude/skills", `${process.env.HOME}/.claude/skills`]);
   const shortlist = rank(task, skills); // ≤5, deduped, [] if nothing matches
   ```
   Then reason over the shortlist + the in-context skill listing (the descriptions are already
   in your context) to add any semantically-relevant skill the lexical pre-filter missed
   (e.g. Spanish/novel phrasing). Do NOT build a keyword index — keywords have ~0 measured effect.
3. **Ratify** — present the shortlist to the human via `AskUserQuestion`:
   - One option per candidate (label = skill name, description = why it applies + what it does).
   - multiSelect: true — the user picks which to activate.
   - If the shortlist is empty, say so plainly ("ninguna skill aplica claramente") — never invent.
4. **Activate** — invoke `Skill(<name>)` only for the ratified candidates.
5. **Multi-pass (optional)** — if the user wants to go deeper or the task shifts, re-run from step 1.

## SIEMPRE rules

- Propose, never auto-activate — the human ratifies (Commandment I, symbiosis).
- Never re-implement the model's semantic matching; reason over the in-context listing + the disk shortlist.
- Empty shortlist → say it; do not invent candidates.
- Cheap: the per-turn surfacing is the hook's job; run this skill at decision points, not every turn.

## Commandments cubiertos

| # | Cómo |
|---|---|
| I | Claude propone el volumen (shortlist), el humano decide qué activar |
| III | Mínimo: una función pura + un workflow; sin índice ni infra nueva |
| IX | Backstop explícito al undertrigger nativo (auto-mejora del sistema) |

## Verificación

- `bun test ./.claude/skills/skill-advisor/__tests__/rank.test.ts` verde.
- Smoke: `/skill-advisor "optimiza el endpoint lento"` → shortlist con review-patterns + AskUserQuestion.

## Reutiliza

- Patrón de lectura de heads de `loadSkills` en `.claude/hooks/skill-activation.ts`.
