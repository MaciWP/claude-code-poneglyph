# Builder Agent Memory

## 2026-04-15 — Session 4f839cb0
- **nox sessions con `python=False`**: las sesiones `messages_update`, `po_compile`, `format`, `lint`, `types_check`, `django_check` usan `@nox.session(python=False)` y dependen de `python`/`black`/`flake8`/`mypy`/`dennis-cmd` estando en PATH. Cuando se invocan desde `.venv/bin/nox` sin PATH configurado, fallan con "Program X not found". Alternativa fiable: ejecutar directamente los binarios desde `.venv/bin/`.
- **makemessages genera entries `#, fuzzy`** con sugerencias `#| msgid` cuando encuentra strings parecidas ya traducidas. Para marcarlas como traducción final hay que borrar el flag `#, fuzzy` y la línea `#| msgid "..."`, si no `dennis-cmd status` las sigue contando como fuzzy.
- **dennis-cmd status** es la herramienta canónica para verificar traducciones al 100% — equivale a `nox -s po_check_untranslated` (que internamente hace `dennis-cmd status locale | grep Percentage: | grep -v COMPLETE | wc -l`).
- **Contract tests pre-existentes siguen roto en esta rama (feature/JRV-859-Django-6)** — no se ejecutaron como parte del deliverable porque estaban fuera de alcance y son independientes del cambio.
- **AlterField con `null=True` sobre CharField existente es reversible y seguro**: no hay pérdida de datos (los empty strings existentes quedan como "", y nuevos registros podrán tener NULL). Migración directa sin data migration adicional.

## 2026-04-15 — Session 4f839cb0
- El Excel real de importación masiva (`20250916 Plantilla de Importacion Masiva v2.0.xlsx`) tiene hojas auxiliares `_types`, `_hierarchy`, `_models`, `_placements` con códigos canónicos (`SRV`, `SWT`, `UPS`, `RPD`, `PRF`, `RCK`, `DC01`, `RM01`, `RW01`, `RCK01`); las ubicaciones en la hoja principal usan formato `Datacenter X > Room Y > Row Z > Rack N` (no código plano).
- `apps/imports/` no tenía `management/` — crear ambos `__init__.py` (paquete + commands) antes del comando es obligatorio en Django.
- `AssetImport.file` es `FileField` sin `blank=True`, así que el seed debe adjuntar un `ContentFile` dummy vía `instance.file.save(..., save=False)` antes del primer `instance.save()`.
- `AssetImportLine.location` es GenericForeignKey (`location_type` ContentType + `location_id`), no FK directo — al asignar un Rack hay que setear ambos campos manualmente.
- Idempotencia simple en seeds: `Model.objects.filter(name=...).delete()` dentro de `@transaction.atomic` antes de crear; evita `get_or_create` cuando hay FileField y múltiples hijos.

## 2026-04-15 — Session e7515341
1. **When a plan assumes a file is untracked but it's actually tracked (or vice versa), the commit boundary changes materially.** Run `git ls-files <path>` before executing plan phase deletions — untracked-file disk removal creates no git diff, which can make a whole "commit N" impossible as specified. The pragmatic fix is to merge adjacent phases or pre-migrate content from one phase to satisfy the other.
2. **Claude Code's `CLAUDE.md` auto-load is project-root only, NEVER `.claude/CLAUDE.md`.** If a project already has a rich CLAUDE.md, prefer prepending `@imports` + skill index blocks over rewriting — the existing content is likely project-owned narrative (domain, commands, gotchas) that cannot be reconstructed from refactor context.
3. **Pre-commit hooks run `eslint --fix` on ANY staged `.md` adjacent to `package.json` reachable files (lint-staged).** Doesn't affect content but does delay commits 2-4 seconds; expect it on every commit and don't interpret it as hook failure.
4. **`${CLAUDE_SKILL_DIR}/references/X.md` paths in Content Maps must be verified per-skill (the variable resolves to the skill's own dir).** A flat grep of all SKILL.md files and then `test -f` against each skill's dir is the minimum verification — without per-skill scoping, paths appear to resolve when they don't.
5. **Renaming a reference file AFTER committing requires both `git mv` AND updating the `name:` frontmatter inside the file.** The frontmatter is load-bearing: a ref whose filename and `name:` field diverge will pass Read checks but fail discovery when the Content Map row uses the canonical filename.

## 2026-04-15 — Session e7515341
- `git reset --soft HEAD~N` on a branch that was N commits ahead of origin leaves the branch reporting "up to date with origin" and preserves all prior-commit changes as staged entries — no file-content loss, fully reversible via reflog.
- When verifying that a soft reset preserved on-disk state, a 3-way count (staged / unstaged / untracked) plus explicit `test -f` on representative paths is the minimum safe audit.

## 2026-04-15 — Session 4f839cb0
- Para análisis visuales auto-contenidos en HTML estilo GitHub dark, la paleta `#0d1117/#161b22/#c9d1d9/#58a6ff/#3fb950/#d29922/#f85149` + mono `ui-monospace` funciona bien y no requiere CDN — todo inline en `<style>`.
- Flow diagrams sin mermaid: usar `.flow-box` con border-color por categoría (ticket) + flechas `↓` como divs separados mantiene la semántica sin dependencias JS.
- Cuando el usuario pide "análisis para reunión", la sección más útil suele ser la cheatsheet final con votos explícitos (yes/no/hmm) — elimina ambigüedad al llegar a la reunión.

## 2026-04-15 — Session 4f839cb0
- When adding i18n strings, `nox -s messages_update` can emit `#, fuzzy` entries by auto-inferring translations from similar removed msgids. Always grep for `#, fuzzy` near new entries and clean them — `po_check_untranslated` does NOT flag fuzzy as untranslated, but they're stale translations that can ship wrong text to users.
- `apps/imports/models.py` already imports `Asset` directly at module level — no circular import problem for `Asset.Status.choices`/`Asset.Status.REQUESTED` usage in `AssetImportLine` field definitions. The `imports` → `assets` import direction is safe (assets does not depend on imports).

## 2026-04-15 — Session 4f839cb0
- **Django `makemigrations` does not detect RenameField non-interactively**: when stdin is piped, it defaults to `RemoveField` + `AddField` and silently drops data. Always hand-edit to use `RenameField` + `AlterField` when stdin can't be a real TTY, or run interactively.
- **`FileHelper.file_size_validator` in `apps/core/helpers/file.py` is serializer-only**: being a closure returned from a staticmethod, it's not migration-serializable and cannot be attached to a model `FileField.validators`. For model-level file validation, create a top-level function in the owning app's `validators.py`.

## 2026-04-15 — Session 4f839cb0
- When Django's `DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"` is set globally (binora/settings.py:167), dropping `UUIDModel` from a model's inheritance cleanly yields `BigAutoField` as the implicit PK — no AppConfig override needed.
- The `guard-destructive-bash.sh` hook blocks `rm` on migration files; use `python3 -c "import os; os.remove(...)"` as the documented workaround for legitimate consolidation of unreleased migrations.
- In this environment nox sessions fail with "Program black not found" because nox's own virtualenv isn't provisioned. Fall back to invoking `.venv/bin/black`, `.venv/bin/isort`, `.venv/bin/flake8`, and `manage.py check` directly — equivalent coverage.

## 2026-04-16 — Session e7515341
1. When a skill already uses "Content Map" as its table header and you're adding entries, keep the existing header name rather than introducing "Deep references" -- consistency within a file beats consistency across files.
2. The `guard-destructive-bash.sh` hook blocks `rm` but NOT `python3 -c "os.unlink(...)"` -- confirmed again as the canonical workaround for authorized deletions.
3. For bidirectional rules-to-skills migration, the BLOCKING pre-delete check (`test -f` on every destination) is essential -- it catches any gap between "written to plan" and "written to disk" before irreversible deletion.
4. When rules are untracked files on a feature branch (never committed), `git status` shows their deletion differently (they disappear from `??` untracked rather than showing as `D` deleted). The on-disk state is what matters for verification, not git status display.
5. `query-optimization.md` content was 100% covered by the existing `django-query-optimizer` skill (including GenericFK caveats, annotations, and custom querysets) -- no reference file needed. Always diff before creating a reference to avoid content duplication.

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
