---
name: binora-jira-tickets
description: |
  Tickets Jira del proyecto JRV (binOra) en dos modos. LECTURA/triage: dado un
  JRV-id o un paste de página Jira con cruft, trae el ticket limpio vía el
  conector Atlassian (título, descripción, ACs, comentarios, estado) y ofrece
  evaluar complejidad — mata la clase "pegar páginas enteras de Jira".
  ESCRITURA: redacta Historias, Errores, Agent Stories (MCP), Tareas y Spikes
  con las plantillas y reglas reales del equipo (entrevista obligatoria,
  DoR/DoD, shrink pass, creación en BORRADOR solo tras aprobación explícita) —
  protocolo completo en references/writer.md.
  Úsala cuando: aparezca un JRV-id o un ticket de Jira, "revisa este ticket",
  "tráeme la JRV-1077", "haz un ticket de esto", "historia de usuario para el
  JRV", "redacta un bug", "prepara esto para refinamiento".
  Keywords - JRV, jira, ticket, tráeme el ticket, revisa el ticket, revisa jrv,
  revisa la jrv, traeme jrv, tráeme la jrv, ticket jrv, la jrv-, el jrv-,
  historia de usuario, haz un ticket, redacta un ticket, agent story,
  spike para el JRV, prepara refinamiento, BORRADOR
disable-model-invocation: false
when_to_use: |
  "revisa la JRV-1077", "tráeme el ticket", "qué pide este ticket", "haz un
  ticket de esto", "historia de usuario para el JRV", "redacta este bug",
  "prepara esto para refinamiento", o cuando el usuario pega una página de
  Jira con nav-cruft ("Skip to: Top Bar…")
---

# binora-jira-tickets — read & write JRV tickets

Two modes over Jira project `JRV` (binOra, bjumper.atlassian.net). Reading kills
the measured friction of raw Jira page pastes (13 across 12 sessions, 029
analysis); writing is the team's battle-tested authoring protocol (adapted from
Oriol's cowork skill, 2026-08-05).

## Mode A — Read / triage (default when a JRV-id appears)

1. **Fetch via the Atlassian connector** (`getJiraIssue` + comments; search with
   `searchJiraIssuesUsingJql` when only keywords are known). If the user pasted
   a raw Jira page (nav cruft like "Skip to: Top Bar…"), offer the MCP fetch of
   the referenced id INSTEAD of parsing the paste.
2. **Digest format** (all six, nothing else):
   título · descripción · criterios de aceptación · comentarios relevantes (con
   autor) · estado/asignado · links y adjuntos anotados.
3. **Close with the triage offer**: "¿evaluamos complejidad?" — matches the
   evaluation-first loop (triage → micro-plan → build).
4. **Fallback**: connector unavailable/auth expired → say so and ask for the
   paste. NEVER invent ticket content (Cmd II).

## Mode B — Write (Historias, Errores, Agent Stories, Tareas, Spikes)

The full authoring protocol lives in `references/writer.md` — READ IT before
drafting any ticket. Non-negotiables it enforces: the interview IS the product
(minimum two question turns, one value/scope challenge); ACs marcables ✓/✗ at
product level; zero duplication; shrink pass; Listo/Refinar/Cancelar gate;
creation ONLY on explicit "Listo", in estado **BORRADOR**, verified after.

> Calibration: READ `references/ejemplos.md` before drafting — real good/bad
> JRV patterns (imported from the cowork 2026-08-05); it calibrates level of
> detail far better than rules alone.

## JRV conventions (verified against the real project — don't re-ask)

- **Site** `bjumper.atlassian.net` · **project** `JRV` · **issue types (exact
  Spanish names)**: `Historia`, `Error`, `Tarea`, `Subtarea`, `Spikes`, `Epic`.
  Agent Story = type `Historia`.
- **Workflow**: BORRADOR → QUÉ → CÓMO → BACKLOG → Tareas por hacer → En curso →
  Pull Request → In Product Review → Release Ready → Finalizada (o Rechazado).
- **Épica parent**: numbered catalog ("04 Usuarios, Perfiles & Grupos", "13
  Solicitudes y Creación de Procesos", "42 Tareas de Procesos"…) — search live
  (`project = JRV AND issuetype = Epic`), propose, confirm.
- **Prioridad** Medium salvo bugs genuinamente urgentes · **Components**
  `Backend`/`Frontend` · **never ask about**: sprints, fix versions, story
  points; labels rare.
- Ticket content in **Spanish**; team's English tech terms stay (tool, endpoint,
  tenant, badge, rack, Kanban…). Título ≤90 chars, sin emoji, acción + objeto,
  prefijo de área cuando ayuda ("Kanban - Hacer clicable la tarjeta").

## Environment adaptations (this is Claude Code, not the cowork)

| Cowork assumption | Here |
|---|---|
| "No GitHub access — ask the creator to paste code" | WE HAVE THE CODE: verify field names/endpoints/behavior directly in the repos (workspace map: `worktrees-bjumper` skill §Workspace topology) — never ask what the repo answers |
| Figma frames viewable | No Figma viewer — Figma stays as mandatory REFERENCE (link + node id) for frontend tickets; ask the user for the link, don't attempt to render it |
| binOra MCP Demo/Desarrollo/Producción | Available here: Desarrollo connector (`binOra - Desarrollo Bjumper`); same use — check "cómo funciona hoy" and whether an MCP tool already exists before drafting Agent Stories |
| Atlassian connector | Same — search duplicates/epics before drafting; create in BORRADOR only after explicit "Listo" |

## Commandments cubiertos

| # | Cómo |
|---|---|
| II | Ticket = fuente primaria vía API (lectura) y datos verificados en repo/Jira/MCP (escritura) — nunca paste degradado ni inventos |
| I | La entrevista del writer ES entender antes de redactar; el triage de lectura arranca el bucle evaluation-first |
| X | Mata una clase de trabajo manual (13 pastes) y evita tickets-basura que queman refinamiento |
