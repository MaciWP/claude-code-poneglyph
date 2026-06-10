---
us: US8
title: settings.json modernization — version gate, fallback models, MCP review
wave: W3
depends_on: [US4]
tdd_mode: optional
estimate: S
status: draft
absorbs_decision: verify field names against current schema before writing
---

# US8 — settings.json modernización

## Execution prompt (Phase 3 input)

**Task**: Modernize `.claude/settings.json`: add version gate (≥2.1.160) and fallback model cascade IF the fields verify against the current schema; review every env var (drop candidates: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` — teams out of scope); fix dead permission entries (`Task` legacy vs `Agent`); inventory session MCPs (Atlassian, binOra ×2, context7, claude-in-chrome) and let the user decide the default-on set; register any US4-ratified Stop-gate hook.
**Context**: Schema URL is in the file header. `requiredMinimumVersion`/`fallbackModel` are [Probable — agent-reported 2026-06-10]; verification is the FIRST step, no invented fields (Commandment II).
**Constraints**: Sensitive path — declare `sensitive: settings base affects all sessions on all machines`. settings.machine.json merge logic untouched. Single-writer: US11/US12 registrations come after, in DAG order.
**Deliverable**: modernized settings.json + verified-fields table in the report + MCP decision documented in docs/system-inventory.md.
**Verify**: JSON parses; next session starts without settings warnings.
**Ask first**: env-var drop list + MCP default-on set.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W3 |
| **Depends on** | [US4] (settings single-writer order; US4 may hand over a Stop-gate hook to register) |
| **Blocks** | [US11, US12] |
| **Files touched** | `.claude/settings.json` |
| **TDD-mode** | optional |
| **Estimate** | S |
| **Cómo arrancar** | Fetch current settings schema (schemastore URL already in the file) + claude-api/docs; verify field names BEFORE editing |
| **Decisión absorbida** | `requiredMinimumVersion`/`fallbackModel` are [Probable] agent-reported — verify first |

## User story

- **As a**: Oriol
- **I want**: settings tuned to current CC capabilities with graceful degradation
- **So that**: Claude performs consistently across machines and model outages

## Acceptance criteria

- **AC1**: Given the schema verification, when the fields exist, then settings.json carries a version gate (≥2.1.160) and fallback model cascade; if a field doesn't exist, the finding is recorded and skipped (no invented config). (spec AC7)
- **AC2**: Given the env block, when reviewed, then each var is justified or removed (e.g. `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` — teams are out of scope and experimental: candidate to drop, ratify with user).
- **AC3**: Given permissions, when reviewed, then allow/deny lists reflect current tool names (e.g. `Task` legacy vs `Agent`) with no dead entries.
- **AC4**: Given the MCP review, when inventorying session-connected servers (Atlassian, binOra ×2, context7, claude-in-chrome), then the user decides which stay default-on; outcome documented in docs/system-inventory.md (MCPs load tool schemas into context).
- **AC5**: Given any change, when done, then `bun .claude/commands/sync-claude.ts` regeneration logic still works (settings.machine.json merge untouched).

## Workflow detallado

1. WebFetch the settings schema + docs page; build the verified-fields table.
2. Edit settings.json (sensitive path — declare `sensitive: settings base affects all sessions on all machines`).
3. AskUserQuestion: env vars candidates to drop + MCP default-on set.
4. Register any US4-handed hook (Stop gate) if ratified.

## Commandments cubiertos

| # | Cómo |
|---|---|
| II | Cero campos inventados — schema verificado primero |
| VII | fallback + MCPs podados = menos contexto muerto, más resiliencia |
| VI | Edición de path sensible declarada |

## Verificación post-implementación

- `bun -e "JSON.parse(await Bun.file('.claude/settings.json').text())"` → parse OK.
- Próxima sesión arranca sin warnings de settings.
