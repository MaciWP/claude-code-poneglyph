---
us: US6
title: Skill jira-ticket — ingesta limpia de tickets vía Atlassian MCP
wave: WB
depends_on: []
tdd_mode: optional
estimate: S
status: closed
closed: 2026-08-05
note: Evolución de alcance aportada por el usuario en el /build — su skill del cowork (binora-jira-tickets, writer battle-tested) se vendoriza como modo ESCRITURA en references/writer.md con 3 adaptaciones de entorno (aquí HAY código → verificar en repo en vez de pedir snippets; sin visor Figma → referencia por link; conector binOra = Desarrollo). El modo LECTURA/triage es la US6 original (digest 6 campos + oferta de triage). Nombre final = binora-jira-tickets (consistencia con el cowork). Verificado con fetch REAL: JRV-1077 completa vía conector Atlassian — y el ticket real exhibe los anti-patterns que el writer combate ("Según diseño" como AC, "(Rubén)…" inline), validando su valor. Pendiente RESUELTO mismo día — Oriol exportó references/ejemplos.md (patrones buenos/malos reales del JRV, 8 anti-patrones) y quedó importado verbatim; SKILL.md y writer.md actualizados de condicional a mandato de lectura pre-draft.
---

# US6 — Skill `jira-ticket` (ingesta vía Atlassian MCP)

## Execution prompt (Phase 3 input)

**Task**: Create the `jira-ticket` skill: given a JRV-id (or a detected raw Jira page paste), fetch the ticket via the Atlassian MCP connector and produce a clean work digest.
**Context**: Evidence: 13 raw Jira page pastes across 12 sessions (both corpora), always with nav cruft ("Skip to: Top Bar Main Content Sidebar…"), vs only 6 MCP calls in 2 sessions — the connector exists and is connected (mcp__claude_ai_Atlassian__getJiraIssue et al., verified in this session's tool roster) but nothing routes to it. Every ticket-triage session starts with this manual paste.
**Constraints**: Digest format: title · description · acceptance criteria · relevant comments (with author) · links/attachments noted · status/assignee. Detect-and-offer: when a paste contains Jira nav cruft, offer the MCP fetch of the referenced JRV-id instead of parsing the paste. Fallback when MCP unavailable (headless/cron or auth expired): say so and ask for the paste — never hallucinate ticket content (Cmd II). Triage hint: end the digest with "¿evaluamos complejidad?" — matches his evaluation-first loop ("Revisa como de complejo y que necesitamos hacer"). Activation: es-ES surface; keywords: "JRV-", "jira", "ticket", "revisa este ticket". Keyword row in skill-activation.ts + test.
**Deliverable**: `.claude/skills/jira-ticket/SKILL.md` + keyword row + test.
**Verify**: `bun test ./.claude/hooks/` green; smoke live: fetch a real JRV ticket via MCP and compare digest vs raw page.
**Ask first**: nothing — decisions locked.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | none |
| **Blocks** | none |
| **Files touched** | `.claude/skills/jira-ticket/SKILL.md` · `.claude/hooks/skill-activation.ts` (+ test) |
| **TDD-mode** | optional |
| **Estimate** | S |
| **Cómo arrancar** | Listar las tools mcp__claude_ai_Atlassian__* disponibles; diseñar el digest sobre getJiraIssue |

## User story

- **As a**: Oriol
- **I want**: pegar "JRV-1077" y recibir el ticket limpio (descripción, AC, comentarios) sin pegar páginas enteras con cruft
- **So that**: cada triage empieza en el contenido, no en la limpieza

## Acceptance criteria

- **AC1**: Given "revisa JRV-1077", when the skill fires, then the digest arrives via MCP fetch with the 6 fields, no nav cruft.
- **AC2**: Given a raw Jira page paste with nav cruft, when detected, then the skill offers the MCP fetch of the referenced id.
- **AC3**: Given MCP unavailable, when fetch fails, then explicit fallback ask — zero invented ticket content.

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/skills/jira-ticket/SKILL.md` | Skill nueva |
| `.claude/hooks/skill-activation.ts` + test | Keyword row — `sensitive: hook global de activación` |

## Commandments cubiertos

| # | Cómo |
|---|---|
| II | Ticket = fuente primaria vía API, no paste degradado ni memoria |
| X | Mata una clase entera de trabajo manual repetido (13 instancias) |

## Verificación post-implementación

- Smoke live: JRV real → digest correcto.
- `bun test ./.claude/hooks/` green.
