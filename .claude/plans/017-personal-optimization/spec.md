---
id: 017-personal-optimization
created: 2026-06-10
approved: 2026-06-10
mode: full
phase: 1
status: closed
closed: 2026-06-10
version: v2 — deltas from retro 017 (AC3/AC7 reworded to findings-based reality, US14 scope note; user-ratified)
---

# Problema

The meta-system has accumulated debt that degrades Claude's real performance for its single user: always-loaded context bloat (CLAUDE.md 264 lines + ~200 more in always-on rules), documentation that lies (dead agent references, 13 unclosed plans, phantom hooks listed as reliable), dead artifacts (stale HTML, unused dirs), an output style that reads like translated English instead of natural es-ES, and — most important — an orchestration doctrine built on the premise that delegating to agents improves quality, when the user's lived experience is the opposite: **agents never worked well for building** (token cost, degraded summaries back to the Lead, lost context), and the system itself under-states that agents exist for parallelization only.

# Resultado esperado

- Claude works better per session: less always-loaded noise, truthful self-documentation, and an orchestration doctrine that defaults to inline work — agents reserved for genuinely parallel, read-heavy fan-outs (research/exploration), which is the one mode proven to work.
- Communication feels like a Spanish colleague: natural es-ES prose, no translated-English constructions, no unnecessary anglicisms, while staying visual and fast to read (tables and confidence labels stay).
- The repo carries only what serves the 10 Commandments: essential tests only, active plans only (closed ones archived out of accidental-read reach), no dead HTML, documented or deleted directories.
- Claude Code configuration (settings.json, hooks, skills, commands, MCPs) modernized to current CC capabilities and tuned for performance and code quality.

# Success criteria (medibles, Given/When/Then)

- **AC1 (truth debt)**: Given the repo after build, when grepping for `builder|reviewer|scout` as live references, phantom hook claims, or `.claude/agents/**` globs, then 0 live instructions point at dead components, `error-recovery.md` matches the real hook registry, and the 7 version-pinned claims carry citations.
- **AC2 (hooks)**: Given the 4 hooks, when running `bun test ./.claude/hooks/`, then the pruned essential suite is green, `auto-approve.ts` uses `readHookStdin()` (Windows bug fixed), and hook functions are exported/testable.
- **AC3 (slim repo)** *(v2 — delta from retro 017)*: Given the cleanup, when listing the repo, then the 4 root HTML files and `.claude/data/usage/*.html` are deleted, closed/abandoned plans live in a gitignored archive with truthful `state.json`, and `.claude/plans/` keeps only active plans plus justified retained-by-reference files (001 canonical auxiliary matrix, research files cited by live docs).
- **AC4 (always-loaded diet)**: Given a fresh session, when counting always-loaded content, then CLAUDE.md ≤200 lines, with inventory/history/mode tables moved to on-demand locations, and no always-on rule contradicts another.
- **AC5 (orchestration rethink)**: Given `orchestrator-protocol` + CLAUDE.md after build, when reading the delegation doctrine, then it states inline-first as the default for ALL build work, frames agents exclusively as a parallelization tool for independent read-heavy units, documents the known costs (tokens, summary degradation, context loss), and removes any remaining "delegated by default" framing for Lead tools.
- **AC6 (style es-ES)**: Given `output-styles/poneglyph.md` + CLAUDE.md honesty anchors after build, when Claude responds in a real session, then prose is natural Spanish (es-ES), telegraphic compression and translated-English constructions are explicitly counter-exemplified in the style spec, anglicisms are limited to technical identifiers without a clear Spanish equivalent, and visual speed (tables, labels) is preserved.
- **AC7 (config modernization)** *(v2 — delta from retro 017)*: Given `settings.json` after build, when validated against the current schema, then it carries the version gate + the reviewed permission set, with field-existence findings documented instead of invented config (`fallbackModel` does not exist in the schema; `disable-model-invocation: true` blocks explicit Skill-tool invocation — live-smoked and reverted), and new hook patterns (UserPromptSubmit injection, InstructionsLoaded observability) adopted where they add value.
- **AC8 (skills health)**: Given the 21 skills, when audited against the official authoring checklist, then descriptions are third-person ≤1024 chars with clear triggers, `retro` (478) and `critic` (438) have content extracted to references before crossing 500 lines, and references stay one level deep.

> *(v2 — delta from retro 017)*: project-onboard (US14) v1 scope was EXPANDED at build by explicit user decision — full personalized component menu (project skills, rules, CLAUDE.md, commands, MCP suggestions) instead of the planned minimum.

# Out of scope (explícito)

- **Plugin packaging spike** (action #20) — own feature after this one lands; system is in flux.
- **Observability / success metrics framework** — user decision: no observability exists today; measuring the improvement is deferred to a later phase. ACs above are build-time mechanical checks, not usage metrics.
- **Agent teams / experimental multi-session orchestration** — stays experimental, not adopted.
- **Telemetry pipeline** — remains reactive ad-hoc by design (Commandment IX).
- **Rewriting skill business content** — skills are audited/trimmed for form and triggers, not redesigned.

# Constraints

- **Compatibilidad**: `bun test ./.claude/hooks/` green after every wave; `/flow` resumability must survive the plans/ archive change.
- **Técnico**: Bun + TypeScript for hooks; English for everything stored in repo files, Spanish only for runtime communication (language convention unchanged).
- **Proceso**: changes to CLAUDE.md/output-style only validate behaviorally in the NEXT session (known lesson) — final style validation is a next-session check, not a build-time one.

# Stakeholders

- **Oriol** — único usuario; sufre el problema cada sesión en cada máquina; decide los gates.

# Open questions

- Exact essential-test subset (which asserts survive the prune) — decided in Phase 2 per test file.
- Archive location for closed plans (`.claude/plans/_archive/` gitignored vs `~/.claude-plans/`) — Phase 2 decision; user leaned "out of accidental read reach" with minimal /flow surgery.
- Whether `data/usage/` tooling (beyond the 2 HTML) is dead or alive — verify in Phase 2 before deleting the directory.
- MCPs review depth ("pulir MCPs" was mentioned) — inventory which MCP servers are configured and whether any is dead weight; scope per finding in Phase 2.

# Modelo conceptual / Detalle técnico

## Voces externas (modo full — generadas inline, sin agentes, por petición explícita del usuario de no gastar tokens en delegación)

- **Outsider**: "¿Por qué ahora?" — porque dos análisis consecutivos (3-agent audit + 20-action ranking) ya pagaron el coste de descubrimiento; ejecutar ahora amortiza esa investigación. Riesgo señalado: una feature "optimízalo todo" tiende a no cerrarse nunca — mitigado con olas y gates intermedios.
- **Product**: el valor no está repartido uniforme: ~60% del impacto vive en 3 unidades (dieta always-loaded, doctrina de orquestación, estilo es-ES) porque tocan TODAS las sesiones futuras; la limpieza (HTML, plans, tests) es higiene de una sola vez. Priorizar esas 3 en las primeras olas.
- **User (DX)**: el cambio de estilo es el único con riesgo de regresión subjetiva — es-ES natural mal calibrado puede volverse verboso. Mitigación: counter-examples explícitos en el style spec + validación en sesión siguiente con feedback del usuario antes de cerrar retro.

## Evidence base (consumed by Phase 2)

- 3-agent analysis (2026-06-10): 42 findings (1 BUG, 10 DRIFT, 25 SMELL); CC v2.1.170 digest; official-docs + community inspiration report.
- 20-action ranking (this session): Tiers 1-4 with effort/commandment mapping; all in scope except #20 (plugin spike).
- User testimony (this session): agents never worked for building — felt like the future, performed worse (tokens, summaries, understanding); the proven-good mode is parallel read-only research fan-out. This is primary input for AC5, weighted above any official guidance that suggests more delegation.
