---
name: lessons
description: |
  Cross-project lessons learned: real mistakes made in any repo Oriol works on, each
  carrying the evidence that produced it and the rule to apply. Not a best-practices
  list — every entry earned its place by causing a real bug, a PR rejection or a
  wasted cycle. Read it before reviewing a diff/PR and before declaring work done;
  append to it when a review surfaces a mistake that would repeat in another repo.
  Úsala cuando: vas a revisar una PR o un diff, vas a declarar "hecho", acabas de
  recibir feedback de review, o quieres registrar una lección aprendida.
  Keywords - lecciones, lecciones aprendidas, lección aprendida, lessons, lessons learned,
  qué aprendimos, no repitamos el error, registra la lección, apunta esta lección,
  errores recurrentes, pitfalls, guards, review lessons, past mistakes, no volver a fallar
disable-model-invocation: false
when_to_use: |
  "apunta esta lección", "no repitamos este error", "qué lecciones tenemos",
  before reviewing a PR/diff, before declaring done, right after review feedback lands
---

# lessons — cross-project lessons learned

Every entry below cost something real: a PR rejection, a silent data loss, a wasted
cycle. This is the **single home** for lessons across every repo Oriol works on: the
cross-repo ones live in this file, the stack-specific ones in `references/`. No repo
keeps its own lessons layer — those were migrated here (2026-08-06) and retired.

## Frontier — what lives where

| Layer | Holds | Read at |
|---|---|---|
| **This file** | Mistakes that repeat across repos or stacks: process, review hygiene, delivery discipline | On demand — before review, before "done" |
| **`references/<stack>-*.md`** | Stack- and codebase-specific rules (Django serializers, OpenAPI contract, React Query) | On demand, when the work touches that stack |
| **memory** (`memory/*.md`) | Facts about Oriol, his preferences, project state — how to work *with him* | Auto-injected every session |

A lesson belongs in exactly **one** layer. When an entry already has a memory sibling,
this file points at it instead of restating it — no copies.

## Triggers

| Moment | Action |
|---|---|
| Before reviewing a PR/diff (`pr-review`, `critic`) | Read §Lessons; every guard is a checkable item |
| Before declaring work done (`verify`) | Re-check G2, G3, G4 — the ones that bite at the finish line |
| Starting a HU in a known stack (`build`) | Read the matching `references/<stack>-*.md` |
| A review (human or agent) surfaces a mistake | Append here if cross-repo; to `references/<stack>` if stack-specific |
| `retro` Step 8 promotion, scope = cross-project | Land it here |

## Admission rule — three conditions, all mandatory

1. **Real evidence**: a concrete PR, finding or lost cycle. "Good practice" with no
   incident behind it is not a lesson — it is filler, and it dilutes the ones that matter.
2. **Not already default behavior**: if the model does it right without being told
   (tutorial material: "comments explain why, not what"), it does not enter.
3. **Cross-repo reach**: tied to one stack → `references/<stack>`, not the tables below.

Entry format: `| Lesson | Evidence (where it bit us) | Rule to apply |`.

## Lessons — process

| Lesson | Evidence | Rule to apply |
|---|---|---|
| **G1 — Never infer a convention from a small sample** | "Repo writes comment-free tests" claimed from 3 files; the census of 145 test files showed 58% do have comments and `it("should …")` dominates (65%) | Measure across the **whole** repo before normalizing a style. Match the majority, not your taste. Memory siblings: `feedback-measure-dont-estimate`, `feedback-discriminating-greps` |
| **G2 — Verify agent self-reports yourself** | A builder reported "eslint clean" having linted only the files *it* touched; re-linting the full changed set surfaced `jsx-sort-props` / `import/order` errors | After delegated work, re-run the gates over the **whole** changed set (`git diff --name-only --diff-filter=d HEAD`) and read the real diff. A report is a claim, not evidence |
| **G3 — Code recovered from a stash carries old lessons** | A groups stash predating PR #256 re-introduced the exact `tableConfig`/`i18next`-in-hook/`error: any` mistakes already fixed elsewhere | Run the lessons pass over stash/old-branch code **before** declaring it done, not after |
| **G4 — Sweep the whole unit, not the line under review** | Success toasts were i18n'd while error toasts stayed hardcoded English in the same file; a dead barrel export and a copy-pasted wrong i18n key shipped with them | When touching a cross-cutting category (strings, logging, error handling), sweep the entire file/feature for the same category |
| **G5 — Team preference beats repo convention** | An automated review approved `error: any` as "consistent with the repo norm" (8+ occurrences); the human reviewer required `ErrorResponse` | When the existing convention and the team's stated preference diverge, the **team wins** — and the old convention becomes legacy-to-migrate, not the target |
| **G6 — A merge gate is never a nit** | F401 (unused import) fails `nox -s lint`, a hard merge gate; classifying it NIT produced an APPROVED verdict on non-mergeable code | If the check blocks merge, severity is MAJOR minimum and APPROVED is forbidden while it is red. Run the linter before the verdict, don't infer it |

## Lessons — diff hygiene

| Lesson | Evidence | Rule to apply |
|---|---|---|
| **R1 — Don't reformat lines unrelated to the change** | `django-review-lessons` #25: reformatting noise buried the real change in review | Touch only what the task requires; formatting sweeps are their own commit |
| **R2 — Copy-paste leaves live traces** | `django-review-lessons` #24: duplicated blocks kept the source's names/keys | After copying a block, re-read it for names, keys and comments belonging to the origin |

## Lessons — UI built from a design

| Lesson | Evidence | Rule to apply |
|---|---|---|
| **U1 — Replicated structure ≠ design fidelity** | JRV-967: the `Responsible` picker set a value the UI never displayed back | Before coding from a mockup, enumerate every **visible** element (label, displayed value, selected-state feedback, badge) and make each one an AC |
| **U2 — `undefined` is not `false`** | Persisted group members lacked `is_active` → every row rendered "Inactive" | In status columns, distinguish unknown (`-`) from false. Never let a falsy default stand in for missing data |

## Stack references (read on demand — only the one the work touches)

| File | Covers | Origin |
|---|---|---|
| `references/django-lessons.md` | 34 general lessons (#1-#33) + serializers (S1-S4) + rescued agent-memory (Django 6.0.4 email regression, `makemigrations` rename data loss, `delete()` pk reset, nested-router `lookup_field`, replication diff semantics) | binora-backend |
| `references/django-contract.md` | OpenAPI contract C1-C19: schema↔serializer drift, enums, nullability, pagination wrappers | binora-backend |
| `references/django-checklists.md` | Quality checklist with severity + pre-PR scan list | binora-backend |
| `references/django-violations.md` | Long-form wrong/right pairs for the 6 most repeated violations | binora-backend |
| `references/react-lessons.md` | Module boundaries, i18n, React Query, UI states, DataTable, permissions, design fidelity + rescued agent-memory (apiClient double cast, RHF `setValue`, Radix Select in tests, i18next singleton, `MutationConfig<fn, ErrorResponse>`) | binora-frontend |

A stack with no reference file is fine — the cross-repo tables above still apply, and
the first real lesson for that stack creates its file.

> **Retired layers (2026-08-06)**: `binora-backend/.claude/skills/django-review-lessons/`,
> `binora-frontend/.claude/skills/frontend-review-lessons/` and the `agent-memory/` dirs of
> both repos were migrated here and are being removed. Do NOT reintroduce a per-repo
> lessons layer — a second home is how the two copies drift apart (Cmd IX).

## Pruning

The value of this file is inverse to its length. On every append, check the neighbors:

- Entry the model now handles by default → delete it.
- Two entries with the same root cause → merge them, keep both pieces of evidence.
- Entry that only ever applied to one repo → move it down to that repo's layer.

## Anti-patterns

| Anti-pattern | Correction |
|---|---|
| Adding a lesson with no incident behind it | Admission rule #1 — evidence or it does not enter |
| Putting a stack-specific lesson in the cross-repo tables | It belongs in `references/<stack>` — one lesson, one layer (Cmd IX) |
| Recreating a lessons layer inside a repo | The layers were merged here on purpose; a second home drifts |
| Restating something already in memory | Point at the memory file instead |
| Reading this file *after* the review verdict | Guards only pay off before the verdict, not as a post-mortem |
| Auto-capturing lessons via a hook | Tried and cut (`learning-inbox`, 030): produced truncated confidence-0.5 fragments with no consumer. Lessons are written deliberately, by a human or a Lead that just saw the failure |

## Commandments cubiertos

| # | Cómo |
|---|---|
| II | Each lesson carries its evidence; no unbacked claims |
| IV | G2/G6 keep the gates honest — a report is not a passing check |
| V | R1/R2 protect the delivered diff from noise and copy-paste debris |
| IX | The frontier table and the pruning rule stop this becoming a third source of truth |
