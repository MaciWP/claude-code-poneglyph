# Plans directory convention

`.claude/plans/` stores persistent artefacts from the 5-phase workflow. Each feature occupies one directory; templates live in `templates/`.

## Naming convention

```
.claude/plans/{NNN}-{slug}/
```

- `NNN`: 3-digit sequential integer, zero-padded (001, 002, …). Next free number — no gaps.
- `slug`: kebab-case description of the feature (e.g. `auth-refactor`, `onboarding-flow`).
- If two features share the same slug, NNN differentiates them (`002-foo`, `003-foo`).

## Lifecycle by mode

| Mode | When | Artefacts created |
|---|---|---|
| **minimal** | Trivial task (<30 complexity, 1-2 files, known pattern) | No directory created. Only Phase 3 + Phase 4-light run. |
| **standard** | Bounded task with some uncertainty (30-60 complexity) | `spec.md`, `tasks/` (index + US{N}.md), `tests.md` or `validations.md`, `review.md`, `retro.md` |
| **full** | Architectural / multi-domain task (>60 complexity) | Same as standard + `state.json` |

## Files by phase

| Phase | File / Dir | Skill |
|---|---|---|
| 1 | `spec.md` | scope-definer |
| 2 | `tasks/` directory containing `index.md` (DAG + summary) + one `US{N}.md` per story | tech-planner |
| 2.5 | `tests.md` (code) **or** `validations.md` (markdown/skills/docs) — chosen per HU based on whether files are executable | tdd-designer |
| 3 | Code changes; updates `state.json` (if full mode) | story-executor |
| 4 | `review.md` | critic-reviewer |
| 5 | `retro.md` | retro-learner |

> **`tasks/` is a directory, not a single `tasks.md` file.** This was a deliberate choice: one file per story keeps each HU under ~200 lines and parseable in isolation. The legacy monolithic `tasks.md` is not supported.

## Status transitions

| Status | Meaning | Transition |
|---|---|---|
| `draft` | Artefact created, not yet approved | → `approved` after human hard gate |
| `approved` | Human gate passed; phase may proceed | → `implementing` when Phase 3 starts |
| `implementing` | Active development underway | → `closed` after Phase 5 done; → `blocked` if dependency fails |
| `closed` | All phases done, retro complete | Terminal |
| `blocked` | Waiting on external dependency | → `implementing` once unblocked |

## Garbage collection policy

Directories with `status: draft` and no updates for **>30 days** may be purged manually. There is no auto-purge. Before deleting: verify no other feature depends on this one via `Grep` in `.claude/plans/`.

## Template override (project-local)

Templates in this directory are global defaults (via `~/.claude/` symlink). A project-local override takes precedence:

1. Skill checks `.claude/plans/templates/<name>.template.md` (project-local).
2. If not found, falls back to the global `~/.claude/plans/templates/<name>.template.md`.

Override only what differs; keep the rest from the global template to stay consistent.

## Template reference

| Template | Phase | Purpose |
|---|---|---|
| [spec.template.md](templates/spec.template.md) | 1 | Feature scope definition |
| [tasks.template.md](templates/tasks.template.md) | 2 | Single US{N}.md story |
| [tasks-index.template.md](templates/tasks-index.template.md) | 2 | Summary index of all stories |
| [tests.template.md](templates/tests.template.md) | 2.5 | TDD test specs (executable code) |
| [validations.template.md](templates/validations.template.md) | 2.5 | Validation specs (markdown/docs/configs) |
| [review.template.md](templates/review.template.md) | 4 | Critic review checklist + findings |
| [retro.template.md](templates/retro.template.md) | 5 | Retrospective + promotions |
| [state.template.json](templates/state.template.json) | all (full mode) | Tracking schema |
