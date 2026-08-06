---
us: US4
title: Disciplina git/side-effects — rule global + gate en security-gate + /commit-text
wave: WC
depends_on: []
note: /commit-text ya NO se crea aquí — US10 (Wave B) abstrae los commands existentes de binora (commit-message.md, pr-description.md); esta HU queda en rule + gate warn en security-gate
tdd_mode: forced
estimate: M
status: closed
closed: 2026-08-05
result: Red→green honrado (5 tests nuevos, 155/155). Entregado — (1) regla git discipline en CLAUDE.md §Sensitive paths (2 líneas: commits/push solo pedidos ESTE turno, sin Co-Authored-By en repos de trabajo, sin suites unprompted); (2) backstop mecánico en security-gate (Stop) — extractTurnFromTranscript + buildGitDisciplineWarning comparan mutaciones git del turno vs intención del prompt (COMMIT_INTENT_RE cubre sus phrasings reales incl. typos "comitea"), doble canal, warn nunca block, merge con el warn de secretos; (3) docs-sync hooks.md misma HU. /commit-text NO creado aquí (absorbido por US10 — comandos existentes abstraídos). ADDENDUM mismo día — primer disparo en producción fue falso positivo de clase model-uplift #2 (matcheó "git commit" dentro de los fixtures heredoc de sus propios tests; git log confirmó cero mutaciones reales); fix de clase red→green: stripShellData() elimina heredocs y spans entrecomillados antes de matchear (+4 tests, 162/162). Trade-off declarado — mutación escondida en comillas se escapa (best-effort warn).
---

# US4 — Disciplina git/side-effects + `/commit-text`

## Execution prompt (Phase 3 input)

**Task**: Encode git/side-effect discipline as (a) a global rule, (b) a soft gate in the existing `security-gate.ts` hook, and (c) a `/commit-text` command that authors commit/PR text without ever executing git.
**Context**: Evidence (10 instances, 9 sessions, two corpora): unauthorized commits ("es que has hecho un commit que no te he pedido… quiero hacerlo yo manualmente"; "no has respetado el yolo y has hecho commit cuando no te lo pedi"), unwanted Claude authorship ("te has dado la autoria y no queria", "no pongas a ti como auto pls"), file deleted by accident (`seed_data`), test-suite collision ("no ejecutes test pls… ya hay otros test corriendo"). Standing spec he repeats for text: commit message in English, brief and clear; PR description in es-ES, brief, markdown. Existing components (verified): `.claude/hooks/security-gate.ts` with dual-channel design (028) + tests; Commandment VI (prose, not holding); harness default appends Co-Authored-By (must be overridden per his explicit preference in Bjumper repos).
**Constraints**: Gate is SOFT (warn/confirm), not hard block — "commit esto" legítimo debe pasar sin fricción; the gate targets `git commit`/`git push` when the turn's user prompt did not request it (heuristic: PreToolUse warn channel; exact mechanism designed in-implementation against security-gate's existing architecture — fix the input CLASS: any state-mutating git op, not just commit). Rule content: never commit/push/create branches beyond what was asked; never add Claude authorship/Co-Authored-By in work repos; never run full test suites unprompted in work repos; never delete files without surfacing first (extends Cmd VI list). `/commit-text`: takes staged diff or described change → outputs commit msg (EN, brief) + PR description (es-ES, brief, md) ready to copy — NEVER runs git. Hook edit carries tests (tdd forced: red→green on the new gate class).
**Deliverable**: `.claude/rules/git-discipline.md` (or extension of an existing rule if one owns this ground — check first) · `security-gate.ts` + tests · `.claude/commands/commit-text.md`.
**Verify**: `bun test ./.claude/hooks/` green including new cases (commit-unasked warns; commit-asked passes; push warns; non-git ops untouched); smoke `/commit-text` on a real staged diff.
**Ask first**: open question 2 del index (warn vs block) — propuesta: warn+confirm.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | none |
| **Blocks** | none |
| **Files touched** | `.claude/rules/git-discipline.md` · `.claude/hooks/security-gate.ts` (+ tests) · `.claude/commands/commit-text.md` |
| **TDD-mode** | forced — hook con lógica nueva, red→green |
| **Estimate** | M |
| **Cómo arrancar** | Leer security-gate.ts + sus tests; diseñar el canal warn para git mutante no pedido |

## User story

- **As a**: Oriol
- **I want**: mantener yo el control de git (commits míos, sin autoría de Claude, sin tests lanzados solos) con el texto de commit/PR generado en mi formato exacto
- **So that**: desaparecen las 10 correcciones por side-effects y las 6 peticiones repetidas de formato

## Acceptance criteria

- **AC1**: Given a `git commit`/`git push` Bash call in a turn whose user prompt didn't ask for it, when PreToolUse fires, then security-gate emits the warn/confirm channel (test: red→green).
- **AC2**: Given "haz commit de esto" in the prompt, when the same call fires, then no friction (test).
- **AC3**: Given the rule, when read, then it covers: no unasked git mutations · no Claude authorship in work repos · no unprompted full test-suite runs in work repos · no deletions without surfacing.
- **AC4**: Given `/commit-text`, when invoked with a staged diff, then output = commit msg (EN, brief) + PR description (es-ES, brief, md), copy-ready, and NO git command was executed.

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/rules/git-discipline.md` | Rule global (o extensión del dueño existente — verificar con Grep antes de crear) |
| `.claude/hooks/security-gate.ts` | Canal warn para git mutante no pedido — `sensitive: hook de seguridad global con dual-channel` |
| `.claude/hooks/__tests__/security-gate.test.ts` | Casos nuevos red→green |
| `.claude/commands/commit-text.md` | Command nuevo, formato exacto del usuario |

## Workflow detallado

1. Grep rules/ for existing git-discipline ownership; extend or create.
2. Red tests for the gate class → implement → green.
3. `/commit-text` command; smoke on real diff.

## Commandments cubiertos

| # | Cómo |
|---|---|
| VI | Enforcement mecánico de lo que hoy es prosa (y está fallando en repos de trabajo) |
| IV | Gate bloqueante suave: la intención ("no era mi intención commitear") deja de bastar |

## Smell signals

- ⚠️ Si la heurística "no pedido" genera falsos positivos recurrentes → atacar la clase, no el caso (memoria fix-class-not-instance), o degradar a solo-logging y re-evaluar.

## Verificación post-implementación

- `bun test ./.claude/hooks/` green.
- Smoke: sesión real — commit no pedido → warn; commit pedido → fluye.
