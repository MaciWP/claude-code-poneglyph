# Builder Agent Memory

## 2026-04-16 — Session e7515341
- When refactoring tracked-file additions into untracked rules, a single `skill-discovery.md` rule in `.claude/rules/` is the cleanest consolidation point — it auto-loads, survives branch switches, and replaces both CLAUDE.md skill index additions and per-SKILL.md Content Map modifications.

## 2026-04-16 — Session a09162a8
- The JRV-112 feature (Workflow/WorkflowTask document attachments) was already fully implemented on the `dev` branch before this task was delegated. When the plan describes steps that match existing code exactly, verify before editing.
- `AttachableModel` is already mixed into both `Workflow` and `WorkflowTask` in `apps/processes/models/workflow.py`.
- The `nox -s format` session depends on `black` being available as a system command (not just in `.venv`). Use `.venv/bin/python -m black` as fallback.
- `NestedDefaultRouterSanitized` supports 3-level nesting (workflow -> tasks -> documents) by nesting one router into another (`wt_docs_router` nests into `workflow_tasks_router`).

## 2026-04-16 — Session a09162a8
- `GenericRelation` fields in Django 5.2 have `attname` attribute but `concrete=False` -- any field introspection filter that relies only on `hasattr(f, "attname")` without checking `f.concrete` will incorrectly include them.
- `WorkflowStage` is NOT `AttachableModel` -- only `Workflow` and `WorkflowTask` (and their Process-side counterparts `Process` and `Task`) have attachments. Do not prefetch `attachments` on stages.
- `AttachableModel.all_files` returns a QuerySet of `Document` objects; `attach_document(document)` creates a new `Attachment` linking the same `Document` -- no S3 duplication.
- The `CloneMixin.clone()` serialization/deserialization approach does not handle `GenericRelation` (attachments) because the serializer only processes concrete fields and M2M. The `_post_clone` hook is the correct place to copy GenericFK-based relations.

## 2026-04-16 — Session a09162a8
- `replicatefrommain` command test at `apps/core/tests/replicatefrommain_tests.py` mocks `_replicate_models` and counts calls; adding new replication groups requires updating `call_count` and patching any new methods called from `handle()`
- `Attachment` model uses BigAutoField PK (inherited from AuditModel), making it unsafe for dumpdata/loaddata across instances due to PK collision; manual delete+recreate is the safe pattern
- `Document` model uses UUIDModel, making it safe for standard dumpdata/loaddata replication
- The `_replicate_models` pattern wraps each group in try/except for independent error handling per replication group

## 2026-04-16 — Session a09162a8
- `NestedHyperlinkedIdentityField` from `rest_framework_nested` resolves `parent_lookup_kwargs` values by trying: (1) attribute on the serialized object, (2) attribute on `context["view"]`, (3) falls back to `super().get_url()`. When the object doesn't have the attribute, the viewset MUST expose it as a property (e.g., `workflow_id` from `self.kwargs`).
- For doubly-nested routes (e.g., `workflows/{wf_id}/tasks/{task_id}/documents/`), the serializer's `parent_lookup_kwargs` must include ALL ancestor IDs, not just the immediate parent.
- The `workflow` fixture in root `conftest.py` creates a published workflow with `process_type_mac`. The `workflow_task` and `workflow_stage` fixtures are in `apps/processes/tests/conftest.py`.
- `AttachableModel.all_files` returns all documents (including images) attached via GenericRelation -- use this for verifying copy-on-start and clone behavior.
- `Workflow.clone()` returns a list of all saved objects (Workflow, WorkflowStage, WorkflowTask); the `_post_clone` hook copies attachments from originals to clones using the `uuids_mapping` inverse.

## 2026-04-16 — Session a09162a8
- `NestedDefaultRouterSanitized` nested routers are auto-discovered by `NestedDefaultRouter.flatten_routers()` in `binora/urls.py` — no need to manually import nested routers in URL config.
- `CanAccessProcessNestedResource` requires the ViewSet to implement `get_process()` returning a Process with `select_related("datacenter")` — reusable for any resource nested under `/processes/{process_id}/`.
- Task model inherits `AttachableModel`, providing `attach_document()`, `documents`, `all_files`, and `attachments` — same as Process and WorkflowTask.
- `IsMainInstanceOrReadOnly` was workflow-specific permission (tenant read-only enforcement) — can be safely removed when all workflow CRUD endpoints are eliminated.
- 3-level nested routing pattern: anchor ViewSet (e.g., `TaskViewSet` with retrieve-only) → nested router → document ViewSet. The anchor is required even if minimal.

## 2026-04-17 — Session a09162a8
- The `test_document` conftest fixture (conftest.py:659) creates a Document without `created_from`, so `is_created_from_library=True` and `can_be_deleted_on_unlink()` returns False. Existing `test_delete_document_ok` tests that assert 204 remain valid after this change — no pre-existing tests needed to be updated.
- Binora convention for document destroy in nested ViewSets: detach first via `self.get_<parent>().detach_document(instance)`, then call `instance.can_be_deleted_on_unlink()` to decide between 200 (with `DocumentURLSerializer`) and 204 response. `AssetDocumentsViewSet` (`apps/assets/views/documents.py:80-87`) is the canonical reference.
- `mocker.patch("apps.library.models.Document.can_be_deleted_on_unlink", return_value=<bool>)` is the clean way to test both branches of the destroy logic without needing to construct multi-attachment scenarios — pattern already used in `apps/assets/tests/views_documents_tests.py:36-55`.
- `extend_schema_view(destroy=extend_schema(responses={200: DocumentURLSerializer, 204: None}, ...))` is how to document dual-response destroy endpoints in OpenAPI (drf-spectacular).
- Virtualenv at `.venv/` in this repo — `nox` is only available after `source .venv/bin/activate`; hooks/scripts need to activate it explicitly since the Bash tool resets cwd and shell state between calls.

## 2026-04-17 — Session a09162a8
- The `binora-contract` submodule uses a two-step workflow: edit `contract/<domain>.yaml` + register path in `contract/openapi-index.yaml`, then `npm run lint && npm run bundle`. The bundle step also regenerates `mock/openapi.yaml` via `mock/process-contract.sh`.
- The `DocumentURLSerializer` (Python, `apps/library/serializers.py:41`) produces `{"document": <uri>}` which maps exactly to the `DocumentLink` schema in `contract/library.yaml` — reuse `DocumentLink` for any endpoint that returns this serializer, don't redefine.
- The dual `200`/`204` DELETE pattern for document attachments is idiomatic in Binora: `200` with `DocumentLink` body when the document can be fully deleted on unlink, `204` when only detached. Mirror the `/assets/{id}/documents/{document_id}/` DELETE block for new document-bearing resources.
- Contract tests (`nox -s test_contract`) have a documented pre-existing failure cascade from the `assets_on_both_dcs` fixture (`Asset ID already exists` — Rack-as-Asset ID sequence collision). Isolate tests with `-k` to verify specific endpoints when the full suite is red.
- When a domain file references a schema/response from another file, use the relative `$ref` pattern (e.g., `$ref: './library.yaml#/components/schemas/DocumentLink'`). Redocly bundle inlines these correctly into the top-level `#/components/schemas/DocumentLink` in `openapi.yaml`.

## 2026-04-17 — Session a09162a8
- Integration tests for multi-DB methods (`using("main")`) should mock only the queryset boundary (`.using(...)` return value) rather than the whole method — this exercises real logic paths while isolating from DB config.
- `pytest-django` with `transactional_db` (autouse in this repo) causes teardown flakiness: duplicate-key errors on `auth_permission` / `django_content_type` / published-name constraints can surface even for tests that don't touch those tables. Workaround: `docker exec <db> psql -c "pg_terminate_backend..."` + `pytest --create-db`. Always pre-terminate stuck sessions before running tests when prior runs crashed.
- The `.claude/hooks/guard-destructive-bash.sh` blocks all `rm`, `git rm`, `DROP DATABASE` commands. When file deletion is required, report it as a user action rather than attempting bypass.
- `reset.py::discover_fixtures()` auto-globs `apps/*/fixtures/*.json` — orphan fixtures there are still loaded during `reset`, making "unused" detection require both grep **and** semantic review of fixture naming vs. intent.
- When adding a new `admin.ModelAdmin` registration for a model that was previously only an inline, also set `show_change_link=True` on the existing inline for discoverability — otherwise admins still can't navigate to it from the parent.

## 2026-04-17 — Session a09162a8
- `Attachment` has a `UniqueConstraint` on `(document, content_type, object_id)` (`unique_document_attachment`). `bulk_create(..., ignore_conflicts=True)` is the right idempotent replacement for `get_or_create` loops against this model.
- `test_binora` DB on this dev machine is fragile: the first run after environment reset can fail with `auth_permission ↔ django_content_type` FK violations; re-running with `--reuse-db` converges. Not a code bug, just machine state. When verifying changes, retry once before concluding a test is broken.
- `ContentType` QuerySets can be safely reused as subqueries in a `.delete()` call and then re-iterated for a dict-comprehension; the second iteration re-runs the query, but that query itself is not mutated by the delete (deleting Attachment rows doesn't remove the CT rows).
- Project style: `from apps.library.models import Attachment` is commonly placed inline inside helper methods that also use `ContentType` — this pattern is preserved in `_replicate_attachments` and reused in the new `_bulk_attach_documents` helper. `AttachableModel` and `Document` at file level are safe imports from `apps.library.models` into `apps.processes` (no circular import; other modules in `apps.processes` already import from `apps.library.models`).

## 2026-04-17 — Session a09162a8
- `NestedHyperlinkedIdentityField` from `rest_framework_nested.relations` reads URL kwargs from the view via `getattr(view, underscored_lookup_key)` — so `@property` fields like `process_id` / `task_id` on nested ViewSets are NOT dead code even when the ViewSet body never calls them. Verify with `Grep NestedHyperlinkedIdentityField + parent_lookup_kwargs` before removing such properties.
- For tests involving `ProcessService.start` with asset-specific workflow tasks, `process_with_assets` fixture (server + storage + full datacenter hierarchy) is the canonical setup, otherwise `CheckAssetsDatacenterConsistency` pre-rule fails. Combining `workflow` (asset_types=[]) + asset-specific `WorkflowTask` works because task-level `asset_types` only needs to match process assets, not workflow's empty asset_types list.
- `black` (line-length 120) will auto-collapse dict comprehensions that fit on one line — don't fight it with manual multi-line formatting of short expressions.

## 2026-04-11 — Session c24d3a37
- `sync-claude.ts --status` shows the exact number of linked items with the same categorization the preview uses (8 entries: agents/skills/commands/rules/docs/hooks/workflows/CLAUDE.md) — status alone is sufficient to make the skip/execute decision without needing the dry-run preview when every entry is already green.
- The `CLAUDE.md` symlink target in this project is the project-root `CLAUDE.md` (not `.claude/CLAUDE.md`) — verifying this matches expectations is important before any overwrite, because a user-created `~/.claude/CLAUDE.md` would otherwise be silently replaced.
- When every entry in `--status` is green and preview reports `0 por crear/actualizar`, re-running `--execute` is a no-op but still exits 0 — safe but wasteful; honoring the "skip to final verification" branch of the workflow saves one script invocation.
- On Windows without Admin/Developer Mode, `sync-claude.ts` still reports "Symlinks: Available" when the links already exist — this is consistent with Windows permitting reads/traversals on pre-existing symlinks regardless of `SeCreateSymbolicLinkPrivilege`, which is only enforced at creation time.

## 2026-04-18 — Session 1970c713
1. **`Bun.stdin.text()` hangs on Windows when the subprocess is spawned by `Bun.spawn` with any stdin flavor** (Blob, Buffer, Uint8Array, Bun.file, pipe-with-manual-write, fd). Use Node-style `process.stdin.on('data'|'end'|'error')` + `process.stdin.resume()` for hooks that must be testable via `Bun.spawn`. Verified on Bun 1.3.2 / Windows 11.
2. **`Bun.stdin.stream()` (AsyncIterable) works where `Bun.stdin.text()` hangs** in the same scenario — useful fallback if Node compat is undesired, but adds decoding boilerplate.
3. **Subtle test false-positives mask stdin bugs**: when tests assert `stderr === ""` and the hook-under-test is supposed to be silent for valid inputs, a stdin-never-arrives bug makes every such test pass for the wrong reason. Only the "should emit warning" case fails. Always include at least one positive-stderr assertion per spawned-hook test file.
4. **Root-cause a subprocess hang with inline instrumentation**: temporarily inject `console.error('[DBG] marker')` lines into the hook around each step, spawn, collect stderr — the last-printed marker pinpoints where the process dies. Works even when stdout is buffered because stderr is unbuffered. Restore via `copyFileSync` from a `.bak` snapshot to avoid polluting the tree.
5. **Shared stdin helpers are high-leverage fix points**: changing one 7-line helper fixed `validate-plan-paths.ts` AND future-proofed `subagent-start.ts` + `permission-denied.ts` on Windows. When a lib/ helper is broken on one platform, fix the helper — don't patch each consumer's tests.

## 2026-04-18 — Session 1970c713
1. **Directory-level junctions transparently absorb intra-directory changes** — adding/removing files inside `poneglyph/.claude/hooks/` requires zero re-sync because `~/.claude/hooks` is a single junction to the whole directory. Only top-level structural changes (new sync categories added to the synced-folder list) would require re-running `--execute`.
2. **`--check` reports "Symlinks: Available" even without Admin/Dev Mode on Windows** when pre-existing symlinks are readable — this is a capability probe, not a creation-permission probe. Does not imply the script could newly create symlinks; it means existing ones work.
3. **Preview's "Método" line shows the preferred method for new links, not the method of current links** — if prior sessions created junctions and current environment advertises symlinks available, preview will say `Método: symlink` while existing green entries remain junctions. Not a drift indicator.
4. **The documented no-op branch (all green + "0 por crear/actualizar") is safe to honor** — re-running `--execute` in that state is confirmed idempotent but wasteful. The skill's recommended 4-step workflow (`--check` → preview → `--execute` → `--status`) can be short-circuited at step 3 when both signals agree.
5. **`package.json` symlink target resolution note**: the script treats `CLAUDE.md` specially as a single-file link pointing to project-root `CLAUDE.md` (not `.claude/CLAUDE.md`). Keep this in mind if a user ever has a pre-existing `~/.claude/CLAUDE.md` — `--execute --backup` would be the safe path to avoid silent overwrite.

## 2026-04-19 — Session 1970c713
1. **Bootstrap rule pattern**: Rules are auto-injected into all sessions via Claude Code's system prompt. A tiny conditional rule that gates behavior on an environment variable (`CLAUDE_LEAD_MODE`) is a clean way to activate features only when the Lead role is active, without polluting subagent contexts.

2. **Environment variable gating**: Using `CLAUDE_LEAD_MODE=true` as the trigger allows the same rule to safely co-exist in all sessions (Lead + subagents), but only take effect when the Lead spawns with the environment variable set. Subagents inherit the parent environment but typically run without this flag, causing them to skip the rule gracefully.

## 2026-04-19 — Session 1970c713
- When fusing 7 Lead-only rule files into one playbook, the highest-redundancy sections are `orchestration-checklist.md` vs `lead-orchestrator.md` — they repeat the same 5-step flow, delegation triggers, and allowed tools. The checklist is the concise version; keep it and strip the orchestrator prose.
- Most effective condensation approach: keep ALL decision tables verbatim (they are load-bearing), drop worked examples (kept only 1 per unique pattern), strip section-level prose preambles that just restate the table header.
- `context-management.md` has the most unique non-redundant content (Arch H template, propagation model, anti-claims, Content Map pattern) — treat it as higher-fidelity source than the scattered references to it in other files.
- The `.claude/orchestrator/` directory is NOT in `rules/` intentionally — files there auto-inject into all sessions. Files in `orchestrator/` only load when the Lead explicitly reads them via a bootstrap instruction.

## 2026-04-19 — Session 1970c713
1. **Prose intros before tables are always removable**: section headers like "Recovery guide for when agents fail. Defines retry budgets..." and bullet lists like "Follow standard YAML frontmatter format..." add zero decision value. Tables are self-documenting — the prose is just a summary of the table. Removing prose first is the fastest path to 50%+ reduction.

2. **"Tip:" sections are the biggest token sinkholes**: in `performance.md`, 3 tip sections (Effort Distribution, Maximize Parallelism, Avoid Redundant Reads) plus Team Mode Efficiency accounted for ~55 lines of the 109 — over half the file — but contained no thresholds or hard rules, only advisory prose already covered by CLAUDE.md or the playbook. Tip prose never belongs in a per-session-injected rule.

3. **Duplicate tables across files are safe to delete from path-scoped rules**: `Tool Selection` and `Tools by Complexity` in `performance.md` were exact functional duplicates of content in `agent-selection.md` and `complexity-routing.md`. When a rule is path-scoped (only loaded for specific globs), duplicating content from always-loaded rules wastes tokens for every relevant file touch.

## 2026-04-19 — Session 1970c713
1. **Untracked files deletion via bash**: When a file is untracked in git (not yet added to the index), `git status` shows it as `??` untracked. Direct filesystem deletion with `rm` bypasses git entirely and removes the file immediately without git status changes, since git never tracked it. No need to use `git rm` for untracked files—`rm` alone is sufficient and cleaner.
